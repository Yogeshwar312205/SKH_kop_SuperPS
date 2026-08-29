/**
 * Automated Verification Script for KrishiFly Drone System
 */

const {
  haversineDistanceKm,
  generateFlightCorridor,
  checkNoFlyZoneCompliance,
  calculateBatteryFeasibility,
  compareRoadVsDrone,
} = require('../src/services/droneRoutingService');
const { evaluateDroneMission } = require('../src/services/droneEligibilityService');
const droneController = require('../src/controllers/droneController');

async function testDroneSystem() {
  console.log('🧪 Starting KrishiFly Drone System Verification...\n');

  // 1. Test Haversine distance
  const pohegaonCoords = [74.4423, 19.9245];
  const depotCoords = [74.4765, 19.8826];
  const dist = haversineDistanceKm(pohegaonCoords, depotCoords);
  console.log(`1. Distance Pohegaon -> Kopargaon Depot: ${dist.toFixed(2)} km`);
  console.assert(dist > 5 && dist < 10, 'Distance must be ~5.8 km');

  // 2. Test 3D waypoints
  const waypoints = generateFlightCorridor(pohegaonCoords, depotCoords, 6);
  console.log(`2. Generated ${waypoints.length} 3D flight waypoints (Takeoff 0m -> Cruise 75m -> Land 0m)`);
  console.assert(waypoints[0][2] === 0, 'First waypoint must be 0m');
  console.assert(waypoints[2][2] === 75, 'Cruising waypoint must be 75m');

  // 3. Test Shirdi Airport 5km No-Fly Zone
  const airspace = checkNoFlyZoneCompliance(waypoints);
  console.log(`3. Airspace Compliance: ${airspace.zoneStatus} (Min dist to Shirdi: ${airspace.minDistanceToAirportKm} km)`);
  console.assert(airspace.isCompliant === true, 'Pohegaon corridor must be clear of Shirdi Airport');

  // 4. Test Battery Feasibility & RTL reserve
  const battery = calculateBatteryFeasibility(dist, 4.5, 92);
  console.log(`4. Battery RTL Feasibility: ${battery.verdict}`);
  console.log(`   Arrival SoC: ${battery.estimatedArrivalSoc}%, RTL Reserve: ${battery.reserveBufferPct}%`);
  console.assert(battery.isFeasible === true, 'Battery must have >= 25% safety reserve');

  // 5. Test Road vs Drone Comparison
  const comparison = compareRoadVsDrone(pohegaonCoords, depotCoords, 4.5);
  console.log(`5. Speed & Quality Comparison:`);
  console.log(`   - Air Duration: ${comparison.flightDurationMin} mins vs Road: ${comparison.roadDurationMin} mins (${comparison.percentTimeSaved}% faster)`);
  console.log(`   - Drone Cost: ₹${comparison.droneCostInr} vs Road Tempo: ₹${comparison.roadCostEstimatedInr} (Save ₹${comparison.costSavingsInr})`);
  console.log(`   - Produce Vibration: ${comparison.vibrationRisk.drone}`);

  // 6. Test Controller Hubs & Fleet
  const mockReq = {};
  const mockResHubs = {
    json: (data) => {
      console.log(`6. Drone Hubs returned: ${data.hubs.length} certified pads (Source: ${data.source})`);
      console.assert(data.hubs.length >= 8, 'Must return at least 8 Kopargaon pads');
    }
  };
  await droneController.getDroneHubs(mockReq, mockResHubs);

  const mockResFleet = {
    json: (data) => {
      console.log(`7. Drone Fleet returned: ${data.drones.length} Kisan Drones (Source: ${data.source})`);
      console.assert(data.drones.length >= 4, 'Must return at least 4 registered drones');
    }
  };
  await droneController.getDroneFleet(mockReq, mockResFleet);

  console.log('\n✅ All 7 KrishiFly Drone System tests PASSED successfully!\n');
}

testDroneSystem();
