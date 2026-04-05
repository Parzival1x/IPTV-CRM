const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect, developmentOnly } = require('../middleware/auth');
const customerRepository = require('../repositories/customerRepository');

const router = express.Router();

const isInternationalPhoneNumber = (value) =>
  /^\+[1-9]\d{7,14}$/.test(String(value || '').trim());

const normalizePaymentMode = (paymentMode) => {
  if (!paymentMode) {
    return 'Other';
  }

  const normalized = String(paymentMode).trim().toLowerCase();

  const paymentModeMap = {
    cash: 'Cash',
    card: 'Credit Card',
    'credit card': 'Credit Card',
    credit_card: 'Credit Card',
    'debit card': 'Debit Card',
    debit_card: 'Debit Card',
    paypal: 'PayPal',
    'bank transfer': 'Bank Transfer',
    bank_transfer: 'Bank Transfer',
    other: 'Other'
  };

  return paymentModeMap[normalized] || paymentMode;
};

const normalizeCustomerPayload = (payload) => {
  const normalized = { ...payload };

  if (normalized.status) {
    normalized.status = String(normalized.status).trim().toLowerCase();
  }

  if (Object.prototype.hasOwnProperty.call(normalized, 'paymentMode')) {
    normalized.paymentMode = normalizePaymentMode(normalized.paymentMode);
  }

  return normalized;
};

const normalizeServicePayload = (payload) => {
  const normalized = { ...payload };

  if (Object.prototype.hasOwnProperty.call(normalized, 'paymentMode')) {
    normalized.paymentMode = normalizePaymentMode(normalized.paymentMode);
  }

  if (normalized.status) {
    normalized.status = String(normalized.status).trim().toLowerCase();
  }

  if (Array.isArray(normalized.features)) {
    normalized.features = normalized.features
      .map((feature) => String(feature || '').trim())
      .filter(Boolean);
  }

  return normalized;
};

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

router.post('/seed', developmentOnly, async (req, res) => {
  try {
    const customers = await customerRepository.ensureSampleCustomers();

    res.json({
      success: true,
      message: 'Sample customers ready',
      count: customers.length,
      customers
    });
  } catch (error) {
    console.error('Seed customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error seeding customers'
    });
  }
});

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const customers = await customerRepository.getAll();
    res.json({
      success: true,
      customers
    });
  } catch (error) {
    console.error('Get customers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting customers'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const customer = await customerRepository.getById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting customer'
    });
  }
});

router.post('/', [
  body('name').isLength({ min: 2 }).trim(),
  body('email').isEmail().normalizeEmail(),
  body('phone')
    .trim()
    .custom((value) => {
      if (!isInternationalPhoneNumber(value)) {
        throw new Error('Phone number must use international format, for example +919876543210');
      }

      return true;
    }),
  body('whatsappNumber')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!isInternationalPhoneNumber(value)) {
        throw new Error('WhatsApp number must use international format, for example +919876543210');
      }

      return true;
    })
], async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const existingCustomer = await customerRepository.findByEmail(req.body.email);
    const existingPhone = await customerRepository.findByPhone(req.body.phone);

    if (existingCustomer) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'Customer with this phone number already exists'
      });
    }

    const customer = await customerRepository.create(
      normalizeCustomerPayload(req.body)
    );

    res.status(201).json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Create customer error:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error creating customer'
    });
  }
});

router.put('/:id', [
  body('name').optional().isLength({ min: 2 }).trim(),
  body('email').optional().isEmail().normalizeEmail(),
  body('phone')
    .optional()
    .trim()
    .custom((value) => {
      if (!isInternationalPhoneNumber(value)) {
        throw new Error('Phone number must use international format, for example +919876543210');
      }

      return true;
    }),
  body('whatsappNumber')
    .optional({ values: 'falsy' })
    .trim()
    .custom((value) => {
      if (!isInternationalPhoneNumber(value)) {
        throw new Error('WhatsApp number must use international format, for example +919876543210');
      }

      return true;
    })
], async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) {
      return;
    }

    if (req.body.email) {
      const existingCustomer = await customerRepository.findByEmail(req.body.email);

      if (existingCustomer && existingCustomer.id !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this email already exists'
        });
      }
    }

    if (req.body.phone) {
      const existingPhone = await customerRepository.findByPhone(req.body.phone);

      if (existingPhone && existingPhone.id !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Customer with this phone number already exists'
        });
      }
    }

    const customer = await customerRepository.update(
      req.params.id,
      normalizeCustomerPayload(req.body)
    );

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer
    });
  } catch (error) {
    console.error('Update customer error:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Customer with this email already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating customer'
    });
  }
});

router.post('/:id/reset-portal-password', async (req, res) => {
  try {
    const result = await customerRepository.resetPortalPassword(req.params.id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      customer: result.customer,
      portalSetup: {
        temporaryPassword: result.temporaryPassword,
        resetRequired: true
      }
    });
  } catch (error) {
    console.error('Reset portal password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resetting portal password'
    });
  }
});

router.post(
  '/:id/services',
  [
    body('planCode').isLength({ min: 2 }).trim(),
    body('name').isLength({ min: 2 }).trim(),
    body('status').optional().isIn(['draft', 'active', 'expired', 'cancelled', 'suspended']),
    body('amount').optional(),
    body('paymentMode').optional().trim(),
    body('durationMonths').optional().isInt({ min: 1, max: 36 }),
    body('startDate').optional().isISO8601(),
    body('expiryDate').optional().isISO8601(),
    body('maxConnections').optional().isInt({ min: 1, max: 20 }),
    body('features').optional().isArray(),
    body('portalUrl').optional({ values: 'falsy' }).isURL(),
    body('billingUrl').optional({ values: 'falsy' }).isURL()
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const existingCustomer = await customerRepository.getById(req.params.id);

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const customer = await customerRepository.addServiceSubscription(
        req.params.id,
        normalizeServicePayload(req.body)
      );

      res.status(201).json({
        success: true,
        customer
      });
    } catch (error) {
      console.error('Add customer service error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Server error adding customer service'
      });
    }
  }
);

router.post(
  '/:id/payments',
  [
    body('subscriptionIds').isArray({ min: 1 }),
    body('subscriptionIds.*').isUUID(),
    body('amount').optional().isFloat({ min: 0.01 }),
    body('paymentMode').optional().trim(),
    body('paymentDate').optional().isISO8601()
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const existingCustomer = await customerRepository.getById(req.params.id);

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const customer = await customerRepository.recordCustomerPayment(req.params.id, req.body);

      res.status(201).json({
        success: true,
        customer
      });
    } catch (error) {
      console.error('Record customer payment error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Server error recording payment'
      });
    }
  }
);

router.put(
  '/:id/services/:serviceId',
  [
    body('planCode').isLength({ min: 2 }).trim(),
    body('name').isLength({ min: 2 }).trim(),
    body('status').optional().isIn(['draft', 'active', 'expired', 'cancelled', 'suspended']),
    body('amount').optional(),
    body('paymentMode').optional().trim(),
    body('durationMonths').optional().isInt({ min: 1, max: 36 }),
    body('startDate').optional().isISO8601(),
    body('expiryDate').optional().isISO8601(),
    body('maxConnections').optional().isInt({ min: 1, max: 20 }),
    body('features').optional().isArray(),
    body('portalUrl').optional({ values: 'falsy' }).isURL(),
    body('billingUrl').optional({ values: 'falsy' }).isURL()
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const existingCustomer = await customerRepository.getById(req.params.id);

      if (!existingCustomer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const existingService = existingCustomer.subscriptions.find(
        (subscription) => subscription.id === req.params.serviceId
      );

      if (!existingService) {
        return res.status(404).json({
          success: false,
          message: 'Service not found for this customer'
        });
      }

      const customer = await customerRepository.updateServiceSubscription(
        req.params.id,
        req.params.serviceId,
        normalizeServicePayload(req.body)
      );

      res.json({
        success: true,
        customer
      });
    } catch (error) {
      console.error('Update customer service error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Server error updating customer service'
      });
    }
  }
);

router.delete('/:id', async (req, res) => {
  try {
    const wasDeleted = await customerRepository.remove(req.params.id);

    if (!wasDeleted) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    res.json({
      success: true,
      message: 'Customer deleted successfully'
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting customer'
    });
  }
});

module.exports = router;
