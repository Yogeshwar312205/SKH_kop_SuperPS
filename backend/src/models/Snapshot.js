const mongoose = require('mongoose');

/**
 * Snapshot Model - Point-in-time state captures
 * 
 * Snapshots are periodic exports of the four operational collections
 * (User, Vehicle, PickupRequest, BuyerPosting) to JSON files. They serve
 * two purposes:
 * 
 * 1. Recovery acceleration - instead of replaying millions of events from
 *    the beginning of time, we start from the most recent snapshot and only
 *    replay events after it.
 * 
 * 2. Consistency verification - we can compare reconstructed state against
 *    snapshots to calculate real consistency percentages.
 * 
 * Snapshots are tagged with the journal sequence number at capture time,
 * so we know exactly which events came before and after.
 */
const snapshotSchema = new mongoose.Schema({
  snapshotId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    description: 'Unique snapshot identifier: SNAP-{timestamp}'
  },
  
  timestamp: {
    type: Date,
    required: true,
    index: true,
    description: 'When this snapshot was taken'
  },
  
  sequenceNumber: {
    type: Number,
    required: true,
    index: true,
    description: 'Last journal seq included in this snapshot'
  },
  
  collections: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
    description: 'Metadata for each collection snapshot',
    default: {}
    // Structure:
    // {
    //   users: { count: N, filename: 'users-SNAP-...json', sizeBytes: X },
    //   vehicles: { count: N, filename: 'vehicles-SNAP-...json', sizeBytes: X },
    //   pickuprequests: { count: N, filename: 'pickuprequests-SNAP-...json', sizeBytes: X },
    //   buyerpostings: { count: N, filename: 'buyerpostings-SNAP-...json', sizeBytes: X }
    // }
  },
  
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED'],
    default: 'PENDING',
    index: true,
    description: 'Snapshot creation status'
  },
  
  totalSizeBytes: {
    type: Number,
    default: 0,
    description: 'Total size of all snapshot files'
  },
  
  duration: {
    type: Number,
    default: 0,
    description: 'How long the snapshot took to create (milliseconds)'
  },
  
  error: {
    type: String,
    default: null,
    description: 'Error message if status is FAILED'
  }
}, {
  collection: 'snapshots',
  timestamps: true
});

// Index for finding latest snapshot
snapshotSchema.index({ status: 1, timestamp: -1 });

module.exports = mongoose.model('Snapshot', snapshotSchema);
