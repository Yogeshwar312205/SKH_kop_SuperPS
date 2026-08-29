const express = require('express');
const router = express.Router();
const systemController = require('../controllers/systemController');

/**
 * System Routes - Resilience & Blackout Challenge
 * 
 * These routes are UNAUTHENTICATED by design.
 * Critical insight: if users collection is wiped, auth middleware breaks.
 * 
 * Guards: NODE_ENV !== 'production' OR RESILIENCE_DRILL_TOKEN header
 */

// Health check (always accessible)
router.get('/health', systemController.getHealth);

// Drill endpoints (guarded)
router.post('/drill/seed', systemController.seedDrillData);
router.post('/drill/blackout', systemController.simulateBlackout);
router.post('/drill/reset', systemController.resetDrill);

// Recovery endpoint (guarded)
router.post('/recover', systemController.recoverSystem);

// Manual snapshot (guarded)
router.post('/snapshot', systemController.takeSnapshot);

module.exports = router;
