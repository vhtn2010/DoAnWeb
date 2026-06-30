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

module.exports = {
  getMe,
  updateMe,
  updateMeAvatar,
};
