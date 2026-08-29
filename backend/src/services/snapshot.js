const fs = require('fs').promises;
const path = require('path');
const Snapshot = require('../models/Snapshot');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const PickupRequest = require('../models/PickupRequest');
const BuyerPosting = require('../models/BuyerPosting');
const journal = require('./journal');
const logger = require('../utils/logger');

/**
 * Snapshot Service - Point-in-time state capture
 * 
 * Creates periodic snapshots of the four operational collections to JSON files.
 * This is critical for recovery performance - without snapshots, we'd have to
 * replay every event from the beginning of time.
 * 
 * Snapshots are triggered:
 * - On boot (if none in the last hour)
 * - Every 15 minutes (setInterval)
 * - Before every drill (auto-restore point)
 * - Manually via POST /api/system/snapshot
 */

class SnapshotService {
  constructor() {
    this.snapshotsDir = path.join(__dirname, '../../data/snapshots');
    this.initialized = false;
    this.intervalHandle = null;
  }

  /**
   * Initialize snapshot service
   * Creates snapshots directory and optionally takes initial snapshot
   */
  async initialize() {
    try {
      // Ensure snapshots directory exists
      await fs.mkdir(this.snapshotsDir, { recursive: true });

      // Check if we need an initial snapshot
      const latest = await this.getLatest();
      const now = new Date();
      
      if (!latest || (now - latest.timestamp) > 60 * 60 * 1000) {
        // No snapshot in last hour - take one now
        logger.info('[Snapshot] No recent snapshot found, creating initial snapshot...');
        await this.take();
      }

      // Start periodic snapshots (every 15 minutes)
      this.startPeriodicSnapshots();

      logger.info('[Snapshot] Service initialized');
      this.initialized = true;
    } catch (error) {
      logger.error(`[Snapshot] Initialization failed: ${error.message}`);
      this.initialized = true; // Mark as initialized anyway (degrade gracefully)
    }
  }

  /**
   * Start periodic snapshot creation (every 15 minutes)
   */
  startPeriodicSnapshots() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
    }

    // 15 minutes in milliseconds
    const interval = 15 * 60 * 1000;

    this.intervalHandle = setInterval(async () => {
      try {
        logger.info('[Snapshot] Periodic snapshot triggered');
        await this.take();
      } catch (error) {
        logger.error(`[Snapshot] Periodic snapshot failed: ${error.message}`);
      }
    }, interval);

    logger.info('[Snapshot] Periodic snapshots enabled (every 15 min)');
  }

  /**
   * Take a snapshot of all operational collections
   * 
   * @returns {Promise<Object>} Snapshot document
   */
  async take() {
    const startTime = Date.now();
    const snapshotId = `SNAP-${Date.now()}`;
    const currentSeq = journal.getCurrentSeq();

    logger.info(`[Snapshot] Starting snapshot ${snapshotId} at seq ${currentSeq}`);

    try {
      const collections = {};
      let totalSize = 0;

      // Snapshot each collection
      const collectionNames = ['users', 'vehicles', 'pickuprequests', 'buyerpostings'];
      const models = {
        users: User,
        vehicles: Vehicle,
        pickuprequests: PickupRequest,
        buyerpostings: BuyerPosting
      };

      for (const collName of collectionNames) {
        const result = await this.snapshotCollection(collName, models[collName], snapshotId);
        collections[collName] = result;
        totalSize += result.sizeBytes;
      }

      const duration = Date.now() - startTime;

      // Save snapshot metadata
      const snapshot = new Snapshot({
        snapshotId,
        timestamp: new Date(),
        sequenceNumber: currentSeq,
        collections,
        status: 'COMPLETED',
        totalSizeBytes: totalSize,
        duration
      });

      await snapshot.save();

      logger.info(`[Snapshot] Completed ${snapshotId} in ${duration}ms (${Math.round(totalSize / 1024)}KB)`);
      return snapshot;

    } catch (error) {
      logger.error(`[Snapshot] Failed to create ${snapshotId}: ${error.message}`);

      // Save failed snapshot record
      try {
        const snapshot = new Snapshot({
          snapshotId,
          timestamp: new Date(),
          sequenceNumber: currentSeq,
          collections: {},
          status: 'FAILED',
          duration: Date.now() - startTime,
          error: error.message
        });
        await snapshot.save();
      } catch (saveError) {
        logger.error(`[Snapshot] Failed to save error record: ${saveError.message}`);
      }

      throw error;
    }
  }

  /**
   * Snapshot a single collection to JSON file
   * 
   * @param {string} name - Collection name (lowercase)
   * @param {Model} Model - Mongoose model
   * @param {string} snapshotId - Snapshot ID for filename
   * @returns {Promise<Object>} Metadata { count, filename, sizeBytes }
   */
  async snapshotCollection(name, Model, snapshotId) {
    try {
      // Query all documents (lean for performance)
      const docs = await Model.find({}).lean();
      
      // Convert to JSON
      const json = JSON.stringify(docs, null, 2);
      const sizeBytes = Buffer.byteLength(json, 'utf8');

      // Write to file
      const filename = `${name}-${snapshotId}.json`;
      const filepath = path.join(this.snapshotsDir, filename);
      await fs.writeFile(filepath, json, 'utf8');

      logger.info(`[Snapshot] ${name}: ${docs.length} docs, ${Math.round(sizeBytes / 1024)}KB`);

      return {
        count: docs.length,
        filename,
        sizeBytes
      };
    } catch (error) {
      logger.error(`[Snapshot] Error snapshotting ${name}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the latest completed snapshot
   * 
   * @returns {Promise<Object|null>} Snapshot document or null
   */
  async getLatest() {
    try {
      const snapshot = await Snapshot.findOne({ status: 'COMPLETED' })
        .sort({ timestamp: -1 });
      return snapshot;
    } catch (error) {
      logger.error(`[Snapshot] Error getting latest: ${error.message}`);
      return null;
    }
  }

  /**
   * Load a snapshot's data from disk
   * 
   * @param {string} snapshotId - Snapshot ID
   * @returns {Promise<Object>} { snapshot, data: { users, vehicles, ... } }
   */
  async load(snapshotId) {
    try {
      const snapshot = await Snapshot.findOne({ snapshotId });
      if (!snapshot) {
        throw new Error(`Snapshot ${snapshotId} not found`);
      }

      if (snapshot.status !== 'COMPLETED') {
        throw new Error(`Snapshot ${snapshotId} status is ${snapshot.status}`);
      }

      const data = {};

      // Load each collection file
      for (const [collName, metadata] of Object.entries(snapshot.collections)) {
        const filepath = path.join(this.snapshotsDir, metadata.filename);
        const json = await fs.readFile(filepath, 'utf8');
        data[collName] = JSON.parse(json);
        logger.info(`[Snapshot] Loaded ${collName}: ${data[collName].length} docs`);
      }

      return { snapshot, data };
    } catch (error) {
      logger.error(`[Snapshot] Error loading ${snapshotId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get snapshot statistics
   * 
   * @returns {Promise<Object>} Stats
   */
  async getStats() {
    try {
      const latest = await this.getLatest();
      const total = await Snapshot.countDocuments();
      const completed = await Snapshot.countDocuments({ status: 'COMPLETED' });

      return {
        total,
        completed,
        failed: total - completed,
        latest: latest ? {
          snapshotId: latest.snapshotId,
          timestamp: latest.timestamp,
          sequenceNumber: latest.sequenceNumber,
          ageSeconds: Math.floor((Date.now() - latest.timestamp.getTime()) / 1000),
          collections: Object.entries(latest.collections).map(([name, meta]) => ({
            name,
            count: meta.count,
            sizeKB: Math.round(meta.sizeBytes / 1024)
          }))
        } : null
      };
    } catch (error) {
      logger.error(`[Snapshot] Error getting stats: ${error.message}`);
      return {
        total: 0,
        completed: 0,
        failed: 0,
        latest: null,
        error: error.message
      };
    }
  }

  /**
   * Clean up old snapshots (keep last N)
   * 
   * @param {number} keep - Number of snapshots to keep (default: 10)
   */
  async cleanup(keep = 10) {
    try {
      const snapshots = await Snapshot.find({ status: 'COMPLETED' })
        .sort({ timestamp: -1 })
        .skip(keep);

      for (const snapshot of snapshots) {
        // Delete files
        for (const metadata of Object.values(snapshot.collections)) {
          const filepath = path.join(this.snapshotsDir, metadata.filename);
          try {
            await fs.unlink(filepath);
          } catch (err) {
            logger.warn(`[Snapshot] Failed to delete ${metadata.filename}: ${err.message}`);
          }
        }

        // Delete snapshot record
        await Snapshot.deleteOne({ _id: snapshot._id });
        logger.info(`[Snapshot] Cleaned up old snapshot ${snapshot.snapshotId}`);
      }

      logger.info(`[Snapshot] Cleanup complete, kept ${keep} snapshots`);
    } catch (error) {
      logger.error(`[Snapshot] Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Stop periodic snapshots (for graceful shutdown)
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      logger.info('[Snapshot] Periodic snapshots stopped');
    }
  }
}

// Singleton instance
const snapshotService = new SnapshotService();

module.exports = snapshotService;
