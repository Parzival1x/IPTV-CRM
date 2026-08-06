const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { jwtSecret } = require('../config/runtime');
const { protectCustomer } = require('../middleware/auth');
const { customerLoginLimiter } = require('../middleware/rateLimit');
const { assertStrongPassword } = require('../middleware/validation');
const customerRepository = require('../repositories/customerRepository');

const router = express.Router();

// See the admin equivalent: tokenVersion is what lets a password change or a
// revoked portal account end a session that is already open.
const generateCustomerToken = (customer) =>
  jwt.sign(
    { id: customer.id, kind: 'customer', tokenVersion: Number(customer.tokenVersion || 0) },
    jwtSecret,
    { expiresIn: process.env.CUSTOMER_JWT_EXPIRES_IN || '7d' }
  );

const handleValidationErrors = (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
    return true;
  }

  return false;
};

router.post(
  '/login',
  customerLoginLimiter,
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 1, max: 200 })],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const customer = await customerRepository.authenticatePortalCustomer(
        req.body.email,
        req.body.password
      );

      if (!customer) {
        return res.status(401).json({
          success: false,
          message: 'Invalid portal credentials'
        });
      }

      // The password was right but the temporary one they were issued has
      // since expired. Say so specifically -- a generic "invalid credentials"
      // sends them round in circles retyping a password that is correct.
      if (customer.expired) {
        return res.status(401).json({
          success: false,
          code: 'password_expired',
          message: 'This temporary password has expired. Ask your provider to send a new one.'
        });
      }

      res.json({
        success: true,
        token: generateCustomerToken(customer),
        customer
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Unable to sign in to the customer portal'
      });
    }
  }
);

router.get('/me', protectCustomer, async (req, res) => {
  res.json({
    success: true,
    customer: req.customer
  });
});

router.put(
  '/change-password',
  protectCustomer,
  [
    body('currentPassword').isLength({ min: 1, max: 200 }),
    body('newPassword').custom(assertStrongPassword)
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const result = await customerRepository.changePortalPassword(
        req.customer.id,
        req.body.currentPassword,
        req.body.newPassword
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message:
            result.code === 'invalid_password'
              ? 'Current password is incorrect'
              : 'Customer portal account was not found'
        });
      }

      const customer = await customerRepository.getPortalCustomerById(req.customer.id);

      // The change bumped tokenVersion, so the token this request arrived with
      // is now stale. Issue a fresh one, or the customer is signed out by
      // their own password change.
      res.json({
        success: true,
        token: generateCustomerToken({ id: req.customer.id, tokenVersion: result.tokenVersion }),
        customer
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Unable to change portal password'
      });
    }
  }
);

module.exports = router;
