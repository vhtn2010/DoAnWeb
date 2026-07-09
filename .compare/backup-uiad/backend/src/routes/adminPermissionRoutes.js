const express = require('express');
const {
  listAdminPermissions,
  replaceAdminRolePermissions,
} = require('../controllers/adminPermissionController');
const { authRequired, requirePermissions } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/admin/permissions',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  requirePermissions(['permission.read']),
  asyncHandler(listAdminPermissions),
);

router.put(
  '/admin/roles/:roleId/permissions',
  authRequired({
    allowedRoles: ['system_admin'],
  }),
  requirePermissions(['role_permission.update']),
  asyncHandler(replaceAdminRolePermissions),
);

module.exports = router;
