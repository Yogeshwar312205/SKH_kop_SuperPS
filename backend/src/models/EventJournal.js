const mongoose = require('mongoose');

/**
 * EventJournal Model - Immutable log of all system operations
 * 
 * This is the foundation of the resilience system. Every important operation
 * is stored as an event. Combined with file-based journal.ndjson, this provides
 * dual-sink persistence that survives database wipes.
 * 
 * Events are never updated or deleted - only appended.
 */
const eventJournalSchema = new mongoose.Schema({
  seq: {
    type: Number,
    required: true,
    unique: true,
    index: true,
    description: 'Monotonic sequence number, recovered from file on boot'
  },
  
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'UUID v4 event identifier'
  },
  
  entityType: {
    type: String,
    required: true,
    enum: ['User', 'Vehicle', 'PickupRequest', 'BuyerPosting'],
    index: true,
    description: 'Type of entity this event affects'
  },
  
  entityId: {
    type: String,
    required: true,
    index: true,
    description: 'String representation of entity _id'
  },
  
  eventType: {
    type: String,
    required: true,
    enum: ['CREATE', 'UPDATE', 'STATUS', 'ASSIGN', 'LOCATION', 'ROUTE_SET', 'DELETE'],
    index: true,
    description: 'Type of operation performed'
  },
  
  payload: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    description: 'Full document on CREATE, changed fields on UPDATE/STATUS/etc'
  },
  
  actorId: {
    type: String,
    default: 'system',
    description: 'User ID who performed the action, or "system"/"drill"'
  },
  
  at: {
    type: Date,
    required: true,
    default: Date.now,
    index: true,
    description: 'Timestamp when event occurred'
  },
  
  prevHash: {
    type: String,
    required: true,
    description: 'Hash of previous event (chain integrity)'
  },
  
  hash: {
    type: String,
    required: true,
    description: 'SHA-256 hash of this event (prevHash + canonical JSON)'
  }
}, {
  collection: 'eventjournals',
  timestamps: false // We use 'at' field instead
});

// Compound indexes for fast queries
eventJournalSchema.index({ entityType: 1, entityId: 1, seq: 1 });
eventJournalSchema.index({ seq: 1, entityType: 1 });
eventJournalSchema.index({ at: 1 });

// Don't allow updates or deletes - events are immutable
eventJournalSchema.pre('findOneAndUpdate', function() {
  throw new Error('Events cannot be updated - append-only');
});

eventJournalSchema.pre('findOneAndDelete', function() {
  throw new Error('Events cannot be deleted - append-only');
});

module.exports = mongoose.model('EventJournal', eventJournalSchema);
