const rateLimit = require('express-rate-limit');

// High-capacity API limiter for local development and active driver/farmer portals
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // relaxed limit for active usage & dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 50 : 500,
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  }
});

// Separate limiter for dispatch endpoints - fleet owners may check frequently
const dispatchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // relaxed for local testing
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many dispatch requests. Please wait a moment before refreshing.'
  }
});

module.exports = { apiLimiter, authLimiter, dispatchLimiter };
