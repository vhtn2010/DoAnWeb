const express = require('express');
const {
  listAdminPermissions,
  replaceAdminRolePermissions,
} = require('../controllers/adminPermissionController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/admin/permissions',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  asyncHandler(listAdminPermissions),
);

router.put(
  '/admin/roles/:roleId/permissions',
  authRequired({
    allowedRoles: ['system_admin'],
  }),
  asyncHandler(replaceAdminRolePermissions),
);

module.exports = router;
