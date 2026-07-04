const express = require('express');
const {
  createAdminRole,
  deleteAdminRole,
  getAdminRoleDetail,
  listAdminRoles,
  updateAdminRole,
} = require('../controllers/adminRoleController');
const { authRequired, requirePermissions } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/admin/roles',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  requirePermissions(['role.read']),
  asyncHandler(listAdminRoles),
);

router.get(
  '/admin/roles/:roleId',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  requirePermissions(['role.read']),
  asyncHandler(getAdminRoleDetail),
);

router.post(
  '/admin/roles',
  authRequired({
    allowedRoles: ['system_admin'],
  }),
  requirePermissions(['role.create']),
  asyncHandler(createAdminRole),
);

router.patch(
  '/admin/roles/:roleId',
  authRequired({
    allowedRoles: ['system_admin'],
  }),
  requirePermissions(['role.update']),
  asyncHandler(updateAdminRole),
);

router.delete(
  '/admin/roles/:roleId',
  authRequired({
    allowedRoles: ['system_admin'],
  }),
  requirePermissions(['role.delete']),
  asyncHandler(deleteAdminRole),
);

module.exports = router;
