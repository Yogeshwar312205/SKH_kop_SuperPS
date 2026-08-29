const commodityClassifier = require('../services/commodityClassifier');
const logger = require('../utils/logger');

/**
 * POST /api/v2/commodity/classify
 * 
 * Classify a commodity and get packaging recommendations
 */
const classifyCommodity = async (req, res) => {
  try {
    const { commodity, packagingType, weightKg, pieceCount } = req.body;

    if (!commodity) {
      return res.status(400).json({
        success: false,
        message: 'Commodity name is required'
      });
    }

    const classification = commodityClassifier.classifyCommodity(commodity);
    const packagingRec = commodityClassifier.getPackagingRecommendation(classification);
    const validation = commodityClassifier.validateCommodityForBus(
      commodity,
      packagingType,
      weightKg || 0,
      pieceCount || 1
    );

    return res.json({
      success: true,
      classification,
      packagingRecommendation: packagingRec,
      validation: {
        isValid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        rules: validation.rules
      }
    });
  } catch (error) {
    logger.error(`Commodity classification failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to classify commodity'
    });
  }
};

/**
 * GET /api/v2/commodity/packaging-types
 * 
 * Get list of available packaging types
 */
const getPackagingTypes = async (req, res) => {
  try {
    const packagingTypes = [
      { value: 'loose', label: 'Loose', description: 'No packaging', risk: 'high' },
      { value: 'jute-sack', label: 'Jute Sack', description: 'Traditional jute bag', risk: 'medium' },
      { value: 'plastic-sack', label: 'Plastic Sack', description: 'HDPE bag', risk: 'low' },
      { value: 'hdpe-bag', label: 'HDPE Bag', description: 'High-density polyethylene bag', risk: 'low' },
      { value: 'cardboard-box', label: 'Cardboard Box', description: 'Corrugated cardboard box', risk: 'low' },
      { value: 'sealed-box', label: 'Sealed Box', description: 'Sealed carton box', risk: 'very-low' },
      { value: 'wooden-crate', label: 'Wooden Crate', description: 'Wooden box for heavy items', risk: 'very-low' },
      { value: 'plastic-crate', label: 'Plastic Crate', description: 'Ventilated plastic crate', risk: 'low' },
      { value: 'net-bag', label: 'Net Bag', description: 'Mesh bag for produce', risk: 'medium' },
      { value: 'sealed-container', label: 'Sealed Container', description: 'Airtight container', risk: 'very-low' },
      { value: 'insulated-box', label: 'Insulated Box', description: 'Temperature-controlled box', risk: 'very-low' },
      { value: 'ventilated-box', label: 'Ventilated Box', description: 'Box with air holes', risk: 'low' }
    ];

    return res.json({
      success: true,
      packagingTypes
    });
  } catch (error) {
    logger.error(`Get packaging types failed: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Failed to get packaging types'
    });
  }
};

module.exports = {
  classifyCommodity,
  getPackagingTypes
};
