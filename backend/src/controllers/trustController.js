const IntegrityTicket = require('../models/IntegrityTicket');
const ContentFlag = require('../models/ContentFlag');
const { getProvenance } = require('../services/provenanceService');
const logger = require('../utils/logger');

/**
 * Trust Controller - Data Integrity & Misinformation Response
 * 
 * Public routes (rate-limited):
 * - GET  /api/trust/provenance - Data source information
 * - POST /api/trust/report - File an integrity concern
 * - GET  /api/trust/flags - Batch query moderation verdicts
 * - GET  /api/trust/ticket/:ticketId - Check ticket status
 * 
 * Admin routes (protected by adminGuard):
 * - POST /api/trust/admin/login - Admin authentication
 * - GET  /api/trust/admin/tickets - Moderation queue
 * - POST /api/trust/admin/tickets/:id/triage - Update ticket status
 * - POST /api/trust/admin/tickets/:id/verdict - Set moderation verdict
 */

// ============================================================================
// Public Routes
// ============================================================================

/**
 * GET /api/trust/provenance
 * Returns comprehensive data source information
 */
const getProvenanceInfo = async (req, res) => {
  try {
    const provenance = await getProvenance();
    return res.json({
      success: true,
      provenance,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error(`[Trust] Provenance fetch failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch provenance information',
    });
  }
};

/**
 * POST /api/trust/report
 * File an integrity concern
 * 
 * Body: {
 *   category: 'price_dispute' | 'scam_posting' | 'scheme_rumor' | 'treatment_claim' | 'other',
 *   subject: { type, id?, label, displayedValue },
 *   reason: string,
 *   reporterName?: string,
 *   reporterContact?: string,
 * }
 */
const reportConcern = async (req, res) => {
  try {
    const { category, subject, reason, reporterName, reporterContact } = req.body;

    // Validation
    if (!category || !subject || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: category, subject, reason',
      });
    }

    if (!subject.type || !subject.label) {
      return res.status(400).json({
        success: false,
        message: 'Subject must include type and label',
      });
    }

    // Server-side provenance capture (never trust client data)
    const sourceOfRecord = await captureSourceOfRecord(subject);

    // Create ticket
    const ticket = await IntegrityTicket.create({
      status: 'open',
      category,
      source: 'user_report',
      subject,
      sourceOfRecord,
      reporterName,
      reporterContact,
      reason,
      timeline: [{
        at: new Date(),
        actor: 'reporter',
        action: 'created',
        note: `User reported: ${category}`,
      }],
    });

    logger.info(`[Trust] New user report: ${ticket.ticketId} - ${category}`);

    // TODO: Broadcast socket event in M2
    // broadcast('trust:ticket_new', { ticketId: ticket.ticketId, category });

    return res.status(201).json({
      success: true,
      ticketId: ticket.ticketId,
      message: 'Report submitted. An admin will review it.',
    });

  } catch (error) {
    logger.error(`[Trust] Report failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit report',
    });
  }
};

/**
 * GET /api/trust/flags?subjects=type:id,type:id,...
 * Batch query moderation verdicts for displayed items
 */
const getContentFlags = async (req, res) => {
  try {
    const { subjects } = req.query;

    if (!subjects) {
      return res.json({ success: true, flags: [] });
    }

    // Parse subjects: "posting:123,price:456" → [{type, id}, ...]
    const parsedSubjects = subjects.split(',').map(s => {
      const [type, id] = s.split(':');
      return { type, id };
    }).filter(s => s.type && s.id);

    if (parsedSubjects.length === 0) {
      return res.json({ success: true, flags: [] });
    }

    // Query flags
    const flags = await ContentFlag.find({
      $or: parsedSubjects.map(s => ({
        subjectType: s.type,
        subjectId: s.id,
      })),
    }).select('-__v -createdAt -updatedAt');

    return res.json({
      success: true,
      flags: flags.map(f => ({
        subjectType: f.subjectType,
        subjectId: f.subjectId,
        verdict: f.verdict,
        note: f.note,
        by: f.by,
        at: f.at,
        ticketId: f.ticketId,
      })),
    });

  } catch (error) {
    logger.error(`[Trust] Flags query failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch flags',
    });
  }
};

/**
 * GET /api/trust/ticket/:ticketId
 * Public status of a ticket (claim check for reporters)
 */
const getTicketStatus = async (req, res) => {
  try {
    const { ticketId } = req.params;

    const ticket = await IntegrityTicket.findOne({ ticketId })
      .select('ticketId status category subject verdict verdictNote verdictAt createdAt');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    return res.json({
      success: true,
      ticket: {
        ticketId: ticket.ticketId,
        status: ticket.status,
        category: ticket.category,
        subject: ticket.subject,
        verdict: ticket.verdict,
        verdictNote: ticket.verdictNote,
        verdictAt: ticket.verdictAt,
        createdAt: ticket.createdAt,
      },
    });

  } catch (error) {
    logger.error(`[Trust] Ticket status failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch ticket status',
    });
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Capture server-side provenance for a reported subject
 * Never trust client-supplied source data
 */
const captureSourceOfRecord = async (subject) => {
  const record = {
    capturedAt: new Date().toISOString(),
    subjectType: subject.type,
    subjectId: subject.id,
  };

  try {
    // Fetch fresh data based on subject type
    switch (subject.type) {
      case 'posting':
        // TODO: Fetch BuyerPosting details
        record.snapshot = { note: 'Buyer posting snapshot to be implemented' };
        break;

      case 'price':
        // TODO: Fetch latest Agmarknet price
        record.snapshot = { note: 'Price snapshot to be implemented' };
        break;

      case 'advice':
      case 'forecast':
      case 'scheme':
        record.snapshot = { label: subject.label, displayedValue: subject.displayedValue };
        break;

      default:
        record.snapshot = { label: subject.label };
    }

  } catch (error) {
    logger.warn(`[Trust] Could not capture source for ${subject.type}: ${error.message}`);
    record.snapshot = { error: 'Unable to capture source' };
  }

  return record;
};

module.exports = {
  // Public routes
  getProvenanceInfo,
  reportConcern,
  getContentFlags,
  getTicketStatus,
};
