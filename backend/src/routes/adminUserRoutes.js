const express = require('express');
const {
  createAdminUser,
  getAdminUserDetail,
  getAdminUserLogs,
  listAdminUsers,
  updateAdminUser,
} = require('../controllers/adminUserController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

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

module.exports = router;
