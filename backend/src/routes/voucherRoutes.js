const express = require('express');
const { validateVoucher } = require('../controllers/voucherController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const voucherValidateRateLimiter = createRateLimiter({
  keyGenerator: (req) => {
    const normalizedCode =
      typeof req.body?.code === 'string'
        ? req.body.code.trim().toUpperCase()
        : 'missing';

    return `voucher-validate:${req.auth?.userId || 'anonymous'}:${req.ip || 'anonymous'}:${normalizedCode || 'missing'}`;
  },
  maxRequests: 20,
  message: 'Too many voucher validation attempts. Please try again later.',
  storeKey: 'voucher-validate',
  windowMs: 60 * 1000,
});

router.post(
  '/vouchers/validate',
  authRequired({
    allowedRoles: ['customer'],
  }),
  voucherValidateRateLimiter,
  asyncHandler(validateVoucher),
);

module.exports = router;
