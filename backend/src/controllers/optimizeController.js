const OptimizationRun = require('../models/OptimizationRun');
const logger = require('../utils/logger');

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// POST /api/v2/optimize/run
const runOptimization = async (req, res) => {
  try {
    const { mode, serviceDate } = req.body || {};

    if (!mode || !serviceDate) {
      return res.status(400).json({ success: false, message: 'mode and serviceDate are required.' });
    }

    if (MOCK_MODE) {
      const mockMetrics = mode === 'baseline'
        ? {
            costPerQuintalKm: 4.2,
            totalVehicleKm: 2450,
            meanTransitMin: 185,
            spareCapacityUtilPct: 0,
            parcelRevenue: 0,
            busAssignedCount: 0,
            fleetReroutedCount: 45,
            unassignedCount: 2,
            co2Kg: 588,
          }
        : {
            costPerQuintalKm: 2.8,
            totalVehicleKm: 2455,
            meanTransitMin: 142,
            spareCapacityUtilPct: 67,
            parcelRevenue: 18500,
            busAssignedCount: 32,
            fleetReroutedCount: 13,
            unassignedCount: 0,
            co2Kg: 425,
          };

      return res.json({
        success: true,
        source: 'mock',
        run: {
          runId: `${mode}-${serviceDate}-${Date.now()}`,
          mode,
          serviceDate,
          metrics: mockMetrics,
          createdAt: new Date().toISOString(),
        },
      });
    }

    // TODO: P2/P3 implement actual optimization run (calls solver, records metrics)

    return res.json({
      success: true,
      source: 'stub',
      message: 'Optimization run endpoint ready. Awaiting P2/P3 implementation.',
    });
  } catch (error) {
    logger.error(`Run optimization failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not run optimization.' });
  }
};

// GET /api/v2/optimize/compare?date=YYYY-MM-DD
const compareRuns = async (req, res) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'date query parameter required.' });
    }

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        baseline: {
          runId: `baseline-${date}`,
          metrics: {
            costPerQuintalKm: 4.2,
            totalVehicleKm: 2450,
            meanTransitMin: 185,
            busAssignedCount: 0,
          },
        },
        optimized: {
          runId: `optimized-${date}`,
          metrics: {
            costPerQuintalKm: 2.8,
            totalVehicleKm: 2455,
            meanTransitMin: 142,
            busAssignedCount: 32,
          },
        },
        delta: {
          costPerQuintalKm: -1.4,
          totalVehicleKm: +5,
          meanTransitMin: -43,
          busAssignedCount: +32,
        },
      });
    }

    const [baseline, optimized] = await Promise.all([
      OptimizationRun.findOne({ mode: 'baseline', serviceDate: date }).sort({ createdAt: -1 }),
      OptimizationRun.findOne({ mode: 'optimized', serviceDate: date }).sort({ createdAt: -1 }),
    ]);

    if (!baseline || !optimized) {
      return res.status(404).json({ success: false, message: 'No optimization runs found for this date.' });
    }

    const delta = {};
    Object.keys(baseline.metrics).forEach((key) => {
      delta[key] = optimized.metrics[key] - baseline.metrics[key];
    });

    return res.json({
      success: true,
      source: 'database',
      baseline: { runId: baseline.runId, metrics: baseline.metrics },
      optimized: { runId: optimized.runId, metrics: optimized.metrics },
      delta,
    });
  } catch (error) {
    logger.error(`Compare runs failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not compare optimization runs.' });
  }
};

module.exports = { runOptimization, compareRuns };
