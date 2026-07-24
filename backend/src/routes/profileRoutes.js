const express = require('express');
const { profileRateLimit } = require('../config/auth');
const {
  getMyCustomerSurveyStatus,
  submitMyCustomerSurvey,
} = require('../controllers/customerSurveyController');
const {
  getMe,
  getMyLogs,
  getMyVouchers,
  requestAccountDeactivation,
  saveMyVoucher,
  updateMe,
  updateMeAvatar,
  updateMePassword,
} = require('../controllers/profileController');
const { authRequired, requirePermissions } = require('../middleware/authSession');
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
  requirePermissions(['profile.read_self']),
  asyncHandler(getMe),
);
router.get(
  '/me/logs',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  requirePermissions(['profile.read_self']),
  asyncHandler(getMyLogs),
);
router.get(
  '/me/vouchers',
  authRequired({
    allowedRoles: ['customer'],
  }),
  requirePermissions(['profile.read_self']),
  asyncHandler(getMyVouchers),
);
router.post(
  '/me/vouchers',
  authRequired({
    allowedRoles: ['customer'],
  }),
  requirePermissions(['profile.read_self']),
  asyncHandler(saveMyVoucher),
);
router.get(
  '/me/customer-survey',
  authRequired({
    allowedRoles: ['customer'],
  }),
  requirePermissions(['profile.read_self']),
  asyncHandler(getMyCustomerSurveyStatus),
);
router.post(
  '/me/customer-survey',
  authRequired({
    allowedRoles: ['customer'],
  }),
  requirePermissions(['profile.read_self']),
  asyncHandler(submitMyCustomerSurvey),
);
router.patch(
  '/me',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  requirePermissions(['profile.update_self']),
  asyncHandler(updateMe),
);
router.patch(
  '/me/avatar',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  requirePermissions(['profile.update_self']),
  asyncHandler(updateMeAvatar),
);
router.patch(
  '/me/password',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  requirePermissions(['profile.change_password']),
  changePasswordRateLimiter,
  asyncHandler(updateMePassword),
);
router.post(
  '/me/account-deactivation-request',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(requestAccountDeactivation),
);

module.exports = router;
