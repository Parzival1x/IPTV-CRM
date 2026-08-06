const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { protect, requireRole, developmentOnly, ROLES } = require('../middleware/auth');
const { adminLoginLimiter } = require('../middleware/rateLimit');
const { jwtSecret } = require('../config/runtime');
const { assertStrongPassword, respondWithError } = require('../middleware/validation');
const auditRepository = require('../repositories/auditRepository');
const adminRepository = require('../repositories/adminRepository');

const router = express.Router();

// tokenVersion is checked on every request. Bumping the column on the admin
// row invalidates every token already issued to them, which is what makes a
// password change or a deactivation take effect before the token expires.
const generateToken = (admin) => jwt.sign(
  { id: admin.id, kind: 'admin', tokenVersion: Number(admin.tokenVersion || 0) },
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

router.post('/login', adminLoginLimiter, [
  body('email').isEmail().normalizeEmail(),
  // Deliberately not the strength rule: an existing account may predate it,
  // and telling an attacker their guess was too short is a free oracle.
  body('password').isLength({ min: 1, max: 200 })
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

    await auditRepository.record({
      action: 'admin_signed_in',
      adminId: admin.id,
      entityType: 'admin',
      entityId: admin.id,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      token: generateToken(admin),
      admin
    });
  } catch (error) {
    respondWithError(res, error, { fallback: 'Server error during login' });
  }
});

// Creating an administrator is the most privileged action in the system, so
// it takes the most privileged role. Previously any `admin` could do it, which
// meant any admin could mint themselves a super-admin.
router.post('/register',
  protect,
  requireRole(ROLES.SUPER_ADMIN),
  [
    body('name').isLength({ min: 2 }).trim(),
    body('email').isEmail().normalizeEmail(),
    body('password').custom(assertStrongPassword),
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

      await auditRepository.recordFromRequest(req, 'admin_created', {
        entityType: 'admin',
        entityId: admin.id,
        metadata: { email: admin.email, role: admin.role }
      });

      // No token is returned. The previous version signed the caller in AS the
      // account it had just created, so creating a user silently swapped the
      // creator's own session for the new one.
      res.status(201).json({ success: true, admin });
    } catch (error) {
      respondWithError(res, error, { fallback: 'Server error during registration' });
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
    respondWithError(res, error, { fallback: 'Server error during seeding' });
  }
});

module.exports = router;
