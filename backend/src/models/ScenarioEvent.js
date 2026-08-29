const mongoose = require('mongoose');

/**
 * A scenario disruption applied to the system (§10.7).
 *
 * Scenarios are what demonstrate adaptation. The five buttons on the demo
 * screen each create one of these, the system re-optimizes, and the diff is
 * animated. This is the ADAPTATION criterion satisfied.
 */
const ScenarioEventSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['trip_cancelled', 'road_closed', 'demand_spike', 'weather', 'congestion'],
    required: true,
    index: true,
  },
  /**
   * Which entity the scenario affects. Interpretation depends on type:
   * - trip_cancelled: tripId
   * - road_closed: edge identifier (e.g., 'KPG-DEPOT_SHIRDI')
   * - demand_spike: date string
   * - weather: region code
   * - congestion: route code
   */
  targetId: { type: String, default: '' },
  /**
   * Type-specific parameters. Examples:
   * - trip_cancelled: { reason: 'vehicle breakdown' }
   * - road_closed: { edgeId, durationHours }
   * - demand_spike: { multiplier: 3.0 }
   * - weather: { rainProbPct: 85, tempC: 28 }
   * - congestion: { speedFactor: 0.4 }
   */
  params: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  appliedAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true, index: true },
}, { timestamps: true });

ScenarioEventSchema.index({ active: 1, appliedAt: -1 });

module.exports = mongoose.model('ScenarioEvent', ScenarioEventSchema);
