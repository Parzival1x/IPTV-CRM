const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { jwtSecret } = require('../config/runtime');
const { protectCustomer } = require('../middleware/auth');
const customerRepository = require('../repositories/customerRepository');

const router = express.Router();

const generateCustomerToken = (customerId) =>
  jwt.sign(
    { id: customerId, kind: 'customer' },
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
  [body('email').isEmail().normalizeEmail(), body('password').isLength({ min: 6 })],
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

      res.json({
        success: true,
        token: generateCustomerToken(customer.id),
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
  [body('currentPassword').isLength({ min: 6 }), body('newPassword').isLength({ min: 8 })],
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

      res.json({
        success: true,
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
