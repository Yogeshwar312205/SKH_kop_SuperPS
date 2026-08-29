/**
 * API v2 Client (§8.2, §8.9) — Typed functions for every /api/v2 endpoint.
 *
 * Follows existing api.js pattern: uses apiClient from services/api.js,
 * handles errors with toApiError, returns structured responses.
 */

import { apiClient } from './api';

const toApiError = (err, fallbackMessage) => {
  if (err.response) {
    return new Error(err.response.data?.message || fallbackMessage);
  }
  if (err.code === 'ECONNABORTED') {
    return new Error('The server took too long to respond. Please try again.');
  }
  return new Error('Cannot reach the KrishiFlow server. Check your connection.');
};

// ==============================================================================
// Bus network
// ==============================================================================

/**
 * Get all bus stops.
 * GET /api/v2/bus/stops
 */
export const getBusStops = async () => {
  try {
    const { data } = await apiClient.get('/v2/bus/stops');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load bus stops.');
  }
};

/**
 * Get all bus routes.
 * GET /api/v2/bus/routes
 */
export const getBusRoutes = async () => {
  try {
    const { data } = await apiClient.get('/v2/bus/routes');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load bus routes.');
  }
};

/**
 * Create a new bus route.
 * POST /api/v2/bus/routes
 */
export const createBusRoute = async (routeData) => {
  try {
    const { data } = await apiClient.post('/v2/bus/routes', routeData);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not create bus route.');
  }
};

/**
 * Get bus trips for a date and/or route.
 * GET /api/v2/bus/trips?date=YYYY-MM-DD&routeId=xxx
 */
export const getBusTrips = async (filters = {}) => {
  try {
    const { data } = await apiClient.get('/v2/bus/trips', { params: filters });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load bus trips.');
  }
};

/**
 * Schedule a new bus trip.
 * POST /api/v2/bus/trips
 */
export const createBusTrip = async (tripData) => {
  try {
    const { data } = await apiClient.post('/v2/bus/trips', tripData);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not schedule bus trip.');
  }
};

/**
 * Get TomTom traffic flow and optimal route details.
 * GET /api/v2/bus/traffic
 */
export const getTomTomTraffic = async (params = {}) => {
  try {
    const { data } = await apiClient.get('/v2/bus/traffic', { params });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load TomTom traffic data.');
  }
};

/**
 * Get trip manifest (loading list for depot clerk).
 * GET /api/v2/bus/trips/:id/manifest
 */
export const getTripManifest = async (tripId) => {
  try {
    const { data } = await apiClient.get(`/v2/bus/trips/${tripId}/manifest`);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load trip manifest.');
  }
};

// ==============================================================================
// Consignments (parallel to /api/requests)
// ==============================================================================

/**
 * Create a consignment (triggers eligibility + assignment).
 * POST /api/v2/consignments
 */
export const createConsignment = async (consignment) => {
  try {
    const { data } = await apiClient.post('/v2/consignments', consignment);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not create consignment.');
  }
};

/**
 * Get consignments with optional filters.
 * GET /api/v2/consignments?status=&class=
 */
export const getConsignments = async (filters = {}) => {
  try {
    const { data } = await apiClient.get('/v2/consignments', { params: filters });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load consignments.');
  }
};

/**
 * Get a single consignment with assignment details.
 * GET /api/v2/consignments/:id
 */
export const getConsignment = async (consignmentId) => {
  try {
    const { data } = await apiClient.get(`/v2/consignments/${consignmentId}`);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load consignment.');
  }
};

/**
 * Get decision trace (the explainability layer, §6.2).
 * GET /api/v2/consignments/:id/explain
 */
export const explainConsignment = async (consignmentId) => {
  try {
    const { data } = await apiClient.get(`/v2/consignments/${consignmentId}/explain`);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load decision trace.');
  }
};

/**
 * Get consignment tracking timeline.
 * GET /api/v2/consignments/:id/tracking
 */
export const getConsignmentTracking = async (consignmentId) => {
  try {
    const { data } = await apiClient.get(`/v2/consignments/${consignmentId}/tracking`);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load tracking information.');
  }
};

// ==============================================================================
// Commodity classification
// ==============================================================================

/**
 * Classify a commodity and get bus eligibility.
 * POST /api/v2/commodity/classify
 */
export const classifyCommodity = async (commodity, packagingType, weightKg, pieceCount) => {
  try {
    const { data } = await apiClient.post('/v2/commodity/classify', {
      commodity,
      packagingType,
      weightKg,
      pieceCount
    });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not classify commodity.');
  }
};

/**
 * Get available packaging types.
 * GET /api/v2/commodity/packaging-types
 */
export const getPackagingTypes = async () => {
  try {
    const { data } = await apiClient.get('/v2/commodity/packaging-types');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load packaging types.');
  }
};

// ==============================================================================
// Dashboard metrics
// ==============================================================================

/**
 * Get dashboard metrics with optional filters.
 * GET /api/v2/dashboard/metrics?startDate=&endDate=&status=&cargoClass=
 */
export const getDashboardMetrics = async (filters = {}) => {
  try {
    const { data } = await apiClient.get('/v2/dashboard/metrics', { params: filters });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load dashboard metrics.');
  }
};

/**
 * Get quick stats for homepage.
 * GET /api/v2/dashboard/stats
 */
export const getQuickStats = async () => {
  try {
    const { data } = await apiClient.get('/v2/dashboard/stats');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load quick stats.');
  }
};

// ==============================================================================
// Route preview
// ==============================================================================

/**
 * Get route preview with available trips.
 * GET /api/v2/bus/route-preview?originStopId=&destStopId=&date=&requiredCapacityKg=
 */
export const getRoutePreview = async (originStopId, destStopId, date, requiredCapacityKg) => {
  try {
    const { data } = await apiClient.get('/v2/bus/route-preview', {
      params: { originStopId, destStopId, date, requiredCapacityKg }
    });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load route preview.');
  }
};

/**
 * Evaluate a consignment against trips (for manual testing).
 * POST /api/v2/rules/evaluate
 */
export const evaluateRules = async (payload) => {
  try {
    const { data } = await apiClient.post('/v2/rules/evaluate', payload);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not evaluate rules.');
  }
};

/**
 * Get the rulebook (read-only, for depot manager UI).
 * GET /api/v2/rules/book
 */
export const getRulebook = async () => {
  try {
    const { data } = await apiClient.get('/v2/rules/book');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load rulebook.');
  }
};

// ==============================================================================
// Environment (weather + traffic)
// ==============================================================================

/**
 * Get current environment state.
 * GET /api/v2/environment/current
 */
export const getEnvironment = async () => {
  try {
    const { data } = await apiClient.get('/v2/environment/current');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load environment state.');
  }
};

/**
 * Override environment for demo (manual sliders).
 * POST /api/v2/environment/override
 */
export const overrideEnvironment = async (overrides) => {
  try {
    const { data } = await apiClient.post('/v2/environment/override', overrides);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not override environment.');
  }
};

/**
 * Get active providers (simulated vs live).
 * GET /api/v2/environment/providers
 */
export const getProviders = async () => {
  try {
    const { data } = await apiClient.get('/v2/environment/providers');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load providers.');
  }
};

/**
 * Switch provider (simulated ⇄ TomTom).
 * POST /api/v2/environment/providers
 */
export const setProviders = async (providers) => {
  try {
    const { data } = await apiClient.post('/v2/environment/providers', providers);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not switch providers.');
  }
};

// ==============================================================================
// Optimization
// ==============================================================================

/**
 * Run an optimization (baseline or optimized mode).
 * POST /api/v2/optimize/run
 */
export const runOptimization = async (params) => {
  try {
    const { data } = await apiClient.post('/v2/optimize/run', params);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not run optimization.');
  }
};

/**
 * Compare baseline vs optimized runs.
 * GET /api/v2/optimize/compare?date=YYYY-MM-DD
 */
export const compareRuns = async (date) => {
  try {
    const { data } = await apiClient.get('/v2/optimize/compare', { params: { date } });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not compare optimization runs.');
  }
};

// ==============================================================================
// Scenarios (adaptation demos, §10.7)
// ==============================================================================

/**
 * Apply a scenario disruption.
 * POST /api/v2/scenario/apply
 */
export const applyScenario = async (scenario) => {
  try {
    const { data } = await apiClient.post('/v2/scenario/apply', scenario);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not apply scenario.');
  }
};

/**
 * Reset all active scenarios.
 * POST /api/v2/scenario/reset
 */
export const resetScenarios = async () => {
  try {
    const { data } = await apiClient.post('/v2/scenario/reset');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not reset scenarios.');
  }
};

/**
 * Get active scenarios.
 * GET /api/v2/scenario/active
 */
export const getActiveScenarios = async () => {
  try {
    const { data } = await apiClient.get('/v2/scenario/active');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load active scenarios.');
  }
};

// ==============================================================================
// EV charging
// ==============================================================================

/**
 * Get EV charging candidates with scores.
 * GET /api/v2/ev/candidates
 */
export const getCandidates = async () => {
  try {
    const { data } = await apiClient.get('/v2/ev/candidates');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load EV candidates.');
  }
};

/**
 * Optimize EV siting (select top k).
 * POST /api/v2/ev/optimize
 */
export const optimizeEVSiting = async (params) => {
  try {
    const { data } = await apiClient.post('/v2/ev/optimize', params);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not optimize EV siting.');
  }
};

/**
 * Optimize EV Pickup Route with Charging Station insertion.
 * POST /api/v2/ev/route-optimize
 */
export const optimizeEVRoute = async (evParams) => {
  try {
    const { data } = await apiClient.post('/v2/ev/route-optimize', evParams);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not calculate EV route optimization.');
  }
};

// ==============================================================================
// Drone network (§KrishiFly)
// ==============================================================================

export const getDroneHubs = async () => {
  try {
    const { data } = await apiClient.get('/v2/drone/hubs');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load drone hubs.');
  }
};

export const getDroneFleet = async () => {
  try {
    const { data } = await apiClient.get('/v2/drone/fleet');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load drone fleet.');
  }
};

export const estimateDroneMission = async (estimateParams) => {
  try {
    const { data } = await apiClient.post('/v2/drone/estimate', estimateParams);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not estimate drone mission.');
  }
};

export const dispatchDroneMission = async (dispatchParams) => {
  try {
    const { data } = await apiClient.post('/v2/drone/dispatch', dispatchParams);
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not dispatch drone mission.');
  }
};

export const simulateDroneMission = async (missionId, waypoints) => {
  try {
    const { data } = await apiClient.post(`/v2/drone/simulate/${missionId}`, { waypoints });
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not start flight simulation.');
  }
};

export const getDroneAnalytics = async () => {
  try {
    const { data } = await apiClient.get('/v2/drone/analytics');
    return data;
  } catch (err) {
    throw toApiError(err, 'Could not load drone analytics.');
  }
};

// ==============================================================================
// Export all
// ==============================================================================

export default {
  // Bus network
  getBusStops,
  getBusRoutes,
  createBusRoute,
  getBusTrips,
  createBusTrip,
  getTripManifest,
  getRoutePreview,
  getTomTomTraffic,
  
  // Consignments
  createConsignment,
  getConsignments,
  getConsignment,
  getConsignmentTracking,
  explainConsignment,
  
  // Commodity
  classifyCommodity,
  getPackagingTypes,
  
  // Dashboard
  getDashboardMetrics,
  getQuickStats,
  
  // Rules
  evaluateRules,
  getRulebook,
  
  // Environment
  getEnvironment,
  overrideEnvironment,
  getProviders,
  setProviders,
  
  // Optimization
  runOptimization,
  compareRuns,
  
  // Scenarios
  applyScenario,
  resetScenarios,
  getActiveScenarios,
  
  // EV
  getCandidates,
  optimizeEVSiting,
  optimizeEVRoute,

  // Drone (§KrishiFly)
  getDroneHubs,
  getDroneFleet,
  estimateDroneMission,
  dispatchDroneMission,
  simulateDroneMission,
  getDroneAnalytics,
};
