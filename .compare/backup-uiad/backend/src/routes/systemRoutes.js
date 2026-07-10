const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  requireAdminAuth,
  requireAdminRoles,
} = require('../middleware/adminAuth');
const { createRateLimiter } = require('../middleware/rateLimit');
const {
  getAdminSystemStats,
  getHealth,
  getLiveness,
  getReadiness,
  getVersion,
} = require('../controllers/systemController');

const router = express.Router();
const adminSystemStatsRateLimit = createRateLimiter({
  keyGenerator: (req) => req.auth?.userId || req.ip || 'anonymous',
  maxRequests: 60,
  message: 'Too many system stats requests. Please try again later.',
  storeKey: 'admin-system-stats',
  windowMs: 60 * 1000,
});

router.get('/health', getHealth);
router.get('/health/live', getLiveness);
router.get('/health/ready', asyncHandler(getReadiness));
router.get('/version', getVersion);
router.get(
  '/admin/system/stats',
  requireAdminAuth,
  requireAdminRoles(['system_admin']),
  adminSystemStatsRateLimit,
  asyncHandler(getAdminSystemStats),
);

module.exports = router;
