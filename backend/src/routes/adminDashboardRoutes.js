const express = require('express');
const {
  getAdminDashboardBookingChart,
  getAdminDashboardOverview,
  getAdminDashboardRevenueChart,
} = require('../controllers/adminDashboardController');
const {
  requireAdminAuth,
  requireAdminRoles,
} = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const adminDashboardRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 60,
  message: 'Too many dashboard requests. Please try again later.',
  storeKey: 'admin-dashboard',
  windowMs: 60 * 1000,
});

router.get(
  '/admin/dashboard/overview',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminDashboardRateLimit,
  asyncHandler(getAdminDashboardOverview),
);

router.get(
  '/admin/dashboard/charts/revenue',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminDashboardRateLimit,
  asyncHandler(getAdminDashboardRevenueChart),
);

router.get(
  '/admin/dashboard/charts/bookings',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminDashboardRateLimit,
  asyncHandler(getAdminDashboardBookingChart),
);

module.exports = router;
