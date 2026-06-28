const { cloudinary } = require('./index');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const isCloudinaryConfigured = cloudinary.isConfigured;

const ensureCloudinaryConfigured = () => {
  if (!isCloudinaryConfigured) {
    throw new AppError('Cloudinary is not configured', {
      code: API_ERROR_CODES.CLOUDINARY_NOT_CONFIGURED,
      statusCode: 503,
    });
  }
};

module.exports = {
  cloudinary,
  ensureCloudinaryConfigured,
  isCloudinaryConfigured,
};
