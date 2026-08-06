const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const { protect, requireRole, ROLES } = require('../middleware/auth');
const { assertStrongPassword, respondWithError, asyncHandler } = require('../middleware/validation');
const { jwtSecret } = require('../config/runtime');
const auditRepository = require('../repositories/auditRepository');
const schedulerService = require('../services/schedulerService');
const adminRepository = require('../repositories/adminRepository');

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

router.get('/profile', protect, async (req, res) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

router.put('/profile', [
  protect,
  body('name').optional().isLength({ min: 2 }).trim(),
  body('email').optional().isEmail().normalizeEmail()
], async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const updatedAdmin = await adminRepository.updateProfile(req.admin.id, req.body);

    if (!updatedAdmin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    res.json({
      success: true,
      admin: updatedAdmin
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use'
      });
    }

    respondWithError(res, error, { fallback: 'Server error updating profile' });
  }
});

router.put('/change-password', [
  protect,
  body('currentPassword').isLength({ min: 1, max: 200 }),
  body('newPassword').custom(assertStrongPassword)
], async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const { currentPassword, newPassword } = req.body;
    const result = await adminRepository.changePassword(req.admin.id, currentPassword, newPassword);

    if (!result.success && result.code === 'invalid_password') {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    if (!result.success) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found'
      });
    }

    await auditRepository.recordFromRequest(req, 'admin_password_changed', {
      entityType: 'admin',
      entityId: req.admin.id
    });

    // The change invalidated every existing token, including the one this
    // request used. Hand back a fresh one so the admin is not signed out by
    // their own password change.
    res.json({
      success: true,
      message: 'Password updated successfully',
      token: jwt.sign(
        { id: req.admin.id, kind: 'admin', tokenVersion: result.tokenVersion },
        jwtSecret,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      )
    });
  } catch (error) {
    respondWithError(res, error, { fallback: 'Server error changing password' });
  }
});

// ---------------------------------------------------------------------------
// Administrator management
// ---------------------------------------------------------------------------

router.get('/users', protect, requireRole(ROLES.SUPER_ADMIN), asyncHandler(async (req, res) => {
  try {
    res.json({ success: true, admins: await adminRepository.list() });
  } catch (error) {
    respondWithError(res, error, { fallback: 'Server error listing administrators' });
  }
}));

router.put(
  '/users/:id/status',
  protect,
  requireRole(ROLES.SUPER_ADMIN),
  [body('isActive').isBoolean()],
  asyncHandler(async (req, res) => {
    if (handleValidationErrors(req, res)) {
      return;
    }

    try {
      // Locking yourself out is not recoverable through this UI.
      if (req.params.id === req.admin.id && req.body.isActive === false) {
        return res.status(400).json({
          success: false,
          message: 'You cannot deactivate your own account.'
        });
      }

      const admin = await adminRepository.setActive(req.params.id, req.body.isActive);

      if (!admin) {
        return res.status(404).json({ success: false, message: 'Administrator not found' });
      }

      await auditRepository.recordFromRequest(req, 'admin_status_changed', {
        entityType: 'admin',
        entityId: req.params.id,
        metadata: { isActive: Boolean(req.body.isActive) }
      });

      res.json({ success: true, admin });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error changing administrator status' });
    }
  })
);

// ---------------------------------------------------------------------------
// Scheduler
// ---------------------------------------------------------------------------

router.get('/scheduler', protect, (req, res) => {
  res.json({ success: true, scheduler: schedulerService.getStatus() });
});

// Manual trigger, so the expiry sweep and reminder run can be exercised
// without waiting for the cron window or restarting on a different schedule.
router.post(
  '/scheduler/run',
  protect,
  requireRole(ROLES.ADMIN),
  asyncHandler(async (req, res) => {
    try {
      const result = await schedulerService.runOnce({ trigger: `manual:${req.admin.email}` });

      await auditRepository.recordFromRequest(req, 'scheduler_manual_run', {
        entityType: 'scheduler',
        metadata: result
      });

      res.json({ success: true, result });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Scheduler run failed' });
    }
  })
);

module.exports = router;
