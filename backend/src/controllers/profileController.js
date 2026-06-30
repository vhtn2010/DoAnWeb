const profileService = require('../services/profileService');

const getMe = async (req, res) => {
  const profile = await profileService.getCurrentProfile({
    userId: req.auth.userId,
  });

  res.success({
    data: profile,
    message: 'Profile retrieved successfully',
  });
};

module.exports = {
  getMe,
};
