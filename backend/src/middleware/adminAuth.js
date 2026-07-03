const { isTest } = require('../config');
const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const { isDatabaseConfigured } = require('../database/config');
const {
  buildResolvedTokenPayload,
  extractPermissionCodes,
  extractUserIdFromPayload,
  normalizeRole,
  normalizeScopeServiceIds,
} = require('./authContext');
const authService = require('../services/authService');
const AppError = require('../utils/AppError');
const { verifyHs256Token } = require('../utils/jwt');

const ADMIN_ROLE_VALUES = Object.freeze([
  'staff',
  'admin',
  'system_admin',
]);

const buildAuthError = (message) =>
  new AppError(message, {
    code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    statusCode: 401,
  });

const buildForbiddenError = (message = 'You do not have permission to access this resource') =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const extractBearerToken = (authorization) => {
  if (typeof authorization !== 'string') {
    return null;
  }

  const [scheme, token] = authorization.split(' ');

  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim();
};

const buildLegacyTestAuthContext = (tokenPayload) => {
  const roleCode = normalizeRole(tokenPayload);
  const userId = extractUserIdFromPayload(tokenPayload);

  return {
    permissions: extractPermissionCodes(tokenPayload),
    roleCode,
    tokenId: tokenPayload?.jti || null,
    user: {
      email: tokenPayload?.email || null,
      full_name: tokenPayload?.full_name || null,
      id: userId,
      role_code: roleCode,
      status: USER_STATUS.ACTIVE,
    },
    userId,
  };
};

const resolveAdminAuthContext = async (tokenPayload) => {
  if (isTest && !isDatabaseConfigured()) {
    return buildLegacyTestAuthContext(tokenPayload);
  }

  return authService.resolveAuthenticatedUser(tokenPayload);
};

const requireAdminAuth = async (req, res, next) => {
  const token = extractBearerToken(req.headers.authorization);
  const secret = process.env.JWT_ACCESS_SECRET;

  if (!token || !secret) {
    next(buildAuthError('Access token is missing or expired'));
    return;
  }

  const verification = verifyHs256Token(token, secret);

  if (!verification.valid) {
    next(buildAuthError('Access token is missing or expired'));
    return;
  }

  try {
    const authContext = await resolveAdminAuthContext(verification.payload);
    const role = authContext.roleCode;

    if (!role || !ADMIN_ROLE_VALUES.includes(role)) {
      next(buildForbiddenError());
      return;
    }

    req.auth = {
      role,
      serviceScopeIds: normalizeScopeServiceIds(verification.payload),
      tokenPayload: buildResolvedTokenPayload(verification.payload, authContext),
      userId: authContext.userId,
    };
    next();
  } catch (error) {
    next(error);
  }
};

const requireAdminRoles = (roles) => (req, res, next) => {
  if (!req.auth?.role) {
    next(buildAuthError('Access token is missing or expired'));
    return;
  }

  if (!Array.isArray(roles) || !roles.includes(req.auth.role)) {
    next(buildForbiddenError());
    return;
  }

  next();
};

module.exports = {
  ADMIN_ROLE_VALUES,
  requireAdminAuth,
  requireAdminRoles,
};
