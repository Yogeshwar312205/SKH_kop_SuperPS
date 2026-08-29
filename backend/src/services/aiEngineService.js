/**
 * AI Engine Service — Wrapper for calling FastAPI endpoints.
 *
 * This connects the Node.js backend to the Python AI engine for:
 * - Rule evaluation (cargo eligibility)
 * - Solver (assignment + repair)
 * - Weather forecasts
 * - Capacity prediction
 */

const axios = require('axios');
const logger = require('../utils/logger');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';
const AI_ENGINE_TIMEOUT = 15000; // 15s timeout for solver operations

/**
 * Check if AI Engine (FastAPI) is healthy.
 *
 * @returns {Promise<Object>} { status: 'online' | 'offline', details }
 */
async function checkAiEngineHealth() {
  try {
    const { data } = await axios.get(`${AI_ENGINE_URL}/health`, {
      timeout: 5000,
    });
    
    return {
      status: 'online',
      ...data,
    };
  } catch (err) {
    logger.warn('AI Engine health check failed:', err.message);
    return {
      status: 'offline',
      error: err.message,
    };
  }
}

/**
 * Evaluate consignment against candidate trips using rule engine.
 *
 * @param {Object} consignment - Consignment data
 * @param {Array} trips - Candidate trips
 * @param {Object} environment - Weather + traffic state
 * @returns {Promise<Object>} RuleDecision with trace + summary
 */
async function evaluateRules(consignment, trips, environment) {
  try {
    const { data } = await axios.post(
      `${AI_ENGINE_URL}/rules/evaluate`,
      {
        consignment,
        trips,
        environment,
      },
      { timeout: AI_ENGINE_TIMEOUT }
    );
    
    return data;
  } catch (err) {
    logger.error('Rule evaluation error:', err.message);
    throw new Error(`Rule evaluation failed: ${err.message}`);
  }
}

/**
 * Assign consignments to trips using solver.
 *
 * @param {Array} trips - Available trips
 * @param {Array} consignments - Pending consignments
 * @param {Object} environment - Weather + traffic state
 * @param {Object} [costParams] - Optional cost parameters
 * @returns {Promise<Object>} { assignments, reroutedToFleet, unassigned, metrics }
 */
async function assignConsignments(trips, consignments, environment, costParams = null) {
  try {
    const { data } = await axios.post(
      `${AI_ENGINE_URL}/solve/assign`,
      {
        trips,
        consignments,
        environment,
        costParams,
      },
      { timeout: AI_ENGINE_TIMEOUT }
    );
    
    return data;
  } catch (err) {
    logger.error('Solver assign error:', err.message);
    throw new Error(`Solver assignment failed: ${err.message}`);
  }
}

/**
 * Repair assignments after disruption.
 *
 * @param {Array} currentAssignments - Existing assignments
 * @param {Object} disruption - { type, targetId, params }
 * @param {Array} trips - Updated trips (post-disruption)
 * @param {Object} environment - Current environment
 * @returns {Promise<Object>} { changes, stillFeasible, failed }
 */
async function repairAssignments(currentAssignments, disruption, trips, environment) {
  try {
    const { data } = await axios.post(
      `${AI_ENGINE_URL}/solve/repair`,
      {
        currentAssignments,
        disruption,
        trips,
        environment,
      },
      { timeout: AI_ENGINE_TIMEOUT }
    );
    
    return data;
  } catch (err) {
    logger.error('Solver repair error:', err.message);
    throw new Error(`Solver repair failed: ${err.message}`);
  }
}

/**
 * Get rulebook (for read-only UI display).
 *
 * @returns {Promise<Object>} Parsed rulebook.yaml
 */
async function getRulebook() {
  try {
    const { data } = await axios.get(`${AI_ENGINE_URL}/rules/book`, {
      timeout: 5000,
    });
    
    return data;
  } catch (err) {
    logger.error('Rulebook fetch error:', err.message);
    throw new Error(`Rulebook fetch failed: ${err.message}`);
  }
}

/**
 * Reload rulebook (hot-reload for depot manager edits).
 *
 * @returns {Promise<Object>} { ok, message }
 */
async function reloadRulebook() {
  try {
    const { data } = await axios.post(`${AI_ENGINE_URL}/rules/reload`, {}, {
      timeout: 5000,
    });
    
    return data;
  } catch (err) {
    logger.error('Rulebook reload error:', err.message);
    throw new Error(`Rulebook reload failed: ${err.message}`);
  }
}

/**
 * Predict spare capacity for multiple trips.
 *
 * @param {Array} trips - Trips to predict
 * @returns {Promise<Object>} { predictions: [...] }
 */
async function predictSpareCapacity(trips) {
  try {
    const { data } = await axios.post(
      `${AI_ENGINE_URL}/forecast/spare-capacity-batch`,
      { trips },
      { timeout: 8000 }
    );
    
    return data;
  } catch (err) {
    logger.error('Capacity prediction error:', err.message);
    throw new Error(`Capacity prediction failed: ${err.message}`);
  }
}

/**
 * Get route statistics (passenger load patterns).
 *
 * @param {string} routeCode - Route code (e.g., 'R-SHIRDI')
 * @returns {Promise<Object>} { routeCode, avgPassengerLoadPct, peakHours, ... }
 */
async function getRouteStats(routeCode) {
  try {
    const { data } = await axios.get(
      `${AI_ENGINE_URL}/forecast/route-stats/${routeCode}`,
      { timeout: 5000 }
    );
    
    return data;
  } catch (err) {
    logger.error('Route stats error:', err.message);
    throw new Error(`Route stats failed: ${err.message}`);
  }
}

/**
 * Optimize EV charging siting.
 *
 * @param {Array} candidates - Charging candidates
 * @param {Object} tripDensity - Trip density data
 * @param {Object} dwellData - Dwell time data
 * @param {number} k - Number of sites to select
 * @returns {Promise<Object>} { selected, coverageBefore, coverageAfter, ... }
 */
async function optimizeEVSiting(candidates, tripDensity, dwellData, k) {
  try {
    const { data } = await axios.post(
      `${AI_ENGINE_URL}/ev-siting/optimize`,
      {
        candidates,
        tripDensity,
        dwellData,
        k,
      },
      { timeout: 10000 }
    );
    
    return data;
  } catch (err) {
    logger.error('EV siting optimization error:', err.message);
    throw new Error(`EV siting optimization failed: ${err.message}`);
  }
}

/**
 * Get SHAP explainability for a model prediction.
 *
 * @param {string} modelName - 'price' | 'capacity'
 * @param {Object} features - Feature values
 * @returns {Promise<Object>} { baseValue, contributions, ... }
 */
async function explainWithSHAP(modelName, features) {
  try {
    const { data } = await axios.post(
      `${AI_ENGINE_URL}/explain/shap`,
      {
        modelName,
        features,
      },
      { timeout: 10000 }
    );
    
    return data;
  } catch (err) {
    logger.error('SHAP explainability error:', err.message);
    throw new Error(`SHAP explainability failed: ${err.message}`);
  }
}

module.exports = {
  checkAiEngineHealth,
  evaluateRules,
  assignConsignments,
  repairAssignments,
  getRulebook,
  reloadRulebook,
  predictSpareCapacity,
  getRouteStats,
  optimizeEVSiting,
  explainWithSHAP,
};
