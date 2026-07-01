const express = require('express');
const {
  getAdminUserDetail,
  getAdminUserLogs,
  listAdminUsers,
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

router.get('/admin/users', asyncHandler(listAdminUsers));
router.get('/admin/users/:userId/logs', asyncHandler(getAdminUserLogs));
router.get('/admin/users/:userId', asyncHandler(getAdminUserDetail));

module.exports = router;
