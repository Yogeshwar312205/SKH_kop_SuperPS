const mongoose = require('mongoose');
const BusStop = require('../models/BusStop');
const BusRoute = require('../models/BusRoute');
const BusTrip = require('../models/BusTrip');
const logger = require('../utils/logger');

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// GET /api/v2/bus/stops
const getStops = async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        count: 3,
        stops: [
          {
            id: 'stop-001',
            code: 'KPG-DEPOT',
            name: 'Kopargaon ST Depot',
            nameMr: 'कोपरगाव एसटी डेपो',
            location: { type: 'Point', coordinates: [74.4765, 19.8826] },
            isDepot: true,
            isMandi: false,
            approachRoadClass: 'paved',
          },
          {
            id: 'stop-002',
            code: 'SHIRDI',
            name: 'Shirdi Bus Stand',
            nameMr: 'शिर्डी बस स्टँड',
            location: { type: 'Point', coordinates: [74.4777, 19.7645] },
            isDepot: false,
            isMandi: false,
            approachRoadClass: 'paved',
          },
          {
            id: 'stop-003',
            code: 'KPG-APMC',
            name: 'Kopargaon APMC',
            nameMr: 'कोपरगाव एपीएमसी',
            location: { type: 'Point', coordinates: [74.4712, 19.8801] },
            isDepot: false,
            isMandi: true,
            approachRoadClass: 'paved',
          },
        ],
      });
    }

    const stops = await BusStop.find({}).sort({ code: 1 });
    return res.json({
      success: true,
      source: 'database',
      count: stops.length,
      stops: stops.map((s) => ({
        id: String(s._id),
        code: s.code,
        name: s.name,
        nameMr: s.nameMr,
        location: s.location,
        isDepot: s.isDepot,
        isMandi: s.isMandi,
        approachRoadClass: s.approachRoadClass,
      })),
    });
  } catch (error) {
    logger.error(`Get bus stops failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load bus stops.' });
  }
};

// GET /api/v2/bus/routes
const getRoutes = async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        count: 2,
        routes: [
          {
            id: 'route-001',
            code: 'R-SHIRDI',
            name: 'Kopargaon ↔ Shirdi',
            distanceKm: 16.2,
            stops: [
              { stopId: 'stop-001', seq: 0, offsetMin: 0 },
              { stopId: 'stop-002', seq: 1, offsetMin: 25 },
            ],
            operatingDays: [],
          },
          {
            id: 'route-002',
            code: 'R-NASHIK',
            name: 'Kopargaon ↔ Nashik',
            distanceKm: 68.5,
            stops: [
              { stopId: 'stop-001', seq: 0, offsetMin: 0 },
              { stopId: 'stop-003', seq: 1, offsetMin: 5 },
            ],
            operatingDays: [],
          },
        ],
      });
    }

    const routes = await BusRoute.find({}).populate('stops.stopId').sort({ code: 1 });
    return res.json({
      success: true,
      source: 'database',
      count: routes.length,
      routes: routes.map((r) => ({
        id: String(r._id),
        code: r.code,
        name: r.name,
        distanceKm: r.distanceKm,
        stops: r.stops.map((s) => {
          const stop = s.stopId;
          return {
            stopId: String(stop._id || stop),
            stopCode: stop.code || '',
            stopName: stop.name || '',
            seq: s.seq,
            offsetMin: s.offsetMin,
            location: stop.location || null
          };
        }),
        operatingDays: r.operatingDays,
        originStop: r.stops.length > 0 ? {
          id: String(r.stops[0].stopId._id || r.stops[0].stopId),
          name: r.stops[0].stopId.name || '',
          code: r.stops[0].stopId.code || ''
        } : null,
        destinationStop: r.stops.length > 0 ? {
          id: String(r.stops[r.stops.length - 1].stopId._id || r.stops[r.stops.length - 1].stopId),
          name: r.stops[r.stops.length - 1].stopId.name || '',
          code: r.stops[r.stops.length - 1].stopId.code || ''
        } : null,
        estimatedDurationMin: r.stops.length > 0 ? r.stops[r.stops.length - 1].offsetMin : 0
      })),
    });
  } catch (error) {
    logger.error(`Get bus routes failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load bus routes.' });
  }
};

// GET /api/v2/bus/trips?date=YYYY-MM-DD&routeId=xxx
const getTrips = async (req, res) => {
  try {
    const { date, routeId } = req.query;

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        count: 2,
        trips: [
          {
            id: 'trip-001',
            routeId: routeId || 'route-001',
            serviceDate: date || new Date().toISOString().split('T')[0],
            departureTime: '06:00',
            vehicleCode: 'MH-19-BUS-3401',
            status: 'scheduled',
            delayMin: 0,
            passengerCapacity: 52,
            cargoCapacityKg: 200,
            predictedSpareKg: 140,
            cargoUsedKg: 60,
            crewWindow: { startTime: '05:30', endTime: '22:00' },
          },
          {
            id: 'trip-002',
            routeId: routeId || 'route-001',
            serviceDate: date || new Date().toISOString().split('T')[0],
            departureTime: '14:00',
            vehicleCode: 'MH-19-BUS-3402',
            status: 'scheduled',
            delayMin: 0,
            passengerCapacity: 52,
            cargoCapacityKg: 200,
            predictedSpareKg: 180,
            cargoUsedKg: 20,
            crewWindow: { startTime: '05:30', endTime: '22:00' },
          },
        ],
      });
    }

    const query = {};
    if (date) query.serviceDate = date;
    if (routeId) {
      if (mongoose.Types.ObjectId.isValid(routeId)) {
        query.routeId = routeId;
      } else {
        const MOCK_ROUTE_MAP = {
          'route-001': 'R-SHIRDI',
          'route-002': 'R-NASHIK',
        };
        const targetCode = MOCK_ROUTE_MAP[routeId] || routeId;
        const route = await BusRoute.findOne({ code: String(targetCode).toUpperCase() });
        if (route) query.routeId = route._id;
        else query.routeId = routeId;
      }
    }

    const trips = await BusTrip.find(query)
      .populate('routeId')
      .sort({ departureTime: 1 });
      
    return res.json({
      success: true,
      source: 'database',
      count: trips.length,
      trips: trips.map((t) => ({
        id: String(t._id),
        routeId: String(t.routeId._id || t.routeId),
        routeCode: t.routeId?.code || '',
        routeName: t.routeId?.name || '',
        routeDistanceKm: t.routeId?.distanceKm || 0,
        serviceDate: t.serviceDate,
        departureTime: t.departureTime,
        vehicleCode: t.vehicleCode,
        status: t.status,
        delayMin: t.delayMin,
        passengerCapacity: t.passengerCapacity,
        cargoCapacityKg: t.cargoCapacityKg,
        predictedSpareKg: t.predictedSpareKg,
        cargoUsedKg: t.cargoUsedKg,
        availableCapacityKg: t.predictedSpareKg - t.cargoUsedKg,
        utilizationPct: Math.round(((t.cargoUsedKg / t.cargoCapacityKg) * 100)),
        crewWindow: t.crewWindow,
      })),
    });
  } catch (error) {
    logger.error(`Get bus trips failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load bus trips.' });
  }
};

// GET /api/v2/bus/trips/:id/manifest
const getTripManifest = async (req, res) => {
  try {
    const { id } = req.params;

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        trip: {
          id,
          routeCode: 'R-SHIRDI',
          serviceDate: new Date().toISOString().split('T')[0],
          departureTime: '06:00',
          vehicleCode: 'MH-19-BUS-3401',
          cargoUsedKg: 60,
          cargoCapacityKg: 200,
        },
        consignments: [
          {
            id: 'cons-001',
            farmerName: 'Ramesh Singh',
            commodity: 'Soybean Seeds',
            weightKg: 35,
            origin: 'Kopargaon APMC',
            destination: 'Shirdi Bus Stand',
            status: 'in_transit',
          },
          {
            id: 'cons-002',
            farmerName: 'Anita Kulkarni',
            commodity: 'General Parcel',
            weightKg: 25,
            origin: 'Kopargaon Depot',
            destination: 'Shirdi Bus Stand',
            status: 'in_transit',
          },
        ],
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const trip = await BusTrip.findById(id).populate('routeId');
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found.' });
    }

    const Consignment = require('../models/Consignment');
    const consignments = await Consignment.find({
      'assignment.legs.tripId': id,
      status: { $in: ['assigned', 'in_transit'] },
    }).populate('originStopId destStopId');

    return res.json({
      success: true,
      source: 'database',
      trip: {
        id: String(trip._id),
        routeCode: trip.routeId?.code,
        serviceDate: trip.serviceDate,
        departureTime: trip.departureTime,
        vehicleCode: trip.vehicleCode,
        cargoUsedKg: trip.cargoUsedKg,
        cargoCapacityKg: trip.cargoCapacityKg,
      },
      consignments: consignments.map((c) => ({
        id: String(c._id),
        farmerName: c.farmerName,
        commodity: c.commodity,
        weightKg: c.weightKg,
        origin: c.originStopId?.name,
        destination: c.destStopId?.name,
        status: c.status,
      })),
    });
  } catch (error) {
    logger.error(`Get trip manifest failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load trip manifest.' });
  }
};

module.exports = { getStops, getRoutes, getTrips, getTripManifest };
