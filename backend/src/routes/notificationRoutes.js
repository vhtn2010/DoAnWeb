const express = require('express');
const {
  getMyNotificationDetail,
  listMyNotifications,
} = require('../controllers/notificationController');
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired } = require('../middleware/authSession');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const notificationReadRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 120,
  message: 'Too many notification requests. Please try again later.',
  storeKey: 'notification-read',
  windowMs: 60 * 1000,
});

const allowedRoles = ['customer', 'staff', 'admin', 'system_admin'];

router.get(
  '/notifications',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(listMyNotifications),
);

router.get(
  '/notifications/:notification_id',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(getMyNotificationDetail),
);

module.exports = router;
