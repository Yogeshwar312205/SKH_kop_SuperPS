const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const EventJournal = require('../models/EventJournal');
const logger = require('../utils/logger');

/**
 * Journal Service - Dual-sink event logging
 * 
 * Critical insight: MongoDB collection alone isn't enough for resilience.
 * If the database is wiped, the event log goes with it. This service writes
 * to TWO independent sinks:
 * 
 * 1. MongoDB eventjournals collection (queryable, indexed)
 * 2. backend/data/journal.ndjson file (survives DB wipes!)
 * 
 * The file is the source of truth. On boot, we recover the current sequence
 * number from the file, not from MongoDB.
 */

class JournalService {
  constructor() {
    this.currentSeq = 0;
    this.lastHash = '0000000000000000000000000000000000000000000000000000000000000000'; // Genesis
    this.journalPath = path.join(__dirname, '../../data/journal.ndjson');
    this.initialized = false;
    this.writeQueue = [];
    this.isProcessing = false;
  }

  /**
   * Initialize the journal service
   * Must be called on server boot
   */
  async initialize() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.journalPath);
      await fs.mkdir(dataDir, { recursive: true });

      // Recover sequence from file (source of truth)
      await this.recoverSequenceFromFile();

      logger.info(`[Journal] Initialized. Current seq: ${this.currentSeq}, last hash: ${this.lastHash.substring(0, 8)}...`);
      this.initialized = true;
    } catch (error) {
      logger.error(`[Journal] Initialization failed: ${error.message}`);
      // Don't throw - degrade gracefully
      this.initialized = true; // Mark as initialized anyway
    }
  }

  /**
   * Recover the current sequence number and last hash from journal.ndjson
   * This is the source of truth - MongoDB might be wiped
   */
  async recoverSequenceFromFile() {
    try {
      const content = await fs.readFile(this.journalPath, 'utf8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      
      if (lines.length === 0) {
        logger.info('[Journal] Empty journal file, starting from seq 0');
        return;
      }

      // Parse last line to get seq and hash
      const lastLine = lines[lines.length - 1];
      const lastEvent = JSON.parse(lastLine);
      
      this.currentSeq = lastEvent.seq;
      this.lastHash = lastEvent.hash;
      
      logger.info(`[Journal] Recovered from file: ${lines.length} events, seq: ${this.currentSeq}`);
    } catch (error) {
      if (error.code === 'ENOENT') {
        logger.info('[Journal] No existing journal file, starting fresh');
      } else {
        logger.error(`[Journal] Error recovering from file: ${error.message}`);
      }
    }
  }

  /**
   * Record an event to the journal
   * 
   * @param {Object} params
   * @param {string} params.entityType - 'User' | 'Vehicle' | 'PickupRequest' | 'BuyerPosting'
   * @param {string} params.entityId - String ID of the entity
   * @param {string} params.eventType - 'CREATE' | 'UPDATE' | 'STATUS' | etc
   * @param {Object} params.payload - Data that changed (full doc on CREATE)
   * @param {string} params.actorId - User ID or 'system'/'drill'
   * @returns {Promise<Object>} The created event
   */
  async record({ entityType, entityId, eventType, payload, actorId = 'system' }) {
    if (!this.initialized) {
      logger.warn('[Journal] Not initialized, skipping event');
      return null;
    }

    try {
      // Increment sequence
      this.currentSeq++;
      
      const event = {
        seq: this.currentSeq,
        eventId: uuidv4(),
        entityType,
        entityId: String(entityId),
        eventType,
        payload: JSON.parse(JSON.stringify(payload)), // Deep clone
        actorId: String(actorId),
        at: new Date(),
        prevHash: this.lastHash,
        hash: '' // Computed below
      };

      // Compute hash (chain integrity)
      event.hash = this.computeHash(event);
      this.lastHash = event.hash;

      // Queue for async processing (don't block caller)
      this.writeQueue.push(event);
      this.processQueue(); // Fire and forget

      return event;
    } catch (error) {
      // CRITICAL: Never throw into caller - degradation rule
      logger.error(`[Journal] Failed to record event: ${error.message}`, {
        entityType,
        entityId,
        eventType,
        error: error.stack
      });
      return null;
    }
  }

  /**
   * Process queued events asynchronously
   * Writes to both MongoDB and file
   */
  async processQueue() {
    if (this.isProcessing || this.writeQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.writeQueue.length > 0) {
      const event = this.writeQueue.shift();
      
      try {
        // Write to both sinks in parallel
        await Promise.all([
          this.writeToMongo(event),
          this.writeToFile(event)
        ]);
      } catch (error) {
        logger.error(`[Journal] Failed to write event ${event.eventId}: ${error.message}`);
        // Don't re-queue - accept the loss (degradation)
      }
    }

    this.isProcessing = false;
  }

  /**
   * Write event to MongoDB
   */
  async writeToMongo(event) {
    try {
      const doc = new EventJournal(event);
      await doc.save();
    } catch (error) {
      // Mongo might be down - that's okay, file has it
      logger.warn(`[Journal] MongoDB write failed (seq ${event.seq}): ${error.message}`);
    }
  }

  /**
   * Write event to file (NDJSON format)
   */
  async writeToFile(event) {
    try {
      const line = JSON.stringify(event) + '\n';
      await fs.appendFile(this.journalPath, line, 'utf8');
    } catch (error) {
      logger.error(`[Journal] File write failed (seq ${event.seq}): ${error.message}`);
      throw error; // This is critical - if file write fails, we have a problem
    }
  }

  /**
   * Compute hash for an event (chain integrity)
   * hash = sha256(prevHash + canonicalJSON(event body))
   */
  computeHash(event) {
    const body = {
      seq: event.seq,
      eventId: event.eventId,
      entityType: event.entityType,
      entityId: event.entityId,
      eventType: event.eventType,
      payload: event.payload,
      actorId: event.actorId,
      at: event.at instanceof Date ? event.at.toISOString() : event.at
    };

    const canonical = JSON.stringify(body, Object.keys(body).sort());
    const data = event.prevHash + canonical;
    
    return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
  }

  /**
   * Verify hash chain integrity
   * @returns {Promise<Object>} { ok: boolean, brokenAt: number|null }
   */
  async verifyChainIntegrity() {
    try {
      const content = await fs.readFile(this.journalPath, 'utf8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      
      let prevHash = '0000000000000000000000000000000000000000000000000000000000000000';
      
      for (let i = 0; i < lines.length; i++) {
        const event = JSON.parse(lines[i]);
        
        // Check prevHash matches
        if (event.prevHash !== prevHash) {
          return { ok: false, brokenAt: event.seq, reason: 'prevHash mismatch' };
        }
        
        // Recompute hash
        const computed = this.computeHash(event);
        if (computed !== event.hash) {
          return { ok: false, brokenAt: event.seq, reason: 'hash mismatch' };
        }
        
        prevHash = event.hash;
      }
      
      return { ok: true, brokenAt: null };
    } catch (error) {
      return { ok: false, brokenAt: null, reason: error.message };
    }
  }

  /**
   * Get events for a specific entity
   */
  async getEntityEvents(entityType, entityId) {
    try {
      // Try MongoDB first (faster with indexes)
      const events = await EventJournal.find({ entityType, entityId }).sort({ seq: 1 }).lean();
      if (events.length > 0) {
        return events;
      }

      // Fallback to file
      return this.getEntityEventsFromFile(entityType, entityId);
    } catch (error) {
      logger.error(`[Journal] Error getting entity events: ${error.message}`);
      return [];
    }
  }

  /**
   * Get events from file (fallback when MongoDB is down)
   */
  async getEntityEventsFromFile(entityType, entityId) {
    try {
      const content = await fs.readFile(this.journalPath, 'utf8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      
      const events = [];
      for (const line of lines) {
        const event = JSON.parse(line);
        if (event.entityType === entityType && event.entityId === String(entityId)) {
          events.push(event);
        }
      }
      
      return events;
    } catch (error) {
      logger.error(`[Journal] Error reading from file: ${error.message}`);
      return [];
    }
  }

  /**
   * Get all events since a sequence number
   */
  async getEventsSince(seq) {
    try {
      // Try MongoDB first
      const events = await EventJournal.find({ seq: { $gt: seq } }).sort({ seq: 1 }).lean();
      if (events.length > 0) {
        return events;
      }

      // Fallback to file
      return this.getEventsFromFileSince(seq);
    } catch (error) {
      logger.error(`[Journal] Error getting events since ${seq}: ${error.message}`);
      return this.getEventsFromFileSince(seq);
    }
  }

  /**
   * Get events from file since sequence number
   */
  async getEventsFromFileSince(seq) {
    try {
      const content = await fs.readFile(this.journalPath, 'utf8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      
      const events = [];
      for (const line of lines) {
        const event = JSON.parse(line);
        if (event.seq > seq) {
          events.push(event);
        }
      }
      
      return events;
    } catch (error) {
      logger.error(`[Journal] Error reading from file: ${error.message}`);
      return [];
    }
  }

  /**
   * Get current sequence number
   */
  getCurrentSeq() {
    return this.currentSeq;
  }

  /**
   * Get journal stats
   */
  async getStats() {
    try {
      const content = await fs.readFile(this.journalPath, 'utf8');
      const lines = content.trim().split('\n').filter(l => l.trim());
      const integrity = await this.verifyChainIntegrity();
      
      return {
        totalEvents: lines.length,
        currentSeq: this.currentSeq,
        lastHash: this.lastHash,
        chainIntegrity: integrity,
        queuedWrites: this.writeQueue.length
      };
    } catch (error) {
      return {
        totalEvents: 0,
        currentSeq: this.currentSeq,
        lastHash: this.lastHash,
        chainIntegrity: { ok: false, reason: error.message },
        queuedWrites: this.writeQueue.length
      };
    }
  }
}

// Singleton instance
const journalService = new JournalService();

module.exports = journalService;
