const express = require('express');
const {
  approveAdminRefund,
  getAdminRefundDetail,
  listAdminRefunds,
  markAdminRefundFailed,
  markAdminRefundProcessing,
  markAdminRefundSuccess,
  rejectAdminRefund,
  updateAdminRefundNote,
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
const adminRefundProcessRateLimit = createRateLimiter({
  maxRequests: 60,
  storeKey: 'admin-refund-process',
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

router.post(
  '/admin/refunds/:refund_id/approve',
  requireAdminAuth,
  adminRefundProcessRateLimit,
  asyncHandler(approveAdminRefund),
);

router.post(
  '/admin/refunds/:refund_id/reject',
  requireAdminAuth,
  adminRefundProcessRateLimit,
  asyncHandler(rejectAdminRefund),
);

router.post(
  '/admin/refunds/:refund_id/mark-processing',
  requireAdminAuth,
  adminRefundProcessRateLimit,
  asyncHandler(markAdminRefundProcessing),
);

router.post(
  '/admin/refunds/:refund_id/mark-success',
  requireAdminAuth,
  adminRefundProcessRateLimit,
  asyncHandler(markAdminRefundSuccess),
);

router.post(
  '/admin/refunds/:refund_id/mark-failed',
  requireAdminAuth,
  adminRefundProcessRateLimit,
  asyncHandler(markAdminRefundFailed),
);

router.patch(
  '/admin/refunds/:refund_id/note',
  requireAdminAuth,
  adminRefundProcessRateLimit,
  asyncHandler(updateAdminRefundNote),
);

module.exports = router;
