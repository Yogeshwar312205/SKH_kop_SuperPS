const mongoose = require('mongoose');
const BusRoute = require('../models/BusRoute');
const BusStop = require('../models/BusStop');
const BusTrip = require('../models/BusTrip');
const logger = require('../utils/logger');

/**
 * Route Validation Service
 * 
 * Validates if a direct route exists between origin and destination stops,
 * calculates distances, travel times, and finds available trips.
 */

const MOCK_STOP_CODE_MAP = {
  'stop-001': 'KPG-DEPOT',
  'stop-002': 'SHIRDI',
  'stop-003': 'KPG-APMC',
};

/**
 * Safely resolve a BusStop document by Mongoose ObjectId,
 * mock stop ID (e.g. 'stop-002'), or stop code (e.g. 'SHIRDI').
 */
async function findBusStop(idOrCode) {
  if (!idOrCode) return null;
  const str = String(idOrCode).trim();

  if (mongoose.Types.ObjectId.isValid(str)) {
    const stop = await BusStop.findById(str);
    if (stop) return stop;
  }

  const mappedCode = MOCK_STOP_CODE_MAP[str] || str;
  return await BusStop.findOne({
    $or: [
      { code: mappedCode.toUpperCase() },
      { code: str.toUpperCase() },
      { code: str }
    ]
  });
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - [lng, lat]
 * @param {Array} coord2 - [lng, lat]
 * @returns {number} Distance in kilometers
 */
function calculateDistance(coord1, coord2) {
  const R = 6371; // Earth's radius in km
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;
  
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

/**
 * Find route between two stops
 * 
 * @param {string} originStopId - Origin stop ID or code
 * @param {string} destStopId - Destination stop ID or code
 * @returns {Object} Validation result with route info
 */
async function validateRoute(originStopId, destStopId) {
  try {
    // Validate input
    if (!originStopId || !destStopId) {
      return {
        isValid: false,
        error: 'Origin and destination stops are required',
        code: 'MISSING_STOPS'
      };
    }
    
    if (String(originStopId).trim() === String(destStopId).trim()) {
      return {
        isValid: false,
        error: 'Origin and destination cannot be the same',
        code: 'SAME_STOPS'
      };
    }
    
    // Fetch stops safely
    const [originStop, destStop] = await Promise.all([
      findBusStop(originStopId),
      findBusStop(destStopId)
    ]);
    
    if (!originStop) {
      return {
        isValid: false,
        error: `Origin stop not found (${originStopId})`,
        code: 'ORIGIN_NOT_FOUND'
      };
    }
    
    if (!destStop) {
      return {
        isValid: false,
        error: `Destination stop not found (${destStopId})`,
        code: 'DEST_NOT_FOUND'
      };
    }
    
    if (String(originStop._id) === String(destStop._id)) {
      return {
        isValid: false,
        error: 'Origin and destination cannot be the same stop',
        code: 'SAME_STOPS'
      };
    }
    
    // Find all routes
    const routes = await BusRoute.find({}).populate('stops.stopId');
    
    // Find routes that contain both stops in the correct order
    const validRoutes = [];
    
    for (const route of routes) {
      const stops = route.stops;
      
      // Find indices of origin and destination in this route (matching by _id or code)
      const originIndex = stops.findIndex(s => {
        if (!s.stopId) return false;
        const sid = String(s.stopId._id || s.stopId);
        const scode = (s.stopId.code || '').toUpperCase();
        return sid === String(originStop._id) || scode === originStop.code.toUpperCase();
      });
      const destIndex = stops.findIndex(s => {
        if (!s.stopId) return false;
        const sid = String(s.stopId._id || s.stopId);
        const scode = (s.stopId.code || '').toUpperCase();
        return sid === String(destStop._id) || scode === destStop.code.toUpperCase();
      });
      
      // Valid if both stops exist and origin comes before destination
      if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
        const originStopData = stops[originIndex];
        const destStopData = stops[destIndex];
        
        // Calculate segment distance and duration
        const travelTimeMin = destStopData.offsetMin - originStopData.offsetMin;
        const segmentDistance = calculateSegmentDistance(route, originIndex, destIndex);
        
        validRoutes.push({
          routeId: String(route._id),
          routeCode: route.code,
          routeName: route.name,
          totalDistanceKm: route.distanceKm,
          segmentDistanceKm: segmentDistance,
          travelTimeMin,
          estimatedTravelTime: formatDuration(travelTimeMin),
          originStopSeq: originStopData.seq,
          destStopSeq: destStopData.seq,
          intermediateStops: destIndex - originIndex - 1,
          operatingDays: route.operatingDays.length > 0 ? route.operatingDays : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        });
      }
    }
    
    if (validRoutes.length === 0) {
      // Check if reverse route exists
      const hasReverseRoute = routes.some(route => {
        const stops = route.stops;
        const originIndex = stops.findIndex(s => {
          if (!s.stopId) return false;
          const sid = String(s.stopId._id || s.stopId);
          const scode = (s.stopId.code || '').toUpperCase();
          return sid === String(originStop._id) || scode === originStop.code.toUpperCase();
        });
        const destIndex = stops.findIndex(s => {
          if (!s.stopId) return false;
          const sid = String(s.stopId._id || s.stopId);
          const scode = (s.stopId.code || '').toUpperCase();
          return sid === String(destStop._id) || scode === destStop.code.toUpperCase();
        });
        return originIndex !== -1 && destIndex !== -1 && originIndex > destIndex;
      });
      
      return {
        isValid: false,
        error: hasReverseRoute 
          ? `Route exists in reverse direction only. Try swapping origin and destination.`
          : 'No direct bus route available between these stops',
        code: hasReverseRoute ? 'REVERSE_ROUTE_ONLY' : 'NO_ROUTE',
        originStop: {
          id: String(originStop._id),
          code: originStop.code,
          name: originStop.name,
          location: originStop.location
        },
        destStop: {
          id: String(destStop._id),
          code: destStop.code,
          name: destStop.name,
          location: destStop.location
        },
        straightLineDistanceKm: calculateDistance(
          originStop.location.coordinates,
          destStop.location.coordinates
        )
      };
    }
    
    // Sort routes by travel time (fastest first)
    validRoutes.sort((a, b) => a.travelTimeMin - b.travelTimeMin);
    
    return {
      isValid: true,
      originStop: {
        id: String(originStop._id),
        code: originStop.code,
        name: originStop.name,
        location: originStop.location
      },
      destStop: {
        id: String(destStop._id),
        code: destStop.code,
        name: destStop.name,
        location: destStop.location
      },
      straightLineDistanceKm: calculateDistance(
        originStop.location.coordinates,
        destStop.location.coordinates
      ),
      routes: validRoutes,
      recommendedRoute: validRoutes[0], // Fastest route
      alternativeRoutes: validRoutes.slice(1)
    };
    
  } catch (error) {
    logger.error(`Route validation error: ${error.message}`);
    return {
      isValid: false,
      error: 'Failed to validate route',
      code: 'VALIDATION_ERROR',
      details: error.message
    };
  }
}

/**
 * Calculate distance of a segment within a route
 */
function calculateSegmentDistance(route, startIndex, endIndex) {
  const totalStops = route.stops.length - 1;
  const segmentStops = endIndex - startIndex;
  
  if (totalStops === 0) return 0;
  
  const segmentDistance = (route.distanceKm * segmentStops) / totalStops;
  return Math.round(segmentDistance * 10) / 10;
}

/**
 * Format duration in minutes to human-readable string
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${mins}m`;
}

/**
 * Find available trips for a route on a specific date
 * 
 * @param {string} routeId - Route ID or code
 * @param {string} serviceDate - Date in YYYY-MM-DD format
 * @param {number} minCapacityKg - Minimum required capacity
 * @returns {Array} Available trips
 */
async function findAvailableTrips(routeId, serviceDate, minCapacityKg = 0) {
  try {
    if (!routeId) return [];

    let realRouteId = routeId;
    if (!mongoose.Types.ObjectId.isValid(routeId)) {
      const MOCK_ROUTE_MAP = {
        'route-001': 'R-SHIRDI',
        'route-002': 'R-NASHIK',
      };
      const code = MOCK_ROUTE_MAP[routeId] || routeId;
      const route = await BusRoute.findOne({ code: String(code).toUpperCase() });
      if (route) realRouteId = route._id;
    }

    const trips = await BusTrip.find({
      routeId: realRouteId,
      serviceDate,
      status: { $in: ['scheduled', 'running'] }
    })
    .populate('routeId')
    .sort({ departureTime: 1 });
    
    return trips
      .filter(trip => {
        const availableKg = trip.predictedSpareKg - trip.cargoUsedKg;
        return availableKg >= minCapacityKg;
      })
      .map(trip => ({
        tripId: String(trip._id),
        routeCode: trip.routeId?.code,
        departureTime: trip.departureTime,
        vehicleCode: trip.vehicleCode,
        status: trip.status,
        availableCapacityKg: trip.predictedSpareKg - trip.cargoUsedKg,
        totalCapacityKg: trip.cargoCapacityKg,
        utilizationPct: Math.round((trip.cargoUsedKg / trip.cargoCapacityKg) * 100),
        delayMin: trip.delayMin
      }));
  } catch (error) {
    logger.error(`Find available trips error: ${error.message}`);
    return [];
  }
}

/**
 * Get complete route preview with trips
 * 
 * @param {string} originStopId - Origin stop ID
 * @param {string} destStopId - Destination stop ID
 * @param {string} serviceDate - Date in YYYY-MM-DD format (default: today)
 * @param {number} requiredCapacityKg - Required cargo capacity
 * @returns {Object} Complete route preview with available trips
 */
async function getRoutePreview(originStopId, destStopId, serviceDate = null, requiredCapacityKg = 0) {
  // Validate route
  const validation = await validateRoute(originStopId, destStopId);
  
  if (!validation.isValid) {
    return validation;
  }
  
  // Use today if no date provided
  const targetDate = serviceDate || new Date().toISOString().split('T')[0];
  
  // Get day of week
  const date = new Date(targetDate);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayOfWeek = dayNames[date.getDay()];
  
  // Find available trips for each route
  const routesWithTrips = await Promise.all(
    validation.routes.map(async (route) => {
      // Check if route operates on this day
      const operatesOnDay = route.operatingDays.length === 0 || 
                           route.operatingDays.includes(dayOfWeek);
      
      if (!operatesOnDay) {
        return {
          ...route,
          operatesOnDay: false,
          availableTrips: [],
          message: `Route does not operate on ${dayOfWeek}`
        };
      }
      
      const trips = await findAvailableTrips(route.routeId, targetDate, requiredCapacityKg);
      
      return {
        ...route,
        operatesOnDay: true,
        availableTrips: trips,
        tripCount: trips.length
      };
    })
  );
  
  // Sort by number of available trips (descending)
  routesWithTrips.sort((a, b) => b.tripCount - a.tripCount);
  
  // Get total available trip count
  const totalAvailableTrips = routesWithTrips.reduce((sum, r) => sum + r.tripCount, 0);
  
  return {
    ...validation,
    serviceDate: targetDate,
    dayOfWeek,
    requiredCapacityKg,
    routes: routesWithTrips,
    totalAvailableTrips,
    hasAvailableTrips: totalAvailableTrips > 0,
    recommendation: totalAvailableTrips > 0 
      ? `${totalAvailableTrips} trips available on ${targetDate}`
      : `No trips with ${requiredCapacityKg}kg capacity available on ${targetDate}`
  };
}

/**
 * Validate if a specific trip can accommodate a consignment
 * 
 * @param {string} tripId - Trip ID
 * @param {number} weightKg - Required capacity
 * @param {Date} deadlineAt - Deadline for delivery
 * @returns {Object} Validation result
 */
async function validateTripForConsignment(tripId, weightKg, deadlineAt) {
  try {
    if (!tripId || !mongoose.Types.ObjectId.isValid(tripId)) {
      return {
        isValid: false,
        error: 'Trip not found or invalid trip ID',
        code: 'TRIP_NOT_FOUND'
      };
    }

    const trip = await BusTrip.findById(tripId).populate('routeId');
    
    if (!trip) {
      return {
        isValid: false,
        error: 'Trip not found',
        code: 'TRIP_NOT_FOUND'
      };
    }
    
    // Check capacity
    const availableKg = trip.predictedSpareKg - trip.cargoUsedKg;
    if (weightKg > availableKg) {
      return {
        isValid: false,
        error: `Insufficient capacity. Required: ${weightKg}kg, Available: ${availableKg}kg`,
        code: 'INSUFFICIENT_CAPACITY',
        availableKg,
        requiredKg: weightKg,
        shortfallKg: weightKg - availableKg
      };
    }
    
    // Check status
    if (!['scheduled', 'running'].includes(trip.status)) {
      return {
        isValid: false,
        error: `Trip status is "${trip.status}" - not accepting bookings`,
        code: 'TRIP_NOT_AVAILABLE'
      };
    }
    
    // Check deadline (estimate arrival time)
    const route = trip.routeId;
    if (route && route.stops && route.stops.length > 0) {
      const lastStop = route.stops[route.stops.length - 1];
      const travelTimeMin = lastStop.offsetMin;
      
      // Parse departure time
      const [hours, minutes] = trip.departureTime.split(':').map(Number);
      const departureDate = new Date(trip.serviceDate);
      departureDate.setHours(hours, minutes, 0, 0);
      
      const arrivalDate = new Date(departureDate.getTime() + travelTimeMin * 60000);
      
      if (deadlineAt && arrivalDate > new Date(deadlineAt)) {
        return {
          isValid: false,
          error: 'Trip arrival time exceeds deadline',
          code: 'DEADLINE_EXCEEDED',
          estimatedArrival: arrivalDate.toISOString(),
          deadline: deadlineAt
        };
      }
    }
    
    return {
      isValid: true,
      trip: {
        tripId: String(trip._id),
        routeCode: trip.routeId?.code,
        departureTime: trip.departureTime,
        serviceDate: trip.serviceDate,
        availableCapacityKg: availableKg,
        vehicleCode: trip.vehicleCode
      }
    };
    
  } catch (error) {
    logger.error(`Trip validation error: ${error.message}`);
    return {
      isValid: false,
      error: 'Failed to validate trip',
      code: 'VALIDATION_ERROR'
    };
  }
}

module.exports = {
  findBusStop,
  validateRoute,
  findAvailableTrips,
  getRoutePreview,
  validateTripForConsignment,
  calculateDistance,
  formatDuration
};

