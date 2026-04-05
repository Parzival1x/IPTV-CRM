const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/runtime');
const adminRepository = require('../repositories/adminRepository');
const customerRepository = require('../repositories/customerRepository');

const getBearerToken = (req) => {
  const authHeader = req.header('Authorization') || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.replace('Bearer ', '').trim();
};

const protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.kind && decoded.kind !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Admin authentication required'
      });
    }

    const admin = await adminRepository.getById(decoded.id);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated user not found'
      });
    }

    req.admin = admin;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

const protectCustomer = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.kind !== 'customer') {
      return res.status(401).json({
        success: false,
        message: 'Customer authentication required'
      });
    }

    const customer = await customerRepository.getPortalCustomerById(decoded.id);

    if (!customer) {
      return res.status(401).json({
        success: false,
        message: 'Authenticated customer not found'
      });
    }

    req.customer = customer;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.admin) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (!roles.includes(req.admin.role)) {
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action'
    });
  }

  next();
};

const developmentOnly = (req, res, next) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const allowSeedInProduction = process.env.ALLOW_DEV_SEED === 'true';

  if (!isDevelopment && !allowSeedInProduction) {
    return res.status(403).json({
      success: false,
      message: 'This endpoint is disabled outside development'
    });
  }

  next();
};

module.exports = {
  protect,
  protectCustomer,
  requireRole,
  developmentOnly
};
