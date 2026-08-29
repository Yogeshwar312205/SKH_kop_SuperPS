const Consignment = require('../models/Consignment');
const logger = require('../utils/logger');

/**
 * Impact Calculator Service
 * 
 * Calculates real-time metrics and KPIs for the Bus-Parcel system dashboard.
 * All calculations are based on actual consignment data from MongoDB.
 */

/**
 * Calculate cost savings compared to baseline (individual fleet hire)
 * 
 * Baseline assumption: ₹8/kg/km for dedicated fleet transport
 * Bus consolidation: ₹3/kg/km
 * Savings: ₹5/kg/km
 */
function calculateCostSavings(consignments) {
  let totalSavings = 0;
  let busConsignments = 0;
  
  for (const c of consignments) {
    if (c.assignment && c.assignment.network === 'bus') {
      // Simplified calculation - actual would use real distance
      const distanceKm = c.assignment.distanceKm || 20; // Default estimate
      const baselineCost = c.weightKg * distanceKm * 8; // ₹8/kg/km
      const actualCost = c.assignment.totalCost || (c.weightKg * distanceKm * 3);
      const saving = baselineCost - actualCost;
      
      totalSavings += saving;
      busConsignments++;
    }
  }
  
  return {
    totalSavings: Math.round(totalSavings),
    busConsignments,
    averageSavingsPerConsignment: busConsignments > 0 
      ? Math.round(totalSavings / busConsignments)
      : 0
  };
}

/**
 * Calculate vehicle-km avoided
 * 
 * Each consignment via bus avoids a dedicated fleet trip
 */
function calculateVehicleKmAvoided(consignments) {
  let totalKm = 0;
  let tripsAvoided = 0;
  
  for (const c of consignments) {
    if (c.assignment && c.assignment.network === 'bus') {
      const distanceKm = c.assignment.distanceKm || 20;
      totalKm += distanceKm;
      tripsAvoided++;
    }
  }
  
  return {
    totalKm: Math.round(totalKm),
    tripsAvoided
  };
}

/**
 * Calculate CO2 emissions avoided
 * 
 * Fleet truck: ~0.8 kg CO2/km
 * Bus (marginal): ~0.1 kg CO2/km per consignment (shared footprint)
 * Savings: ~0.7 kg CO2/km
 */
function calculateCO2Avoided(consignments) {
  let totalCO2Kg = 0;
  
  for (const c of consignments) {
    if (c.assignment && c.assignment.network === 'bus') {
      const distanceKm = c.assignment.distanceKm || 20;
      const co2Saved = distanceKm * 0.7; // 0.7 kg CO2/km saved
      totalCO2Kg += co2Saved;
    }
  }
  
  return {
    totalKg: Math.round(totalCO2Kg),
    totalTonnes: Math.round(totalCO2Kg / 1000 * 10) / 10
  };
}

/**
 * Calculate cargo utilization metrics
 */
function calculateUtilization(consignments) {
  const totalWeight = consignments.reduce((sum, c) => sum + (c.weightKg || 0), 0);
  
  const assignedWeight = consignments
    .filter(c => c.assignment && c.assignment.network === 'bus')
    .reduce((sum, c) => sum + (c.weightKg || 0), 0);
  
  const reroutedWeight = consignments
    .filter(c => c.status === 'rerouted_to_fleet')
    .reduce((sum, c) => sum + (c.weightKg || 0), 0);
  
  return {
    totalWeight: Math.round(totalWeight),
    assignedWeight: Math.round(assignedWeight),
    reroutedWeight: Math.round(reroutedWeight),
    utilizationPct: totalWeight > 0 
      ? Math.round((assignedWeight / totalWeight) * 100)
      : 0
  };
}

/**
 * Calculate consignment status breakdown
 */
function calculateStatusBreakdown(consignments) {
  const breakdown = {
    total: consignments.length,
    assigned: 0,
    in_transit: 0,
    delivered: 0,
    rerouted_to_fleet: 0,
    rejected: 0,
    cancelled: 0,
    pending: 0,
    other: 0
  };
  
  for (const c of consignments) {
    const status = c.status;
    if (breakdown.hasOwnProperty(status)) {
      breakdown[status]++;
    } else {
      breakdown.other++;
    }
  }
  
  return breakdown;
}

/**
 * Calculate commodity class breakdown
 */
function calculateClassBreakdown(consignments) {
  const breakdown = {
    A: 0, // Agricultural
    B: 0, // General parcels
    C: 0, // Institutional
    D: 0  // Hazardous/Non-bus-eligible
  };
  
  for (const c of consignments) {
    const cargoClass = c.cargoClass;
    if (breakdown.hasOwnProperty(cargoClass)) {
      breakdown[cargoClass]++;
    }
  }
  
  return breakdown;
}

/**
 * Calculate time-series data (daily trends)
 */
function calculateDailyTrends(consignments, days = 7) {
  const trends = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + 1);
    
    const dayConsignments = consignments.filter(c => {
      const createdDate = new Date(c.createdAt);
      return createdDate >= date && createdDate < nextDate;
    });
    
    const assigned = dayConsignments.filter(c => 
      c.assignment && c.assignment.network === 'bus'
    ).length;
    
    const rerouted = dayConsignments.filter(c => 
      c.status === 'rerouted_to_fleet'
    ).length;
    
    trends.push({
      date: date.toISOString().split('T')[0],
      total: dayConsignments.length,
      assigned,
      rerouted,
      assignmentRate: dayConsignments.length > 0
        ? Math.round((assigned / dayConsignments.length) * 100)
        : 0
    });
  }
  
  return trends;
}

/**
 * Get complete dashboard metrics
 * 
 * @param {Object} filters - { startDate, endDate, status, cargoClass }
 * @returns {Object} Complete metrics
 */
async function getDashboardMetrics(filters = {}) {
  try {
    const query = {};
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    
    // Status filter
    if (filters.status) {
      query.status = filters.status;
    }
    
    // Cargo class filter
    if (filters.cargoClass) {
      query.cargoClass = filters.cargoClass;
    }
    
    // Fetch consignments
    const consignments = await Consignment.find(query)
      .select('weightKg status cargoClass assignment createdAt commodityMetadata')
      .lean();
    
    // Calculate all metrics
    const costSavings = calculateCostSavings(consignments);
    const vehicleKm = calculateVehicleKmAvoided(consignments);
    const co2 = calculateCO2Avoided(consignments);
    const utilization = calculateUtilization(consignments);
    const statusBreakdown = calculateStatusBreakdown(consignments);
    const classBreakdown = calculateClassBreakdown(consignments);
    const dailyTrends = calculateDailyTrends(consignments, 7);
    
    // Calculate success rate
    const totalNonRejected = consignments.filter(c => 
      c.status !== 'rejected' && c.status !== 'cancelled'
    ).length;
    
    const successfullyAssigned = consignments.filter(c => 
      c.assignment && c.assignment.network === 'bus'
    ).length;
    
    const assignmentRate = totalNonRejected > 0
      ? Math.round((successfullyAssigned / totalNonRejected) * 100)
      : 0;
    
    return {
      summary: {
        totalConsignments: consignments.length,
        assignedToBus: successfullyAssigned,
        reroutedToFleet: statusBreakdown.rerouted_to_fleet,
        rejected: statusBreakdown.rejected,
        assignmentRate,
        totalWeightKg: utilization.totalWeight,
      },
      impact: {
        costSavings: costSavings.totalSavings,
        averageSavingsPerConsignment: costSavings.averageSavingsPerConsignment,
        vehicleKmAvoided: vehicleKm.totalKm,
        tripsAvoided: vehicleKm.tripsAvoided,
        co2AvoidedKg: co2.totalKg,
        co2AvoidedTonnes: co2.totalTonnes,
      },
      utilization: {
        totalWeightKg: utilization.totalWeight,
        assignedWeightKg: utilization.assignedWeight,
        reroutedWeightKg: utilization.reroutedWeight,
        utilizationPct: utilization.utilizationPct,
      },
      breakdown: {
        byStatus: statusBreakdown,
        byClass: classBreakdown,
      },
      trends: {
        daily: dailyTrends,
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        filters,
        dataSource: 'mongodb'
      }
    };
    
  } catch (error) {
    logger.error(`Dashboard metrics calculation failed: ${error.message}`);
    throw error;
  }
}

/**
 * Get quick stats (for homepage widget)
 */
async function getQuickStats() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const [totalCount, todayCount, busCount, fleetCount] = await Promise.all([
      Consignment.countDocuments({}),
      Consignment.countDocuments({ createdAt: { $gte: today } }),
      Consignment.countDocuments({ 'assignment.network': 'bus' }),
      Consignment.countDocuments({ status: 'rerouted_to_fleet' })
    ]);
    
    return {
      totalConsignments: totalCount,
      todayConsignments: todayCount,
      busConsignments: busCount,
      fleetConsignments: fleetCount,
      busUtilizationPct: totalCount > 0 
        ? Math.round((busCount / totalCount) * 100)
        : 0
    };
  } catch (error) {
    logger.error(`Quick stats calculation failed: ${error.message}`);
    return {
      totalConsignments: 0,
      todayConsignments: 0,
      busConsignments: 0,
      fleetConsignments: 0,
      busUtilizationPct: 0
    };
  }
}

module.exports = {
  getDashboardMetrics,
  getQuickStats,
  calculateCostSavings,
  calculateVehicleKmAvoided,
  calculateCO2Avoided,
  calculateUtilization,
  calculateStatusBreakdown,
  calculateClassBreakdown,
  calculateDailyTrends
};
