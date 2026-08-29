const mongoose = require('mongoose');
const IntegrityTicket = require('../models/IntegrityTicket');
const ContentFlag = require('../models/ContentFlag');
const BuyerPosting = require('../models/BuyerPosting');
const { getProvenance } = require('../services/provenanceService');
const { verifyAdminCredentials, generateAdminToken } = require('../middlewares/adminAuth');
const { broadcast } = require('../sockets/bus');
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

    // Broadcast live ticket creation
    broadcast('trust:ticket_new', { ticketId: ticket.ticketId, category: ticket.category });

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

// ============================================================================
// Admin Routes (Protected by adminGuard)
// ============================================================================

/**
 * POST /api/trust/admin/login
 * Admin authentication
 * Body: { username, password }
 */
const adminLogin = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password required',
      });
    }

    // Verify credentials
    if (!verifyAdminCredentials(username, password)) {
      logger.warn(`[TrustAdmin] Failed login attempt for: ${username}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials',
      });
    }

    // Generate token
    const token = generateAdminToken(username);

    logger.info(`[TrustAdmin] Admin logged in: ${username}`);

    return res.json({
      success: true,
      token,
      username,
    });

  } catch (error) {
    logger.error(`[TrustAdmin] Login failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
};

/**
 * GET /api/trust/admin/tickets?status=open
 * Get moderation queue
 */
const getAdminTickets = async (req, res) => {
  try {
    const { status, source, category } = req.query;

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;
    if (category) filter.category = category;

    // Fetch tickets, newest first
    const tickets = await IntegrityTicket.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    return res.json({
      success: true,
      tickets,
      count: tickets.length,
    });

  } catch (error) {
    logger.error(`[TrustAdmin] Tickets fetch failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch tickets',
    });
  }
};

/**
 * POST /api/trust/admin/tickets/:id/triage
 * Update ticket status and add timeline entry
 * Body: { status: 'triaging' | 'resolved' | 'dismissed', note }
 */
const triageTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status required',
      });
    }

    const validStatuses = ['open', 'triaging', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
      ticket = await IntegrityTicket.findById(id);
    }
    if (!ticket) {
      ticket = await IntegrityTicket.findOne({ ticketId: id });
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const adminUser = req.admin?.username || 'admin';

    if (!Array.isArray(ticket.timeline)) {
      ticket.timeline = [];
    }

    if (!ticket.subject) {
      ticket.subject = { type: 'price', label: 'Reported Item' };
    } else if (!ticket.subject.type) {
      ticket.subject.type = 'price';
    }

    // Update status and timeline
    ticket.status = status;
    ticket.timeline.push({
      at: new Date(),
      actor: adminUser,
      action: 'status_changed',
      note: note || `Status changed to ${status}`,
    });

    await ticket.save();

    logger.info(`[TrustAdmin] Ticket ${ticket.ticketId} triaged: ${status} by ${adminUser}`);

    try {
      broadcast('trust:ticket_update', { ticketId: ticket.ticketId, status });
    } catch (e) {
      logger.warn(`[TrustAdmin] Socket broadcast warning: ${e.message}`);
    }

    return res.json({
      success: true,
      ticket,
    });

  } catch (error) {
    logger.error(`[TrustAdmin] Triage failed: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to triage ticket',
    });
  }
};

/**
 * POST /api/trust/admin/tickets/:id/verdict
 * Set moderation verdict on a ticket
 * Body: { verdict: 'verified' | 'disputed' | 'misleading' | 'removed', note }
 */
const setTicketVerdict = async (req, res) => {
  try {
    const { id } = req.params;
    const { verdict, note } = req.body;

    if (!verdict || !note) {
      return res.status(400).json({
        success: false,
        message: 'Verdict and note required',
      });
    }

    const validVerdicts = ['verified', 'disputed', 'misleading', 'removed'];
    if (!validVerdicts.includes(verdict)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verdict',
      });
    }

    let ticket;
    if (mongoose.Types.ObjectId.isValid(id)) {
      ticket = await IntegrityTicket.findById(id);
    }
    if (!ticket) {
      ticket = await IntegrityTicket.findOne({ ticketId: id });
    }

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      });
    }

    const adminUser = req.admin?.username || 'admin';

    if (!Array.isArray(ticket.timeline)) {
      ticket.timeline = [];
    }

    if (!ticket.subject) {
      ticket.subject = { type: 'price', label: 'Reported Item' };
    } else if (!ticket.subject.type) {
      ticket.subject.type = 'price';
    }

    // Set verdict on ticket
    ticket.verdict = verdict;
    ticket.verdictNote = note;
    ticket.verdictBy = adminUser;
    ticket.verdictAt = new Date();
    ticket.status = 'resolved';

    // Add timeline entry
    ticket.timeline.push({
      at: new Date(),
      actor: adminUser,
      action: 'verdict_set',
      note: `Verdict: ${verdict}`,
    });

    await ticket.save();

    // Upsert ContentFlag (public verdict)
    const contentFlag = await ContentFlag.findOneAndUpdate(
      {
        subjectType: ticket.subject?.type || 'price',
        subjectId: ticket.subject?.id || ticket.ticketId, // Fallback to ticketId if no specific ID
      },
      {
        verdict,
        note,
        by: adminUser,
        at: new Date(),
        ticketId: ticket.ticketId,
      },
      { upsert: true, new: true }
    );

    logger.info(`[TrustAdmin] Verdict set on ${ticket.ticketId}: ${verdict} by ${adminUser}`);

    try {
      broadcast('trust:verdict', { 
        ticketId: ticket.ticketId, 
        verdict, 
        subjectType: ticket.subject?.type || 'price',
        subjectId: ticket.subject?.id || ticket.ticketId,
        note,
        by: adminUser,
        at: ticket.verdictAt,
      });
    } catch (e) {
      logger.warn(`[TrustAdmin] Socket broadcast warning: ${e.message}`);
    }

    return res.json({
      success: true,
      ticket,
      message: 'Verdict published',
    });

  } catch (error) {
    logger.error(`[TrustAdmin] Verdict failed: ${error.message}`, error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to set verdict',
    });
  }
};

module.exports = {
  // Public routes
  getProvenanceInfo,
  reportConcern,
  getContentFlags,
  getTicketStatus,
  
  // Admin routes
  adminLogin,
  getAdminTickets,
  triageTicket,
  setTicketVerdict,
};
