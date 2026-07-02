const express = require('express');
const {
  deleteMyNotification,
  getUnreadNotificationCount,
  getMyNotificationDetail,
  listAdminNotifications,
  listMyNotifications,
  markAllMyNotificationsRead,
  markMyNotificationRead,
  markMyNotificationsBulkRead,
  updateAdminNotificationStatus,
} = require('../controllers/notificationController');
const {
  requireAdminAuth,
  requireAdminRoles,
} = require('../middleware/adminAuth');
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
const adminNotificationCatalogRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 120,
  message: 'Too many admin notification requests. Please try again later.',
  storeKey: 'admin-notification-catalog',
  windowMs: 60 * 1000,
});
const adminNotificationStatusRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 60,
  message: 'Too many admin notification status requests. Please try again later.',
  storeKey: 'admin-notification-status',
  windowMs: 60 * 1000,
});

const allowedRoles = ['customer', 'staff', 'admin', 'system_admin'];

router.get(
  '/admin/notifications',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminNotificationCatalogRateLimit,
  asyncHandler(listAdminNotifications),
);

router.patch(
  '/admin/notifications/:notification_id/status',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminNotificationStatusRateLimit,
  asyncHandler(updateAdminNotificationStatus),
);

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

router.delete(
  '/notifications/:notification_id',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(deleteMyNotification),
);

router.get(
  '/notifications/:notification_id',
  authRequired({ allowedRoles }),
  notificationReadRateLimit,
  asyncHandler(getMyNotificationDetail),
);

module.exports = router;
