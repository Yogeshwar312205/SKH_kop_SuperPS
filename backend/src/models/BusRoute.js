const mongoose = require('mongoose');

/**
 * A scheduled bus corridor (e.g., Kopargaon ↔ Shirdi).
 *
 * A route is a sequence of stops with known offsets from the origin. Trips are
 * generated from routes — the route is the template, the trip is the instance.
 */
const RouteStopSchema = new mongoose.Schema({
  stopId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BusStop',
    required: true,
  },
  seq: { type: Number, required: true }, // Stop sequence: 0, 1, 2, ...
  offsetMin: { type: Number, required: true }, // Minutes from origin
}, { _id: false });

const BusRouteSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  name: { type: String, required: true },
  distanceKm: { type: Number, required: true },
  stops: [RouteStopSchema],
  /**
   * Which days this route operates. Empty array means every day.
   * Values: 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
   */
  operatingDays: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

BusRouteSchema.index({ code: 1 });

module.exports = mongoose.model('BusRoute', BusRouteSchema);
