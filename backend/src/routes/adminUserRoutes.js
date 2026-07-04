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
const { authRequired, requirePermissions } = require('../middleware/authSession');
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

router.post('/admin/users', requirePermissions(['user.create']), asyncHandler(createAdminUser));
router.get('/admin/users', requirePermissions(['user.read_all']), asyncHandler(listAdminUsers));
router.get('/admin/users/:userId/logs', requirePermissions(['user.read_all']), asyncHandler(getAdminUserLogs));
router.get('/admin/users/:userId', requirePermissions(['user.read_all']), asyncHandler(getAdminUserDetail));
router.patch('/admin/users/:userId', requirePermissions(['user.update']), asyncHandler(updateAdminUser));
router.patch(
  '/admin/users/:userId/role',
  authRequired({
    allowedRoles: ['system_admin'],
  }),
  requirePermissions(['user.change_role']),
  asyncHandler(changeAdminUserRole),
);
router.patch('/admin/users/:userId/status', requirePermissions(['user.change_status']), asyncHandler(changeAdminUserStatus));
router.delete('/admin/users/:userId', requirePermissions(['user.delete']), asyncHandler(deleteAdminUser));
router.post(
  '/admin/users/:userId/resend-verification-email',
  requirePermissions(['email.resend']),
  resendVerificationRateLimiter,
  asyncHandler(resendAdminUserVerificationEmail),
);

module.exports = router;
