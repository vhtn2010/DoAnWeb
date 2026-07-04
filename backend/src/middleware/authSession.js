const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  buildResolvedTokenPayload,
  normalizeScopeServiceIds,
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
    role: authContext.roleCode,
    serviceScopeIds: normalizeScopeServiceIds(tokenPayload),
    tokenPayload: buildResolvedTokenPayload(tokenPayload, authContext),
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
    'roleCode',
    authContext.roleCode,
  );
  attachHiddenAuthProperty(
    requestAuth,
    'tokenId',
    authContext.tokenId,
  );
  attachHiddenAuthProperty(
    requestAuth,
    'user',
    authContext.user,
  );

  return requestAuth;
};

const normalizePermissionCodes = (req) => {
  if (!Array.isArray(req.auth?.permissions)) {
    return [];
  }

  return req.auth.permissions
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      if (entry && typeof entry === 'object' && typeof entry.code === 'string') {
        return entry.code.trim();
      }

      return null;
    })
    .filter(Boolean);
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

const requirePermissions = (requiredPermissions) => (req, res, next) => {
  if (!req.auth?.userId) {
    next(new AppError('Forbidden', {
      code: API_ERROR_CODES.FORBIDDEN,
      statusCode: 403,
    }));
    return;
  }

  const permissionCodes = normalizePermissionCodes(req);

  if (
    Array.isArray(requiredPermissions) &&
    requiredPermissions.some((code) => permissionCodes.includes(code))
  ) {
    next();
    return;
  }

  next(new AppError('Forbidden', {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  }));
};

const requirePermissionsIfAuthenticated = (requiredPermissions) => (req, res, next) => {
  if (!req.auth?.userId) {
    next();
    return;
  }

  requirePermissions(requiredPermissions)(req, res, next);
};

module.exports = {
  authOptional,
  authRequired,
  requirePermissions,
  requirePermissionsIfAuthenticated,
};
