const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const { apiLimiter } = require('../middlewares/rateLimiter');

// Controllers
const busController = require('../controllers/busController');
const consignmentController = require('../controllers/consignmentController');
const dashboardController = require('../controllers/dashboardController');
const commodityController = require('../controllers/commodityController');
const rulesController = require('../controllers/rulesController');
const environmentController = require('../controllers/environmentController');
const optimizeController = require('../controllers/optimizeController');
const scenarioController = require('../controllers/scenarioController');
const evController = require('../controllers/evController');

// Services
const routeValidator = require('../services/routeValidator');

/*
 * /api/v2 — Bus-parcel consolidation system (§8.2)
 *
 * All endpoints follow the existing pattern: protect middleware for auth,
 * authorize for roles, apiLimiter for rate limiting. MOCK_MODE stubs return
 * realistic data immediately so P4 can build UI in parallel.
 */

// ============================================================================
// Bus network routes
// ============================================================================

router.get('/bus/stops', apiLimiter, protect, busController.getStops);
router.get('/bus/routes', apiLimiter, protect, busController.getRoutes);
router.post('/bus/routes', apiLimiter, protect, busController.createRoute);
router.get('/bus/trips', apiLimiter, protect, busController.getTrips);
router.post('/bus/trips', apiLimiter, protect, busController.createTrip);
router.get('/bus/trips/:id/manifest', apiLimiter, protect, authorize('Logistics', 'Driver', 'Transporter', 'Admin'), busController.getTripManifest);
router.get('/bus/traffic', apiLimiter, protect, busController.getTomTomTraffic);

// Route validation and preview
router.get('/bus/route-preview', apiLimiter, protect, async (req, res) => {
  try {
    const { originStopId, destStopId, date, requiredCapacityKg } = req.query;
    
    if (!originStopId || !destStopId) {
      return res.status(400).json({
        success: false,
        message: 'originStopId and destStopId are required'
      });
    }
    
    const preview = await routeValidator.getRoutePreview(
      originStopId,
      destStopId,
      date,
      parseFloat(requiredCapacityKg) || 0
    );
    
    return res.json({
      success: preview.isValid,
      ...preview
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to get route preview',
      error: error.message
    });
  }
});

// ============================================================================
// Consignment routes (parallel to /api/requests)
// ============================================================================

router.post('/consignments', apiLimiter, protect, authorize('Farmer'), consignmentController.createConsignment);
router.get('/consignments', apiLimiter, protect, consignmentController.getConsignments);
router.get('/consignments/:id', apiLimiter, protect, consignmentController.getConsignment);
router.get('/consignments/:id/tracking', apiLimiter, protect, consignmentController.getConsignmentTracking);
router.get('/consignments/:id/explain', apiLimiter, protect, consignmentController.explainConsignment);

// ============================================================================
// Commodity classification routes
// ============================================================================

router.post('/commodity/classify', apiLimiter, protect, commodityController.classifyCommodity);
router.get('/commodity/packaging-types', apiLimiter, protect, commodityController.getPackagingTypes);

// ============================================================================
// Dashboard routes
// ============================================================================

router.get('/dashboard/metrics', apiLimiter, protect, dashboardController.getMetrics);
router.get('/dashboard/stats', apiLimiter, protect, dashboardController.getStats);

// ============================================================================
// Rules engine routes
// ============================================================================

router.post('/rules/evaluate', apiLimiter, protect, rulesController.evaluateRules);
router.get('/rules/book', apiLimiter, protect, rulesController.getRulebook);

// ============================================================================
// Environment routes (weather + traffic)
// ============================================================================

router.get('/environment/current', apiLimiter, protect, environmentController.getCurrent);
router.post('/environment/override', apiLimiter, protect, authorize('Admin'), environmentController.overrideEnvironment);
router.get('/environment/providers', apiLimiter, protect, environmentController.getProviders);
router.post('/environment/providers', apiLimiter, protect, authorize('Admin'), environmentController.setProviders);

// ============================================================================
// Optimization routes
// ============================================================================

router.post('/optimize/run', apiLimiter, protect, authorize('Admin', 'Logistics'), optimizeController.runOptimization);
router.get('/optimize/compare', apiLimiter, protect, optimizeController.compareRuns);

// ============================================================================
// Scenario routes (adaptation demos)
// ============================================================================

router.post('/scenario/apply', apiLimiter, protect, authorize('Admin'), scenarioController.applyScenario);
router.post('/scenario/reset', apiLimiter, protect, authorize('Admin'), scenarioController.resetScenarios);
router.get('/scenario/active', apiLimiter, protect, scenarioController.getActiveScenarios);

// ============================================================================
// EV charging routes
// ============================================================================

router.get('/ev/candidates', apiLimiter, protect, evController.getCandidates);
router.post('/ev/optimize', apiLimiter, protect, authorize('Admin', 'Logistics'), evController.optimizeSiting);

module.exports = router;
