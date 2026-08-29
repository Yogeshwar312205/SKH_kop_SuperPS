const mongoose = require('mongoose');

/**
 * A timestamped capture of weather and traffic state.
 *
 * Used by the scenario engine (§10.7) and for auditing what conditions a
 * decision was made under. Every optimization run references a snapshot so the
 * "why did it choose X" question has an answer.
 */
const EnvironmentSnapshotSchema = new mongoose.Schema({
  at: { type: Date, default: Date.now, index: true },
  source: {
    type: String,
    enum: ['open-meteo', 'simulated', 'manual-override'],
    default: 'simulated',
  },
  // Weather state (§4)
  tempC: { type: Number, default: null },
  humidityPct: { type: Number, default: null },
  rainProbPct: { type: Number, default: null },
  rainfallMm: { type: Number, default: null },
  // Traffic state (§5)
  trafficProvider: {
    type: String,
    enum: ['simulated', 'tomtom', 'google'],
    default: 'simulated',
  },
  /**
   * Speed multipliers per edge. Keys are edge identifiers (e.g., stop pairs),
   * values are speed factors: 1.0 = baseline, 0.5 = half speed (congestion),
   * 1.2 = 20% faster (off-peak).
   */
  edgeSpeedFactors: {
    type: Map,
    of: Number,
    default: new Map(),
  },
}, { timestamps: true });

EnvironmentSnapshotSchema.index({ at: -1 });

module.exports = mongoose.model('EnvironmentSnapshot', EnvironmentSnapshotSchema);
