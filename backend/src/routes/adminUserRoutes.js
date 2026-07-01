const express = require('express');
const {
  changeAdminUserRole,
  changeAdminUserStatus,
  createAdminUser,
  deleteAdminUser,
  getAdminUserDetail,
  getAdminUserLogs,
  listAdminUsers,
  resendAdminUserVerificationEmail,
  updateAdminUser,
} = require('../controllers/adminUserController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const resendVerificationRateLimiter = createRateLimiter({
  keyGenerator: (req) =>
    `admin-user-resend-verification:${req.auth?.userId || 'anonymous'}:${req.params?.userId || 'unknown'}:${req.ip || 'anonymous'}`,
  maxRequests: 5,
  message: 'Too many verification resend attempts. Please try again later.',
  storeKey: 'admin-user-resend-verification',
  windowMs: 10 * 60 * 1000,
});

router.use(
  '/admin/users',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
);

router.post('/admin/users', asyncHandler(createAdminUser));
router.get('/admin/users', asyncHandler(listAdminUsers));
router.get('/admin/users/:userId/logs', asyncHandler(getAdminUserLogs));
router.get('/admin/users/:userId', asyncHandler(getAdminUserDetail));
router.patch('/admin/users/:userId', asyncHandler(updateAdminUser));
router.patch(
  '/admin/users/:userId/role',
  authRequired({
    allowedRoles: ['system_admin'],
  }),
  asyncHandler(changeAdminUserRole),
);
router.patch('/admin/users/:userId/status', asyncHandler(changeAdminUserStatus));
router.delete('/admin/users/:userId', asyncHandler(deleteAdminUser));
router.post(
  '/admin/users/:userId/resend-verification-email',
  resendVerificationRateLimiter,
  asyncHandler(resendAdminUserVerificationEmail),
);

module.exports = router;
