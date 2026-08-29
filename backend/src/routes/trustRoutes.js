const express = require('express');
const {
  getProvenanceInfo,
  reportConcern,
  getContentFlags,
  getTicketStatus,
  adminLogin,
  getAdminTickets,
  triageTicket,
  setTicketVerdict,
} = require('../controllers/trustController');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { adminGuard } = require('../middlewares/adminAuth');

const router = express.Router();

/**
 * Trust Routes - Data Integrity & Misinformation Response
 * 
 * Base path: /api/trust
 * Public routes are rate-limited to prevent abuse
 * Admin routes are protected by adminGuard
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

// ============================================================================
// Admin Routes (Protected by adminGuard)
// ============================================================================

/**
 * POST /api/trust/admin/login
 * Admin authentication
 */
router.post('/admin/login', apiLimiter, adminLogin);

/**
 * GET /api/trust/admin/tickets
 * Get moderation queue
 */
router.get('/admin/tickets', adminGuard, getAdminTickets);

/**
 * POST /api/trust/admin/tickets/:id/triage
 * Update ticket status
 */
router.post('/admin/tickets/:id/triage', adminGuard, triageTicket);

/**
 * POST /api/trust/admin/tickets/:id/verdict
 * Set moderation verdict on ticket
 */
router.post('/admin/tickets/:id/verdict', adminGuard, setTicketVerdict);

module.exports = router;
