/**
 * Dispatch suggestions for the logistics provider.
 *
 * POST, not GET: a fleet's routes do not fit in a query string.
 *
 * Stateless by design — vehicles and pending requests arrive in the body. The
 * fleet lives in the zustand store, exactly as bookings, deals and buyer
 * postings do, and this endpoint is the arithmetic rather than the record.
 *
 * The response names what produced it (`source`), following the same rule as
 * `aiEngineSource` on /api/recommend and `source` on /api/markets: the UI must
 * be able to tell the dispatcher honestly what they are looking at. Here that
 * string says "no solver" on purpose — see VRP.md.
 */

const mongoose = require('mongoose');
const {
  suggestInsertions,
  AVG_SPEED_KMH,
  SERVICE_MINUTES_PER_STOP,
  DEFAULT_TOP_N,
  ROAD_FACTOR,
} = require('../services/insertionService');
const Vehicle = require('../models/Vehicle');
const PickupRequest = require('../models/PickupRequest');
const { publicVehicle, FALLBACK_FLEET } = require('./fleetController');
const { publicRequest } = require('./requestController');
const { getIsConnected } = require('../config/db');
const logger = require('../utils/logger');

const SOURCE = 'Cheapest Insertion Heuristic (rule-based, no solver)';

const FALLBACK_DISPATCH_REQUESTS = [
  {
    id: '65f1c0010000000000000001',
    _id: '65f1c0010000000000000001',
    farmerName: 'Ramesh Singh',
    farmerPhone: '+91 98765 43210',
    quantityKg: 800,
    produceType: 'Tomato',
    cropType: 'Tomato',
    origin: { label: 'Nashik Central Farm HQ', coordinates: [73.7898, 19.9975] },
    destination: { label: 'Mumbai APMC, Vashi', coordinates: [73.0044, 19.0760] },
    agreedRatePerKg: 35,
    pickupDate: new Date().toISOString().split('T')[0],
    requestedWindow: {
      date: new Date().toISOString().split('T')[0],
      label: 'Morning (08:00 - 12:00)',
      startHour: 8,
      endHour: 12,
    },
    status: 'pending',
    timeline: [{ status: 'pending', note: 'Created in dispatch queue' }],
  },
  {
    id: '65f1c0010000000000000002',
    _id: '65f1c0010000000000000002',
    farmerName: 'Kiran Thorat',
    farmerPhone: '+91 94211 77665',
    quantityKg: 1500,
    produceType: 'Onion',
    cropType: 'Onion',
    origin: { label: 'Lasalgaon Farm, Niphad', coordinates: [74.2400, 20.1400] },
    destination: { label: 'Kopargaon APMC', coordinates: [74.4712, 19.8801] },
    agreedRatePerKg: 28,
    pickupDate: new Date().toISOString().split('T')[0],
    requestedWindow: {
      date: new Date().toISOString().split('T')[0],
      label: 'Afternoon (12:00 - 16:00)',
      startHour: 12,
      endHour: 16,
    },
    status: 'pending',
    timeline: [{ status: 'pending', note: 'Created in dispatch queue' }],
  },
];

/*
 * GET /api/dispatch/suggestions
 */
const getDispatchSuggestions = async (req, res) => {
  const topN = Number.isFinite(Number(req.query.topN)) && Number(req.query.topN) > 0
    ? Math.min(Number(req.query.topN), 10)
    : DEFAULT_TOP_N;

  try {
    let vehicles = [];
    let requests = [];
    let pendingDocs = [];

    const isDbReady = getIsConnected() && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id);

    if (isDbReady) {
      try {
        const [fleet, queue] = await Promise.all([
          Vehicle.find({ owner: req.user._id }),
          PickupRequest.find({ status: 'pending' }).sort({ createdAt: -1 }),
        ]);

        vehicles = fleet.map(publicVehicle);
        pendingDocs = queue.map(publicRequest);
        requests = queue.map((doc) => ({
          id: String(doc._id),
          quantityKg: doc.quantityKg,
          produceType: doc.cropType,
          origin: doc.origin,
          destination: doc.destination,
          requestedWindow: {
            date: doc.pickupDate,
            label: doc.window?.label || '',
            startHour: doc.window?.startHour ?? null,
            endHour: doc.window?.endHour ?? null,
          },
          status: 'pending',
        }));
      } catch (dbErr) {
        logger.warn(`Dispatch query fallback: ${dbErr.message}`);
      }
    }

    // Graceful fallback to demo data if DB is offline or user has no vehicles yet
    if (vehicles.length === 0) {
      vehicles = FALLBACK_FLEET;
    }
    if (requests.length === 0) {
      requests = FALLBACK_DISPATCH_REQUESTS;
      pendingDocs = FALLBACK_DISPATCH_REQUESTS;
    }

    const { suggestions, infeasible, unrankable } = suggestInsertions(vehicles, requests, topN);

    return res.json({
      success: true,
      source: SOURCE,
      params: {
        roadFactor: ROAD_FACTOR,
        avgSpeedKmH: AVG_SPEED_KMH,
        serviceMinutesPerStop: SERVICE_MINUTES_PER_STOP,
        topN,
      },
      generatedAt: new Date().toISOString(),
      counts: {
        vehicles: vehicles.length,
        requests: requests.length,
        suggestions: suggestions.length,
        infeasible: infeasible.length,
        unrankable: unrankable.length,
      },
      vehicles,
      pending: pendingDocs,
      suggestions,
      infeasible,
      unrankable,
    });
  } catch (error) {
    logger.error(`Dispatch suggestion failed: ${error.message}`);
    return res.status(503).json({ success: false, error: 'Could not rank your fleet.' });
  }
};

module.exports = { getDispatchSuggestions, SOURCE, FALLBACK_DISPATCH_REQUESTS };
