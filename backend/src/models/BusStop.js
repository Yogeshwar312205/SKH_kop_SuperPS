const mongoose = require('mongoose');

/**
 * A bus stop in the Kopargaon region.
 *
 * Coordinates follow the GeoJSON order: [longitude, latitude], matching the
 * existing Vehicle and PickupRequest models. Every stop that appears in a route
 * must have valid coordinates — distance drives both the bus schedule and the
 * cargo eligibility engine.
 */
const BusStopSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  name: { type: String, required: true },
  nameMr: { type: String, default: '' }, // Marathi name
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
  villageCode: { type: String, default: '' },
  isDepot: { type: Boolean, default: false },
  isMandi: { type: Boolean, default: false },
  /**
   * Road class of the approach link to this stop.
   * Matters for weather conditioning (§4 W3) — unpaved approaches degrade in rain.
   */
  approachRoadClass: {
    type: String,
    enum: ['paved', 'unpaved', 'unknown'],
    default: 'unknown',
  },
}, { timestamps: true });

BusStopSchema.index({ location: '2dsphere' });
BusStopSchema.index({ code: 1 });

module.exports = mongoose.model('BusStop', BusStopSchema);
