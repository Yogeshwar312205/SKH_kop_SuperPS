const EnvironmentSnapshot = require('../models/EnvironmentSnapshot');
const logger = require('../utils/logger');

const MOCK_MODE = process.env.MOCK_MODE === 'true';

// GET /api/v2/environment/current
const getCurrent = async (req, res) => {
  try {
    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        environment: {
          at: new Date().toISOString(),
          source: 'simulated',
          tempC: 28.5,
          humidityPct: 65,
          rainProbPct: 30,
          rainfallMm: 0,
          trafficProvider: 'simulated',
          edgeSpeedFactors: {
            'KPG-DEPOT_SHIRDI': 1.0,
            'SHIRDI_NASHIK': 0.85,
          },
        },
      });
    }

    const snapshot = await EnvironmentSnapshot.findOne({ active: true }).sort({ at: -1 });
    if (!snapshot) {
      return res.status(404).json({ success: false, message: 'No environment snapshot available.' });
    }

    return res.json({
      success: true,
      source: 'database',
      environment: {
        at: snapshot.at,
        source: snapshot.source,
        tempC: snapshot.tempC,
        humidityPct: snapshot.humidityPct,
        rainProbPct: snapshot.rainProbPct,
        rainfallMm: snapshot.rainfallMm,
        trafficProvider: snapshot.trafficProvider,
        edgeSpeedFactors: Object.fromEntries(snapshot.edgeSpeedFactors),
      },
    });
  } catch (error) {
    logger.error(`Get current environment failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load environment state.' });
  }
};

// POST /api/v2/environment/override — manual override for demo
const overrideEnvironment = async (req, res) => {
  try {
    const { rainProbPct, tempC, congestionLevel } = req.body || {};

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        message: 'Environment override applied (mock mode).',
        environment: {
          rainProbPct: rainProbPct ?? 85,
          tempC: tempC ?? 32,
          congestionLevel: congestionLevel ?? 'high',
        },
      });
    }

    // TODO: P1 implements actual override logic (writes EnvironmentSnapshot, broadcasts socket event)

    return res.json({
      success: true,
      source: 'stub',
      message: 'Environment override endpoint ready. Awaiting P1 implementation.',
    });
  } catch (error) {
    logger.error(`Override environment failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not override environment.' });
  }
};

// GET /api/v2/environment/providers
const getProviders = async (req, res) => {
  try {
    return res.json({
      success: true,
      providers: {
        traffic: process.env.TRAFFIC_PROVIDER || 'simulated',
        weather: process.env.WEATHER_PROVIDER || 'simulated',
      },
    });
  } catch (error) {
    logger.error(`Get providers failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not load providers.' });
  }
};

// POST /api/v2/environment/providers — switch provider live
const setProviders = async (req, res) => {
  try {
    const { traffic, weather } = req.body || {};

    // This doesn't actually change process.env (immutable at runtime in Node),
    // but signals the provider abstraction layer which impl to use

    if (MOCK_MODE) {
      return res.json({
        success: true,
        source: 'mock',
        message: `Switched to traffic=${traffic || 'simulated'}, weather=${weather || 'simulated'}`,
      });
    }

    // TODO: P1 implements provider switching (updates config, broadcasts socket event)

    return res.json({
      success: true,
      source: 'stub',
      message: 'Provider switching endpoint ready. Awaiting P1 implementation.',
    });
  } catch (error) {
    logger.error(`Set providers failed: ${error.message}`);
    return res.status(503).json({ success: false, message: 'Could not switch providers.' });
  }
};

module.exports = { getCurrent, overrideEnvironment, getProviders, setProviders };
