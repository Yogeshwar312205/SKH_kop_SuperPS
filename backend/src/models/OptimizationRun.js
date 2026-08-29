const mongoose = require('mongoose');

/**
 * A recorded optimization run, either baseline or optimized.
 *
 * The Impact dashboard (§10.1) compares two runs: one with mode='baseline'
 * (individual fleet hires) and one with mode='optimized' (bus consolidation +
 * fleet handoff). The delta is the demonstrable improvement.
 */
const OptimizationRunSchema = new mongoose.Schema({
  runId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  mode: {
    type: String,
    enum: ['baseline', 'optimized'],
    required: true,
  },
  serviceDate: {
    type: String, // ISO yyyy-mm-dd
    required: true,
    index: true,
  },
  scenarioId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ScenarioEvent',
    default: null,
  },
  /**
   * Metrics for demonstrating improvement (§2, rubric requirement).
   * These are the numbers that go on the Impact dashboard cards.
   */
  metrics: {
    costPerQuintalKm: { type: Number, default: 0 },
    totalVehicleKm: { type: Number, default: 0 },
    meanTransitMin: { type: Number, default: 0 },
    spareCapacityUtilPct: { type: Number, default: 0 },
    parcelRevenue: { type: Number, default: 0 },
    busAssignedCount: { type: Number, default: 0 },
    fleetReroutedCount: { type: Number, default: 0 },
    unassignedCount: { type: Number, default: 0 },
    co2Kg: { type: Number, default: 0 },
  },
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

OptimizationRunSchema.index({ mode: 1, serviceDate: 1 });

module.exports = mongoose.model('OptimizationRun', OptimizationRunSchema);
