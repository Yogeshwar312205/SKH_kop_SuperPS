const logger = require('../utils/logger');

/**
 * TomTom Traffic & Routing Service
 * 
 * Provides:
 * 1. Live Traffic Flow & Congestion Index calculation
 * 2. Optimal Route Navigation with Traffic Delay adjustments
 * 3. Traffic Incident reporting
 * 
 * Falls back to simulated rural Maharashtra traffic profile if TOMTOM_API_KEY is not set or network is offline.
 */

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY || '';

/**
 * Common Kopargaon Corridor Coordinates for Traffic Lookups
 */
const KNOWN_COORDINATES = {
  'KPG-DEPOT': [74.4765, 19.8826],
  'KPG-APMC': [74.4712, 19.8801],
  'SANWATSAR': [74.5012, 19.9102],
  'POHEGAON': [74.4423, 19.9245],
  'KOLPEWADI': [74.5234, 19.8556],
  'DHAMORI': [74.4889, 19.8234],
  'CHAS-NALI': [74.5123, 19.9334],
  'KARANJI-BK': [74.4556, 19.8445],
  'MANJUR': [74.4912, 19.9012],
  'SHINGNAPUR': [74.5712, 19.8823],
  'RAWANDA': [74.4334, 19.8667],
  'SHIRDI': [74.4777, 19.7645],
  'RAHATA': [74.4842, 19.8052],
  'SANGAMNER': [74.2168, 19.5668],
  'NASHIK': [73.7898, 19.9975],
  'AHMEDNAGAR': [74.7480, 19.0948],
};

/**
 * Calculate Traffic Congestion & Optimal Route
 * 
 * @param {Object} params - { originCode, destCode, departureTime }
 */
const calculateTrafficAndRoute = async ({ originCode = 'KPG-DEPOT', destCode = 'SHIRDI', departureTime = '08:00' }) => {
  const originCoords = KNOWN_COORDINATES[originCode.toUpperCase()] || KNOWN_COORDINATES['KPG-DEPOT'];
  const destCoords = KNOWN_COORDINATES[destCode.toUpperCase()] || KNOWN_COORDINATES['SHIRDI'];

  if (TOMTOM_API_KEY) {
    try {
      const originStr = `${originCoords[1]},${originCoords[0]}`;
      const destStr = `${destCoords[1]},${destCoords[0]}`;
      
      const url = `https://api.tomtom.com/routing/1/calculateRoute/${originStr}:${destStr}/json?key=${TOMTOM_API_KEY}&traffic=true&travelMode=bus`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.routes && data.routes.length > 0) {
          const route = data.routes[0];
          const summary = route.summary;
          
          const distanceKm = Math.round((summary.lengthInMeters / 1000) * 10) / 10;
          const travelTimeMin = Math.round(summary.travelTimeInSeconds / 60);
          const trafficDelayMin = Math.round((summary.trafficDelayInSeconds || 0) / 60);
          const freeFlowTimeMin = Math.max(5, travelTimeMin - trafficDelayMin);

          let congestionLevel = 'low';
          if (trafficDelayMin > 15) congestionLevel = 'heavy';
          else if (trafficDelayMin > 5) congestionLevel = 'moderate';

          return {
            success: true,
            provider: 'tomtom_live',
            originCode,
            destCode,
            distanceKm,
            travelTimeMin,
            freeFlowTimeMin,
            trafficDelayMin,
            congestionLevel,
            speedMultiplier: Math.round((freeFlowTimeMin / travelTimeMin) * 100) / 100,
            incidents: data.incidents || [],
            coordinates: route.legs ? route.legs[0].points.map((p) => [p.longitude, p.latitude]) : [originCoords, destCoords],
          };
        }
      }
    } catch (err) {
      logger.warn(`TomTom API call failed, using simulated traffic model: ${err.message}`);
    }
  }

  // Fallback: Enhanced Simulated Traffic Model based on hour & route
  return getSimulatedTraffic(originCode, destCode, departureTime, originCoords, destCoords);
};

/**
 * Simulated Traffic Model for Kopargaon / Shirdi Corridors
 */
const getSimulatedTraffic = (originCode, destCode, departureTime, originCoords, destCoords) => {
  const hour = parseInt(departureTime.split(':')[0] || '8', 10);
  
  // Dynamic distance calculation based on coordinates if not in base table
  const lat1 = originCoords[1], lon1 = originCoords[0];
  const lat2 = destCoords[1], lon2 = destCoords[0];
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  let calculatedDistance = Math.round(R * c * 1.35 * 10) / 10; // road winding factor 1.35
  if (calculatedDistance < 1) calculatedDistance = 2.5;

  const distanceKm = calculatedDistance;

  // Base free flow travel time (approx 45 km/h average speed for bus)
  const freeFlowTimeMin = Math.max(5, Math.round((distanceKm / 45) * 60));

  // Time of day congestion multiplier
  let delayMin = 0;
  let congestionLevel = 'low';
  let congestionPercent = 12;

  if (hour >= 7 && hour <= 10) {
    // APMC Mandi morning arrival rush
    delayMin = Math.round(freeFlowTimeMin * 0.35);
    congestionLevel = 'moderate';
    congestionPercent = 58;
  } else if (hour >= 17 && hour <= 20) {
    // Evening Shirdi pilgrim & highway commuter peak
    delayMin = Math.round(freeFlowTimeMin * 0.60);
    congestionLevel = 'heavy';
    congestionPercent = 86;
  } else {
    delayMin = Math.round(freeFlowTimeMin * 0.08);
    congestionLevel = 'low';
    congestionPercent = 18;
  }

  const travelTimeMin = freeFlowTimeMin + delayMin;
  const speedMultiplier = Math.round((freeFlowTimeMin / travelTimeMin) * 100) / 100;

  // Key waypoint interpolation
  const midLng = (originCoords[0] + destCoords[0]) / 2;
  const midLat = (originCoords[1] + destCoords[1]) / 2;

  // Segment breakdown
  const segments = [
    { name: 'Depot / City Gate Exit', lengthKm: Math.round(distanceKm * 0.2 * 10) / 10, speedKmH: congestionLevel === 'heavy' ? 22 : 40, delayMin: Math.round(delayMin * 0.2), status: congestionLevel === 'heavy' ? 'moderate' : 'clear' },
    { name: 'APMC Yard & Highway Junction', lengthKm: Math.round(distanceKm * 0.5 * 10) / 10, speedKmH: congestionLevel === 'heavy' ? 14 : congestionLevel === 'moderate' ? 26 : 48, delayMin: Math.round(delayMin * 0.6), status: congestionLevel },
    { name: 'Corridor Highway Approach', lengthKm: Math.round(distanceKm * 0.3 * 10) / 10, speedKmH: 52, delayMin: Math.round(delayMin * 0.2), status: 'clear' },
  ];

  // Alternative Bypass Option
  const bypassOption = {
    name: 'TomTom Recommended NH-160 Bypass',
    distanceKm: Math.round((distanceKm + 2.4) * 10) / 10,
    travelTimeMin: Math.max(freeFlowTimeMin + 2, travelTimeMin - Math.round(delayMin * 0.7)),
    savesTimeMin: Math.round(delayMin * 0.7),
  };

  return {
    success: true,
    provider: 'simulated',
    originCode,
    destCode,
    distanceKm,
    travelTimeMin,
    freeFlowTimeMin,
    trafficDelayMin: delayMin,
    congestionLevel,
    congestionPercent,
    speedMultiplier,
    avgSpeedKmH: Math.round((distanceKm / (travelTimeMin / 60)) * 10) / 10,
    freeFlowSpeedKmH: 48,
    segments,
    bypassOption,
    optimalDepartureWindow: delayMin > 8 ? 'Depart 15 mins earlier or switch to NH-160 Bypass' : 'Depart on schedule - Highway clear',
    incidents: delayMin > 5 ? [
      {
        id: 'inc-01',
        type: 'Congestion',
        description: `Heavy agricultural vehicle traffic near ${originCode} APMC Yard & Highway Toll Junction`,
        location: [midLng, midLat],
        severity: congestionLevel,
      }
    ] : [],
    coordinates: [
      originCoords,
      [midLng + 0.005, midLat - 0.002],
      destCoords,
    ],
  };
};

module.exports = { calculateTrafficAndRoute };
