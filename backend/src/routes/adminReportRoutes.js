const express = require('express');
const {
  downloadAdminReportFile,
  exportAdminReport,
  getAdminBookingReport,
  getAdminPaymentReport,
  getAdminRevenueReport,
  getAdminServiceReport,
} = require('../controllers/adminReportController');
const {
  requireAdminAuth,
  requireAdminRoles,
} = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const adminReportRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 60,
  message: 'Too many report requests. Please try again later.',
  storeKey: 'admin-report',
  windowMs: 60 * 1000,
});
const adminReportExportRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 10,
  message: 'Too many report export requests. Please try again later.',
  storeKey: 'admin-report-export',
  windowMs: 60 * 1000,
});

router.get(
  '/admin/reports/revenue',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminReportRateLimit,
  asyncHandler(getAdminRevenueReport),
);

router.get(
  '/admin/reports/bookings',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminReportRateLimit,
  asyncHandler(getAdminBookingReport),
);

router.get(
  '/admin/reports/services',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminReportRateLimit,
  asyncHandler(getAdminServiceReport),
);

router.get(
  '/admin/reports/payments',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminReportRateLimit,
  asyncHandler(getAdminPaymentReport),
);

router.post(
  '/admin/reports/export',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminReportExportRateLimit,
  asyncHandler(exportAdminReport),
);

router.get(
  '/admin/reports/files/:file_name',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminReportRateLimit,
  asyncHandler(downloadAdminReportFile),
);

module.exports = router;
module.exports.ADMIN_REPORT_EXPORT_RATE_LIMIT_STORE_KEY = 'admin-report-export';
