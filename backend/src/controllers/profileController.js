const profileService = require('../services/profileService');

const getMyVouchers = async (req, res) => {
  const vouchers = await profileService.getCurrentUserVouchers({
    userId: req.auth.userId,
  });

  res.success({
    data: vouchers,
    message: 'Profile vouchers retrieved successfully',
  });
};

const saveMyVoucher = async (req, res) => {
  const voucher = await profileService.saveCurrentUserVoucher({
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: voucher,
    message: 'Voucher saved successfully',
    statusCode: 201,
  });
};

const getMe = async (req, res) => {
  const profile = await profileService.getCurrentProfile({
    userId: req.auth.userId,
  });

  res.success({
    data: profile,
    message: 'Profile retrieved successfully',
  });
};

const updateMe = async (req, res) => {
  const profile = await profileService.updateCurrentProfile({
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: profile,
    message: 'Profile updated successfully',
  });
};

const updateMeAvatar = async (req, res) => {
  const profile = await profileService.updateCurrentAvatar({
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: profile,
    message: 'Avatar updated successfully',
  });
};

const updateMePassword = async (req, res) => {
  const profile = await profileService.updateCurrentPassword({
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: profile,
    message: 'Password changed successfully',
  });
};

const getMyLogs = async (req, res) => {
  const result = await profileService.getCurrentUserLogs({
    query: req.query,
    userId: req.auth.userId,
  });

  res.success({
    data: result.data,
    message: 'Profile activity logs retrieved successfully',
    meta: result.meta,
  });
};

const requestAccountDeactivation = async (req, res) => {
  const result = await profileService.requestAccountDeactivation({
    ipAddress: req.ip,
    payload: req.body,
    roleCode: req.auth.roleCode,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Account deactivation request submitted successfully',
  });
};

module.exports = {
  getMe,
  getMyLogs,
  getMyVouchers,
  requestAccountDeactivation,
  saveMyVoucher,
  updateMe,
  updateMeAvatar,
  updateMePassword,
};
