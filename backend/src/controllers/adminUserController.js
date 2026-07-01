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

const getAdminUserDetail = async (req, res) => {
  const user = await adminUserService.getUserById({
    userId: req.params.userId,
  });

  res.success({
    data: user,
    message: 'User retrieved successfully',
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

module.exports = {
  getAdminUserDetail,
  getAdminUserLogs,
  listAdminUsers,
};
