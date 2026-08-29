const mongoose = require('mongoose');

/**
 * A parcel booking request for the bus network.
 *
 * Parallel to PickupRequest, but for scheduled bus transport rather than the
 * existing fleet VRP. The cargo eligibility engine (§3) decides which network
 * a consignment goes to.
 */
const ConsignmentSchema = new mongoose.Schema({
  farmerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  farmerName: { type: String, required: true },
  farmerPhone: { type: String, default: '' },
  originStopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusStop',
    required: true,
    index: true,
  },
  destStopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusStop',
    required: true,
  },
  commodity: { type: String, required: true },
  /**
   * Commodity classification metadata from commodityClassifier service
   */
  commodityMetadata: {
    category: { type: String, default: '' }, // AGRICULTURAL, HAZARDOUS, FRAGILE, GENERAL
    subcategory: { type: String, default: '' },
    confidence: { type: Number, default: 0 },
    busEligible: { type: Boolean, default: true },
    matchedKeyword: { type: String, default: '' },
  },
  /**
   * Cargo class from §3.2: A (bus-eligible agri), B (general parcels),
   * C (institutional), D (not bus-eligible → routed to fleet).
   */
  cargoClass: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    required: true,
    index: true,
  },
  packagingType: {
    type: String,
    enum: [
      'jute-sack', 'plastic-sack', 'hdpe-bag', 'cardboard-box', 
      'sealed-box', 'wooden-crate', 'plastic-crate', 'ventilated-box', 
      'net-bag', 'sealed-container', 'insulated-box', 'waterproof', 
      'loose', 'other'
    ],
    default: 'jute-sack',
  },
  weightKg: { type: Number, required: true, min: 0.1 },
  pieceCount: { type: Number, default: 1, min: 1 },
  maxPieceWeightKg: { type: Number, required: true },
  declaredValue: { type: Number, default: 0 }, // INR
  readyAt: { type: Date, required: true },
  deadlineAt: { type: Date, required: false },
  /**
   * Consignment lifecycle status.
   * State machine: CREATED → VALIDATING → SEARCHING_TRIP → ASSIGNED → 
   * PAYMENT_PENDING → CONFIRMED → READY_FOR_DROP → RECEIVED_AT_STOP → 
   * LOADED → IN_TRANSIT → ARRIVED → DELIVERED
   * 
   * Failure states: REJECTED, REROUTED_TO_FLEET, CANCELLED, FAILED
   */
  status: {
    type: String,
    enum: [
      'created', 'validating', 'searching_trip', 'assigned', 
      'payment_pending', 'confirmed', 'ready_for_drop', 
      'received_at_stop', 'loaded', 'in_transit', 
      'arrived', 'delivered',
      'rejected', 'rerouted_to_fleet', 'cancelled', 'failed'
    ],
    default: 'created',
    index: true,
  },
  /**
   * Status history for tracking timeline.
   * Records every state transition with timestamp and optional metadata.
   */
  statusHistory: [{
    status: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    actor: { 
      type: String, 
      enum: ['farmer', 'system', 'depot_clerk', 'driver', 'admin'],
      default: 'system'
    },
    location: { type: String, default: '' }, // Stop name or coordinates
    note: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  }],
  /**
   * Assignment to bus trips. A consignment may span multiple legs (e.g.,
   * Kopargaon → Sangamner on one bus, transfer, Sangamner → Nashik on another).
   */
  assignment: {
    legs: [{
      tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusTrip' },
      boardStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusStop' },
      alightStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusStop' },
      etd: { type: Date },
      eta: { type: Date },
    }],
    totalCost: { type: Number, default: 0 },
    network: {
      type: String,
      enum: ['bus', 'fleet'],
      default: 'bus',
    },
  },
  /**
   * Weather Risk Score from §4.1 — LOW/MEDIUM/HIGH. Computed by the rule
   * engine and used by rules WX-01, WX-02.
   */
  weatherRiskScore: { type: Number, min: 0, max: 100, default: 0 },
  /**
   * Link to the rule decision that produced the assignment or rejection.
   * The decision trace (§6.2) lives in RuleDecision.
   */
  decisionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RuleDecision',
    default: null,
  },
  /**
   * What it would have cost via the baseline (individual fleet hire). Used for
   * the Impact dashboard (§10.1) to show baseline vs. optimized.
   */
  baselineCost: { type: Number, default: null },
  /**
   * Booking code for farmer reference (e.g., BP-20260829-00124)
   */
  bookingCode: { 
    type: String, 
    unique: true, 
    sparse: true,
    index: true 
  },
  /**
   * Cancellation metadata
   */
  cancellation: {
    reason: { type: String, default: '' },
    cancelledBy: { type: String, default: '' },
    cancelledAt: { type: Date, default: null },
    refundAmount: { type: Number, default: 0 }
  }
}, { timestamps: true });

ConsignmentSchema.index({ status: 1, createdAt: -1 });
ConsignmentSchema.index({ farmerId: 1, status: 1 });

/**
 * Generate booking code (BP-YYYYMMDD-NNNNN)
 */
ConsignmentSchema.statics.generateBookingCode = async function() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  
  // Find the highest booking number for today
  const lastBooking = await this.findOne({
    bookingCode: new RegExp(`^BP-${dateStr}-`)
  }).sort({ bookingCode: -1 });
  
  let nextNum = 1;
  if (lastBooking && lastBooking.bookingCode) {
    const match = lastBooking.bookingCode.match(/-(\d+)$/);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }
  
  return `BP-${dateStr}-${String(nextNum).padStart(5, '0')}`;
};

/**
 * Add status history entry
 */
ConsignmentSchema.methods.addStatusHistory = function(status, actor = 'system', note = '', metadata = {}) {
  this.statusHistory.push({
    status,
    timestamp: new Date(),
    actor,
    note,
    metadata
  });
  this.status = status;
};

/**
 * Get current status info
 */
ConsignmentSchema.methods.getCurrentStatus = function() {
  if (this.statusHistory.length === 0) {
    return {
      status: this.status,
      timestamp: this.createdAt,
      actor: 'system'
    };
  }
  return this.statusHistory[this.statusHistory.length - 1];
};

/**
 * Check if consignment can transition to new status
 */
ConsignmentSchema.methods.canTransitionTo = function(newStatus) {
  const validTransitions = {
    'created': ['validating', 'rejected', 'cancelled'],
    'validating': ['searching_trip', 'rejected', 'rerouted_to_fleet', 'cancelled'],
    'searching_trip': ['assigned', 'rerouted_to_fleet', 'rejected', 'cancelled'],
    'assigned': ['payment_pending', 'confirmed', 'cancelled'],
    'payment_pending': ['confirmed', 'cancelled'],
    'confirmed': ['ready_for_drop', 'cancelled'],
    'ready_for_drop': ['received_at_stop', 'cancelled'],
    'received_at_stop': ['loaded', 'cancelled'],
    'loaded': ['in_transit'],
    'in_transit': ['arrived'],
    'arrived': ['delivered'],
    'delivered': [], // Terminal state
    'rejected': [], // Terminal state
    'rerouted_to_fleet': [], // Terminal state (moves to fleet system)
    'cancelled': [], // Terminal state
    'failed': [] // Terminal state
  };
  
  const allowed = validTransitions[this.status] || [];
  return allowed.includes(newStatus);
};

/**
 * Get estimated arrival time
 */
ConsignmentSchema.methods.getEstimatedArrival = function() {
  if (!this.assignment || !this.assignment.legs || this.assignment.legs.length === 0) {
    return null;
  }
  
  // Return ETA of the last leg
  const lastLeg = this.assignment.legs[this.assignment.legs.length - 1];
  return lastLeg.eta;
};

/**
 * Calculate time in transit
 */
ConsignmentSchema.methods.getTransitDuration = function() {
  const loadedEntry = this.statusHistory.find(h => h.status === 'loaded');
  const deliveredEntry = this.statusHistory.find(h => h.status === 'delivered');
  
  if (!loadedEntry || !deliveredEntry) {
    return null;
  }
  
  return deliveredEntry.timestamp - loadedEntry.timestamp; // milliseconds
};

module.exports = mongoose.model('Consignment', ConsignmentSchema);
