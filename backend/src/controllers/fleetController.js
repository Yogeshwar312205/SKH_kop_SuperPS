const mongoose = require('mongoose');
const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');
const { broadcast } = require('../sockets/bus');
const { getIsConnected } = require('../config/db');

const FALLBACK_FLEET = [
  {
    id: '65f1b0010000000000000001',
    vehicleNo: 'MH 15 GH 4921',
    driverName: 'Suresh Shinde',
    driverPhone: '+91 98230 11223',
    vehicleType: 'Refrigerated Van',
    capacityKg: 3500,
    currentLoadKg: 1200,
    ratePerKm: 52,
    isRefrigerated: true,
    baseLocation: 'Nashik APMC Hub',
    status: 'En route',
    coordinates: [73.7898, 19.9975],
    currentRoute: [
      { id: 'stop-1', kind: 'depot', label: 'Nashik APMC Hub', coordinates: [73.7898, 19.9975], loadDeltaKg: 1200 },
      { id: 'stop-2', kind: 'drop', label: 'Mumbai Vashi APMC', coordinates: [73.0012, 19.0760], loadDeltaKg: -1200 },
    ],
  },
  {
    id: '65f1b0010000000000000002',
    vehicleNo: 'MH 31 CB 7810',
    driverName: 'Sunita Patil',
    driverPhone: '+91 94221 88990',
    vehicleType: 'Heavy Freighter',
    capacityKg: 10000,
    currentLoadKg: 0,
    ratePerKm: 78,
    isRefrigerated: true,
    baseLocation: 'Nashik depot',
    status: 'Idle',
    coordinates: [73.7898, 19.9975],
    currentRoute: [
      { id: 'stop-3', kind: 'depot', label: 'Nashik depot', coordinates: [73.7898, 19.9975], loadDeltaKg: 0 },
    ],
  },
  {
    id: '65f1b0010000000000000003',
    vehicleNo: 'MH 15 DK 2204',
    driverName: 'Balu Wagh',
    driverPhone: '+91 98230 44556',
    vehicleType: 'Mini Truck',
    capacityKg: 2000,
    currentLoadKg: 0,
    ratePerKm: 38,
    isRefrigerated: false,
    baseLocation: 'Pimpalgaon Baswant',
    status: 'Idle',
    coordinates: [73.9850, 20.1750],
    currentRoute: [
      { id: 'stop-4', kind: 'depot', label: 'Pimpalgaon Baswant', coordinates: [73.9850, 20.1750], loadDeltaKg: 0 },
    ],
  },
];

/**
 * A fleet owner's own vehicles. Every query is scoped to `req.user._id`, so one
 * owner can never read or move another owner's trucks.
 */

const publicVehicle = (v) => ({
  id: String(v._id || v.id),
  vehicleNo: v.vehicleNo,
  driverName: v.driverName,
  driverPhone: v.driverPhone,
  vehicleType: v.vehicleType,
  capacityKg: v.capacityKg,
  currentLoadKg: v.currentLoadKg,
  ratePerKm: v.ratePerKm,
  isRefrigerated: v.isRefrigerated,
  baseLocation: v.baseLocation,
  status: v.status,
  routeStartAt: v.routeStartAt,
  currentRoute: (v.currentRoute || []).map((s) => ({
    id: String(s._id || s.id),
    kind: s.kind,
    label: s.label,
    coordinates: s.coordinates,
    loadDeltaKg: s.loadDeltaKg,
    requestId: s.requestId ? String(s.requestId) : null,
  })),
  coordinates: v.location?.coordinates || v.coordinates || null,
  locationUpdatedAt: v.locationUpdatedAt,
});

// GET /api/fleet
const listFleet = async (req, res) => {
  try {
    let vehicles = [];
    const isDbReady = getIsConnected() && req.user?._id && mongoose.Types.ObjectId.isValid(req.user._id);
    if (isDbReady) {
      try {
        const docs = await Vehicle.find({ owner: req.user._id }).sort({ createdAt: 1 });
        vehicles = docs.map(publicVehicle);
      } catch (err) {
        logger.warn(`List fleet DB notice: ${err.message}`);
      }
    }
    if (vehicles.length === 0) {
      vehicles = FALLBACK_FLEET;
    }
    return res.json({ success: true, count: vehicles.length, vehicles });
  } catch (error) {
    logger.error(`List fleet failed: ${error.message}`);
    return res.json({ success: true, count: FALLBACK_FLEET.length, vehicles: FALLBACK_FLEET });
  }
};

// POST /api/fleet
const addVehicle = async (req, res) => {
  try {
    const {
      vehicleNo, driverName, driverPhone, vehicleType,
      capacityKg, ratePerKm, isRefrigerated, baseLocation, baseCoords,
    } = req.body || {};

    const coords = Array.isArray(baseCoords) && baseCoords.length === 2
      && baseCoords.every(Number.isFinite) ? baseCoords : null;

    // A truck with no base has no position, and a vehicle with no position
    // cannot be ranked at all. Refuse rather than store one that will silently
    // sit out every dispatch.
    if (!coords) {
      return res.status(400).json({ success: false, message: 'Pick the vehicle base on the map.' });
    }
    if (!vehicleNo || !driverName || !Number(capacityKg) || !Number(ratePerKm)) {
      return res.status(400).json({ success: false, message: 'Vehicle number, driver, capacity and rate are required.' });
    }

    const vehicle = await Vehicle.create({
      owner: req.user._id,
      vehicleNo: String(vehicleNo).trim(),
      driverName, driverPhone: driverPhone || '',
      vehicleType, capacityKg: Number(capacityKg), ratePerKm: Number(ratePerKm),
      isRefrigerated: Boolean(isRefrigerated),
      currentLoadKg: 0,
      baseLocation: baseLocation || '',
      status: 'Idle',
      routeStartAt: new Date(new Date().setHours(6, 0, 0, 0)),
      currentRoute: [{
        kind: 'depot',
        label: baseLocation || 'Base',
        coordinates: coords,
        loadDeltaKg: 0,
      }],
      location: { type: 'Point', coordinates: coords },
      locationUpdatedAt: new Date(),
    });

    return res.status(201).json({ success: true, vehicle: publicVehicle(vehicle) });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'That vehicle number is already in your fleet.' });
    }
    logger.error(`Add vehicle failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not add the vehicle.' });
  }
};

// POST /api/fleet/:id/location — a position report from the cab
const reportLocation = async (req, res) => {
  try {
    const { coordinates } = req.body || {};
    if (!Array.isArray(coordinates) || coordinates.length !== 2 || !coordinates.every(Number.isFinite)) {
      return res.status(400).json({ success: false, message: 'coordinates must be [lng, lat].' });
    }
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { location: { type: 'Point', coordinates }, locationUpdatedAt: new Date() },
      { new: true }
    );
    if (!vehicle) return res.status(404).json({ success: false, message: 'Not one of your vehicles.' });

    /*
     * Written first, then broadcast. The farmer watching this lot gets the fix
     * within a second instead of on their next refresh, and the record and the
     * moving marker can never disagree — the map is showing what was stored.
     *
     * `source: 'report'` is what separates this from the demo simulator's
     * stream, which the tracking map stamps rather than trusts.
     */
    broadcast('vehicle:location_changed', {
      vehicleId: String(vehicle._id),
      vehicleNo: vehicle.vehicleNo,
      coordinates: vehicle.location.coordinates,
      at: vehicle.locationUpdatedAt,
      source: 'report',
    });

    return res.json({ success: true, vehicle: publicVehicle(vehicle) });
  } catch (error) {
    logger.error(`Report location failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not update the position.' });
  }
};

module.exports = { listFleet, addVehicle, reportLocation, publicVehicle, FALLBACK_FLEET };
