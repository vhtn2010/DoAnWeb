const adminUserService = require('../services/adminUserService');

const listAdminUsers = async (req, res) => {
  const result = await adminUserService.getUsers({
    query: req.query,
  });

  res.success({
    data: result.data,
    message: 'Users retrieved successfully',
    meta: result.meta,
  });
};

const createAdminUser = async (req, res) => {
  const user = await adminUserService.createUser({
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: user,
    message: 'User created successfully',
    statusCode: 201,
  });
};

const changeAdminUserStatus = async (req, res) => {
  const user = await adminUserService.changeUserStatus({
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.params.userId,
  });

  res.success({
    data: user,
    message: 'User status updated successfully',
  });
};

const changeAdminUserRole = async (req, res) => {
  const result = await adminUserService.changeUserRole({
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.params.userId,
  });

  res.success({
    data: result,
    message: 'User role updated successfully',
  });
};

const getAdminUserDetail = async (req, res) => {
  const user = await adminUserService.getUserById({
    userId: req.params.userId,
  });

  res.success({
    data: user,
    message: 'User retrieved successfully',
  });
};

const deleteAdminUser = async (req, res) => {
  const result = await adminUserService.deleteUser({
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.params.userId,
  });

  res.success({
    data: result,
    message: 'User deleted successfully',
  });
};

const getAdminUserLogs = async (req, res) => {
  const result = await adminUserService.getUserLogs({
    query: req.query,
    userId: req.params.userId,
  });

  res.success({
    data: result.data,
    message: 'User logs retrieved successfully',
    meta: result.meta,
  });
};

const resendAdminUserVerificationEmail = async (req, res) => {
  const result = await adminUserService.resendVerificationEmail({
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.params.userId,
  });

  res.success({
    data: result,
    message: 'Verification email resent successfully',
  });
};

const updateAdminUser = async (req, res) => {
  const user = await adminUserService.updateUser({
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.params.userId,
  });

  res.success({
    data: user,
    message: 'User updated successfully',
  });
};

module.exports = {
  changeAdminUserRole,
  changeAdminUserStatus,
  createAdminUser,
  deleteAdminUser,
  getAdminUserDetail,
  getAdminUserLogs,
  listAdminUsers,
  resendAdminUserVerificationEmail,
  updateAdminUser,
};
