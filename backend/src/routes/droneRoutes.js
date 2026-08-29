const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { apiLimiter } = require('../middlewares/rateLimiter');
const droneController = require('../controllers/droneController');

/**
 * /api/v2/drone — Autonomous Drone Supply Chain & First-Mile Network
 */

// Public / Authenticated discovery
router.get('/hubs', apiLimiter, droneController.getDroneHubs);
router.get('/fleet', apiLimiter, droneController.getDroneFleet);
router.get('/analytics', apiLimiter, droneController.getDroneAnalytics);

// Operational actions
router.post('/estimate', apiLimiter, droneController.estimateMission);
router.post('/dispatch', apiLimiter, droneController.dispatchMission);
router.post('/simulate/:missionId', apiLimiter, droneController.simulateMission);

module.exports = router;
