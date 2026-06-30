const authService = require('../services/authService');

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
  register,
  resendVerification,
  verifyEmail,
};
