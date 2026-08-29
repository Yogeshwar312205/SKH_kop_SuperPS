const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const PickupRequest = require('../models/PickupRequest');
const BuyerPosting = require('../models/BuyerPosting');
const EventJournal = require('../models/EventJournal');
const journal = require('../services/journal');
const snapshot = require('../services/snapshot');
const recovery = require('../services/recovery');
const recoveryState = require('../services/recoveryState');
const logger = require('../utils/logger');
const { getIsConnected } = require('../config/db');

/**
 * System Controller - Resilience & Blackout Challenge endpoints
 * 
 * These endpoints are UNAUTHENTICATED by design. Critical insight:
 * if the users collection is wiped, auth breaks (User.findById fails).
 * The console must be accessible to demonstrate recovery.
 * 
 * Guards: NODE_ENV !== 'production' OR RESILIENCE_DRILL_TOKEN header
 */

/**
 * Check if request is authorized for drill operations
 */
const isAuthorized = (req) => {
  // Always allow in non-production
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  // Check drill token
  const token = req.headers['resilience-drill-token'] || req.headers['x-drill-token'];
  const expectedToken = process.env.RESILIENCE_DRILL_TOKEN;

  if (expectedToken && token === expectedToken) {
    return true;
  }

  return false;
};

/**
 * GET /api/system/health - System health check
 * 
 * Scans database vs journal to detect corruption
 */
const getHealth = async (req, res) => {
  try {
    const dbConnected = getIsConnected();
    const journalStats = await journal.getStats();
    const snapshotStats = await snapshot.getStats();

    // Scan for corruption
    const scan = {
      byType: {},
      affected: [],
      recoverable: 0,
      unrecoverable: []
    };

    if (dbConnected) {
      // Count documents by type
      const counts = {
        User: await User.countDocuments(),
        Vehicle: await Vehicle.countDocuments(),
        PickupRequest: await PickupRequest.countDocuments(),
        BuyerPosting: await BuyerPosting.countDocuments()
      };

      // Count expected from journal
      const createEvents = await EventJournal.aggregate([
        { $match: { eventType: 'CREATE' } },
        { $group: { _id: '$entityType', count: { $sum: 1 } } }
      ]);

      const expectedCounts = {};
      createEvents.forEach(item => {
        expectedCounts[item._id] = item.count;
      });

      // Compare and detect corruption
      for (const entityType of ['User', 'Vehicle', 'PickupRequest', 'BuyerPosting']) {
        const inDb = counts[entityType] || 0;
        const expected = expectedCounts[entityType] || 0;
        const missing = Math.max(0, expected - inDb);

        // Detect corruption patterns
        let corrupt = 0;
        if (entityType === 'Vehicle') {
          corrupt = await Vehicle.countDocuments({
            drill: true,
            $or: [
              { capacityKg: { $lt: 0 } },
              { status: 'CORRUPTED' },
              { vehicleNo: { $regex: '^CORRUPTED-' } }
            ]
          });
        } else if (entityType === 'PickupRequest') {
          corrupt = await PickupRequest.countDocuments({
            drill: true,
            $or: [
              { quantityKg: { $lt: 0 } },
              { status: 'CORRUPTED' },
              { cropType: { $regex: '^CORRUPTED-' } }
            ]
          });
        } else if (entityType === 'User') {
          corrupt = await User.countDocuments({
            drill: true,
            $or: [
              { email: { $regex: '^corrupted-.*@invalid\\.local$' } },
              { phone: { $regex: '^000000' } }
            ]
          });
        } else if (entityType === 'BuyerPosting') {
          corrupt = await BuyerPosting.countDocuments({
            drill: true,
            $or: [
              { pricePerKg: { $lt: 0 } },
              { quantityKg: { $lt: 0 } }
            ]
          });
        }

        scan.byType[entityType] = {
          inDb,
          expected,
          missing,
          corrupt
        };

        if (missing > 0) {
          scan.affected.push({
            entityType,
            count: missing,
            kind: 'missing'
          });
          scan.recoverable += missing;
        }

        if (corrupt > 0) {
          scan.affected.push({
            entityType,
            count: corrupt,
            kind: 'corrupted'
          });
          scan.recoverable += corrupt;
        }
      }
    }

    // Drill scope count
    const drillCounts = dbConnected ? {
      User: await User.countDocuments({ drill: true }),
      Vehicle: await Vehicle.countDocuments({ drill: true }),
      PickupRequest: await PickupRequest.countDocuments({ drill: true }),
      BuyerPosting: await BuyerPosting.countDocuments({ drill: true })
    } : {};

    const drillScopeCount = Object.values(drillCounts).reduce((sum, c) => sum + c, 0);

    return res.json({
      db: dbConnected ? (scan.affected.length > 0 ? 'degraded' : 'online') : 'down',
      mongoConnected: dbConnected,
      journal: {
        status: journalStats.chainIntegrity.ok ? 'intact' : 'broken',
        events: journalStats.totalEvents,
        lastSeq: journalStats.currentSeq,
        chainOk: journalStats.chainIntegrity.ok
      },
      snapshot: {
        at: snapshotStats.latest?.timestamp || null,
        ageSec: snapshotStats.latest?.ageSeconds || 0,
        seq: snapshotStats.latest?.sequenceNumber || 0
      },
      recovery: recoveryState.get(),
      scan,
      queue: {
        pending: 0 // TODO: Count queued operations
      },
      drill: {
        scopeCount: drillScopeCount,
        lastRunAt: null // TODO: Track drill runs
      }
    });
  } catch (error) {
    logger.error(`[System] Health check failed: ${error.message}`);
    return res.status(500).json({
      db: 'unknown',
      mongoConnected: false,
      error: error.message
    });
  }
};

/**
 * POST /api/system/drill/seed - Create drill test data
 * 
 * Creates drill:true tagged documents:
 * - 2 farmers
 * - 1 fleet owner + 3 vehicles
 * - 4 pickup requests (mid-lifecycle)
 * - 1 buyer posting
 * - 1 document inserted via raw insertMany (bypasses journal = unrecoverable)
 */
const seedDrillData = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    logger.info('[Drill] Seeding test data...');

    // Take snapshot first (restore point)
    await snapshot.take();

    const created = {
      users: [],
      vehicles: [],
      requests: [],
      postings: []
    };

    // Create 2 farmers
    const farmer1 = await User.create({
      name: 'Ramesh Patil (Drill)',
      email: `drill-farmer1-${Date.now()}@test.local`,
      password: 'test123',
      phone: '9876543210',
      role: 'Farmer',
      drill: true
    });
    created.users.push(farmer1._id);

    // Journal event
    await journal.record({
      entityType: 'User',
      entityId: String(farmer1._id),
      eventType: 'CREATE',
      payload: farmer1.toObject(),
      actorId: 'drill'
    });

    const farmer2 = await User.create({
      name: 'Sanjay Deshmukh (Drill)',
      email: `drill-farmer2-${Date.now()}@test.local`,
      password: 'test123',
      phone: '9876543211',
      role: 'Farmer',
      drill: true
    });
    created.users.push(farmer2._id);

    await journal.record({
      entityType: 'User',
      entityId: String(farmer2._id),
      eventType: 'CREATE',
      payload: farmer2.toObject(),
      actorId: 'drill'
    });

    // Create 1 fleet owner
    const fleetOwner = await User.create({
      name: 'Suresh Transport (Drill)',
      email: `drill-fleet-${Date.now()}@test.local`,
      password: 'test123',
      phone: '9876543212',
      role: 'Logistics',
      drill: true
    });
    created.users.push(fleetOwner._id);

    await journal.record({
      entityType: 'User',
      entityId: String(fleetOwner._id),
      eventType: 'CREATE',
      payload: fleetOwner.toObject(),
      actorId: 'drill'
    });

    // Create 3 vehicles
    const baseCoords = [74.4765, 19.8826]; // Kopargaon
    for (let i = 0; i < 3; i++) {
      const vehicle = await Vehicle.create({
        owner: fleetOwner._id,
        vehicleNo: `MH15-DRILL-${i + 1}00${i}`,
        driverName: `Driver ${i + 1} (Drill)`,
        driverPhone: `987654321${i}`,
        vehicleType: 'Mini Truck',
        capacityKg: 2000 + (i * 500),
        ratePerKm: 12 + i,
        currentLoadKg: 0,
        baseLocation: 'Kopargaon ST Depot',
        status: 'Idle',
        currentRoute: [{
          kind: 'depot',
          label: 'Kopargaon ST Depot',
          coordinates: baseCoords,
          loadDeltaKg: 0
        }],
        location: { type: 'Point', coordinates: baseCoords },
        drill: true
      });
      created.vehicles.push(vehicle._id);

      await journal.record({
        entityType: 'Vehicle',
        entityId: String(vehicle._id),
        eventType: 'CREATE',
        payload: vehicle.toObject(),
        actorId: 'drill'
      });
    }

    // Create 4 pickup requests (varying statuses)
    const statuses = ['pending', 'assigned', 'collected', 'in_transit'];
    for (let i = 0; i < 4; i++) {
      const request = await PickupRequest.create({
        farmer: farmer1._id,
        farmerName: farmer1.name,
        farmerPhone: farmer1.phone,
        cropType: i % 2 === 0 ? 'Tomato' : 'Onion',
        quantityKg: 500 + (i * 100),
        origin: {
          label: 'Farm Location',
          coordinates: [74.4765 + (i * 0.01), 19.8826 + (i * 0.01)]
        },
        destination: {
          label: 'Kopargaon APMC',
          coordinates: [74.4712, 19.8801]
        },
        pickupDate: new Date().toISOString().split('T')[0],
        status: statuses[i],
        assignedVehicle: i > 0 ? created.vehicles[i - 1] : null,
        assignedOwner: i > 0 ? fleetOwner._id : null,
        timeline: [{ status: statuses[i], note: `Drill request ${i + 1}` }],
        drill: true
      });
      created.requests.push(request._id);

      await journal.record({
        entityType: 'PickupRequest',
        entityId: String(request._id),
        eventType: 'CREATE',
        payload: request.toObject(),
        actorId: 'drill'
      });
    }

    // Create 1 buyer posting
    const posting = await BuyerPosting.create({
      buyer: farmer2._id, // Reusing as buyer
      cropType: 'Tomato',
      grade: 'A Grade',
      offeredPricePerKg: 25,
      requiredQuantityKg: 5000,
      mandiName: 'Kopargaon',
      status: 'Active Procurement',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      drill: true
    });
    created.postings.push(posting._id);

    await journal.record({
      entityType: 'BuyerPosting',
      entityId: String(posting._id),
      eventType: 'CREATE',
      payload: posting.toObject(),
      actorId: 'drill'
    });

    // CRITICAL: Create 1 "unrecoverable" document via raw insert (bypasses journal)
    // This demonstrates honest recovery - not everything can be saved
    const unrecoverable = {
      buyer: farmer2._id,
      cropType: 'Onion',
      grade: 'B Grade',
      offeredPricePerKg: 20,
      requiredQuantityKg: 3000,
      mandiName: 'Nashik',
      status: 'Active Procurement',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      drill: true
    };

    const insertResult = await BuyerPosting.insertMany([unrecoverable]);
    created.postings.push(insertResult[0]._id);
    // NOTE: No journal.record call - this is intentional!

    logger.info(`[Drill] Seeded: ${created.users.length} users, ${created.vehicles.length} vehicles, ${created.requests.length} requests, ${created.postings.length} postings`);

    return res.json({
      success: true,
      message: 'Drill data seeded',
      created: {
        users: created.users.length,
        vehicles: created.vehicles.length,
        requests: created.requests.length,
        postings: created.postings.length,
        unrecoverable: 1
      }
    });
  } catch (error) {
    logger.error(`[Drill] Seed failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to seed drill data',
      error: error.message
    });
  }
};

/**
 * POST /api/system/drill/blackout - Simulate database corruption
 * 
 * Deletes ~60% of drill:true documents and corrupts remaining 40%
 */
const simulateBlackout = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    logger.info('[Drill] Simulating blackout...');

    // Auto-snapshot first (restore point)
    await snapshot.take();

    const results = {
      deleted: 0,
      corrupted: 0
    };

    // Get all drill documents
    const drillUsers = await User.find({ drill: true });
    const drillVehicles = await Vehicle.find({ drill: true });
    const drillRequests = await PickupRequest.find({ drill: true });
    const drillPostings = await BuyerPosting.find({ drill: true });

    const allDrill = [
      ...drillUsers.map(d => ({ type: 'User', id: d._id })),
      ...drillVehicles.map(d => ({ type: 'Vehicle', id: d._id })),
      ...drillRequests.map(d => ({ type: 'PickupRequest', id: d._id })),
      ...drillPostings.map(d => ({ type: 'BuyerPosting', id: d._id }))
    ];

    // Shuffle
    const shuffled = allDrill.sort(() => Math.random() - 0.5);

    // Delete 60%
    const deleteCount = Math.floor(shuffled.length * 0.6);
    for (let i = 0; i < deleteCount; i++) {
      const doc = shuffled[i];
      const Model = getModel(doc.type);
      await Model.deleteOne({ _id: doc.id });
      results.deleted++;
    }

    // Corrupt 40% (bypass validation by using Model.collection.updateOne)
    for (let i = deleteCount; i < shuffled.length; i++) {
      const doc = shuffled[i];
      const corruptionId = Date.now() + i; // Unique corruption marker

      if (doc.type === 'Vehicle') {
        // Use raw collection to bypass geospatial validation
        await Vehicle.collection.updateOne(
          { _id: doc.id },
          {
            $set: {
              capacityKg: -9999, // Invalid negative capacity
              status: 'CORRUPTED', // Invalid status
              vehicleNo: `CORRUPTED-${corruptionId}` // Invalid vehicle number (unique)
            }
          }
        );
        results.corrupted++;
      } else if (doc.type === 'PickupRequest') {
        // Use raw collection to bypass geospatial validation
        await PickupRequest.collection.updateOne(
          { _id: doc.id },
          {
            $set: {
              quantityKg: -9999, // Invalid negative quantity
              status: 'CORRUPTED', // Invalid status
              cropType: `CORRUPTED-${corruptionId}` // Invalid crop type (unique)
            }
          }
        );
        results.corrupted++;
      } else if (doc.type === 'User') {
        await User.collection.updateOne(
          { _id: doc.id },
          {
            $set: {
              email: `corrupted-${corruptionId}@invalid.local`, // Invalid email (unique)
              phone: `000000${String(corruptionId).slice(-4)}` // Invalid phone (unique)
            }
          }
        );
        results.corrupted++;
      } else if (doc.type === 'BuyerPosting') {
        await BuyerPosting.updateOne({ _id: doc.id }, {
          $set: {
            pricePerKg: -9999, // Invalid negative price
            quantityKg: -9999 // Invalid negative quantity
          }
        });
        results.corrupted++;
      }
    }

    // Set state to blackout
    recoveryState.set('blackout');

    logger.info(`[Drill] Blackout complete: ${results.deleted} deleted, ${results.corrupted} corrupted`);

    return res.json({
      success: true,
      message: 'Blackout simulated',
      results
    });
  } catch (error) {
    logger.error(`[Drill] Blackout failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to simulate blackout',
      error: error.message
    });
  }
};

/**
 * POST /api/system/recover - Start recovery process
 */
const recoverSystem = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    logger.info('[Recovery] Starting recovery...');

    const result = await recovery.recover();

    return res.json({
      success: true,
      message: 'Recovery complete',
      result
    });
  } catch (error) {
    logger.error(`[Recovery] Failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Recovery failed',
      error: error.message
    });
  }
};

/**
 * POST /api/system/drill/reset - Clean up drill data
 */
const resetDrill = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    logger.info('[Drill] Resetting...');

    // Delete all drill:true documents
    const results = {
      users: await User.deleteMany({ drill: true }),
      vehicles: await Vehicle.deleteMany({ drill: true }),
      requests: await PickupRequest.deleteMany({ drill: true }),
      postings: await BuyerPosting.deleteMany({ drill: true })
    };

    // Reset state
    recoveryState.set('idle');

    logger.info('[Drill] Reset complete');

    return res.json({
      success: true,
      message: 'Drill reset',
      deleted: {
        users: results.users.deletedCount,
        vehicles: results.vehicles.deletedCount,
        requests: results.requests.deletedCount,
        postings: results.postings.deletedCount
      }
    });
  } catch (error) {
    logger.error(`[Drill] Reset failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Reset failed',
      error: error.message
    });
  }
};

/**
 * POST /api/system/snapshot - Manual snapshot
 */
const takeSnapshot = async (req, res) => {
  if (!isAuthorized(req)) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    const result = await snapshot.take();

    return res.json({
      success: true,
      message: 'Snapshot created',
      snapshot: {
        snapshotId: result.snapshotId,
        sequenceNumber: result.sequenceNumber,
        duration: result.duration
      }
    });
  } catch (error) {
    logger.error(`[System] Snapshot failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Snapshot failed',
      error: error.message
    });
  }
};

/**
 * Helper: Get model by type name
 */
function getModel(typeName) {
  const models = {
    User,
    Vehicle,
    PickupRequest,
    BuyerPosting
  };
  return models[typeName];
}

module.exports = {
  getHealth,
  seedDrillData,
  simulateBlackout,
  recoverSystem,
  resetDrill,
  takeSnapshot
};
