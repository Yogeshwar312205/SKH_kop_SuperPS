const mongoose = require('mongoose');

/**
 * IntegrityTicket - Tracks data integrity concerns and moderation workflow
 * 
 * A ticket is created when:
 * 1. A user reports something that looks wrong
 * 2. Auto-heuristics flag suspicious content (e.g., buyer posting far from modal price)
 * 
 * Lifecycle: open → triaging → resolved/dismissed
 */
const IntegrityTicketSchema = new mongoose.Schema({
  ticketId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['open', 'triaging', 'resolved', 'dismissed'],
    default: 'open',
    index: true,
  },
  category: {
    type: String,
    enum: ['price_dispute', 'scam_posting', 'scheme_rumor', 'treatment_claim', 'other'],
    required: true,
    index: true,
  },
  source: {
    type: String,
    enum: ['user_report', 'auto_signal'],
    required: true,
    index: true,
  },
  // The content being questioned
  subject: {
    type: {
      type: String, // 'price', 'posting', 'advice', 'forecast', 'scheme'
      default: 'price',
      required: true,
    },
    id: String, // Entity ID if applicable
    label: String, // Human-readable description
    displayedValue: String, // What was shown to the user
  },
  // Server-captured provenance at report time (never client-supplied)
  sourceOfRecord: {
    type: mongoose.Schema.Types.Mixed,
    // Contains: source name, fetch time, method, data snapshot
  },
  // Reporter information (optional for user reports)
  reporterName: String,
  reporterContact: String,
  reason: String, // Why they think it's wrong
  // Auto-generated trust signals (for auto_signal source)
  signals: [{
    code: String, // 'price_deviation', 'new_account', 'velocity', 'mandi_unknown'
    severity: String, // 'low', 'medium', 'high'
    detail: String,
  }],
  // Admin verdict
  verdict: {
    type: String,
    enum: ['verified', 'disputed', 'misleading', 'removed'],
  },
  verdictNote: String,
  verdictBy: String, // Admin username
  verdictAt: Date,
  // Audit trail
  timeline: [{
    at: { type: Date, default: Date.now },
    actor: String, // 'system', 'reporter', admin username
    action: String, // 'created', 'status_changed', 'verdict_set'
    note: String,
  }],
}, { timestamps: true });

// Compound indexes for queue views
IntegrityTicketSchema.index({ status: 1, createdAt: -1 });
IntegrityTicketSchema.index({ source: 1, status: 1, createdAt: -1 });

// Generate readable ticket IDs
IntegrityTicketSchema.pre('save', function(next) {
  if (!this.ticketId) {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.ticketId = `TKT-${timestamp}-${random}`;
  }
  next();
});

module.exports = mongoose.model('IntegrityTicket', IntegrityTicketSchema);
