const logger = require('../utils/logger');
const DroneMission = require('../models/DroneMission');
const Drone = require('../models/Drone');

let ioInstance = null;
const activeSimulations = new Map();

/**
 * Initialize Socket.io real-time listeners and handlers for Drone Air Corridors.
 */
const initDroneSockets = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    logger.info(`🚁 Drone Socket Client Connected: ${socket.id}`);

    // Join a specific mission telemetry channel
    socket.on('drone:subscribe_mission', (missionId) => {
      socket.join(`drone:mission:${missionId}`);
      logger.debug(`Socket ${socket.id} subscribed to drone:mission:${missionId}`);
    });

    // Dev trigger: Start live flight simulation
    socket.on('drone:trigger_simulation', async (payload) => {
      logger.info(`🚀 Starting live flight simulation for mission: ${payload?.missionId || 'DEMO'}`);
      startFlightSimulation(payload?.missionId, payload?.waypoints, io);
    });

    // Abort simulation
    socket.on('drone:abort_simulation', (missionId) => {
      if (activeSimulations.has(missionId)) {
        clearInterval(activeSimulations.get(missionId));
        activeSimulations.delete(missionId);
        io.emit('drone:mission_aborted', { missionId, reason: 'Manual pilot abort / RTL triggered' });
      }
    });
  });

  logger.info('✓ KrishiFly Drone Socket.io real-time engine initialized');
};

/**
 * Runs a smooth 1-second interval simulated flight across waypoints.
 */
function startFlightSimulation(missionId = 'DEMO-POHEGAON-KPG', customWaypoints, io) {
  const ioEngine = io || ioInstance;
  if (!ioEngine) return;

  // Clear existing simulation if running
  if (activeSimulations.has(missionId)) {
    clearInterval(activeSimulations.get(missionId));
    activeSimulations.delete(missionId);
  }

  // Default corridor: Pohegaon Village Pad [74.4423, 19.9245] -> Kopargaon ST Depot [74.4765, 19.8826]
  const defaultWaypoints = [
    [74.4423, 19.9245, 0],   // Pohegaon Pad (Takeoff)
    [74.4455, 19.9205, 35],  // Climb out
    [74.4490, 19.9160, 75],  // Cruising corridor
    [74.4530, 19.9120, 75],
    [74.4580, 19.9070, 75],
    [74.4620, 19.9020, 75],
    [74.4660, 19.8970, 75],
    [74.4700, 19.8920, 75],
    [74.4735, 19.8870, 40],  // Approach descent
    [74.4765, 19.8826, 0],   // Kopargaon ST Depot Pad (Touchdown)
  ];

  const waypoints = (customWaypoints && customWaypoints.length > 2) ? customWaypoints : defaultWaypoints;
  let currentStep = 0;
  let currentSoc = 92;
  const totalSteps = waypoints.length;

  ioEngine.emit('drone:mission_status', {
    missionId,
    status: 'airborne',
    message: '🚁 Drone cleared for takeoff. Entering designated rural air corridor...',
    timestamp: new Date().toISOString(),
  });

  const timer = setInterval(async () => {
    if (currentStep >= totalSteps) {
      clearInterval(timer);
      activeSimulations.delete(missionId);

      ioEngine.emit('drone:mission_status', {
        missionId,
        status: 'delivered',
        message: '🎯 Safe touchdown at Kopargaon ST Depot Pad. Cargo unlatched.',
        finalBatterySoc: currentSoc,
        timestamp: new Date().toISOString(),
      });

      // Multimodal Handoff Ready Event
      ioEngine.emit('drone:multimodal_ready', {
        missionId,
        cargoWeightKg: 4.5,
        connectingBusTrip: 'MH-19-BUS-4288 (Kopargaon ↔ Nashik APMC)',
        transferDepot: 'Kopargaon ST Depot Luggage Counter #2',
        windowMinutes: 18,
        timestamp: new Date().toISOString(),
      });

      // Update DB if real mission
      try {
        await DroneMission.findByIdAndUpdate(missionId, {
          status: 'delivered',
          'currentTelemetry.altitude': 0,
          'currentTelemetry.speed': 0,
          'currentTelemetry.batterySoc': currentSoc,
        });
      } catch (_) {}

      return;
    }

    const currentWp = waypoints[currentStep];
    const altitude = currentWp[2] || 75;
    const speed = (currentStep === 0 || currentStep === totalSteps - 1) ? 0 : 48; // km/h
    currentSoc = Math.max(25, Math.round(currentSoc - 0.7)); // Burn battery smoothly

    const telemetry = {
      missionId,
      droneCode: 'KPG-DRONE-01',
      coordinates: [currentWp[0], currentWp[1]], // [lng, lat]
      altitude,
      speed,
      batterySoc: currentSoc,
      step: currentStep + 1,
      totalSteps,
      etaSecondsRemaining: (totalSteps - currentStep) * 2,
      status: currentStep === 0 ? 'takeoff' : currentStep === totalSteps - 1 ? 'landing' : 'cruising',
      timestamp: new Date().toISOString(),
    };

    ioEngine.emit('drone:telemetry', telemetry);
    ioEngine.to(`drone:mission:${missionId}`).emit('drone:telemetry', telemetry);

    // Update DB telemetry
    try {
      await DroneMission.findByIdAndUpdate(missionId, {
        status: 'airborne',
        'currentTelemetry.coordinates': [currentWp[0], currentWp[1]],
        'currentTelemetry.altitude': altitude,
        'currentTelemetry.speed': speed,
        'currentTelemetry.batterySoc': currentSoc,
        'currentTelemetry.lastUpdated': new Date(),
      });
    } catch (_) {}

    currentStep++;
  }, 1000);

  activeSimulations.set(missionId, timer);
}

const emitDroneTelemetry = (missionId, telemetry) => {
  if (ioInstance) {
    ioInstance.emit('drone:telemetry', telemetry);
  }
};

const emitDroneStatus = (missionId, status, details) => {
  if (ioInstance) {
    ioInstance.emit('drone:mission_status', { missionId, status, details, timestamp: new Date().toISOString() });
  }
};

module.exports = {
  initDroneSockets,
  startFlightSimulation,
  emitDroneTelemetry,
  emitDroneStatus,
};
