const mongoose = require('mongoose');

/**
 * A specific bus departure on a route at a specific time.
 *
 * This is where capacity and spare capacity live. predictedSpareKg is what the
 * cargo eligibility engine checks before offering a consignment to this trip.
 */
const BusTripSchema = new mongoose.Schema({
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusRoute',
    required: true,
    index: true,
  },
  serviceDate: {
    type: String, // ISO yyyy-mm-dd
    required: true,
    index: true,
  },
  departureTime: {
    type: String, // HH:mm (24-hour)
    required: true,
  },
  vehicleCode: { type: String, default: '' },
  status: {
    type: String,
    enum: ['scheduled', 'running', 'cancelled', 'delayed', 'completed'],
    default: 'scheduled',
    index: true,
  },
  delayMin: { type: Number, default: 0 },
  /**
   * Passenger capacity — not enforced, purely informational. The constraint
   * that matters for parcels is cargo capacity.
   */
  passengerCapacity: { type: Number, default: 50 },
  /**
   * How much luggage/parcel weight this trip can carry. Rule PHY-01 checks
   * consignments against this, via predictedSpareKg.
   */
  cargoCapacityKg: { type: Number, required: true },
  /**
   * Predicted spare capacity for this trip. Starts at cargoCapacityKg and
   * decreases as consignments are assigned. May come from a learned model
   * (Tier 3) or a synthetic profile (interim).
   */
  predictedSpareKg: { type: Number, required: true },
  /**
   * Actual cargo weight assigned so far. Incremented when consignments are
   * assigned to this trip.
   */
  cargoUsedKg: { type: Number, default: 0 },
  /**
   * Crew duty window constraining when this trip can actually operate.
   * Used by rule CAP-02 (§3.3).
   */
  crewWindow: {
    startTime: { type: String, default: '' }, // HH:mm
    endTime: { type: String, default: '' },   // HH:mm
  },
}, { timestamps: true });

BusTripSchema.index({ routeId: 1, serviceDate: 1, departureTime: 1 });
BusTripSchema.index({ serviceDate: 1, status: 1 });

module.exports = mongoose.model('BusTrip', BusTripSchema);
