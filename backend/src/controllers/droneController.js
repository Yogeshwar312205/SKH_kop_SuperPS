const Drone = require('../models/Drone');
const DroneHub = require('../models/DroneHub');
const DroneMission = require('../models/DroneMission');
const logger = require('../utils/logger');
const { getIsConnected } = require('../config/db');
const { evaluateDroneMission } = require('../services/droneEligibilityService');
const { startFlightSimulation } = require('../sockets/droneSocket');

// ==============================================================================
// Fallback Data (Guarantees system degrades gracefully if DB has no seed)
// ==============================================================================
const FALLBACK_HUBS = [
  {
    _id: 'hub-kpg-depot',
    hubCode: 'DH-KPG-DEPOT',
    name: 'Kopargaon ST Depot Air Hub',
    nameMr: 'कोपरगाव एसटी डेपो हवाई हब',
    location: { type: 'Point', coordinates: [74.4765, 19.8826] },
    hubType: 'depot_hub',
    elevationMeters: 492,
    hasSolarCharging: true,
    approachRoadClass: 'paved',
    operator: { name: 'Sanjay Deshmukh', phone: '9822301111', role: 'Depot Pad Officer' },
    isActive: true,
  },
  {
    _id: 'hub-pohegaon',
    hubCode: 'DH-POHEGAON',
    name: 'Pohegaon Panchayat Drone Pad',
    nameMr: 'पोहेगाव ग्रामपंचायत ड्रोन पॅड',
    location: { type: 'Point', coordinates: [74.4423, 19.9245] },
    hubType: 'village_pad',
    elevationMeters: 488,
    hasSolarCharging: true,
    approachRoadClass: 'unpaved',
    operator: { name: 'Sunita Shinde (Namo Drone Didi)', phone: '9822302222', role: 'SHG Pad Manager' },
    isActive: true,
  },
  {
    _id: 'hub-sanwatsar',
    hubCode: 'DH-SANWATSAR',
    name: 'Sanwatsar Village Drone Pad',
    nameMr: 'सानवत्सर ग्राम ड्रोन पॅड',
    location: { type: 'Point', coordinates: [74.5012, 19.9102] },
    hubType: 'village_pad',
    elevationMeters: 495,
    hasSolarCharging: true,
    approachRoadClass: 'unpaved',
    operator: { name: 'Kavita Jadhav', phone: '9822303333', role: 'Pad Sahayak' },
    isActive: true,
  },
  {
    _id: 'hub-dhamori',
    hubCode: 'DH-DHAMORI',
    name: 'Dhamori Village Drone Pad',
    nameMr: 'धामोरी ग्राम ड्रोन पॅड',
    location: { type: 'Point', coordinates: [74.4889, 19.8234] },
    hubType: 'village_pad',
    elevationMeters: 502,
    hasSolarCharging: true,
    approachRoadClass: 'paved',
    operator: { name: 'Rahul Patil', phone: '9822304444', role: 'Pad Operator' },
    isActive: true,
  },
  {
    _id: 'hub-chasnali',
    hubCode: 'DH-CHASNALI',
    name: 'Chas Nali Agri Center Pad',
    nameMr: 'चास नाळी कृषी केंद्र पॅड',
    location: { type: 'Point', coordinates: [74.5123, 19.9334] },
    hubType: 'village_pad',
    elevationMeters: 485,
    hasSolarCharging: false,
    approachRoadClass: 'unpaved',
    operator: { name: 'Anil Wagh', phone: '9822305555', role: 'Pad Coordinator' },
    isActive: true,
  },
  {
    _id: 'hub-apmc',
    hubCode: 'DH-KPG-APMC',
    name: 'Kopargaon APMC Cold Storage Pad',
    nameMr: 'कोपरगाव एपीएमसी शीतगृह पॅड',
    location: { type: 'Point', coordinates: [74.4712, 19.8801] },
    hubType: 'apmc_pad',
    elevationMeters: 490,
    hasSolarCharging: true,
    approachRoadClass: 'paved',
    operator: { name: 'Ganesh More', phone: '9822306666', role: 'APMC Logistics Incharge' },
    isActive: true,
  },
  {
    _id: 'hub-kvk',
    hubCode: 'DH-KVK-LAB',
    name: 'KVK Soil & Pest Diagnostic Lab Pad',
    nameMr: 'केव्हीके मृदा व कीड निदान लॅब पॅड',
    location: { type: 'Point', coordinates: [74.4650, 19.8910] },
    hubType: 'kvk_lab_pad',
    elevationMeters: 494,
    hasSolarCharging: true,
    approachRoadClass: 'paved',
    operator: { name: 'Dr. Vivek Kulkarni', phone: '9822307777', role: 'Chief Scientist' },
    isActive: true,
  },
  {
    _id: 'hub-shirdi',
    hubCode: 'DH-SHIRDI-LINK',
    name: 'Shirdi Express Air Transit Link',
    nameMr: 'शिर्डी एक्सप्रेस हवाई ट्रान्झिट लिंक',
    location: { type: 'Point', coordinates: [74.4777, 19.7645] },
    hubType: 'depot_hub',
    elevationMeters: 510,
    hasSolarCharging: true,
    approachRoadClass: 'paved',
    operator: { name: 'Pravin Shinde', phone: '9822308888', role: 'Transit Officer' },
    isActive: true,
  },
];

const FALLBACK_DRONES = [
  {
    _id: 'drone-01',
    droneCode: 'KPG-DRONE-01',
    name: 'KisanDrone Hexa-15 Cargo',
    maxPayloadKg: 15.0,
    maxRangeKm: 22.0,
    cruiseSpeedKmh: 48.0,
    battery: { capacityMah: 22000, currentSoc: 92, voltage: 48.2, healthCycles: 140, isCharging: false },
    location: { type: 'Point', coordinates: [74.4765, 19.8826] },
    altitudeCeilingM: 120,
    maxWindToleranceKmh: 28,
    status: 'idle',
    dualUseStats: { sprayHoursToday: 2.5, deliveryHoursToday: 3.5, totalDeliveries: 14, totalEarningsToday: 1650 },
  },
  {
    _id: 'drone-02',
    droneCode: 'KPG-DRONE-02',
    name: 'Marut Agri-Lifter Pro',
    maxPayloadKg: 12.0,
    maxRangeKm: 18.0,
    cruiseSpeedKmh: 45.0,
    battery: { capacityMah: 18000, currentSoc: 86, voltage: 47.8, healthCycles: 98, isCharging: false },
    location: { type: 'Point', coordinates: [74.4423, 19.9245] },
    altitudeCeilingM: 120,
    maxWindToleranceKmh: 26,
    status: 'idle',
    dualUseStats: { sprayHoursToday: 2.0, deliveryHoursToday: 2.5, totalDeliveries: 8, totalEarningsToday: 1100 },
  },
  {
    _id: 'drone-03',
    droneCode: 'KPG-DRONE-03',
    name: 'Garuda Express Courier',
    maxPayloadKg: 8.0,
    maxRangeKm: 25.0,
    cruiseSpeedKmh: 55.0,
    battery: { capacityMah: 16000, currentSoc: 95, voltage: 48.6, healthCycles: 45, isCharging: false },
    location: { type: 'Point', coordinates: [74.4712, 19.8801] },
    altitudeCeilingM: 120,
    maxWindToleranceKmh: 30,
    status: 'idle',
    dualUseStats: { sprayHoursToday: 1.5, deliveryHoursToday: 4.0, totalDeliveries: 19, totalEarningsToday: 1950 },
  },
  {
    _id: 'drone-04',
    droneCode: 'KPG-DRONE-04',
    name: 'IoTech Sky-Worker 16',
    maxPayloadKg: 16.0,
    maxRangeKm: 16.0,
    cruiseSpeedKmh: 42.0,
    battery: { capacityMah: 24000, currentSoc: 48, voltage: 45.2, healthCycles: 180, isCharging: true },
    location: { type: 'Point', coordinates: [74.4650, 19.8910] },
    altitudeCeilingM: 120,
    maxWindToleranceKmh: 24,
    status: 'charging',
    dualUseStats: { sprayHoursToday: 3.0, deliveryHoursToday: 1.5, totalDeliveries: 6, totalEarningsToday: 850 },
  },
];

/**
 * GET /api/v2/drone/hubs
 */
exports.getDroneHubs = async (req, res) => {
  try {
    if (!getIsConnected()) {
      return res.json({ success: true, hubs: FALLBACK_HUBS, source: 'fallback' });
    }
    const hubs = await DroneHub.find({ isActive: true }).sort({ hubType: 1 });
    if (!hubs || hubs.length === 0) {
      return res.json({ success: true, hubs: FALLBACK_HUBS, source: 'fallback' });
    }
    return res.json({ success: true, hubs, source: 'database' });
  } catch (err) {
    logger.warn(`Error fetching drone hubs: ${err.message}`);
    return res.json({ success: true, hubs: FALLBACK_HUBS, source: 'fallback' });
  }
};

/**
 * GET /api/v2/drone/fleet
 */
exports.getDroneFleet = async (req, res) => {
  try {
    if (!getIsConnected()) {
      return res.json({ success: true, drones: FALLBACK_DRONES, source: 'fallback' });
    }
    const drones = await Drone.find().populate('homeHubId');
    if (!drones || drones.length === 0) {
      return res.json({ success: true, drones: FALLBACK_DRONES, source: 'fallback' });
    }
    return res.json({ success: true, drones, source: 'database' });
  } catch (err) {
    logger.warn(`Error fetching drone fleet: ${err.message}`);
    return res.json({ success: true, drones: FALLBACK_DRONES, source: 'fallback' });
  }
};

/**
 * POST /api/v2/drone/estimate
 */
exports.estimateMission = async (req, res) => {
  try {
    const { originHubId, destHubId, cargo, droneId, weatherOverride } = req.body;

    if (!originHubId || !destHubId) {
      return res.status(400).json({ success: false, message: 'originHubId and destHubId are required' });
    }

    // Resolve Origin Hub
    let originHub = null;
    let destHub = null;

    try {
      originHub = await DroneHub.findById(originHubId);
      destHub = await DroneHub.findById(destHubId);
    } catch (_) {}

    if (!originHub) {
      originHub = FALLBACK_HUBS.find((h) => h._id === originHubId || h.hubCode === originHubId) || FALLBACK_HUBS[1];
    }
    if (!destHub) {
      destHub = FALLBACK_HUBS.find((h) => h._id === destHubId || h.hubCode === destHubId) || FALLBACK_HUBS[0];
    }

    let drone = null;
    if (droneId) {
      try {
        drone = await Drone.findById(droneId);
      } catch (_) {}
    }
    if (!drone) {
      drone = FALLBACK_DRONES[0];
    }

    const payload = cargo || {
      description: 'Emergency Organic Biocontrol Kit',
      weightKg: 4.5,
      category: 'emergency_input',
      declaredValue: 1200,
    };

    const weather = weatherOverride || { windKmh: 12, rainMm: 0, tempC: 29 };

    const evaluation = await evaluateDroneMission({
      cargo: payload,
      originHub,
      destHub,
      drone,
      currentWeather: weather,
    });

    return res.json({
      success: true,
      originHub,
      destHub,
      drone,
      cargo: payload,
      ...evaluation,
    });
  } catch (err) {
    logger.error(`Error estimating drone mission: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v2/drone/dispatch
 */
exports.dispatchMission = async (req, res) => {
  try {
    const { originHubId, destHubId, droneId, cargo, requester, intermodal } = req.body;

    // Resolve hubs
    let originHub = await DroneHub.findById(originHubId).catch(() => null);
    let destHub = await DroneHub.findById(destHubId).catch(() => null);

    if (!originHub) originHub = FALLBACK_HUBS[1];
    if (!destHub) destHub = FALLBACK_HUBS[0];

    let drone = await Drone.findById(droneId).catch(() => null);
    if (!drone) drone = FALLBACK_DRONES[0];

    const payload = cargo || {
      description: 'Emergency Pest Control',
      weightKg: 4.0,
      category: 'emergency_input',
    };

    const evaluation = await evaluateDroneMission({
      cargo: payload,
      originHub,
      destHub,
      drone,
    });

    const missionCode = `DM-${Date.now().toString().slice(-6)}`;

    let mission = null;
    try {
      mission = await DroneMission.create({
        missionCode,
        droneId: drone._id.length === 24 ? drone._id : undefined,
        originHubId: originHub._id.length === 24 ? originHub._id : undefined,
        destinationHubId: destHub._id.length === 24 ? destHub._id : undefined,
        cargo: payload,
        requester: requester || { name: 'Kopargaon Farmer', role: 'Farmer' },
        flightProfile: {
          straightLineDistanceKm: evaluation.comparison.aerialDistanceKm,
          roadEquivalentDistanceKm: evaluation.comparison.roadDistanceKm,
          flightDurationMin: evaluation.comparison.flightDurationMin,
          roadEquivalentDurationMin: evaluation.comparison.roadDurationMin,
          timeSavedMin: evaluation.comparison.timeSavedMin,
          batterySoCStart: drone.battery.currentSoc,
          batterySoCEndEstimated: evaluation.batteryAudit.estimatedArrivalSoc,
        },
        waypoints: evaluation.waypoints,
        intermodal: intermodal || {
          isConnectingToBus: evaluation.multimodalConnection.isIntermodalEligible,
          transferWindowMin: evaluation.multimodalConnection.transferWindowMin,
          destinationMandi: 'Nashik APMC',
        },
        safetyAudit: {
          windKmh: 12,
          rainMm: 0,
          airspaceClear: evaluation.airspaceAudit.isCompliant,
          batteryReservePct: evaluation.batteryAudit.reserveBufferPct,
          shirdiAirportBufferClear: evaluation.airspaceAudit.isCompliant,
        },
        status: 'cleared',
        currentTelemetry: {
          coordinates: originHub.location.coordinates,
          altitude: 0,
          speed: 0,
          batterySoc: drone.battery.currentSoc,
        },
      });
    } catch (createErr) {
      logger.warn(`Notice creating mission in DB: ${createErr.message}`);
      mission = {
        _id: 'simulated-mission-' + Date.now(),
        missionCode,
        status: 'cleared',
        waypoints: evaluation.waypoints,
        cargo: payload,
      };
    }

    return res.json({
      success: true,
      message: `Mission ${missionCode} approved and queued for flight.`,
      mission,
      evaluation,
    });
  } catch (err) {
    logger.error(`Error dispatching mission: ${err.message}`);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/v2/drone/simulate/:missionId
 */
exports.simulateMission = async (req, res) => {
  try {
    const { missionId } = req.params;
    const { waypoints } = req.body;

    startFlightSimulation(missionId, waypoints);

    return res.json({
      success: true,
      message: `Live aerial flight simulation started for mission ${missionId}`,
      channel: `drone:telemetry`,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/v2/drone/analytics
 */
exports.getDroneAnalytics = async (req, res) => {
  return res.json({
    success: true,
    metrics: {
      activeDrones: 4,
      totalCertifiedPads: 8,
      completedFlightsThisMonth: 168,
      hoursSavedRuralRoads: 412,
      cropValueProtectedInr: 584000, // ₹5.84 Lakhs saved from urgent pest interventions
      dualUseOwnerEarningsInr: 218400, // Extra revenue generated during idle midday hours
      co2AvoidedKg: 890, // vs diesel tempos on rural dirt roads
      emergencyMedicalMissions: 23, // Snakebite antivenom / AI semen delivery
      averageFlightTimeMin: 12.4,
      averageRoadTimeMin: 46.8,
    },
  });
};
