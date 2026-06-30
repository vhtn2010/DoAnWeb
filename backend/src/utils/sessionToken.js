const crypto = require('node:crypto');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { sessionToken } = require('../config/auth');
const AppError = require('./AppError');

const ACCESS_TOKEN_TYPE = 'access';

const base64urlEncode = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const base64urlDecodeJson = (value) => {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch (error) {
    throw createTokenExpiredError('Access token is invalid or expired');
  }
};

const createTokenExpiredError = (message = 'Access token is invalid or expired') =>
  new AppError(message, {
    code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED || API_ERROR_CODES.UNAUTHORIZED,
    statusCode: 401,
  });

const ensureSecret = (secret) => {
  if (!secret) {
    throw new AppError('Access token secret is not configured', {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  }
};

const signToken = (encodedHeader, encodedPayload, secret) =>
  crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

const createAccessToken = (
  {
    roleCode,
    userId,
  },
  options = {},
) => {
  const secret = options.secret || sessionToken.accessSecret;

  ensureSecret(secret);

  const issuedAt = options.issuedAt || new Date();
  const iat = Math.floor(issuedAt.getTime() / 1000);
  const tokenPayload = {
    exp: iat + (options.expiresInSeconds || sessionToken.accessExpiresInSeconds),
    iat,
    jti: crypto.randomUUID(),
    role_code: roleCode,
    sub: userId,
    type: ACCESS_TOKEN_TYPE,
  };
  const encodedHeader = base64urlEncode({
    alg: 'HS256',
    typ: 'JWT',
  });
  const encodedPayload = base64urlEncode(tokenPayload);
  const signature = signToken(encodedHeader, encodedPayload, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifyAccessToken = (token, options = {}) => {
  const secret = options.secret || sessionToken.accessSecret;

  ensureSecret(secret);

  if (!token || typeof token !== 'string') {
    throw createTokenExpiredError();
  }

  const [encodedHeader, encodedPayload, signature, ...rest] = token.split('.');

  if (!encodedHeader || !encodedPayload || !signature || rest.length > 0) {
    throw createTokenExpiredError();
  }

  const expectedSignature = signToken(encodedHeader, encodedPayload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    throw createTokenExpiredError();
  }

  const header = base64urlDecodeJson(encodedHeader);
  const payload = base64urlDecodeJson(encodedPayload);

  if (
    header.alg !== 'HS256' ||
    payload.type !== ACCESS_TOKEN_TYPE ||
    !payload.sub ||
    !payload.role_code ||
    !Number.isFinite(payload.exp)
  ) {
    throw createTokenExpiredError();
  }

  const now = options.now || new Date();

  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    throw createTokenExpiredError();
  }

  return payload;
};

const extractBearerToken = (authorizationHeader) => {
  const normalizedValue = String(authorizationHeader || '').trim();

  if (!normalizedValue) {
    throw createTokenExpiredError();
  }

  const match = normalizedValue.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw createTokenExpiredError();
  }

  return match[1].trim();
};

module.exports = {
  createAccessToken,
  createTokenExpiredError,
  extractBearerToken,
  verifyAccessToken,
};
