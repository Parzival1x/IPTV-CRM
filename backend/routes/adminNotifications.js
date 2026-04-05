const express = require('express');
const { protect } = require('../middleware/auth');
const adminNotificationRepository = require('../repositories/adminNotificationRepository');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const notifications = await adminNotificationRepository.getAll();
    res.json({
      success: true,
      notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to fetch admin notifications'
    });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    const notification = await adminNotificationRepository.markRead(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Unable to update admin notification'
    });
  }
});

module.exports = router;
