const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/runtime');
const logger = require('../config/logger');
const adminRepository = require('../repositories/adminRepository');
const customerRepository = require('../repositories/customerRepository');

// Role hierarchy, most privileged first. `requireRole` accepts a minimum rank
// rather than a list, so adding a role does not mean revisiting every route.
const ROLE_RANK = {
  'super-admin': 30,
  admin: 20,
  moderator: 10
};

const ROLES = {
  SUPER_ADMIN: 'super-admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

const getBearerToken = (req) => {
  const authHeader = req.header('Authorization') || '';

  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }

  return authHeader.slice('Bearer '.length).trim();
};

const unauthorized = (res, message) =>
  res.status(401).json({ success: false, message });

const protect = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return unauthorized(res, 'Authentication required');
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.kind && decoded.kind !== 'admin') {
      return unauthorized(res, 'Admin authentication required');
    }

    const admin = await adminRepository.getById(decoded.id);

    if (!admin) {
      return unauthorized(res, 'Authenticated user not found');
    }

    // Tokens last seven days and previously could not be invalidated, so a
    // password change or a revoked account left a working credential in the
    // wild for the rest of the week. The counter is bumped on both, and a
    // token minted before the bump no longer matches.
    if (Number(decoded.tokenVersion ?? 0) !== Number(admin.tokenVersion ?? 0)) {
      return unauthorized(res, 'This session has been signed out. Please sign in again.');
    }

    req.admin = admin;
    next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      logger.error('Admin token verification failed unexpectedly', { error });
    }

    return unauthorized(res, 'Token is not valid');
  }
};

const protectCustomer = async (req, res, next) => {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return unauthorized(res, 'Customer authentication required');
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (decoded.kind !== 'customer') {
      return unauthorized(res, 'Customer authentication required');
    }

    // A cheap row read first: the full portal customer pulls in every
    // subscription and payment, which is wasted work if the token is stale.
    const authRow = await customerRepository.getPortalAuthRow(decoded.id);

    if (!authRow || authRow.deleted_at || authRow.portal_access_enabled !== true) {
      return unauthorized(res, 'Authenticated customer not found');
    }

    if (Number(decoded.tokenVersion ?? 0) !== Number(authRow.token_version ?? 0)) {
      return unauthorized(res, 'This session has been signed out. Please sign in again.');
    }

    const customer = await customerRepository.getPortalCustomerById(decoded.id);

    if (!customer) {
      return unauthorized(res, 'Authenticated customer not found');
    }

    req.customer = customer;
    next();
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError') {
      logger.error('Customer token verification failed unexpectedly', { error });
    }

    return unauthorized(res, 'Token is not valid');
  }
};

// `requireRole` existed before this and was applied to exactly one route, so
// any authenticated admin -- including a moderator -- could delete customers,
// reset portal passwords, record payments and send notifications. It now takes
// the minimum rank required and is applied to every route that changes money,
// access, or the existence of a record.
const requireRole = (minimumRole) => (req, res, next) => {
  if (!req.admin) {
    return unauthorized(res, 'Authentication required');
  }

  const required = ROLE_RANK[minimumRole] ?? ROLE_RANK[ROLES.SUPER_ADMIN];
  const actual = ROLE_RANK[req.admin.role] ?? 0;

  if (actual < required) {
    return res.status(403).json({
      success: false,
      message: `This action requires the ${minimumRole} role or higher.`
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
  developmentOnly,
  ROLES,
  ROLE_RANK
};
