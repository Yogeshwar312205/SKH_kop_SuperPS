const logger = require('../utils/logger');
const { checkAiEngineHealth, callModelInfo } = require('./aiEngineService');
const { RESOURCE_ID, BASE_URL, CACHE_TTL_MS } = require('./agmarknetService');

/**
 * Provenance Service - Assembles "where our data comes from" information
 * 
 * Returns a comprehensive breakdown of:
 * 1. Government price feed (Agmarknet)
 * 2. Sell/hold advice (rule-based)
 * 3. Price forecast (trained model)
 * 4. Spoilage estimate (Q10 model)
 * 5. Government schemes (reference links only)
 * 
 * Cached for ~60 seconds to avoid expensive health checks on every call.
 */

let cache = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 60 * 1000; // 60 seconds

/**
 * Get provenance data for all information sources
 * @returns {Promise<Object>} Five source blocks with metadata
 */
const getProvenance = async () => {
  const now = Date.now();
  
  // Return cached if valid
  if (cache && now < cacheExpiry) {
    return cache;
  }

  logger.info('[Provenance] Assembling data source information...');

  try {
    // Parallel health checks
    const [aiHealth, modelInfo] = await Promise.all([
      checkAiEngineHealth().catch(err => ({ status: 'offline', error: err.message })),
      callModelInfo().catch(err => null),
    ]);

    const provenance = {
      // 1. Government Price Feed
      governmentFeed: {
        name: 'Agmarknet APMC Price Data',
        authority: 'Ministry of Agriculture & Farmers Welfare, Government of India',
        source: 'data.gov.in',
        resourceId: RESOURCE_ID,
        baseUrl: BASE_URL,
        verifyUrl: `https://data.gov.in/resource/${RESOURCE_ID}`,
        isLive: aiHealth.status === 'online', // Proxy for data availability
        refreshCadence: 'Every 6 hours',
        cacheTtl: CACHE_TTL_MS / 1000 / 60, // minutes
        lastFetched: new Date().toISOString(),
        method: 'Direct API integration',
        whatWeShow: 'Government-published modal price per kg',
        whatWeDontDo: 'We do not compute or modify the government price',
      },

      // 2. Sell/Hold Advice (Rule-Based)
      sellHoldAdvice: {
        name: 'Sell or Hold Recommendation',
        method: 'Rule-based decision system',
        inputs: [
          'Current Agmarknet modal price',
          'Price momentum (14-day trailing average)',
          'OpenWeather current conditions',
          'Crop-specific weather profiles',
        ],
        whatWeShow: 'Binary advice: sell now or wait',
        whatWeWithhold: [
          'Exact weights and thresholds',
          'Scoring algorithm details',
          'Weather profile parameters',
        ],
        disclaimer: 'This is advice, not a guarantee. Market conditions can change rapidly.',
      },

      // 3. Price Forecast (Trained Model)
      priceForecast: modelInfo ? {
        name: '7-Period Price Forecast',
        algorithm: modelInfo.algorithm || 'XGBoost',
        trainedOn: modelInfo.trainedOn || 'Historical APMC data (2020-2024)',
        geography: modelInfo.state || 'Maharashtra',
        commodities: modelInfo.commodities || ['Onion', 'Tomato', 'Potato', 'Wheat', 'Soyabean'],
        horizon: modelInfo.horizon || '7 periods ahead',
        lastUpdate: modelInfo.lastUpdate || 'March 2024',
        health: aiHealth.status,
        whatWeShow: 'Predicted price when within ±35% of training range',
        whatWeWithhold: [
          'Feature engineering details',
          'Hyperparameters',
          'Training data splits',
          'Model weights',
        ],
        safetyMeasure: 'Forecast withheld when price exceeds training distribution bounds',
      } : {
        name: '7-Period Price Forecast',
        algorithm: 'XGBoost',
        status: 'offline',
        health: 'AI engine unavailable',
      },

      // 4. Spoilage Estimate (Q10 Model)
      spoilageModel: {
        name: 'Spoilage Risk Estimate',
        method: 'Q10 exponential decay model',
        inputs: [
          'Crop type',
          'Hours since harvest',
          'Temperature (°C)',
          'Refrigeration status',
        ],
        whatWeShow: 'Estimated percentage of commodity spoiled',
        whatWeWithhold: [
          'Q10 temperature coefficients per crop',
          'Decay rate constants',
          'Activation energy parameters',
        ],
        disclaimer: 'Estimate based on standard storage conditions. Actual spoilage may vary.',
      },

      // 5. Government Schemes (Reference Only)
      governmentSchemes: {
        name: 'Government Scheme References',
        approach: 'Outbound links only',
        whatWeDo: 'Link to official government pages with verification dates',
        whatWeDontDo: 'We never restate scheme terms or eligibility criteria',
        schemes: [
          {
            name: 'PM-KISAN (Pradhan Mantri Kisan Samman Nidhi)',
            url: 'https://pmkisan.gov.in/',
            lastChecked: '2026-08-15',
          },
          {
            name: 'PM Fasal Bima Yojana (Crop Insurance)',
            url: 'https://pmfby.gov.in/',
            lastChecked: '2026-08-15',
          },
          {
            name: 'e-NAM (National Agriculture Market)',
            url: 'https://www.enam.gov.in/',
            lastChecked: '2026-08-15',
          },
          {
            name: 'Kisan Credit Card Scheme',
            url: 'https://www.nabard.org/content1.aspx?id=523',
            lastChecked: '2026-08-15',
          },
        ],
        disclaimer: 'Always verify scheme details directly on official government websites',
      },
    };

    // Update cache
    cache = provenance;
    cacheExpiry = now + CACHE_DURATION_MS;

    logger.info('[Provenance] Data source information assembled and cached');
    return provenance;

  } catch (error) {
    logger.error(`[Provenance] Failed to assemble provenance: ${error.message}`);
    
    // Return robust fallback with all expected fields
    return {
      error: 'Unable to fetch live provenance information',
      governmentFeed: {
        name: 'Agmarknet APMC Price Data',
        authority: 'Ministry of Agriculture & Farmers Welfare, Government of India',
        resourceId: RESOURCE_ID || '35985678-0d79-46b4-9ed6-6f13308a1d24',
        refreshCadence: 'Every 6 hours',
        method: 'Government APMC API',
        isLive: false,
        whatWeShow: 'Government-published modal price per kg',
        whatWeDontDo: 'We do not compute or modify the government price',
        verifyUrl: `https://data.gov.in/resource/${RESOURCE_ID || '35985678-0d79-46b4-9ed6-6f13308a1d24'}`,
      },
      sellHoldAdvice: {
        name: 'Sell or Hold Recommendation',
        method: 'Rule-based decision system',
        inputs: [
          'Current Agmarknet modal price',
          'Price momentum (14-day trailing average)',
          'OpenWeather current conditions',
        ],
        whatWeWithhold: [
          'Exact weights and thresholds',
          'Scoring algorithm details',
        ],
        disclaimer: 'This is advice, not a guarantee. Market conditions can change rapidly.',
      },
      priceForecast: {
        name: '7-Period Price Forecast',
        algorithm: 'XGBoost',
        status: 'offline',
        health: 'offline',
        trainedOn: 'Historical APMC data',
        geography: 'Maharashtra',
        horizon: '7 periods ahead',
        whatWeWithhold: ['Model parameters and hyperweights'],
        safetyMeasure: 'Forecast withheld when price exceeds bounds',
      },
      spoilageModel: {
        name: 'Spoilage Risk Estimate',
        method: 'Q10 exponential decay model',
        inputs: ['Crop type', 'Hours since harvest', 'Temperature (°C)'],
        whatWeWithhold: ['Q10 temperature coefficients'],
        disclaimer: 'Estimate based on standard storage conditions.',
      },
      governmentSchemes: {
        name: 'Government Scheme References',
        approach: 'Outbound links only',
        whatWeDo: 'Link to official government pages',
        whatWeDontDo: 'We never restate scheme terms',
        schemes: [
          { name: 'PM-KISAN', url: 'https://pmkisan.gov.in/', lastChecked: '2026-08-15' },
          { name: 'PM Fasal Bima Yojana', url: 'https://pmfby.gov.in/', lastChecked: '2026-08-15' },
        ],
        disclaimer: 'Always verify scheme details directly on official government websites',
      },
    };
  }
};

/**
 * Clear the provenance cache (for testing)
 */
const clearCache = () => {
  cache = null;
  cacheExpiry = 0;
};

module.exports = {
  getProvenance,
  clearCache,
};
