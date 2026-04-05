const express = require('express');
const { body, validationResult } = require('express-validator');
const { protect } = require('../middleware/auth');
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
    console.error('Update profile error:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Email address is already in use'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

router.put('/change-password', [
  protect,
  body('currentPassword').isLength({ min: 6 }),
  body('newPassword').isLength({ min: 6 })
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

    res.json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
});

module.exports = router;
