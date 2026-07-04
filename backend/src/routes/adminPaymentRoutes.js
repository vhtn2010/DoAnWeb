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
const {
  requireAdminAuth,
  requireAdminPermissions,
} = require('../middleware/adminAuth');
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
  requireAdminPermissions(['payment.read_all'], { allowWhenMissing: true }),
  adminPaymentRateLimit,
  asyncHandler(listAdminPayments),
);

router.get(
  '/admin/payments/:payment_id',
  requireAdminAuth,
  requireAdminPermissions(['payment.read_all'], { allowWhenMissing: true }),
  adminPaymentRateLimit,
  asyncHandler(getAdminPaymentDetail),
);

router.get(
  '/admin/payments/:payment_id/proof',
  requireAdminAuth,
  requireAdminPermissions(['payment.read_all', 'payment.confirm'], { allowWhenMissing: true }),
  adminPaymentRateLimit,
  asyncHandler(getAdminPaymentProof),
);

router.post(
  '/admin/payments/:payment_id/confirm',
  requireAdminAuth,
  requireAdminPermissions(['payment.confirm']),
  adminPaymentProcessRateLimit,
  asyncHandler(confirmAdminPayment),
);

router.post(
  '/admin/payments/:payment_id/reject',
  requireAdminAuth,
  requireAdminPermissions(['payment.reject']),
  adminPaymentProcessRateLimit,
  asyncHandler(rejectAdminPayment),
);

router.post(
  '/admin/payments/:payment_id/expire',
  requireAdminAuth,
  requireAdminPermissions(['payment.confirm', 'payment.reject']),
  adminPaymentProcessRateLimit,
  asyncHandler(expireAdminPayment),
);

router.post(
  '/admin/payments/:payment_id/mark-reconciled',
  requireAdminAuth,
  requireAdminPermissions(['payment.reconcile']),
  adminPaymentProcessRateLimit,
  asyncHandler(markAdminPaymentReconciled),
);

router.patch(
  '/admin/payments/:payment_id/note',
  requireAdminAuth,
  requireAdminPermissions([
    'payment.read_all',
    'payment.confirm',
    'payment.reject',
    'payment.reconcile',
  ]),
  adminPaymentProcessRateLimit,
  asyncHandler(updateAdminPaymentNote),
);

module.exports = router;
