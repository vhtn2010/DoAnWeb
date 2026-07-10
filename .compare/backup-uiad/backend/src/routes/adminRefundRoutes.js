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
const {
  requireAdminAuth,
  requireAdminPermissions,
  requireAdminRoles,
} = require('../middleware/adminAuth');
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
  requireAdminPermissions(['refund.read_all']),
  adminRefundRateLimit,
  asyncHandler(listAdminRefunds),
);

router.get(
  '/admin/refunds/:refund_id',
  requireAdminAuth,
  requireAdminPermissions(['refund.read_all']),
  adminRefundRateLimit,
  asyncHandler(getAdminRefundDetail),
);

router.post(
  '/admin/refunds/:refund_id/approve',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['refund.approve']),
  adminRefundProcessRateLimit,
  asyncHandler(approveAdminRefund),
);

router.post(
  '/admin/refunds/:refund_id/reject',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['refund.reject']),
  adminRefundProcessRateLimit,
  asyncHandler(rejectAdminRefund),
);

router.post(
  '/admin/refunds/:refund_id/mark-processing',
  requireAdminAuth,
  requireAdminPermissions(['refund.process']),
  adminRefundProcessRateLimit,
  asyncHandler(markAdminRefundProcessing),
);

router.post(
  '/admin/refunds/:refund_id/mark-success',
  requireAdminAuth,
  requireAdminPermissions(['refund.process']),
  adminRefundProcessRateLimit,
  asyncHandler(markAdminRefundSuccess),
);

router.post(
  '/admin/refunds/:refund_id/mark-failed',
  requireAdminAuth,
  requireAdminPermissions(['refund.process']),
  adminRefundProcessRateLimit,
  asyncHandler(markAdminRefundFailed),
);

router.patch(
  '/admin/refunds/:refund_id/note',
  requireAdminAuth,
  requireAdminPermissions(['refund.process', 'refund.approve', 'refund.reject']),
  adminRefundProcessRateLimit,
  asyncHandler(updateAdminRefundNote),
);

module.exports = router;
