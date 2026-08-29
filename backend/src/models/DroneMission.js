const mongoose = require('mongoose');

/**
 * A Drone Delivery Flight Mission in the Kopargaon network.
 * Tracks aerial corridor waypoints, safety pre-flight audit, telemetry HUD,
 * and multimodal handoffs to MSRTC passenger buses.
 */
const DroneMissionSchema = new mongoose.Schema({
  missionCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    index: true,
  },
  droneId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Drone',
    required: true,
  },
  originHubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DroneHub',
    required: true,
  },
  destinationHubId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DroneHub',
    required: true,
  },
  cargo: {
    description: { type: String, required: true },
    weightKg: { type: Number, required: true },
    category: {
      type: String,
      enum: ['emergency_input', 'delicate_perishable', 'diagnostic_sample', 'medical_vet', 'intermodal_handoff'],
      default: 'emergency_input',
    },
    declaredValue: { type: Number, default: 500 },
  },
  requester: {
    name: { type: String, default: 'Village Farmer' },
    phone: { type: String, default: '' },
    role: { type: String, default: 'Farmer' },
  },
  flightProfile: {
    straightLineDistanceKm: { type: Number, required: true },
    roadEquivalentDistanceKm: { type: Number, required: true },
    flightDurationMin: { type: Number, required: true },
    roadEquivalentDurationMin: { type: Number, required: true },
    timeSavedMin: { type: Number, required: true },
    batterySoCStart: { type: Number, required: true },
    batterySoCEndEstimated: { type: Number, required: true },
    cruiseAltitudeM: { type: Number, default: 75 },
  },
  waypoints: [
    {
      type: [Number], // [longitude, latitude, altitudeM]
    }
  ],
  intermodal: {
    isConnectingToBus: { type: Boolean, default: false },
    busTripId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusTrip', default: null },
    transferWindowMin: { type: Number, default: 0 },
    destinationMandi: { type: String, default: '' },
  },
  safetyAudit: {
    windKmh: { type: Number, default: 12 },
    rainMm: { type: Number, default: 0 },
    airspaceClear: { type: Boolean, default: true },
    batteryReservePct: { type: Number, default: 35 },
    shirdiAirportBufferClear: { type: Boolean, default: true },
  },
  status: {
    type: String,
    enum: ['pending', 'cleared', 'airborne', 'delivered', 'returned', 'aborted'],
    default: 'cleared',
  },
  currentTelemetry: {
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [74.4765, 19.8826],
    },
    altitude: { type: Number, default: 0 },
    speed: { type: Number, default: 0 },
    batterySoc: { type: Number, default: 100 },
    lastUpdated: { type: Date, default: Date.now },
  },
}, { timestamps: true });

DroneMissionSchema.index({ status: 1 });
DroneMissionSchema.index({ droneId: 1 });

module.exports = mongoose.model('DroneMission', DroneMissionSchema);
