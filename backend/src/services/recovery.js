const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const PickupRequest = require('../models/PickupRequest');
const BuyerPosting = require('../models/BuyerPosting');
const EventJournal = require('../models/EventJournal');
const journal = require('./journal');
const snapshot = require('./snapshot');
const recoveryState = require('./recoveryState');
const logger = require('../utils/logger');
const { broadcast } = require('../sockets/bus');

/**
 * Recovery Engine - Reconstruct data from snapshots + events
 * 
 * This is the heart of the resilience system. When database corruption is
 * detected, this service:
 * 
 * 1. Loads the latest snapshot (point-in-time state)
 * 2. Replays events after the snapshot (changes since then)
 * 3. Reconstructs current state by folding events
 * 4. Validates reconstructed documents
 * 5. Restores to primary database (Users first!)
 * 6. Replays queued operations from during the outage
 * 
 * Progress is streamed via Socket.IO so the frontend can animate.
 */

class RecoveryService {
  constructor() {
    this.isRecovering = false;
  }

  /**
   * Main recovery process
   * 
   * @param {Object} options - Recovery options
   * @returns {Promise<Object>} Recovery result
   */
  async recover(options = {}) {
    if (this.isRecovering) {
      throw new Error('Recovery already in progress');
    }

    this.isRecovering = true;
    recoveryState.set('recovering');

    const result = {
      startTime: new Date(),
      stages: [],
      recovered: 0,
      failed: 0,
      unrecoverable: [],
      consistency: 0
    };

    try {
      // Stage 1: Detect corruption
      const detected = await this.detectCorruption();
      result.stages.push({ name: 'detect', status: 'completed', ...detected });
      this.emitProgress('detect', 'completed', detected);

      if (detected.affected.length === 0) {
        logger.info('[Recovery] No corruption detected');
        result.stages.push({ name: 'complete', status: 'completed', message: 'No corruption found' });
        this.emitProgress('complete', 'completed', { message: 'No corruption found' });
        recoveryState.set('idle');
        this.isRecovering = false;
        return result;
      }

      // Stage 2: Load snapshot
      this.emitProgress('snapshot', 'in_progress');
      const { snapshot: snapshotDoc, data: snapshotData } = await this.loadSnapshot();
      result.stages.push({ 
        name: 'snapshot', 
        status: 'completed',
        snapshotId: snapshotDoc.snapshotId,
        sequenceNumber: snapshotDoc.sequenceNumber
      });
      this.emitProgress('snapshot', 'completed', { snapshotId: snapshotDoc.snapshotId });

      // Stage 3: Replay events
      this.emitProgress('replay', 'in_progress');
      const events = await journal.getEventsSince(snapshotDoc.sequenceNumber);
      result.stages.push({ 
        name: 'replay', 
        status: 'completed',
        eventCount: events.length
      });
      this.emitProgress('replay', 'completed', { eventCount: events.length });

      // Stage 4: Reconstruct state
      this.emitProgress('reconstruct', 'in_progress');
      const reconstructed = await this.reconstructState(snapshotData, events, detected.affectedIds);
      result.stages.push({ 
        name: 'reconstruct', 
        status: 'completed',
        reconstructed: Object.values(reconstructed).reduce((sum, arr) => sum + arr.length, 0)
      });
      this.emitProgress('reconstruct', 'completed', { 
        reconstructed: Object.values(reconstructed).reduce((sum, arr) => sum + arr.length, 0)
      });

      // Stage 5: Validate
      this.emitProgress('validate', 'in_progress');
      const validated = await this.validateDocuments(reconstructed);
      result.stages.push({ 
        name: 'validate', 
        status: 'completed',
        valid: validated.valid.length,
        invalid: validated.invalid.length
      });
      result.unrecoverable = validated.invalid.map(v => ({
        entityType: v.entityType,
        entityId: v.entityId,
        reason: v.error
      }));
      this.emitProgress('validate', 'completed', { 
        valid: validated.valid.length,
        invalid: validated.invalid.length
      });

      // Stage 6: Restore to database (Users first!)
      this.emitProgress('restore', 'in_progress');
      const restored = await this.restoreToDatabase(validated.valid);
      result.stages.push({ 
        name: 'restore', 
        status: 'completed',
        restored: restored.count
      });
      result.recovered = restored.count;
      result.failed = validated.invalid.length;
      this.emitProgress('restore', 'completed', { restored: restored.count });

      // Stage 7: Replay queued operations
      this.emitProgress('queue', 'in_progress');
      const queueResult = await this.replayQueue();
      result.stages.push({ 
        name: 'queue', 
        status: 'completed',
        replayed: queueResult.replayed
      });
      this.emitProgress('queue', 'completed', { replayed: queueResult.replayed });

      // Stage 8: Calculate consistency
      result.consistency = this.calculateConsistency(validated.valid.length, detected.affected.length);

      // Complete
      result.duration = Date.now() - result.startTime.getTime();
      recoveryState.set('idle');
      this.emitProgress('complete', 'completed', result);

      logger.info(`[Recovery] Complete: ${result.recovered} recovered, ${result.failed} failed, ${result.consistency}% consistency`);

      return result;

    } catch (error) {
      logger.error(`[Recovery] Failed: ${error.message}`);
      result.stages.push({ name: 'error', status: 'failed', error: error.message });
      this.emitProgress('error', 'failed', { error: error.message });
      recoveryState.set('blackout'); // Stay in blackout state
      throw error;
    } finally {
      this.isRecovering = false;
    }
  }

  /**
   * Detect corruption by scanning database vs journal
   */
  async detectCorruption() {
    const affected = [];
    const affectedIds = new Set();

    // Get all CREATE events from journal
    const createEvents = await EventJournal.find({ eventType: 'CREATE' }).lean();

    for (const event of createEvents) {
      const Model = this.getModel(event.entityType);
      if (!Model) continue;

      // Check if entity exists in database
      const exists = await Model.exists({ _id: event.entityId });

      if (!exists) {
        affected.push({
          entityType: event.entityType,
          entityId: event.entityId,
          kind: 'missing',
          reason: 'Document in journal but not in database'
        });
        affectedIds.add(`${event.entityType}:${event.entityId}`);
      }
    }

    // Check for corrupt documents (validation failures)
    const models = {
      User,
      Vehicle,
      PickupRequest,
      BuyerPosting
    };

    for (const [entityType, Model] of Object.entries(models)) {
      const docs = await Model.find({}).lean();

      for (const doc of docs) {
        try {
          // Try to create a Mongoose document (validates)
          const testDoc = new Model(doc);
          await testDoc.validate();
        } catch (error) {
          affected.push({
            entityType,
            entityId: String(doc._id),
            kind: 'corrupt',
            reason: `Validation failed: ${error.message}`
          });
          affectedIds.add(`${entityType}:${doc._id}`);
        }
      }
    }

    logger.info(`[Recovery] Detected ${affected.length} affected records`);

    return {
      affected,
      affectedIds
    };
  }

  /**
   * Load latest snapshot
   */
  async loadSnapshot() {
    const latest = await snapshot.getLatest();
    if (!latest) {
      throw new Error('No snapshot available for recovery');
    }

    logger.info(`[Recovery] Loading snapshot ${latest.snapshotId} from seq ${latest.sequenceNumber}`);
    return await snapshot.load(latest.snapshotId);
  }

  /**
   * Reconstruct state by replaying events on snapshot
   */
  async reconstructState(snapshotData, events, affectedIds) {
    const state = {
      User: new Map(),
      Vehicle: new Map(),
      PickupRequest: new Map(),
      BuyerPosting: new Map()
    };

    // Load snapshot data into maps
    for (const [collName, docs] of Object.entries(snapshotData)) {
      const entityType = this.collectionToEntityType(collName);
      if (!entityType) continue;

      for (const doc of docs) {
        state[entityType].set(String(doc._id), doc);
      }
    }

    // Replay events
    for (const event of events) {
      const key = `${event.entityType}:${event.entityId}`;
      
      // Only reconstruct affected entities (optimization)
      if (affectedIds && affectedIds.size > 0 && !affectedIds.has(key)) {
        continue;
      }

      this.applyEvent(state, event);
    }

    // Convert maps to arrays
    const result = {};
    for (const [entityType, map] of Object.entries(state)) {
      result[entityType] = Array.from(map.values()).filter(doc => !doc._tombstone);
    }

    logger.info(`[Recovery] Reconstructed: ${Object.values(result).reduce((sum, arr) => sum + arr.length, 0)} documents`);

    return result;
  }

  /**
   * Apply a single event to state
   */
  applyEvent(state, event) {
    const map = state[event.entityType];
    if (!map) return;

    const existing = map.get(event.entityId) || {};

    switch (event.eventType) {
      case 'CREATE':
        map.set(event.entityId, { ...event.payload, _id: event.entityId });
        break;

      case 'UPDATE':
      case 'STATUS':
      case 'ASSIGN':
      case 'LOCATION':
      case 'ROUTE_SET':
        map.set(event.entityId, { ...existing, ...event.payload });
        break;

      case 'DELETE':
        map.set(event.entityId, { ...existing, _tombstone: true });
        break;

      default:
        logger.warn(`[Recovery] Unknown event type: ${event.eventType}`);
    }
  }

  /**
   * Validate reconstructed documents
   */
  async validateDocuments(reconstructed) {
    const valid = [];
    const invalid = [];

    for (const [entityType, docs] of Object.entries(reconstructed)) {
      const Model = this.getModel(entityType);
      if (!Model) continue;

      for (const doc of docs) {
        try {
          // Create Mongoose document and validate
          const testDoc = new Model(doc);
          await testDoc.validate();

          valid.push({
            entityType,
            entityId: String(doc._id),
            data: doc
          });
        } catch (error) {
          invalid.push({
            entityType,
            entityId: String(doc._id),
            data: doc,
            error: error.message
          });
        }
      }
    }

    logger.info(`[Recovery] Validation: ${valid.length} valid, ${invalid.length} invalid`);

    return { valid, invalid };
  }

  /**
   * Restore validated documents to database
   * CRITICAL: Restore Users first so auth works!
   */
  async restoreToDatabase(validRecords) {
    let count = 0;

    // Order matters: Users first!
    const order = ['User', 'Vehicle', 'PickupRequest', 'BuyerPosting'];

    for (const entityType of order) {
      const records = validRecords.filter(r => r.entityType === entityType);
      if (records.length === 0) continue;

      const Model = this.getModel(entityType);
      if (!Model) continue;

      // Bulk upsert
      const bulkOps = records.map(record => ({
        updateOne: {
          filter: { _id: record.entityId },
          update: { $set: record.data },
          upsert: true
        }
      }));

      try {
        const result = await Model.bulkWrite(bulkOps);
        count += result.upsertedCount + result.modifiedCount;
        logger.info(`[Recovery] Restored ${entityType}: ${result.upsertedCount + result.modifiedCount}`);
      } catch (error) {
        logger.error(`[Recovery] Error restoring ${entityType}: ${error.message}`);
      }
    }

    return { count };
  }

  /**
   * Replay queued operations from recovery-queue.ndjson
   */
  async replayQueue() {
    // TODO: Implement queue replay in Phase 5
    logger.info('[Recovery] Queue replay not yet implemented');
    return { replayed: 0 };
  }

  /**
   * Calculate consistency percentage
   */
  calculateConsistency(recovered, total) {
    if (total === 0) return 100;
    return Math.round((recovered / total) * 1000) / 10; // One decimal place
  }

  /**
   * Emit recovery progress via Socket.IO
   */
  emitProgress(step, status, details = {}) {
    broadcast('system:recovery_progress', {
      step,
      status,
      timestamp: new Date(),
      ...details
    });
  }

  /**
   * Get Mongoose model by entity type
   */
  getModel(entityType) {
    const models = {
      User,
      Vehicle,
      PickupRequest,
      BuyerPosting
    };
    return models[entityType];
  }

  /**
   * Convert collection name to entity type
   */
  collectionToEntityType(collName) {
    const mapping = {
      users: 'User',
      vehicles: 'Vehicle',
      pickuprequests: 'PickupRequest',
      buyerpostings: 'BuyerPosting'
    };
    return mapping[collName];
  }
}

// Singleton instance
const recoveryService = new RecoveryService();

module.exports = recoveryService;
