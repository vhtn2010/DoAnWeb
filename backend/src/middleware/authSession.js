const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');
const {
  extractBearerToken,
  verifyAccessToken,
} = require('../utils/sessionToken');

const authRequired = ({ allowedRoles } = {}) => (req, res, next) => {
  try {
    const accessToken = extractBearerToken(req.get('authorization'));
    const tokenPayload = verifyAccessToken(accessToken);

    req.auth = {
      roleCode: tokenPayload.role_code,
      tokenId: tokenPayload.jti,
      userId: tokenPayload.sub,
    };

    if (
      Array.isArray(allowedRoles) &&
      allowedRoles.length > 0 &&
      !allowedRoles.includes(tokenPayload.role_code)
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
