const mongoose = require('mongoose');

/**
 * A decision trace from the cargo eligibility engine (§6.2).
 *
 * Every consignment carries an ordered evaluation log showing which rules
 * passed, which failed, and why. This is the explainability layer — the single
 * most persuasive artifact in the system (§6.2).
 */
const TraceEntrySchema = new mongoose.Schema({
  rule: { type: String, required: true }, // e.g., 'SAF-01', 'WX-01'
  result: {
    type: String,
    enum: ['PASS', 'FAIL', 'WARN', 'APPLIED'],
    required: true,
  },
  tripId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusTrip',
    default: null,
  },
  detail: { type: String, default: '' },
}, { _id: false });

const RuleDecisionSchema = new mongoose.Schema({
  consignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consignment',
    required: true,
    index: true,
  },
  decision: {
    type: String,
    enum: ['ASSIGNED', 'REJECTED', 'REROUTED_TO_FLEET'],
    required: true,
  },
  trace: [TraceEntrySchema],
  /**
   * Which trip or fleet assignment was chosen. Null when rejected entirely.
   */
  chosen: { type: String, default: null },
  /**
   * Plain-language summary (§6.2). The most important string in the system:
   * makes the optimizer legible to farmer, depot clerk, and judge simultaneously.
   */
  summary: { type: String, default: '' },
  evaluatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

RuleDecisionSchema.index({ consignmentId: 1, evaluatedAt: -1 });

module.exports = mongoose.model('RuleDecision', RuleDecisionSchema);
