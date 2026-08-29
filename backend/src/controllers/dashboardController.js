const impactCalculator = require('../services/impactCalculator');
const logger = require('../utils/logger');

const MOCK_MODE = process.env.MOCK_MODE === 'true';

/**
 * GET /api/v2/dashboard/metrics
 * 
 * Get comprehensive dashboard metrics with optional filters
 */
const getMetrics = async (req, res) => {
  try {
    const { startDate, endDate, status, cargoClass } = req.query;

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        summary: {
          totalConsignments: 156,
          assignedToBus: 124,
          reroutedToFleet: 28,
          rejected: 4,
          assignmentRate: 81,
          totalWeightKg: 5420,
        },
        impact: {
          costSavings: 89600,
          averageSavingsPerConsignment: 723,
          vehicleKmAvoided: 2480,
          tripsAvoided: 124,
          co2AvoidedKg: 1736,
          co2AvoidedTonnes: 1.7,
        },
        utilization: {
          totalWeightKg: 5420,
          assignedWeightKg: 4310,
          reroutedWeightKg: 1110,
          utilizationPct: 79,
        },
        breakdown: {
          byStatus: {
            total: 156,
            assigned: 85,
            in_transit: 28,
            delivered: 11,
            rerouted_to_fleet: 28,
            rejected: 4,
            cancelled: 0,
            pending: 0,
            other: 0
          },
          byClass: {
            A: 98,
            B: 42,
            C: 12,
            D: 4
          }
        },
        trends: {
          daily: [
            { date: '2026-08-23', total: 18, assigned: 15, rerouted: 3, assignmentRate: 83 },
            { date: '2026-08-24', total: 22, assigned: 18, rerouted: 4, assignmentRate: 82 },
            { date: '2026-08-25', total: 20, assigned: 16, rerouted: 4, assignmentRate: 80 },
            { date: '2026-08-26', total: 25, assigned: 20, rerouted: 5, assignmentRate: 80 },
            { date: '2026-08-27', total: 24, assigned: 19, rerouted: 5, assignmentRate: 79 },
            { date: '2026-08-28', total: 26, assigned: 21, rerouted: 4, assignmentRate: 81 },
            { date: '2026-08-29', total: 21, assigned: 15, rerouted: 3, assignmentRate: 83 }
          ]
        },
        metadata: {
          calculatedAt: new Date().toISOString(),
          dataSource: 'mock'
        }
      });
    }

    const filters = {};
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (status) filters.status = status;
    if (cargoClass) filters.cargoClass = cargoClass;

    const metrics = await impactCalculator.getDashboardMetrics(filters);

    return res.json({
      success: true,
      source: 'database',
      ...metrics
    });
  } catch (error) {
    logger.error(`Get dashboard metrics failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to calculate dashboard metrics'
    });
  }
};

/**
 * GET /api/v2/dashboard/stats
 * 
 * Get quick stats for homepage widget
 */
const getStats = async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        stats: {
          totalConsignments: 156,
          todayConsignments: 21,
          busConsignments: 124,
          fleetConsignments: 28,
          busUtilizationPct: 79
        }
      });
    }

    const stats = await impactCalculator.getQuickStats();

    return res.json({
      success: true,
      source: 'database',
      stats
    });
  } catch (error) {
    logger.error(`Get quick stats failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get quick stats'
    });
  }
};

module.exports = {
  getMetrics,
  getStats
};
