const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  buildResolvedTokenPayload,
} = require('./authContext');
const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const {
  extractBearerToken,
  verifyAccessToken,
} = require('../utils/sessionToken');

const attachHiddenAuthProperty = (target, key, value) => {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: false,
    value,
    writable: true,
  });
};

const buildRequestAuth = (authContext, tokenPayload) => {
  const requestAuth = {
    roleCode: authContext.roleCode,
    tokenId: authContext.tokenId,
    user: authContext.user,
    userId: authContext.userId,
  };

  attachHiddenAuthProperty(
    requestAuth,
    'permissions',
    Array.isArray(authContext.permissions)
      ? authContext.permissions
      : [],
  );
  attachHiddenAuthProperty(
    requestAuth,
    'tokenPayload',
    buildResolvedTokenPayload(tokenPayload, authContext),
  );

  return requestAuth;
};

const authRequired = ({ allowedRoles } = {}) => async (req, res, next) => {
  try {
    const accessToken = extractBearerToken(req.get('authorization'));
    const tokenPayload = verifyAccessToken(accessToken);
    const authContext = await authService.resolveAuthenticatedUser(tokenPayload);

    req.auth = buildRequestAuth(authContext, tokenPayload);

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

const authOptional = ({ allowedRoles } = {}) => async (req, res, next) => {
  try {
    const authorizationHeader = req.get('authorization');

    if (!authorizationHeader) {
      req.auth = null;
      next();
      return;
    }

    const accessToken = extractBearerToken(authorizationHeader);
    const tokenPayload = verifyAccessToken(accessToken);
    const authContext = await authService.resolveAuthenticatedUser(tokenPayload);

    req.auth = buildRequestAuth(authContext, tokenPayload);

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
  authOptional,
  authRequired,
};
