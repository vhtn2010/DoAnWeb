const express = require('express');
const {
  getAdminRefundDetail,
  listAdminRefunds,
} = require('../controllers/adminRefundController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const adminRefundRateLimit = createRateLimiter({
  maxRequests: 120,
  storeKey: 'admin-refund-query',
  windowMs: 60 * 1000,
});

router.get(
  '/admin/refunds',
  requireAdminAuth,
  adminRefundRateLimit,
  asyncHandler(listAdminRefunds),
);

router.get(
  '/admin/refunds/:refund_id',
  requireAdminAuth,
  adminRefundRateLimit,
  asyncHandler(getAdminRefundDetail),
);

module.exports = router;
