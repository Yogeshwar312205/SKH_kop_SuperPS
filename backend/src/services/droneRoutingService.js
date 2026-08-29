/**
 * Drone Routing & Energetics Service (§KrishiFly)
 *
 * Implements:
 * 1. Haversine aerial corridor calculation (point-to-point line-of-sight).
 * 2. 3D waypoint generator (climb to 75m AGL, cruise, landing approach).
 * 3. DGCA DigitalSky compliance & Shirdi International Airport 5km No-Fly Geofence buffer.
 * 4. Aerodynamic battery energy consumption and Return-to-Launch (RTL) safety gating.
 * 5. Road vs Drone time, cost, and vibration comparison.
 */

// Shirdi International Airport Coordinates (Kakadi, Rahata taluka)
const SHIRDI_AIRPORT_COORDS = [74.3792, 19.6897]; // [lng, lat]
const NO_FLY_BUFFER_KM = 5.0; // DGCA mandated 5 km exclusion zone

/**
 * Calculates Haversine distance in kilometers between two [lng, lat] points.
 */
function haversineDistanceKm(coord1, coord2) {
  const [lon1, lat1] = coord1;
  const [lon2, lat2] = coord2;
  const R = 6371; // Earth radius in km

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generates 3D corridor waypoints between origin and destination.
 * Waypoint structure: [lng, lat, altitudeMeters]
 */
function generateFlightCorridor(originCoords, destCoords, steps = 12) {
  const [startLng, startLat] = originCoords;
  const [endLng, endLat] = destCoords;
  const waypoints = [];
  const cruiseAlt = 75; // 75m AGL cruise altitude

  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const lng = startLng + (endLng - startLng) * fraction;
    const lat = startLat + (endLat - startLat) * fraction;

    let alt = cruiseAlt;
    if (i === 0 || i === steps) {
      alt = 0; // Takeoff / Touchdown ground level
    } else if (i === 1 || i === steps - 1) {
      alt = 35; // Climb out / Final approach
    }

    waypoints.push([
      parseFloat(lng.toFixed(6)),
      parseFloat(lat.toFixed(6)),
      Math.round(alt),
    ]);
  }

  return waypoints;
}

/**
 * Checks if the flight corridor intersects Shirdi Airport's 5km exclusion zone.
 */
function checkNoFlyZoneCompliance(waypoints) {
  let minDistanceToAirport = Infinity;

  for (const pt of waypoints) {
    const dist = haversineDistanceKm([pt[0], pt[1]], SHIRDI_AIRPORT_COORDS);
    if (dist < minDistanceToAirport) {
      minDistanceToAirport = dist;
    }
  }

  const isCompliant = minDistanceToAirport >= NO_FLY_BUFFER_KM;

  return {
    isCompliant,
    minDistanceToAirportKm: parseFloat(minDistanceToAirport.toFixed(2)),
    bufferRequiredKm: NO_FLY_BUFFER_KM,
    zoneStatus: isCompliant ? 'Green Zone (Clear)' : 'Red Zone (Airport Exclusion Buffer)',
  };
}

/**
 * Calculates battery energy required and validates Return-To-Launch (RTL) safety.
 *
 * Base consumption: ~14 Wh/km empty
 * Payload drag factor: ~1.8 Wh/km per kg of cargo
 * Returns round-trip SoC needed, safety reserve %, and dispatch feasibility.
 */
function calculateBatteryFeasibility(distanceKm, payloadKg, currentSoc, batteryCapacityWh = 1056) {
  // 1056 Wh standard 22,000 mAh 48V (12S) LiPo/Solid-State pack
  const whPerKm = 14 + payloadKg * 1.8;
  const oneWayEnergyWh = distanceKm * whPerKm;
  // Round trip with return flight (return flight is empty payload)
  const returnEnergyWh = distanceKm * 14;
  const totalEnergyWh = oneWayEnergyWh + returnEnergyWh;

  const totalSocBurn = (totalEnergyWh / batteryCapacityWh) * 100;
  const estimatedEndSoc = Math.max(0, currentSoc - (oneWayEnergyWh / batteryCapacityWh) * 100);
  const rtlRemainingSoc = Math.max(0, currentSoc - totalSocBurn);

  const minimumReserveRequired = 25; // 25% mandatory reserve
  const isFeasible = rtlRemainingSoc >= minimumReserveRequired;

  return {
    isFeasible,
    oneWayEnergyWh: Math.round(oneWayEnergyWh),
    totalRoundTripEnergyWh: Math.round(totalEnergyWh),
    oneWaySocBurnPct: Math.round((oneWayEnergyWh / batteryCapacityWh) * 100),
    estimatedArrivalSoc: Math.round(estimatedEndSoc),
    estimatedReturnSoc: Math.round(rtlRemainingSoc),
    reserveBufferPct: Math.round(rtlRemainingSoc),
    minimumReserveRequired,
    verdict: isFeasible
      ? 'CLEAR FOR LAUNCH: Safe RTL battery buffer verified'
      : 'INSUFFICIENT CHARGE: Return-To-Launch reserve below 25%',
  };
}

/**
 * Compares Drone Air Corridor against traditional Rural Ground Tempo/Tractor.
 */
function compareRoadVsDrone(originCoords, destCoords, payloadKg) {
  const aerialDistKm = haversineDistanceKm(originCoords, destCoords);
  const droneSpeedKmh = 48; // Cruising speed
  const flightDurationMin = Math.round((aerialDistKm / droneSpeedKmh) * 60) + 3; // +3 min for takeoff/landing

  // Rural dirt road tortuosity is typically ~1.45x straight line
  const roadDistKm = parseFloat((aerialDistKm * 1.42).toFixed(1));
  // Average tractor/tempo speed on Kopargaon unpaved roads is 18 km/h
  const roadSpeedKmh = 18;
  const roadDurationMin = Math.round((roadDistKm / roadSpeedKmh) * 60);

  const timeSavedMin = Math.max(0, roadDurationMin - flightDurationMin);

  // Economic comparison
  // Road hiring minimum tempo charge in rural areas is ₹350 - ₹500
  const roadCostEstimatedInr = Math.max(350, Math.round(roadDistKm * 22));
  // Drone shared micro-freight fee: base ₹80 + ₹8/km + ₹6/kg
  const droneCostInr = Math.round(80 + aerialDistKm * 8 + payloadKg * 6);

  return {
    aerialDistanceKm: parseFloat(aerialDistKm.toFixed(2)),
    flightDurationMin,
    roadDistanceKm: roadDistKm,
    roadDurationMin,
    timeSavedMin,
    percentTimeSaved: Math.round((timeSavedMin / roadDurationMin) * 100),
    droneCostInr,
    roadCostEstimatedInr,
    costSavingsInr: Math.max(0, roadCostEstimatedInr - droneCostInr),
    vibrationRisk: {
      road: 'High Vibration (15-20% produce bruising / damage risk on unpaved roads)',
      drone: 'Zero Vibration (Stabilized cargo bay with active damping)',
    },
  };
}

module.exports = {
  haversineDistanceKm,
  generateFlightCorridor,
  checkNoFlyZoneCompliance,
  calculateBatteryFeasibility,
  compareRoadVsDrone,
  SHIRDI_AIRPORT_COORDS,
  NO_FLY_BUFFER_KM,
};
