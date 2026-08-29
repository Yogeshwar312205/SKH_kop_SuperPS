const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const logger = require('../utils/logger');
const { getJwtSecret } = require('../config/jwt');
const { getIsConnected } = require('../config/db');
const { findMockUserById } = require('../data/mockUsers');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route (No token)' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, getJwtSecret());
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Not authorized (Invalid token)' });
  }

  if (!getIsConnected() || !mongoose.Types.ObjectId.isValid(decoded.id)) {
    const validId = mongoose.Types.ObjectId.isValid(decoded.id)
      ? decoded.id
      : '65f1a0010000000000000003';

    req.user = findMockUserById(decoded.id) || {
      _id: validId,
      name: 'Demo User',
      email: 'demo@krishiflow.ai',
      role: decoded.role || 'Logistics',
      phone: '+91 98765 00000',
      location: { address: 'Kopargaon, Maharashtra' },
    };
    return next();
  }

  try {
    req.user = await User.findById(decoded.id).select('-password');
  } catch (e) {
    logger.error(`Auth lookup error: ${e.message}`);
    const fallbackUser = findMockUserById(decoded.id);
    if (fallbackUser) {
      req.user = fallbackUser;
      return next();
    }
    return res.status(503).json({ success: false, message: 'Authorization is temporarily unavailable. Please try again shortly.' });
  }

  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not authorized (user no longer exists)' });
  }

  next();
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'Guest'}' is not authorized to perform this action`
      });
    }
    next();
  };
};

module.exports = { protect, authorize };
