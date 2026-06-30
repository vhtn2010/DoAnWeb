const express = require('express');
const { authRateLimit } = require('../config/auth');
const {
  changeEmailConfirm,
  changeEmailRequest,
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
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

const forgotPasswordRateLimiter = createRateLimiter({
  keyGenerator: (req) => {
    const normalizedEmail =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : 'unknown';

    return `auth-forgot-password:${req.ip || 'anonymous'}:${normalizedEmail || 'unknown'}`;
  },
  maxRequests: authRateLimit.forgotPasswordMaxRequests,
  message: 'Too many password reset requests. Please try again later.',
  storeKey: 'auth-forgot-password',
  windowMs: authRateLimit.forgotPasswordWindowMs,
});

const resetPasswordRateLimiter = createRateLimiter({
  keyGenerator: (req) => {
    const normalizedToken =
      typeof req.body?.token === 'string' && req.body.token.trim()
        ? req.body.token.trim().slice(0, 32)
        : 'unknown';

    return `auth-reset-password:${req.ip || 'anonymous'}:${normalizedToken}`;
  },
  maxRequests: authRateLimit.resetPasswordMaxRequests,
  message: 'Too many password reset attempts. Please try again later.',
  storeKey: 'auth-reset-password',
  windowMs: authRateLimit.resetPasswordWindowMs,
});

const changeEmailRequestRateLimiter = createRateLimiter({
  keyGenerator: (req) => {
    const normalizedEmail =
      typeof req.body?.new_email === 'string'
        ? req.body.new_email.trim().toLowerCase()
        : 'unknown';

    return `auth-change-email-request:${req.auth?.userId || 'anonymous'}:${req.ip || 'anonymous'}:${normalizedEmail || 'unknown'}`;
  },
  maxRequests: authRateLimit.changeEmailRequestMaxRequests,
  message: 'Too many change email requests. Please try again later.',
  storeKey: 'auth-change-email-request',
  windowMs: authRateLimit.changeEmailRequestWindowMs,
});

router.post('/auth/register', registerRateLimiter, asyncHandler(register));
router.post('/auth/login', loginRateLimiter, asyncHandler(login));
router.post(
  '/auth/forgot-password',
  forgotPasswordRateLimiter,
  asyncHandler(forgotPassword),
);
router.post('/auth/refresh-token', asyncHandler(refreshToken));
router.post(
  '/auth/logout',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  asyncHandler(logout),
);
router.post(
  '/auth/reset-password',
  resetPasswordRateLimiter,
  asyncHandler(resetPassword),
);
router.post('/auth/verify-email', asyncHandler(verifyEmail));
router.post(
  '/auth/resend-verification',
  resendVerificationRateLimiter,
  asyncHandler(resendVerification),
);
router.post(
  '/auth/change-email/request',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  changeEmailRequestRateLimiter,
  asyncHandler(changeEmailRequest),
);
router.post(
  '/auth/change-email/confirm',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  asyncHandler(changeEmailConfirm),
);

module.exports = router;
