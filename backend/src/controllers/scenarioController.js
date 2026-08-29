const ScenarioEvent = require('../models/ScenarioEvent');
const logger = require('../utils/logger');

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// POST /api/v2/scenario/apply
const applyScenario = async (req, res) => {
  try {
    const { type, targetId, params } = req.body || {};

    if (!type) {
      return res.status(400).json({ success: false, message: 'type is required.' });
    }

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        scenario: {
          id: 'scenario-' + Date.now(),
          type,
          targetId: targetId || '',
          params: params || {},
          active: true,
        },
        changes: [
          { entity: 'trip', id: 'trip-001', change: 'cancelled' },
          { entity: 'consignment', id: 'cons-005', change: 'rerouted to trip-002' },
        ],
        metrics: {
          affectedTrips: 1,
          affectedConsignments: 3,
          reroutedToFleet: 1,
        },
      });
    }

    const scenario = await ScenarioEvent.create({ type, targetId, params, active: true });

    // TODO: P1/P2 implement actual scenario application (re-optimize, emit socket events)

    return res.status(201).json({
      success: true,
      source: 'stub',
      message: 'Scenario applied. Awaiting P1/P2 implementation for re-optimization.',
      scenario: {
        id: String(scenario._id),
        type: scenario.type,
        targetId: scenario.targetId,
        params: scenario.params,
        active: scenario.active,
      },
    });
  } catch (error) {
    logger.error(`Apply scenario failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not apply scenario.' });
  }
};

// POST /api/v2/scenario/reset
const resetScenarios = async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        message: 'All scenarios reset (mock mode).',
      });
    }

    await ScenarioEvent.updateMany({ active: true }, { active: false });

    return res.json({
      success: true,
      source: 'database',
      message: 'All active scenarios deactivated.',
    });
  } catch (error) {
    logger.error(`Reset scenarios failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not reset scenarios.' });
  }
};

// GET /api/v2/scenario/active
const getActiveScenarios = async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        count: 0,
        scenarios: [],
      });
    }

    const scenarios = await ScenarioEvent.find({ active: true }).sort({ appliedAt: -1 });

    return res.json({
      success: true,
      source: 'database',
      count: scenarios.length,
      scenarios: scenarios.map((s) => ({
        id: String(s._id),
        type: s.type,
        targetId: s.targetId,
        params: s.params,
        appliedAt: s.appliedAt,
      })),
    });
  } catch (error) {
    logger.error(`Get active scenarios failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load scenarios.' });
  }
};

module.exports = { applyScenario, resetScenarios, getActiveScenarios };
