const express = require('express');
const { body } = require('express-validator');
const { protect, requireRole, ROLES } = require('../middleware/auth');
const {
  handleValidationErrors,
  asyncHandler,
  respondWithError
} = require('../middleware/validation');
const customerRepository = require('../repositories/customerRepository');
const auditRepository = require('../repositories/auditRepository');
const notificationService = require('../services/notificationService');
const logger = require('../config/logger');

const router = express.Router();

router.use(protect);

const TEMPLATES = ['welcome', 'payment_due', 'renewal_reminder', 'custom'];

router.get('/status', (req, res) => {
  res.json({ success: true, status: notificationService.getNotificationStatus() });
});

const messageValidators = [
  body('channels').isArray({ min: 1, max: 2 }),
  body('channels.*').isIn(['email', 'whatsapp']),
  body('templateName').isIn(TEMPLATES),
  body('subject').optional().isLength({ min: 2, max: 160 }),
  body('metadata').optional().isObject(),
  body('metadata.message').optional().isLength({ min: 2, max: 5000 })
];

const requireCustomMessage = (req, res) => {
  if (req.body.templateName === 'custom' && !String(req.body.metadata?.message || '').trim()) {
    res.status(400).json({
      success: false,
      message: 'A custom message is required for the custom notification template.'
    });
    return true;
  }

  return false;
};

router.post(
  '/send',
  [body('customerId').isUUID(), ...messageValidators],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res) || requireCustomMessage(req, res)) {
      return;
    }

    try {
      const customer = await customerRepository.getById(req.body.customerId);

      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }

      const { results, skipped } = await notificationService.sendCustomerNotifications({
        customer,
        channels: req.body.channels,
        templateName: req.body.templateName,
        metadata: req.body.metadata || {},
        subject: req.body.subject,
        userId: req.admin?.id || null
      });

      res.json({ success: true, results, skipped });
    } catch (error) {
      // A delivery failure is the provider's answer, not a server fault, so it
      // is a 400 with the provider's message rather than a 500.
      res.status(400).json({
        success: false,
        message: error.message || 'Unable to send notification',
        results: error.results || []
      });
    }
  })
);

// Sending to more than one customer required opening each customer in turn and
// sending individually. Announcing an outage to 400 subscribers was 400 manual
// sends, which in practice meant it did not happen.
router.post(
  '/broadcast',
  requireRole(ROLES.ADMIN),
  [
    body('customerIds').isArray({ min: 1, max: 1000 }),
    body('customerIds.*').isUUID(),
    ...messageValidators
  ],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res) || requireCustomMessage(req, res)) {
      return;
    }

    try {
      const summary = { sent: 0, failed: 0, skipped: 0, failures: [] };

      // Sequential on purpose. Both providers rate limit, and a thousand
      // concurrent sends gets the account throttled or suspended -- which is
      // worse than the broadcast taking a minute.
      for (const customerId of req.body.customerIds) {
        const customer = await customerRepository.getById(customerId);

        if (!customer) {
          summary.skipped += 1;
          continue;
        }

        try {
          const { results } = await notificationService.sendCustomerNotifications({
            customer,
            channels: req.body.channels,
            templateName: req.body.templateName,
            metadata: req.body.metadata || {},
            subject: req.body.subject,
            userId: req.admin?.id || null
          });

          if (results.some((result) => result.success)) {
            summary.sent += 1;
          } else {
            summary.skipped += 1;
          }
        } catch (error) {
          summary.failed += 1;

          // Cap what comes back: a thousand failures should not produce a
          // response the browser struggles to render. The rest are in the log.
          if (summary.failures.length < 25) {
            summary.failures.push({ customerId, name: customer.name, reason: error.message });
          }

          logger.warn('Broadcast delivery failed', { customerId, error });
        }
      }

      await auditRepository.recordFromRequest(req, 'notification_broadcast', {
        entityType: 'notification',
        metadata: {
          templateName: req.body.templateName,
          channels: req.body.channels,
          requested: req.body.customerIds.length,
          ...summary,
          failures: undefined
        }
      });

      res.json({ success: true, summary });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Unable to send the broadcast' });
    }
  })
);

module.exports = router;
