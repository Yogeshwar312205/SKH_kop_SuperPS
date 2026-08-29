const mongoose = require('mongoose');

/**
 * An agricultural/cargo drone asset in the Kopargaon rural network.
 *
 * Represents dual-use Kisan Drones (used for agricultural spraying in early morning/dusk,
 * and converted to cargo delivery during 9:00 AM - 5:00 PM for rural farm supply logistics).
 */
const DroneSchema = new mongoose.Schema({
  droneCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  name: { type: String, required: true },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  homeHubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DroneHub',
    required: true,
  },
  maxPayloadKg: { type: Number, required: true, default: 15.0 },
  maxRangeKm: { type: Number, required: true, default: 22.0 },
  cruiseSpeedKmh: { type: Number, default: 48.0 },
  battery: {
    capacityMah: { type: Number, default: 22000 },
    currentSoc: { type: Number, default: 95 }, // Percentage 0 - 100
    voltage: { type: Number, default: 48.2 },
    healthCycles: { type: Number, default: 120 },
    isCharging: { type: Boolean, default: false },
  },
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
  altitudeCeilingM: { type: Number, default: 120 }, // DGCA Green Zone max ceiling (120m AGL)
  maxWindToleranceKmh: { type: Number, default: 28 }, // Max operational wind speed
  status: {
    type: String,
    enum: ['idle', 'dispatched', 'airborne', 'charging', 'maintenance', 'grounded_weather'],
    default: 'idle',
  },
  dualUseStats: {
    sprayHoursToday: { type: Number, default: 2.0 },
    deliveryHoursToday: { type: Number, default: 3.5 },
    totalDeliveries: { type: Number, default: 12 },
    totalEarningsToday: { type: Number, default: 1450 }, // in INR (₹)
  },
}, { timestamps: true });

DroneSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Drone', DroneSchema);
