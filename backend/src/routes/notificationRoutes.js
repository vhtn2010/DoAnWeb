const express = require('express');
const {
  getUnreadNotificationCount,
  getMyNotificationDetail,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  markMyNotificationsBulkRead,
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
  '/notifications/unread-count',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(getUnreadNotificationCount),
);

router.patch(
  '/notifications/bulk-read',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(markMyNotificationsBulkRead),
);

router.patch(
  '/notifications/read-all',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(markAllMyNotificationsRead),
);

router.patch(
  '/notifications/:notification_id/read',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(markMyNotificationRead),
);

router.get(
  '/notifications/:notification_id',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(getMyNotificationDetail),
);

module.exports = router;
