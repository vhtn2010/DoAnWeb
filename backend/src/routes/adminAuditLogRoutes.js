const express = require('express');
const {
  getAdminAuditLogDetail,
  listAdminAuditLogs,
} = require('../controllers/adminAuditLogController');
const {
  requireAdminAuth,
  requireAdminPermissions,
  requireAdminRoles,
} = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const adminAuditLogRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 60,
  message: 'Too many audit log requests. Please try again later.',
  storeKey: 'admin-audit-log',
  windowMs: 60 * 1000,
});

router.get(
  '/admin/audit-logs',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['audit.read']),
  adminAuditLogRateLimit,
  asyncHandler(listAdminAuditLogs),
);

router.get(
  '/admin/audit-logs/:log_id',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['audit.read']),
  adminAuditLogRateLimit,
  asyncHandler(getAdminAuditLogDetail),
);

module.exports = router;
