const express = require('express');
const { body, query, param } = require('express-validator');
const { protect, requireRole, developmentOnly, ROLES } = require('../middleware/auth');
const {
  handleValidationErrors,
  asyncHandler,
  assertInternationalPhoneNumber,
  respondWithError
} = require('../middleware/validation');
const customerRepository = require('../repositories/customerRepository');
const auditRepository = require('../repositories/auditRepository');
const notificationService = require('../services/notificationService');
const { frontendUrl } = require('../config/runtime');
const logger = require('../config/logger');

const router = express.Router();

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

  // The cached balance columns are no longer written by the application -- the
  // figures come from the customer_financials view. Accepting them from a
  // client would let a browser overwrite an account balance.
  delete normalized.totalCredit;
  delete normalized.alreadyGiven;
  delete normalized.remainingCredits;
  delete normalized.deletedAt;
  delete normalized.tokenVersion;

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

const customerValidators = (optional) => [
  optional
    ? body('name').optional().isLength({ min: 2, max: 160 }).trim()
    : body('name').isLength({ min: 2, max: 160 }).trim(),
  optional
    ? body('email').optional().isEmail().normalizeEmail()
    : body('email').isEmail().normalizeEmail(),
  optional
    ? body('phone').optional().trim().custom(assertInternationalPhoneNumber('Phone number'))
    : body('phone').trim().custom(assertInternationalPhoneNumber('Phone number')),
  body('whatsappNumber')
    .optional({ values: 'falsy' })
    .trim()
    .custom(assertInternationalPhoneNumber('WhatsApp number')),
  body('status').optional().isIn(['active', 'inactive', 'pending', 'suspended']),
  body('currency').optional().isLength({ min: 3, max: 3 }).isAlpha(),
  body('whatsappOptIn').optional().isBoolean(),
  body('emailOptIn').optional().isBoolean(),
  body('note').optional({ values: 'falsy' }).isLength({ max: 4000 })
];

const serviceValidators = [
  body('planCode').isLength({ min: 2, max: 60 }).trim(),
  body('name').isLength({ min: 2, max: 160 }).trim(),
  body('status').optional().isIn(['draft', 'active', 'expired', 'cancelled', 'suspended']),
  body('amount').optional().isFloat({ min: 0, max: 1000000 }),
  body('discount').optional().isFloat({ min: 0, max: 1000000 }),
  body('paymentMode').optional().trim(),
  body('durationMonths').optional().isInt({ min: 1, max: 36 }),
  body('startDate').optional().isISO8601(),
  body('expiryDate').optional().isISO8601(),
  body('maxConnections').optional().isInt({ min: 1, max: 20 }),
  body('features').optional().isArray({ max: 50 }),
  body('portalUrl').optional({ values: 'falsy' }).isURL(),
  body('billingUrl').optional({ values: 'falsy' }).isURL()
];

// A temporary portal password used to be returned to the console and nothing
// else -- never delivered over a channel the customer controls, and valid
// forever. It now goes to the customer and carries an expiry.
const deliverPortalCredentials = async (customer, portalSetup, req) => {
  if (!portalSetup?.temporaryPassword) {
    return { attempted: false };
  }

  const channels = [];

  if (customer.email) {
    channels.push('email');
  }

  if (!channels.length) {
    return { attempted: false, reason: 'The customer has no email address on file.' };
  }

  try {
    await notificationService.sendCustomerNotifications({
      customer,
      channels,
      templateName: 'portal_credentials',
      metadata: {
        temporaryPassword: portalSetup.temporaryPassword,
        expiresInHours: portalSetup.expiresInHours,
        portalUrl: `${frontendUrl.replace(/\/$/, '')}/portal/signin`
      },
      userId: req.admin?.id || null
    });

    return { attempted: true, delivered: true, channels };
  } catch (error) {
    logger.warn('Could not deliver portal credentials', { customerId: customer.id, error });
    return { attempted: true, delivered: false, reason: error.message };
  }
};

router.post('/seed', developmentOnly, asyncHandler(async (req, res) => {
  try {
    const customers = await customerRepository.ensureSampleCustomers();
    res.json({ success: true, message: 'Sample customers ready', count: customers.length, customers });
  } catch (error) {
    respondWithError(res, error, { fallback: 'Server error seeding customers' });
  }
}));

router.use(protect);

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

// Paginated, filtered and sorted in the database. This endpoint used to return
// every customer with every subscription and every payment, and the browser
// did the searching and paging, so opening any screen downloaded the whole
// book of business.
router.get(
  '/',
  [
    query('page').optional().isInt({ min: 1 }),
    query('pageSize').optional().isInt({ min: 1, max: 200 }),
    query('status').optional().isIn(['all', 'active', 'inactive', 'pending', 'suspended']),
    query('sortBy').optional().isIn(['created_at', 'name', 'email', 'status', 'expiry_date', 'amount']),
    query('sortDirection').optional().isIn(['asc', 'desc']),
    query('expiringWithinDays').optional().isInt({ min: 0, max: 365 }),
    query('deleted').optional().isBoolean()
  ],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const { customers, pagination } = await customerRepository.list({
        search: req.query.search || '',
        status: req.query.status || '',
        page: req.query.page,
        pageSize: req.query.pageSize,
        sortBy: req.query.sortBy,
        sortDirection: req.query.sortDirection,
        expiringWithinDays: req.query.expiringWithinDays,
        deleted: req.query.deleted === 'true'
      });

      res.json({ success: true, customers, pagination });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error getting customers' });
    }
  })
);

router.get('/:id', [param('id').isUUID()], asyncHandler(async (req, res) => {
  if (handleValidationErrors(req, res)) {
    return;
  }

  try {
    const customer = await customerRepository.getById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    res.json({ success: true, customer });
  } catch (error) {
    respondWithError(res, error, { fallback: 'Server error getting customer' });
  }
}));

router.get('/:id/activity', [param('id').isUUID()], asyncHandler(async (req, res) => {
  if (handleValidationErrors(req, res)) {
    return;
  }

  try {
    const activity = await auditRepository.listForCustomer(req.params.id);
    res.json({ success: true, activity });
  } catch (error) {
    respondWithError(res, error, { fallback: 'Server error getting customer activity' });
  }
}));

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

router.post(
  '/',
  requireRole(ROLES.MODERATOR),
  customerValidators(false),
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const [existingCustomer, existingPhone] = await Promise.all([
        customerRepository.findByEmail(req.body.email),
        customerRepository.findByPhone(req.body.phone)
      ]);

      if (existingCustomer) {
        return res.status(409).json({
          success: false,
          message: 'Customer with this email already exists'
        });
      }

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message: 'Customer with this phone number already exists'
        });
      }

      const customer = await customerRepository.create(normalizeCustomerPayload(req.body));

      await auditRepository.recordFromRequest(req, 'customer_created', {
        customerId: customer.id,
        entityType: 'customer',
        entityId: customer.id,
        metadata: { name: customer.name, email: customer.email }
      });

      // Deliver the temporary password over a channel the customer controls
      // rather than only returning it to whoever is at the console. Failure to
      // send is not failure to create -- the password is still in the response
      // so the admin can pass it on.
      const delivery = await deliverPortalCredentials(customer, customer.portalSetup, req);

      res.status(201).json({ success: true, customer, credentialDelivery: delivery });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error creating customer' });
    }
  })
);

router.put(
  '/:id',
  requireRole(ROLES.MODERATOR),
  [param('id').isUUID(), ...customerValidators(true)],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      if (req.body.email) {
        const existingCustomer = await customerRepository.findByEmail(req.body.email);

        if (existingCustomer && existingCustomer.id !== req.params.id) {
          return res.status(409).json({
            success: false,
            message: 'Customer with this email already exists'
          });
        }
      }

      if (req.body.phone) {
        const existingPhone = await customerRepository.findByPhone(req.body.phone);

        if (existingPhone && existingPhone.id !== req.params.id) {
          return res.status(409).json({
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
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      await auditRepository.recordFromRequest(req, 'customer_updated', {
        customerId: customer.id,
        entityType: 'customer',
        entityId: customer.id,
        metadata: { fields: Object.keys(req.body) }
      });

      res.json({ success: true, customer });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error updating customer' });
    }
  })
);

// Soft delete. A moderator can create and edit; removing an account -- and the
// view of the money attached to it -- takes an admin.
router.delete(
  '/:id',
  requireRole(ROLES.ADMIN),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const existing = await customerRepository.getById(req.params.id);

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const wasDeleted = await customerRepository.remove(req.params.id);

      if (!wasDeleted) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      await auditRepository.recordFromRequest(req, 'customer_deleted', {
        customerId: req.params.id,
        entityType: 'customer',
        entityId: req.params.id,
        metadata: {
          name: existing.name,
          email: existing.email,
          totalPaid: existing.paymentSummary?.totalPaid
        }
      });

      res.json({
        success: true,
        message: 'Customer removed. Their payment history is retained and the record can be restored.'
      });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error deleting customer' });
    }
  })
);

router.post(
  '/:id/restore',
  requireRole(ROLES.ADMIN),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const restored = await customerRepository.restore(req.params.id);

      if (!restored) {
        return res.status(404).json({
          success: false,
          message: 'No removed customer with that id was found.'
        });
      }

      await auditRepository.recordFromRequest(req, 'customer_restored', {
        customerId: req.params.id,
        entityType: 'customer',
        entityId: req.params.id
      });

      res.json({ success: true, customer: await customerRepository.getById(req.params.id) });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error restoring customer' });
    }
  })
);

// ---------------------------------------------------------------------------
// Portal access
// ---------------------------------------------------------------------------

router.post(
  '/:id/reset-portal-password',
  requireRole(ROLES.ADMIN),
  [param('id').isUUID()],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const result = await customerRepository.resetPortalPassword(req.params.id);

      if (!result) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      await auditRepository.recordFromRequest(req, 'portal_password_reset', {
        customerId: req.params.id,
        entityType: 'customer',
        entityId: req.params.id,
        metadata: { expiresAt: result.expiresAt }
      });

      const customer = await customerRepository.getById(req.params.id);
      const delivery = await deliverPortalCredentials(
        customer,
        { temporaryPassword: result.temporaryPassword, expiresInHours: result.expiresInHours },
        req
      );

      res.json({
        success: true,
        customer: result.customer,
        portalSetup: {
          temporaryPassword: result.temporaryPassword,
          resetRequired: true,
          expiresAt: result.expiresAt,
          expiresInHours: result.expiresInHours
        },
        credentialDelivery: delivery
      });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error resetting portal password' });
    }
  })
);

router.put(
  '/:id/portal-access',
  requireRole(ROLES.ADMIN),
  [param('id').isUUID(), body('enabled').isBoolean()],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const changed = await customerRepository.setPortalAccess(req.params.id, req.body.enabled);

      if (!changed) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      await auditRepository.recordFromRequest(req, 'portal_access_changed', {
        customerId: req.params.id,
        entityType: 'customer',
        entityId: req.params.id,
        metadata: { enabled: Boolean(req.body.enabled) }
      });

      res.json({ success: true, customer: await customerRepository.getById(req.params.id) });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error changing portal access' });
    }
  })
);

// ---------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------

router.post(
  '/:id/services',
  requireRole(ROLES.MODERATOR),
  [param('id').isUUID(), ...serviceValidators],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const existingCustomer = await customerRepository.getById(req.params.id);

      if (!existingCustomer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const customer = await customerRepository.addServiceSubscription(
        req.params.id,
        normalizeServicePayload(req.body)
      );

      await auditRepository.recordFromRequest(req, 'service_added', {
        customerId: req.params.id,
        entityType: 'subscription',
        metadata: { planCode: req.body.planCode, amount: req.body.amount }
      });

      res.status(201).json({ success: true, customer });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error adding customer service' });
    }
  })
);

router.put(
  '/:id/services/:serviceId',
  requireRole(ROLES.MODERATOR),
  [param('id').isUUID(), param('serviceId').isUUID(), ...serviceValidators],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const existingCustomer = await customerRepository.getById(req.params.id);

      if (!existingCustomer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
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

      await auditRepository.recordFromRequest(req, 'service_updated', {
        customerId: req.params.id,
        entityType: 'subscription',
        entityId: req.params.serviceId,
        metadata: {
          previousAmount: existingService.amount,
          newAmount: req.body.amount,
          previousExpiry: existingService.expiryDate
        }
      });

      res.json({ success: true, customer });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error updating customer service' });
    }
  })
);

router.delete(
  '/:id/services/:serviceId',
  requireRole(ROLES.ADMIN),
  [param('id').isUUID(), param('serviceId').isUUID()],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const cancelled = await customerRepository.removeServiceSubscription(
        req.params.id,
        req.params.serviceId
      );

      if (!cancelled) {
        return res.status(404).json({
          success: false,
          message: 'Service not found for this customer'
        });
      }

      await auditRepository.recordFromRequest(req, 'service_cancelled', {
        customerId: req.params.id,
        entityType: 'subscription',
        entityId: req.params.serviceId
      });

      res.json({ success: true, customer: await customerRepository.getById(req.params.id) });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error cancelling customer service' });
    }
  })
);

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

router.post(
  '/:id/payments',
  requireRole(ROLES.MODERATOR),
  [
    param('id').isUUID(),
    body('subscriptionIds').isArray({ min: 1, max: 50 }),
    body('subscriptionIds.*').isUUID(),
    body('amount').optional().isFloat({ min: 0.01, max: 1000000 }),
    body('discount').optional().isFloat({ min: 0, max: 1000000 }),
    body('tax').optional().isFloat({ min: 0, max: 1000000 }),
    body('paymentMode').optional().trim(),
    body('paymentDate').optional().isISO8601(),
    body('currency').optional().isLength({ min: 3, max: 3 }).isAlpha(),
    body('applyCredit').optional().isBoolean(),
    body('notes').optional({ values: 'falsy' }).isLength({ max: 2000 })
  ],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const existingCustomer = await customerRepository.getById(req.params.id);

      if (!existingCustomer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const customer = await customerRepository.recordCustomerPayment(req.params.id, req.body);

      await auditRepository.recordFromRequest(req, 'payment_recorded', {
        customerId: req.params.id,
        entityType: 'payment',
        metadata: {
          amount: req.body.amount,
          paymentMode: req.body.paymentMode,
          subscriptionIds: req.body.subscriptionIds,
          balanceBefore: existingCustomer.paymentSummary?.outstandingBalance,
          balanceAfter: customer.paymentSummary?.outstandingBalance
        }
      });

      res.status(201).json({ success: true, customer });
    } catch (error) {
      respondWithError(res, error, {
        fallback: 'Server error recording payment',
        context: { customerId: req.params.id }
      });
    }
  })
);

// The payment_status enum has had a `refunded` value since the first schema
// and nothing could ever produce one.
router.post(
  '/:id/payments/:paymentId/refund',
  requireRole(ROLES.ADMIN),
  [
    param('id').isUUID(),
    param('paymentId').isUUID(),
    body('reason').optional({ values: 'falsy' }).isLength({ max: 500 })
  ],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      const customer = await customerRepository.refundPayment(
        req.params.id,
        req.params.paymentId,
        req.body.reason
      );

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found for this customer'
        });
      }

      await auditRepository.recordFromRequest(req, 'payment_refunded', {
        customerId: req.params.id,
        entityType: 'payment',
        entityId: req.params.paymentId,
        metadata: { reason: req.body.reason || null }
      });

      res.json({ success: true, customer });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error refunding payment' });
    }
  })
);

module.exports = router;
