const express = require('express');
const { profileRateLimit } = require('../config/auth');
const {
  getMe,
  updateMe,
  updateMeAvatar,
  updateMePassword,
} = require('../controllers/profileController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const changePasswordRateLimiter = createRateLimiter({
  keyGenerator: (req) =>
    `profile-change-password:${req.auth?.userId || 'anonymous'}:${req.ip || 'anonymous'}`,
  maxRequests: profileRateLimit.changePasswordMaxRequests,
  message: 'Too many password change attempts. Please try again later.',
  storeKey: 'profile-change-password',
  windowMs: profileRateLimit.changePasswordWindowMs,
});

router.get(
  '/me',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  asyncHandler(getMe),
);
router.patch(
  '/me',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  asyncHandler(updateMe),
);
router.patch(
  '/me/avatar',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  asyncHandler(updateMeAvatar),
);
router.patch(
  '/me/password',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  changePasswordRateLimiter,
  asyncHandler(updateMePassword),
);

module.exports = router;
