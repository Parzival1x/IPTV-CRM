const express = require('express');
const { body, validationResult } = require('express-validator');
const { protectCustomer } = require('../middleware/auth');
const serviceRequestRepository = require('../repositories/serviceRequestRepository');
const customerRepository = require('../repositories/customerRepository');
const adminNotificationRepository = require('../repositories/adminNotificationRepository');

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

router.use(protectCustomer);

router.get('/dashboard', async (req, res) => {
  try {
    const customer = await customerRepository.getPortalCustomerById(req.customer.id);
    const serviceRequests = await serviceRequestRepository.getByCustomerId(req.customer.id);

    res.json({
      success: true,
      customer,
      serviceRequests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to load portal dashboard'
    });
  }
});

router.post(
  '/service-requests',
  [
    body('requestedPlanName').isLength({ min: 2, max: 120 }).trim(),
    body('requestedDurationMonths').isInt({ min: 1, max: 36 }),
    body('requestedAmount').optional().isFloat({ min: 0 }),
    body('notes').optional().isLength({ max: 1000 })
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const request = await serviceRequestRepository.create({
        customerId: req.customer.id,
        planId: req.body.planId || null,
        requestedPlanCode: req.body.requestedPlanCode || null,
        requestedPlanName: req.body.requestedPlanName,
        requestedDurationMonths: Number(req.body.requestedDurationMonths || 12),
        requestedAmount: Number(req.body.requestedAmount || 0),
        notes: req.body.notes || ''
      });

      await adminNotificationRepository.create({
        type: 'service_request_created',
        title: `New service request from ${req.customer.name}`,
        body: `${req.customer.name} requested ${req.body.requestedPlanName} for ${req.body.requestedDurationMonths} months.`,
        customerId: req.customer.id,
        serviceRequestId: request.id
      });

      res.status(201).json({
        success: true,
        serviceRequest: request
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Unable to create service request'
      });
    }
  }
);

module.exports = router;
