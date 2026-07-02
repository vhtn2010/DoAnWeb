const express = require('express');
const {
  getAdminEmailLogDetail,
  listAdminEmailLogs,
} = require('../controllers/emailLogController');
const {
  requireAdminAuth,
  requireAdminRoles,
} = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const adminEmailLogCatalogRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 120,
  message: 'Too many admin email log requests. Please try again later.',
  storeKey: 'admin-email-log-catalog',
  windowMs: 60 * 1000,
});

router.get(
  '/admin/email-logs',
  requireAdminAuth,
  requireAdminRoles(['staff', 'admin', 'system_admin']),
  adminEmailLogCatalogRateLimit,
  asyncHandler(listAdminEmailLogs),
);

router.get(
  '/admin/email-logs/:email_log_id',
  requireAdminAuth,
  requireAdminRoles(['staff', 'admin', 'system_admin']),
  adminEmailLogCatalogRateLimit,
  asyncHandler(getAdminEmailLogDetail),
);

module.exports = router;
