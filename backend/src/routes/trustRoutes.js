const express = require('express');
const {
  getProvenanceInfo,
  reportConcern,
  getContentFlags,
  getTicketStatus,
} = require('../controllers/trustController');
const { apiLimiter } = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * Trust Routes - Data Integrity & Misinformation Response
 * 
 * Base path: /api/trust
 * All public routes are rate-limited to prevent abuse
 * Admin routes will be added in M2
 */

// ============================================================================
// Public Routes (Rate-Limited)
// ============================================================================

/**
 * GET /api/trust/provenance
 * Get comprehensive data source information
 */
router.get('/provenance', apiLimiter, getProvenanceInfo);

/**
 * POST /api/trust/report
 * File an integrity concern
 */
router.post('/report', apiLimiter, reportConcern);

/**
 * GET /api/trust/flags
 * Batch query moderation verdicts
 * Query param: subjects=type:id,type:id,...
 */
router.get('/flags', apiLimiter, getContentFlags);

/**
 * GET /api/trust/ticket/:ticketId
 * Get public status of a ticket
 */
router.get('/ticket/:ticketId', apiLimiter, getTicketStatus);

module.exports = router;
