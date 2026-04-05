const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
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

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const requests = await serviceRequestRepository.getAll(req.query.status || '');
    res.json({
      success: true,
      serviceRequests: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch service requests'
    });
  }
});

router.put(
  '/:id/review',
  [
    body('status').isIn(['approved', 'rejected', 'fulfilled']),
    body('adminResponse').optional().isLength({ max: 1000 })
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const request = await serviceRequestRepository.getById(req.params.id);

      if (!request) {
        return res.status(404).json({
          success: false,
          message: 'Service request not found'
        });
      }

      const reviewed = await serviceRequestRepository.review({
        id: req.params.id,
        status: req.body.status,
        adminResponse: req.body.adminResponse || '',
        reviewedBy: req.admin.id
      });

      if (req.body.status === 'approved' || req.body.status === 'fulfilled') {
        await customerRepository.addServiceSubscription(request.customerId, {
          planCode: request.requestedPlanCode || request.requestedPlanName,
          name: request.requestedPlanName,
          amount: request.requestedAmount,
          durationMonths: request.requestedDurationMonths,
          startDate: new Date().toISOString().slice(0, 10),
          paymentMode: 'Other',
          transactionId: '',
          serviceCode: request.requestedPlanCode || request.requestedPlanName,
          serviceLabel: request.requestedPlanName,
          description: request.notes || ''
        });
      }

      await adminNotificationRepository.create({
        type: 'service_request_reviewed',
        title: `Service request ${req.body.status}`,
        body: `${request.customer?.name || 'Customer'} request for ${request.requestedPlanName} was marked ${req.body.status}.`,
        customerId: request.customerId,
        serviceRequestId: request.id
      });

      res.json({
        success: true,
        serviceRequest: reviewed
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message || 'Unable to review service request'
      });
    }
  }
);

module.exports = router;
