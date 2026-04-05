const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
const customerRepository = require('../repositories/customerRepository');
const notificationService = require('../services/notificationService');

const router = express.Router();

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

router.use(protect);

router.get('/status', async (req, res) => {
  res.json({
    success: true,
    status: notificationService.getNotificationStatus()
  });
});

router.post(
  '/send',
  [
    body('customerId').isUUID(),
    body('channels').isArray({ min: 1 }),
    body('channels.*').isIn(['email', 'whatsapp']),
    body('templateName').isIn(['welcome', 'payment_due', 'renewal_reminder', 'custom']),
    body('subject').optional().isLength({ min: 2, max: 160 }),
    body('metadata').optional().isObject(),
    body('metadata.message')
      .optional()
      .isLength({ min: 2, max: 5000 })
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      if (req.body.templateName === 'custom' && !String(req.body.metadata?.message || '').trim()) {
        return res.status(400).json({
          success: false,
          message: 'A custom message is required for the custom notification template.'
        });
      }

      const customer = await customerRepository.getById(req.body.customerId);

      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }

      const results = await notificationService.sendCustomerNotifications({
        customer,
        channels: req.body.channels,
        templateName: req.body.templateName,
        metadata: req.body.metadata || {},
        subject: req.body.subject,
        userId: req.admin?.id || null
      });

      res.json({
        success: true,
        results
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message || 'Unable to send notification'
      });
    }
  }
);

module.exports = router;
