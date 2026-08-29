const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');
const logger = require('../utils/logger');

/**
 * Admin Authentication Middleware for Trust System
 * 
 * Demo credentials: admin/admin123
 * Configurable via TRUST_ADMIN_USER/TRUST_ADMIN_PASS env vars
 * 
 * Security model:
 * - Non-production: Always enabled (demo mode)
 * - Production: Requires TRUST_ADMIN_ENABLED=true
 * - Future: Replace with User.role === 'Admin' + real RBAC
 * 
 * The admin routes already isolate behind this guard, so only
 * the credential check needs to change for production deployment.
 */

/**
 * Check if admin features are enabled
 */
const isAdminEnabled = () => {
  if (process.env.NODE_ENV !== 'production') {
    return true; // Always enabled in dev/test
  }
  return process.env.TRUST_ADMIN_ENABLED === 'true';
};

/**
 * Verify admin credentials (demo implementation)
 * @param {string} username 
 * @param {string} password 
 * @returns {boolean}
 */
const verifyAdminCredentials = (username, password) => {
  const adminUser = process.env.TRUST_ADMIN_USER || 'admin';
  const adminPass = process.env.TRUST_ADMIN_PASS || 'admin123';
  
  return username === adminUser && password === adminPass;
};

/**
 * Generate admin JWT token
 * @param {string} username 
 * @returns {string}
 */
const generateAdminToken = (username) => {
  return jwt.sign(
    {
      scope: 'trust-admin',
      username,
      iat: Date.now(),
    },
    getJwtSecret(),
    { expiresIn: '8h' } // Short-lived for security
  );
};

/**
 * Admin Guard Middleware
 * Protects admin-only routes
 */
const adminGuard = async (req, res, next) => {
  // Check if admin features are enabled
  if (!isAdminEnabled()) {
    logger.warn('[TrustAdmin] Admin access blocked - not enabled in production');
    return res.status(403).json({
      success: false,
      message: 'Admin features are not enabled',
      hint: 'Set TRUST_ADMIN_ENABLED=true in production',
    });
  }

  // Extract token
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Admin authentication required',
    });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, getJwtSecret());
    
    // Check scope
    if (decoded.scope !== 'trust-admin') {
      return res.status(403).json({
        success: false,
        message: 'Invalid admin token scope',
      });
    }

    // Attach admin info to request
    req.admin = {
      username: decoded.username,
      scope: decoded.scope,
    };

    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Admin session expired',
      });
    }
    
    logger.error(`[TrustAdmin] Token verification failed: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Invalid admin token',
    });
  }
};

module.exports = {
  adminGuard,
  verifyAdminCredentials,
  generateAdminToken,
  isAdminEnabled,
};
