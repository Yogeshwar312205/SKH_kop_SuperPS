const mongoose = require('mongoose');
const Consignment = require('../models/Consignment');
const RuleDecision = require('../models/RuleDecision');
const BusStop = require('../models/BusStop');
const BusTrip = require('../models/BusTrip');
const logger = require('../utils/logger');
const commodityClassifier = require('../services/commodityClassifier');
const routeValidator = require('../services/routeValidator');

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// POST /api/v2/consignments — create a consignment (triggers eligibility + assign)
const createConsignment = async (req, res) => {
  try {
    const {
      originStopId, destStopId, commodity, cargoClass, packagingType,
      weightKg, pieceCount, maxPieceWeightKg, declaredValue, readyAt, deadlineAt,
    } = req.body || {};

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        consignment: {
          id: 'cons-' + Date.now(),
          farmerId: req.user._id,
          farmerName: req.user.name,
          originStopId,
          destStopId,
          commodity: commodity || 'Soybean Seeds',
          cargoClass: cargoClass || 'A',
          packagingType: packagingType || 'jute-sack',
          weightKg: weightKg || 35,
          pieceCount: pieceCount || 1,
          maxPieceWeightKg: maxPieceWeightKg || 35,
          declaredValue: declaredValue || 15000,
          readyAt: readyAt || new Date().toISOString(),
          deadlineAt: deadlineAt || new Date(Date.now() + 24 * 3600000).toISOString(),
          status: 'assigned',
          bookingCode: `BP-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-00001`,
          weatherRiskScore: 42,
        },
      });
    }

    // ========================================================================
    // Phase 1: Validation & Commodity Classification
    // ========================================================================
    
    // Validate required fields
    if (!originStopId || !destStopId || !commodity || !weightKg || !readyAt) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: originStopId, destStopId, commodity, weightKg, readyAt'
      });
    }

    // Resolve stops safely (supports ObjectIds, codes, and mock IDs like 'stop-002')
    const originStop = await routeValidator.findBusStop(originStopId);
    const destStop = await routeValidator.findBusStop(destStopId);

    if (!originStop) {
      return res.status(400).json({
        success: false,
        message: `Origin stop not found (${originStopId})`
      });
    }

    if (!destStop) {
      return res.status(400).json({
        success: false,
        message: `Destination stop not found (${destStopId})`
      });
    }

    const realOriginStopId = originStop._id;
    const realDestStopId = destStop._id;
    
    // Classify commodity
    const commodityValidation = commodityClassifier.validateCommodityForBus(
      commodity,
      packagingType,
      weightKg,
      pieceCount
    );
    
    // Reject if hazardous
    if (!commodityValidation.isValid) {
      const bookingCode = await Consignment.generateBookingCode();
      const consignment = await Consignment.create({
        farmerId: req.user._id,
        farmerName: req.user.name,
        farmerPhone: req.user.phone || '',
        originStopId: realOriginStopId,
        destStopId: realDestStopId,
        commodity,
        commodityMetadata: {
          category: commodityValidation.classification.category,
          subcategory: commodityValidation.classification.subcategory,
          confidence: commodityValidation.classification.confidence,
          busEligible: false,
          matchedKeyword: commodityValidation.classification.matchedKeyword,
        },
        cargoClass: 'D',
        packagingType: packagingType || 'loose',
        weightKg,
        pieceCount: pieceCount || 1,
        maxPieceWeightKg: maxPieceWeightKg || weightKg,
        declaredValue: declaredValue || 0,
        readyAt: new Date(readyAt),
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        bookingCode,
      });
      
      consignment.addStatusHistory('created', 'farmer', 'Consignment created');
      consignment.addStatusHistory('rejected', 'system', commodityValidation.errors[0].message);
      await consignment.save();
      
      // Save rejection decision
      await RuleDecision.create({
        consignmentId: String(consignment._id),
        decision: 'REJECTED',
        network: 'none',
        trace: commodityValidation.rules,
        summary: commodityValidation.errors[0].message,
        evaluatedAt: new Date(),
      });
      
      return res.status(400).json({
        success: false,
        message: 'Consignment rejected',
        reason: commodityValidation.errors[0].message,
        errors: commodityValidation.errors,
        bookingCode,
        consignmentId: String(consignment._id)
      });
    }
    
    // ========================================================================
    // Phase 2: Route Validation
    // ========================================================================
    
    const serviceDateStr = readyAt ? String(readyAt).slice(0, 10) : new Date().toISOString().slice(0, 10);
    
    const routePreview = await routeValidator.getRoutePreview(
      realOriginStopId,
      realDestStopId,
      serviceDateStr,
      weightKg
    );
    
    if (!routePreview.isValid || !routePreview.hasAvailableTrips) {
      const bookingCode = await Consignment.generateBookingCode();
      const consignment = await Consignment.create({
        farmerId: req.user._id,
        farmerName: req.user.name,
        farmerPhone: req.user.phone || '',
        originStopId: realOriginStopId,
        destStopId: realDestStopId,
        commodity,
        commodityMetadata: {
          category: commodityValidation.classification.category,
          subcategory: commodityValidation.classification.subcategory,
          confidence: commodityValidation.classification.confidence,
          busEligible: true,
          matchedKeyword: commodityValidation.classification.matchedKeyword,
        },
        cargoClass: cargoClass || commodityValidation.classification.cargoClass,
        packagingType: packagingType || 'loose',
        weightKg,
        pieceCount: pieceCount || 1,
        maxPieceWeightKg: maxPieceWeightKg || weightKg,
        declaredValue: declaredValue || 0,
        readyAt: new Date(readyAt),
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        bookingCode,
      });
      
      consignment.addStatusHistory('created', 'farmer', 'Consignment created');
      consignment.addStatusHistory('searching_trip', 'system', 'Searching for available trips');
      consignment.addStatusHistory('rerouted_to_fleet', 'system', 
        routePreview.error || 'No available bus trips - rerouting to fleet'
      );
      await consignment.save();
      
      // Save reroute decision
      await RuleDecision.create({
        consignmentId: String(consignment._id),
        decision: 'REROUTED_TO_FLEET',
        network: 'fleet',
        trace: [
          { rule: 'ROUTE-01', result: 'FAIL', detail: routePreview.error || 'No route available' }
        ],
        summary: routePreview.recommendation || 'No available bus trips',
        evaluatedAt: new Date(),
      });
      
      return res.status(200).json({
        success: true,
        source: 'database',
        consignment: {
          id: String(consignment._id),
          bookingCode: consignment.bookingCode,
          status: consignment.status,
          network: 'fleet',
          message: 'Consignment created but rerouted to fleet - no bus availability'
        }
      });
    }
    
    // ========================================================================
    // Phase 3: Trip Assignment with Atomic Capacity Update
    // ========================================================================
    
    // Get the best route (first one with available trips)
    const bestRoute = routePreview.routes.find(r => r.availableTrips.length > 0);
    if (!bestRoute || !bestRoute.availableTrips || bestRoute.availableTrips.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Route validation passed but no trips available'
      });
    }
    
    // Get the best trip (first available)
    const bestTrip = bestRoute.availableTrips[0];
    
    // Atomic capacity update
    const updatedTrip = await BusTrip.findOneAndUpdate(
      {
        _id: bestTrip.tripId,
        status: { $in: ['scheduled', 'running'] },
        $expr: { $gte: [{ $subtract: ['$predictedSpareKg', '$cargoUsedKg'] }, weightKg] }
      },
      {
        $inc: { cargoUsedKg: weightKg }
      },
      { new: true }
    );
    
    if (!updatedTrip) {
      return res.status(409).json({
        success: false,
        message: 'Trip capacity no longer available (concurrent booking)',
        code: 'CAPACITY_CONFLICT'
      });
    }
    
    // ========================================================================
    // Phase 4: Create Consignment with Assignment
    // ========================================================================
    
    const bookingCode = await Consignment.generateBookingCode();
    
    // Calculate costs (simplified)
    const distanceKm = bestRoute.segmentDistanceKm;
    const baseCostPerKm = 3; // ₹3/kg/km
    const totalCost = Math.round(weightKg * distanceKm * baseCostPerKm);
    
    const consignment = await Consignment.create({
      farmerId: req.user._id,
      farmerName: req.user.name,
      farmerPhone: req.user.phone || '',
      originStopId: realOriginStopId,
      destStopId: realDestStopId,
      commodity,
      commodityMetadata: {
        category: commodityValidation.classification.category,
        subcategory: commodityValidation.classification.subcategory,
        confidence: commodityValidation.classification.confidence,
        busEligible: true,
        matchedKeyword: commodityValidation.classification.matchedKeyword,
      },
      cargoClass: cargoClass || commodityValidation.classification.cargoClass,
      packagingType: packagingType || 'loose',
      weightKg,
      pieceCount: pieceCount || 1,
      maxPieceWeightKg: maxPieceWeightKg || weightKg,
      declaredValue: declaredValue || 0,
      readyAt: new Date(readyAt),
      deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
      bookingCode,
      assignment: {
        legs: [{
          tripId: bestTrip.tripId,
          boardStopId: realOriginStopId,
          alightStopId: realDestStopId,
        }],
        totalCost,
        network: 'bus',
      },
    });
    
    // Add status history
    consignment.addStatusHistory('created', 'farmer', 'Consignment created');
    consignment.addStatusHistory('validating', 'system', 'Validating commodity and route');
    consignment.addStatusHistory('searching_trip', 'system', 'Searching for available trips');
    consignment.addStatusHistory('assigned', 'system', 
      `Assigned to trip ${bestTrip.tripId} departing at ${bestTrip.departureTime}`
    );
    
    await consignment.save();
    
    // ========================================================================
    // Phase 5: Save Decision Trace
    // ========================================================================
    
    const trace = commodityValidation.rules.map(r => ({
      rule: r.rule || r.code,
      result: r.result,
      detail: r.detail
    })).concat([
      {
        rule: 'ROUTE-01',
        result: 'PASS',
        detail: `Route ${bestRoute.routeCode} available between stops`
      },
      {
        rule: 'CAP-01',
        result: 'PASS',
        tripId: bestTrip.tripId,
        detail: `Required ${weightKg}kg, available ${bestTrip.availableCapacityKg}kg`
      }
    ]);
    
    if (commodityValidation.warnings.length > 0) {
      commodityValidation.warnings.forEach(w => {
        trace.push({
          rule: w.rule,
          result: 'WARN',
          detail: w.message
        });
      });
    }
    
    await RuleDecision.create({
      consignmentId: String(consignment._id),
      decision: 'ASSIGNED',
      network: 'bus',
      trace,
      chosen: `${bestRoute.routeCode} - ${bestTrip.departureTime}`,
      summary: `Assigned to ${bestRoute.routeName}, departing ${bestTrip.departureTime}. ${bestRoute.travelTimeMin} min journey, ₹${totalCost} fare.`,
      evaluatedAt: new Date(),
    });
    
    // ========================================================================
    // Phase 6: Emit Real-time Events
    // ========================================================================
    
    try {
      const busSocket = require('../sockets/busSocket');
      busSocket.emitConsignmentReassigned(String(consignment._id), {
        consignmentId: String(consignment._id),
        tripId: bestTrip.tripId,
        status: 'assigned',
      });
      busSocket.emitCapacityUpdated(bestTrip.tripId, {
        tripId: bestTrip.tripId,
        cargoUsedKg: updatedTrip.cargoUsedKg,
        availableKg: updatedTrip.predictedSpareKg - updatedTrip.cargoUsedKg,
      });
    } catch (socketError) {
      logger.warn('Socket event emission failed:', socketError.message);
    }
    
    // ========================================================================
    // Phase 7: Return Success Response
    // ========================================================================
    
    return res.status(201).json({
      success: true,
      source: 'database',
      consignment: {
        id: String(consignment._id),
        bookingCode: consignment.bookingCode,
        farmerId: String(consignment.farmerId),
        farmerName: consignment.farmerName,
        originStop: {
          id: String(originStop._id),
          name: originStop?.name,
          code: originStop?.code
        },
        destStop: {
          id: String(destStop._id),
          name: destStop?.name,
          code: destStop?.code
        },
        commodity: consignment.commodity,
        commodityClassification: consignment.commodityMetadata,
        cargoClass: consignment.cargoClass,
        packagingType: consignment.packagingType,
        weightKg: consignment.weightKg,
        status: consignment.status,
        assignment: {
          network: 'bus',
          routeCode: bestRoute.routeCode,
          routeName: bestRoute.routeName,
          tripId: bestTrip.tripId,
          departureTime: bestTrip.departureTime,
          travelTimeMin: bestRoute.travelTimeMin,
          distanceKm: bestRoute.segmentDistanceKm,
          totalCost,
        },
        timeline: consignment.statusHistory,
        createdAt: consignment.createdAt,
      },
    });
    
  } catch (error) {
    logger.error(`Create consignment failed: ${error.message}`);
    logger.error(error.stack);
    return res.status(503).json({ 
      success: false, 
      message: 'Could not create consignment.',
      error: error.message 
    });
  }
};

// GET /api/v2/consignments?status=&class=
const getConsignments = async (req, res) => {
  try {
    const { status, class: cargoClass, farmerId } = req.query;

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        count: 2,
        consignments: [
          {
            id: 'cons-001',
            bookingCode: 'BP-20260829-00001',
            farmerName: 'Ramesh Singh',
            commodity: 'Soybean Seeds',
            cargoClass: 'A',
            weightKg: 35,
            status: 'assigned',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'cons-002',
            bookingCode: 'BP-20260829-00002',
            farmerName: 'Pesticide Order',
            commodity: 'Pesticide',
            cargoClass: 'D',
            weightKg: 50,
            status: 'rerouted_to_fleet',
            createdAt: new Date().toISOString(),
          },
        ],
      });
    }

    const query = {};
    
    // Filter by status
    if (status) {
      query.status = status;
    }
    
    // Filter by cargo class
    if (cargoClass) {
      query.cargoClass = cargoClass;
    }
    
    // Filter by farmer ID (for farmer's booking history)
    if (farmerId) {
      query.farmerId = farmerId;
    } else if (req.user.role === 'Farmer') {
      // If farmer, only show their own consignments
      query.farmerId = req.user._id;
    }

    const consignments = await Consignment.find(query)
      .populate('originStopId destStopId')
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      source: 'database',
      count: consignments.length,
      consignments: consignments.map((c) => ({
        id: String(c._id),
        bookingCode: c.bookingCode,
        farmerName: c.farmerName,
        farmerId: String(c.farmerId),
        commodity: c.commodity,
        commodityCategory: c.commodityMetadata?.category,
        cargoClass: c.cargoClass,
        weightKg: c.weightKg,
        status: c.status,
        originStop: {
          id: String(c.originStopId?._id || c.originStopId || ''),
          name: c.originStopId?.name || '',
          code: c.originStopId?.code || ''
        },
        destStop: {
          id: String(c.destStopId?._id || c.destStopId || ''),
          name: c.destStopId?.name || '',
          code: c.destStopId?.code || ''
        },
        assignment: c.assignment,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
    });
  } catch (error) {
    logger.error(`Get consignments failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load consignments.' });
  }
};

// GET /api/v2/consignments/:id
const getConsignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        consignment: {
          id,
          bookingCode: 'BP-20260829-00001',
          farmerName: 'Ramesh Singh',
          commodity: 'Soybean Seeds',
          cargoClass: 'A',
          packagingType: 'jute-sack',
          weightKg: 35,
          status: 'assigned',
          assignment: {
            legs: [
              {
                tripId: 'trip-001',
                boardStopId: 'stop-001',
                alightStopId: 'stop-002',
                etd: new Date(Date.now() + 3600000).toISOString(),
                eta: new Date(Date.now() + 5400000).toISOString(),
              },
            ],
            totalCost: 180,
            network: 'bus',
          },
          weatherRiskScore: 42,
          statusHistory: [
            { status: 'created', timestamp: new Date(Date.now() - 3600000).toISOString(), actor: 'farmer' },
            { status: 'assigned', timestamp: new Date(Date.now() - 1800000).toISOString(), actor: 'system' },
          ]
        },
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const consignment = await Consignment.findOne(isObjectId ? { _id: id } : { bookingCode: id })
      .populate('originStopId destStopId')
      .populate('assignment.legs.tripId');

    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found.' });
    }
    
    // Check authorization - farmers can only see their own
    if (req.user.role === 'Farmer' && String(consignment.farmerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.json({
      success: true,
      source: 'database',
      consignment: {
        id: String(consignment._id),
        bookingCode: consignment.bookingCode,
        farmerId: String(consignment.farmerId),
        farmerName: consignment.farmerName,
        farmerPhone: consignment.farmerPhone,
        commodity: consignment.commodity,
        commodityMetadata: consignment.commodityMetadata,
        cargoClass: consignment.cargoClass,
        packagingType: consignment.packagingType,
        weightKg: consignment.weightKg,
        pieceCount: consignment.pieceCount,
        declaredValue: consignment.declaredValue,
        status: consignment.status,
        originStop: {
          id: String(consignment.originStopId._id),
          name: consignment.originStopId.name,
          code: consignment.originStopId.code,
          location: consignment.originStopId.location
        },
        destStop: {
          id: String(consignment.destStopId._id),
          name: consignment.destStopId.name,
          code: consignment.destStopId.code,
          location: consignment.destStopId.location
        },
        assignment: consignment.assignment,
        statusHistory: consignment.statusHistory,
        readyAt: consignment.readyAt,
        deadlineAt: consignment.deadlineAt,
        weatherRiskScore: consignment.weatherRiskScore,
        createdAt: consignment.createdAt,
        updatedAt: consignment.updatedAt,
      },
    });
  } catch (error) {
    logger.error(`Get consignment failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load consignment.' });
  }
};

// GET /api/v2/consignments/:id/tracking — tracking timeline
const getConsignmentTracking = async (req, res) => {
  try {
    const { id } = req.params;

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        tracking: {
          consignmentId: id,
          bookingCode: 'BP-20260829-00001',
          currentStatus: 'in_transit',
          timeline: [
            { 
              status: 'created', 
              timestamp: new Date(Date.now() - 7200000).toISOString(), 
              actor: 'farmer',
              note: 'Booking created',
              location: 'Kopargaon APMC'
            },
            { 
              status: 'validating', 
              timestamp: new Date(Date.now() - 7100000).toISOString(), 
              actor: 'system',
              note: 'Validating commodity and route'
            },
            { 
              status: 'assigned', 
              timestamp: new Date(Date.now() - 7000000).toISOString(), 
              actor: 'system',
              note: 'Assigned to bus trip T-SHIRDI-0600'
            },
            { 
              status: 'confirmed', 
              timestamp: new Date(Date.now() - 5400000).toISOString(), 
              actor: 'farmer',
              note: 'Payment confirmed'
            },
            { 
              status: 'loaded', 
              timestamp: new Date(Date.now() - 3600000).toISOString(), 
              actor: 'depot_clerk',
              note: 'Loaded on bus',
              location: 'Kopargaon ST Depot'
            },
            { 
              status: 'in_transit', 
              timestamp: new Date(Date.now() - 3540000).toISOString(), 
              actor: 'driver',
              note: 'Bus departed',
              location: 'Kopargaon ST Depot'
            }
          ],
          estimatedArrival: new Date(Date.now() + 1800000).toISOString(),
          nextMilestone: 'arrived'
        }
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const consignment = await Consignment.findOne(isObjectId ? { _id: id } : { bookingCode: id })
      .populate('originStopId destStopId');

    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found.' });
    }
    
    // Check authorization
    if (req.user.role === 'Farmer' && String(consignment.farmerId) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Get estimated arrival
    const estimatedArrival = consignment.getEstimatedArrival();
    
    // Determine next milestone
    const statusFlow = [
      'created', 'validating', 'searching_trip', 'assigned', 
      'payment_pending', 'confirmed', 'ready_for_drop', 
      'received_at_stop', 'loaded', 'in_transit', 
      'arrived', 'delivered'
    ];
    
    const currentIndex = statusFlow.indexOf(consignment.status);
    const nextMilestone = currentIndex >= 0 && currentIndex < statusFlow.length - 1 
      ? statusFlow[currentIndex + 1]
      : null;

    return res.json({
      success: true,
      source: 'database',
      tracking: {
        consignmentId: String(consignment._id),
        bookingCode: consignment.bookingCode,
        currentStatus: consignment.status,
        timeline: consignment.statusHistory.map(h => ({
          status: h.status,
          timestamp: h.timestamp,
          actor: h.actor,
          note: h.note,
          location: h.location,
          metadata: h.metadata
        })),
        estimatedArrival,
        nextMilestone,
        originStop: consignment.originStopId?.name,
        destStop: consignment.destStopId?.name,
        transitDuration: consignment.getTransitDuration()
      }
    });
  } catch (error) {
    logger.error(`Get consignment tracking failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load tracking information.' });
  }
};

// GET /api/v2/consignments/:id/explain — the decision trace (§6.2)
const explainConsignment = async (req, res) => {
  try {
    const { id } = req.params;

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        decision: {
          consignmentId: id,
          decision: 'ASSIGNED',
          trace: [
            { rule: 'SAF-01', result: 'PASS', detail: 'Commodity "soybean seed" not on hazardous list' },
            { rule: 'PHY-01', result: 'PASS', detail: '35 kg ≤ 50 kg piece limit' },
            { rule: 'WX-01', result: 'WARN', tripId: 'trip-001', detail: 'Rain 62% on R-SHIRDI 14:00–17:00; packaging "jute sack" not waterproof → WRS 58 (MEDIUM), +₹40 penalty' },
            { rule: 'CAP-01', result: 'PASS', tripId: 'trip-002', detail: 'Needs 35 kg, 90 kg spare' },
          ],
          chosen: 'T-SHIRDI-1610',
          summary: 'Assigned to 16:10 Kopargaon→Shirdi. Rain risk is moderate — use a lined sack. The 14:00 had only 18 kg spare.',
          evaluatedAt: new Date().toISOString(),
        },
      });
    }

    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    const consignment = await Consignment.findOne(isObjectId ? { _id: id } : { bookingCode: id });
    if (!consignment) {
      return res.status(404).json({ success: false, message: 'Consignment not found.' });
    }

    const decision = await RuleDecision.findOne({ consignmentId: consignment._id }).sort({ evaluatedAt: -1 });
    if (!decision) {
      return res.status(404).json({ success: false, message: 'No decision trace found for this consignment.' });
    }

    return res.json({
      success: true,
      source: 'database',
      decision: {
        consignmentId: String(decision.consignmentId),
        decision: decision.decision,
        trace: decision.trace,
        chosen: decision.chosen,
        summary: decision.summary,
        evaluatedAt: decision.evaluatedAt,
      },
    });
  } catch (error) {
    logger.error(`Explain consignment failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load decision trace.' });
  }
};

module.exports = {
  createConsignment,
  getConsignments,
  getConsignment,
  getConsignmentTracking,
  explainConsignment,
};
