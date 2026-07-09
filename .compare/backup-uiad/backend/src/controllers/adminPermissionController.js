const adminPermissionService = require('../services/adminPermissionService');

const listAdminPermissions = async (req, res) => {
  const permissions = await adminPermissionService.getPermissions({
    query: req.query,
  });

  res.success({
    data: permissions,
    message: 'Permissions retrieved successfully',
  });
};

const replaceAdminRolePermissions = async (req, res) => {
  const result = await adminPermissionService.replaceRolePermissions({
    actorRoleCode: req.auth.roleCode,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    roleId: req.params.roleId,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: result,
    message: 'Role permissions updated successfully',
  });
};

module.exports = {
  listAdminPermissions,
  replaceAdminRolePermissions,
};
