const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { protect, requireRole, developmentOnly } = require('../middleware/auth');
const { jwtSecret } = require('../config/runtime');
const adminRepository = require('../repositories/adminRepository');

const router = express.Router();

const generateToken = (adminId) => jwt.sign(
  { id: adminId, kind: 'admin' },
  jwtSecret,
  { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
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

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 })
], async (req, res) => {
  try {
    if (handleValidationErrors(req, res)) {
      return;
    }

    const { email, password } = req.body;
    const admin = await adminRepository.authenticate(email, password);

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      token: generateToken(admin.id),
      admin
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

router.post('/register',
  protect,
  requireRole('admin', 'super-admin'),
  [
    body('name').isLength({ min: 2 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('role').optional().isIn(['admin', 'super-admin', 'moderator'])
  ],
  async (req, res) => {
    try {
      if (handleValidationErrors(req, res)) {
        return;
      }

      const { name, email, password, role } = req.body;
      const existingAdmin = await adminRepository.findByEmail(email);

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Admin with this email already exists'
        });
      }

      const admin = await adminRepository.create({
        name,
        email,
        password,
        role: role || 'admin'
      });

      res.status(201).json({
        success: true,
        token: generateToken(admin.id),
        admin
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error during registration'
      });
    }
  }
);

router.get('/me', protect, async (req, res) => {
  res.json({
    success: true,
    admin: req.admin
  });
});

router.post('/seed', developmentOnly, async (req, res) => {
  try {
    const admin = await adminRepository.seedInitialAdmin({
      name: req.body?.name || process.env.DEV_ADMIN_NAME || 'Admin User',
      email: req.body?.email || process.env.DEV_ADMIN_EMAIL || 'admin@example.com',
      password: req.body?.password || process.env.DEV_ADMIN_PASSWORD || 'admin123',
      role: req.body?.role || process.env.DEV_ADMIN_ROLE || 'admin'
    });

    res.json({
      success: true,
      message: 'Default admin is ready',
      admin
    });
  } catch (error) {
    console.error('Seed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during seeding'
    });
  }
});

module.exports = router;
