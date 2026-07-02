const express = require('express');
const {
  confirmAdminPayment,
  expireAdminPayment,
  getAdminPaymentDetail,
  getAdminPaymentProof,
  listAdminPayments,
  markAdminPaymentReconciled,
  rejectAdminPayment,
  updateAdminPaymentNote,
} = require('../controllers/adminPaymentController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const adminPaymentRateLimit = createRateLimiter({
  maxRequests: 120,
  storeKey: 'admin-payment-query',
  windowMs: 60 * 1000,
});
const adminPaymentProcessRateLimit = createRateLimiter({
  maxRequests: 60,
  storeKey: 'admin-payment-process',
  windowMs: 60 * 1000,
});

router.get(
  '/admin/payments',
  requireAdminAuth,
  adminPaymentRateLimit,
  asyncHandler(listAdminPayments),
);

router.get(
  '/admin/payments/:payment_id',
  requireAdminAuth,
  adminPaymentRateLimit,
  asyncHandler(getAdminPaymentDetail),
);

router.get(
  '/admin/payments/:payment_id/proof',
  requireAdminAuth,
  adminPaymentRateLimit,
  asyncHandler(getAdminPaymentProof),
);

router.post(
  '/admin/payments/:payment_id/confirm',
  requireAdminAuth,
  adminPaymentProcessRateLimit,
  asyncHandler(confirmAdminPayment),
);

router.post(
  '/admin/payments/:payment_id/reject',
  requireAdminAuth,
  adminPaymentProcessRateLimit,
  asyncHandler(rejectAdminPayment),
);

router.post(
  '/admin/payments/:payment_id/expire',
  requireAdminAuth,
  adminPaymentProcessRateLimit,
  asyncHandler(expireAdminPayment),
);

router.post(
  '/admin/payments/:payment_id/mark-reconciled',
  requireAdminAuth,
  adminPaymentProcessRateLimit,
  asyncHandler(markAdminPaymentReconciled),
);

router.patch(
  '/admin/payments/:payment_id/note',
  requireAdminAuth,
  adminPaymentProcessRateLimit,
  asyncHandler(updateAdminPaymentNote),
);

module.exports = router;
