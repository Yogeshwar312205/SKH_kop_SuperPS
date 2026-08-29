const logger = require('../utils/logger');

/**
 * Socket.io /v2 namespace for bus-parcel system real-time events.
 *
 * Following the same pattern as trackingSocket.js but for the bus network.
 * Events listed in §8.3.
 */

let v2Namespace = null;

const initBusSockets = (io) => {
  v2Namespace = io.of('/v2');

  v2Namespace.on('connection', (socket) => {
    logger.info(`Client connected to /v2 namespace: ${socket.id}`);

    socket.on('disconnect', () => {
      logger.info(`Client disconnected from /v2 namespace: ${socket.id}`);
    });

    // Clients can join specific rooms for targeted broadcasts
    socket.on('join:consignment', (consignmentId) => {
      socket.join(`consignment:${consignmentId}`);
      logger.debug(`Socket ${socket.id} joined consignment:${consignmentId}`);
    });

    socket.on('join:trip', (tripId) => {
      socket.join(`trip:${tripId}`);
      logger.debug(`Socket ${socket.id} joined trip:${tripId}`);
    });

    socket.on('join:route', (routeCode) => {
      socket.join(`route:${routeCode}`);
      logger.debug(`Socket ${socket.id} joined route:${routeCode}`);
    });
  });

  logger.info('✓ Bus-parcel Socket.io /v2 namespace initialized');
  return v2Namespace;
};

/**
 * Emitter helpers — called by controllers to broadcast events.
 * Following the same pattern as the existing trackingSocket.js bus emitters.
 */

// trip:updated — when a trip status changes (§8.3)
const emitTripUpdated = (tripId, update) => {
  if (!v2Namespace) {
    logger.warn('Cannot emit trip:updated — /v2 namespace not initialized');
    return;
  }

  const payload = {
    tripId,
    status: update.status,
    delayMin: update.delayMin || 0,
    cargoUsedKg: update.cargoUsedKg,
    timestamp: new Date().toISOString(),
  };

  // Broadcast to everyone watching this trip, plus global listeners
  v2Namespace.to(`trip:${tripId}`).emit('trip:updated', payload);
  v2Namespace.emit('trip:updated', payload); // Global broadcast

  logger.debug(`Emitted trip:updated for ${tripId}`);
};

// consignment:reassigned — when a consignment moves to a different trip (§8.3)
const emitConsignmentReassigned = (consignmentId, from, to, reason) => {
  if (!v2Namespace) {
    logger.warn('Cannot emit consignment:reassigned — /v2 namespace not initialized');
    return;
  }

  const payload = {
    consignmentId,
    from: from || null,
    to: to || null,
    reason: reason || 'Re-optimization',
    timestamp: new Date().toISOString(),
  };

  v2Namespace.to(`consignment:${consignmentId}`).emit('consignment:reassigned', payload);
  v2Namespace.emit('consignment:reassigned', payload);

  logger.info(`Emitted consignment:reassigned: ${consignmentId} from ${from} to ${to}`);
};

// consignment:rerouted — when a consignment is kicked to fleet network (§8.3)
const emitConsignmentRerouted = (consignmentId, toNetwork, failedRule) => {
  if (!v2Namespace) {
    logger.warn('Cannot emit consignment:rerouted — /v2 namespace not initialized');
    return;
  }

  const payload = {
    consignmentId,
    toNetwork: toNetwork || 'fleet',
    failedRule: failedRule || null,
    reason: failedRule ? `Failed rule ${failedRule}` : 'Capacity or eligibility constraint',
    timestamp: new Date().toISOString(),
  };

  v2Namespace.to(`consignment:${consignmentId}`).emit('consignment:rerouted', payload);
  v2Namespace.emit('consignment:rerouted', payload);

  logger.info(`Emitted consignment:rerouted: ${consignmentId} to ${toNetwork}, rule ${failedRule}`);
};

// environment:changed — when weather or traffic state updates (§8.3)
const emitEnvironmentChanged = (update) => {
  if (!v2Namespace) {
    logger.warn('Cannot emit environment:changed — /v2 namespace not initialized');
    return;
  }

  const payload = {
    rainProbPct: update.rainProbPct,
    congestionLevel: update.congestionLevel,
    affectedEdges: update.affectedEdges || [],
    timestamp: new Date().toISOString(),
  };

  v2Namespace.emit('environment:changed', payload);

  logger.info(`Emitted environment:changed: rain=${payload.rainProbPct}%, congestion=${payload.congestionLevel}`);
};

// scenario:applied — when a scenario disruption is triggered (§8.3)
const emitScenarioApplied = (scenarioId, affectedTrips, affectedConsignments) => {
  if (!v2Namespace) {
    logger.warn('Cannot emit scenario:applied — /v2 namespace not initialized');
    return;
  }

  const payload = {
    scenarioId,
    affectedTrips: affectedTrips || [],
    affectedConsignments: affectedConsignments || [],
    timestamp: new Date().toISOString(),
  };

  v2Namespace.emit('scenario:applied', payload);

  logger.info(`Emitted scenario:applied: ${scenarioId}, ${affectedTrips.length} trips, ${affectedConsignments.length} consignments`);
};

// optimize:progress — progress updates during optimization run (§8.3)
const emitOptimizeProgress = (runId, pct, stage) => {
  if (!v2Namespace) {
    logger.warn('Cannot emit optimize:progress — /v2 namespace not initialized');
    return;
  }

  const payload = {
    runId,
    pct: Math.round(pct),
    stage: stage || 'running',
    timestamp: new Date().toISOString(),
  };

  v2Namespace.emit('optimize:progress', payload);

  logger.debug(`Emitted optimize:progress: ${runId} at ${pct}% (${stage})`);
};

module.exports = {
  initBusSockets,
  emitTripUpdated,
  emitConsignmentReassigned,
  emitConsignmentRerouted,
  emitEnvironmentChanged,
  emitScenarioApplied,
  emitOptimizeProgress,
};
