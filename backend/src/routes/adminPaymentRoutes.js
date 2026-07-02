const express = require('express');
const {
  getAdminPaymentDetail,
  getAdminPaymentProof,
  listAdminPayments,
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

module.exports = router;
