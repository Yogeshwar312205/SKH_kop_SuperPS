const mongoose = require('mongoose');

/**
 * A certified Drone Launch / Landing Pad in the Kopargaon rural network.
 *
 * Designed for micro-freight hubs, village panchayat pads (Namo Drone Didi),
 * APMC mandi rooftops, and Kopargaon ST Bus Depot multimodal transfer nodes.
 * Coordinates follow GeoJSON order: [longitude, latitude].
 */
const DroneHubSchema = new mongoose.Schema({
  hubCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  name: { type: String, required: true },
  nameMr: { type: String, default: '' },
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
  hubType: {
    type: String,
    enum: ['depot_hub', 'village_pad', 'apmc_pad', 'hospital_pad', 'kvk_lab_pad'],
    default: 'village_pad',
  },
  elevationMeters: { type: Number, default: 490 },
  hasSolarCharging: { type: Boolean, default: true },
  approachRoadClass: {
    type: String,
    enum: ['paved', 'unpaved'],
    default: 'unpaved',
  },
  operator: {
    name: { type: String, default: 'Village Pad Sahayak' },
    phone: { type: String, default: '' },
    role: { type: String, default: 'Pad Manager' },
  },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

DroneHubSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('DroneHub', DroneHubSchema);
