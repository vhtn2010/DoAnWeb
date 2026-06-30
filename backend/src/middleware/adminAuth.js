const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
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

const normalizeRole = (payload) => {
  const role =
    payload?.role_code ||
    payload?.roleCode ||
    payload?.role ||
    null;

  return typeof role === 'string'
    ? role.trim().toLowerCase()
    : null;
};

const normalizeScopeServiceIds = (payload) => {
  const scope =
    payload?.service_scope_ids ||
    payload?.serviceScopeIds ||
    payload?.scope?.service_ids ||
    null;

  return Array.isArray(scope)
    ? scope.filter((value) => typeof value === 'string' && value.trim())
    : null;
};

const requireAdminAuth = (req, res, next) => {
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

  const role = normalizeRole(verification.payload);

  if (!role || !ADMIN_ROLE_VALUES.includes(role)) {
    next(buildForbiddenError());
    return;
  }

  req.auth = {
    role,
    serviceScopeIds: normalizeScopeServiceIds(verification.payload),
    tokenPayload: verification.payload,
    userId:
      verification.payload.sub ||
      verification.payload.user_id ||
      verification.payload.userId ||
      verification.payload.id ||
      null,
  };
  next();
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
