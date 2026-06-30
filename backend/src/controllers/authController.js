const authService = require('../services/authService');

const changeEmailRequest = async (req, res) => {
  const result = await authService.changeEmailRequest(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: result.data,
    message: result.message,
  });
};

const changeEmailConfirm = async (req, res) => {
  const result = await authService.changeEmailConfirm(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: result.data,
    message: result.message,
  });
};

const register = async (req, res) => {
  const user = await authService.register(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: user,
    message:
      'Registration successful. Please verify your email before logging in.',
    statusCode: 201,
  });
};

const login = async (req, res) => {
  const result = await authService.login(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: result,
    message: 'Login successful.',
  });
};

const forgotPassword = async (req, res) => {
  const result = await authService.forgotPassword(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: result.data,
    message: result.message,
  });
};

const refreshToken = async (req, res) => {
  const result = await authService.refreshToken(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: result,
    message: 'Token refreshed successfully.',
  });
};

const logout = async (req, res) => {
  const result = await authService.logout(req.body, {
    ipAddress: req.ip,
    roleCode: req.auth.roleCode,
    tokenId: req.auth.tokenId,
    userAgent: req.get('user-agent'),
    userId: req.auth.userId,
  });

  res.success({
    data: result.data,
    message: result.message,
  });
};

const resetPassword = async (req, res) => {
  const result = await authService.resetPassword(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: result.data,
    message: result.message,
  });
};

const verifyEmail = async (req, res) => {
  const result = await authService.verifyEmail(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: {
      already_verified: result.already_verified,
      email_verified_at: result.email_verified_at,
      status: result.status,
    },
    message: result.message,
  });
};

const resendVerification = async (req, res) => {
  const result = await authService.resendVerification(req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: result.data,
    message: result.message,
  });
};

module.exports = {
  changeEmailConfirm,
  changeEmailRequest,
  forgotPassword,
  login,
  logout,
  refreshToken,
  register,
  resetPassword,
  resendVerification,
  verifyEmail,
};
