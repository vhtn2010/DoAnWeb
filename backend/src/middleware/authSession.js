const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const {
  extractBearerToken,
  verifyAccessToken,
} = require('../utils/sessionToken');

const authRequired = ({ allowedRoles } = {}) => async (req, res, next) => {
  try {
    const accessToken = extractBearerToken(req.get('authorization'));
    const tokenPayload = verifyAccessToken(accessToken);
    const authContext = await authService.resolveAuthenticatedUser(tokenPayload);

    req.auth = {
      roleCode: authContext.roleCode,
      tokenId: authContext.tokenId,
      user: authContext.user,
      userId: authContext.userId,
    };

    if (
      Array.isArray(allowedRoles) &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(authContext.roleCode)
    ) {
      throw new AppError('Forbidden', {
        code: API_ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  authRequired,
};
