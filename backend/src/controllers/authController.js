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

module.exports = {
  register,
};
