const mongoose = require('mongoose');

/**
 * ContentFlag - Public moderation verdicts on specific content
 * 
 * One record per moderated item. When an admin sets a verdict on a ticket,
 * a ContentFlag is created/updated and becomes publicly queryable via
 * GET /api/trust/flags.
 * 
 * This allows UI components to show caution banners without fetching
 * the full ticket details.
 */
const ContentFlagSchema = new mongoose.Schema({
  subjectType: {
    type: String,
    required: true,
    // 'price', 'posting', 'advice', 'forecast', 'scheme'
  },
  subjectId: {
    type: String,
    required: true,
    // Entity ID (e.g., BuyerPosting._id)
  },
  verdict: {
    type: String,
    enum: ['verified', 'disputed', 'misleading', 'removed'],
    required: true,
  },
  note: {
    type: String,
    required: true,
    // Public explanation shown to users
  },
  by: {
    type: String,
    required: true,
    // Admin username who set the verdict
  },
  at: {
    type: Date,
    default: Date.now,
    required: true,
  },
  ticketId: {
    type: String,
    required: true,
    // Links back to the IntegrityTicket
  },
}, { timestamps: true });

// Unique constraint: one flag per subject
ContentFlagSchema.index({ subjectType: 1, subjectId: 1 }, { unique: true });

// Query by multiple subjects
ContentFlagSchema.index({ subjectType: 1 });

module.exports = mongoose.model('ContentFlag', ContentFlagSchema);
