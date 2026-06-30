const express = require('express');
const { authRateLimit } = require('../config/auth');
const {
  login,
  logout,
  refreshToken,
  register,
  resendVerification,
  verifyEmail,
} = require('../controllers/authController');
const { authRequired } = require('../middleware/authSession');
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

const loginRateLimiter = createRateLimiter({
  keyGenerator: (req) => {
    const normalizedEmail =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'unknown';

    return `auth-login:${req.ip || 'anonymous'}:${normalizedEmail || 'unknown'}`;
  },
  maxRequests: authRateLimit.loginMaxRequests,
  message: 'Too many login attempts. Please try again later.',
  storeKey: 'auth-login',
  windowMs: authRateLimit.loginWindowMs,
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
router.post('/auth/login', loginRateLimiter, asyncHandler(login));
router.post('/auth/refresh-token', asyncHandler(refreshToken));
router.post(
  '/auth/logout',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  asyncHandler(logout),
);
router.post('/auth/verify-email', asyncHandler(verifyEmail));
router.post(
  '/auth/resend-verification',
  resendVerificationRateLimiter,
  asyncHandler(resendVerification),
);

module.exports = router;
