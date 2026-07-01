const adminRoleService = require('../services/adminRoleService');

const listAdminRoles = async (req, res) => {
  const roles = await adminRoleService.getRoles();

  res.success({
    data: roles,
    message: 'Roles retrieved successfully',
  });
};

const createAdminRole = async (req, res) => {
  const role = await adminRoleService.createRole({
    actorRoleCode: req.auth.roleCode,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: role,
    message: 'Role created successfully',
    statusCode: 201,
  });
};

const getAdminRoleDetail = async (req, res) => {
  const role = await adminRoleService.getRoleById({
    roleId: req.params.roleId,
  });

  res.success({
    data: role,
    message: 'Role retrieved successfully',
  });
};

const updateAdminRole = async (req, res) => {
  const role = await adminRoleService.updateRole({
    actorRoleCode: req.auth.roleCode,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    roleId: req.params.roleId,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: role,
    message: 'Role updated successfully',
  });
};

const deleteAdminRole = async (req, res) => {
  const result = await adminRoleService.deleteRole({
    actorRoleCode: req.auth.roleCode,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    roleId: req.params.roleId,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: result,
    message: 'Role deleted successfully',
  });
};

module.exports = {
  createAdminRole,
  deleteAdminRole,
  getAdminRoleDetail,
  listAdminRoles,
  updateAdminRole,
};
