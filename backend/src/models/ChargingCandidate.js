const mongoose = require('mongoose');

/**
 * An EV charging station candidate site (§D, EV module).
 *
 * Siting is driven by three factors: vehicle demand (route density), dwell time
 * (buses stop for how long), and grid access. The EV optimizer (ai-engine)
 * scores each candidate and selects the top k.
 */
const ChargingCandidateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  siteType: {
    type: String,
    enum: ['bus-depot', 'major-stop', 'mandi', 'village-center', 'highway-rest'],
    required: true,
  },
  /**
   * Scores from the siting algorithm. Higher is better.
   */
  demandScore: { type: Number, default: 0 },   // Route density passing through
  dwellScore: { type: Number, default: 0 },     // Average dwell time
  gridScore: { type: Number, default: 0 },      // Grid infrastructure availability
  totalScore: { type: Number, default: 0 },     // Weighted sum
  /**
   * Whether this candidate was selected in the optimization run. The frontend
   * shows selected vs. existing (already built) vs. rejected.
   */
  selected: { type: Boolean, default: false },
}, { timestamps: true });

ChargingCandidateSchema.index({ location: '2dsphere' });
ChargingCandidateSchema.index({ totalScore: -1 });

module.exports = mongoose.model('ChargingCandidate', ChargingCandidateSchema);
