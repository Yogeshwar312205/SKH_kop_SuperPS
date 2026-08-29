/**
 * Weather Service (§4, §7.4) — Backend wrapper for AI engine weather provider.
 *
 * Fetches weather from FastAPI /forecast/weather endpoint (which uses OpenMeteo).
 * Provides a simple interface for controllers to get current weather + forecasts.
 */

const axios = require('axios');
const logger = require('../utils/logger');

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';

// Kopargaon coordinates (default)
const KOPARGAON_LAT = 19.88;
const KOPARGAON_LNG = 74.48;

/**
 * Get current weather for Kopargaon (or custom location).
 *
 * @param {number} [lat=KOPARGAON_LAT] - Latitude
 * @param {number} [lng=KOPARGAON_LNG] - Longitude
 * @returns {Promise<Object>} Weather data
 */
async function getCurrentWeather(lat = KOPARGAON_LAT, lng = KOPARGAON_LNG) {
  try {
    const { data } = await axios.get(`${AI_ENGINE_URL}/forecast/weather`, {
      params: { lat, lng, hours_ahead: 0 },
      timeout: 8000,
    });
    
    return {
      tempC: data.tempC,
      humidityPct: data.humidityPct,
      rainProbPct: data.rainProbPct,
      rainfallMm: data.rainfallMm,
      source: data.source,
      timestamp: data.timestamp,
    };
  } catch (err) {
    logger.error('Weather service error:', err.message);
    
    // Fallback to synthetic if AI engine is down
    return {
      tempC: 28.0,
      humidityPct: 65.0,
      rainProbPct: 30.0,
      rainfallMm: 0.0,
      source: 'fallback-synthetic',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get weather forecast N hours ahead.
 *
 * @param {number} hoursAhead - Hours ahead (1-24)
 * @param {number} [lat=KOPARGAON_LAT] - Latitude
 * @param {number} [lng=KOPARGAON_LNG] - Longitude
 * @returns {Promise<Object>} Weather forecast
 */
async function getForecast(hoursAhead, lat = KOPARGAON_LAT, lng = KOPARGAON_LNG) {
  try {
    const { data } = await axios.get(`${AI_ENGINE_URL}/forecast/weather`, {
      params: { lat, lng, hours_ahead: hoursAhead },
      timeout: 8000,
    });
    
    return {
      tempC: data.tempC,
      humidityPct: data.humidityPct,
      rainProbPct: data.rainProbPct,
      rainfallMm: data.rainfallMm,
      source: data.source,
      timestamp: data.timestamp,
    };
  } catch (err) {
    logger.error('Weather forecast error:', err.message);
    
    // Fallback
    return {
      tempC: 28.0,
      humidityPct: 65.0,
      rainProbPct: 30.0,
      rainfallMm: 0.0,
      source: 'fallback-synthetic',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get weather for a route (average over departure + arrival locations).
 *
 * @param {Object} route - Route with origin and dest stops
 * @param {number} hoursAhead - Hours ahead
 * @returns {Promise<Object>} Weather data
 */
async function getRouteWeather(route, hoursAhead = 0) {
  // Simplified: use route midpoint
  // In production, sample multiple points along route and aggregate
  
  if (!route.origin || !route.dest) {
    return getCurrentWeather();
  }
  
  const originLat = route.origin.location?.coordinates?.[1] || KOPARGAON_LAT;
  const originLng = route.origin.location?.coordinates?.[0] || KOPARGAON_LNG;
  const destLat = route.dest.location?.coordinates?.[1] || KOPARGAON_LAT;
  const destLng = route.dest.location?.coordinates?.[0] || KOPARGAON_LNG;
  
  const midLat = (originLat + destLat) / 2;
  const midLng = (originLng + destLng) / 2;
  
  if (hoursAhead === 0) {
    return getCurrentWeather(midLat, midLng);
  } else {
    return getForecast(hoursAhead, midLat, midLng);
  }
}

/**
 * Calculate Weather Risk Score for a consignment (mirrors rule_engine.py logic).
 *
 * @param {Object} consignment - Consignment data
 * @param {Object} weather - Weather data
 * @returns {number} Weather Risk Score (0-100)
 */
function calculateWeatherRiskScore(consignment, weather) {
  const commodity = (consignment.commodity || '').toLowerCase();
  const packaging = (consignment.packagingType || '').toLowerCase();
  const rainProb = weather.rainProbPct || 0;
  const tempC = weather.tempC || 25;
  const humidityPct = weather.humidityPct || 60;
  
  // Moisture-sensitive commodities
  const moistureSensitive = ['seed', 'grain', 'pulse', 'flour', 'jaggery', 'spice'];
  const sensitivityScore = moistureSensitive.some(ms => commodity.includes(ms)) ? 30 : 10;
  
  // Packaging protection
  const waterproofKeywords = ['plastic', 'tarp', 'sealed', 'hdpe', 'polypropylene'];
  const packagingScore = waterproofKeywords.some(kw => packaging.includes(kw)) ? 10 : 35;
  
  // Rain probability contribution
  const rainScore = rainProb * 0.4; // max 40
  
  // Temp/humidity contribution
  const climateScore = Math.min(15, (humidityPct - 60) * 0.3 + (tempC - 25) * 0.2);
  
  const wrs = Math.min(100, Math.floor(sensitivityScore + packagingScore + rainScore + climateScore));
  return wrs;
}

/**
 * Get weather risk band from WRS.
 *
 * @param {number} wrs - Weather Risk Score (0-100)
 * @returns {string} 'LOW' | 'MEDIUM' | 'HIGH'
 */
function getWeatherRiskBand(wrs) {
  if (wrs >= 70) return 'HIGH';
  if (wrs >= 50) return 'MEDIUM';
  return 'LOW';
}

module.exports = {
  getCurrentWeather,
  getForecast,
  getRouteWeather,
  calculateWeatherRiskScore,
  getWeatherRiskBand,
};
