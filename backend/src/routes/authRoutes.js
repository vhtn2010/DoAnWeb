const express = require('express');
const { authRateLimit } = require('../config/auth');
const {
  register,
  resendVerification,
  verifyEmail,
} = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const registerRateLimiter = createRateLimiter({
  keyGenerator: (req) => `auth-register:${req.ip || 'anonymous'}`,
  maxRequests: authRateLimit.registerMaxRequests,
  message: 'Too many registration attempts. Please try again later.',
  storeKey: 'auth-register',
  windowMs: authRateLimit.registerWindowMs,
});

const resendVerificationRateLimiter = createRateLimiter({
  keyGenerator: (req) => {
    const normalizedEmail =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'unknown';

    return `auth-resend-verification:${req.ip || 'anonymous'}:${normalizedEmail || 'unknown'}`;
  },
  maxRequests: authRateLimit.resendVerificationMaxRequests,
  message: 'Too many verification email resend attempts. Please try again later.',
  storeKey: 'auth-resend-verification',
  windowMs: authRateLimit.resendVerificationWindowMs,
});

router.post('/auth/register', registerRateLimiter, asyncHandler(register));
router.post('/auth/verify-email', asyncHandler(verifyEmail));
router.post(
  '/auth/resend-verification',
  resendVerificationRateLimiter,
  asyncHandler(resendVerification),
);

module.exports = router;
