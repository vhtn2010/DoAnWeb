const crypto = require('node:crypto');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { sessionToken } = require('../config/auth');
const AppError = require('./AppError');

const ACCESS_TOKEN_TYPE = 'access';
const REFRESH_TOKEN_TYPE = 'refresh';

const base64urlEncode = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const base64urlDecodeJson = (value) => {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
  } catch (error) {
    throw new AppError('Token is invalid or expired', {
      code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
      statusCode: 401,
    });
  }
};

const createTokenExpiredError = (message = 'Token is invalid or expired') =>
  new AppError(message, {
    code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    statusCode: 401,
  });

const ensureSecret = (secret, label) => {
  if (!secret) {
    throw new AppError(`${label} secret is not configured`, {
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

const signSessionToken = (
  payload,
  {
    expiresInSeconds,
    issuedAt = new Date(),
    secret,
    tokenType,
  },
) => {
  ensureSecret(secret, tokenType === REFRESH_TOKEN_TYPE ? 'Refresh token' : 'Access token');

  const iat = Math.floor(issuedAt.getTime() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  const tokenPayload = {
    ...payload,
    exp: iat + expiresInSeconds,
    iat,
    jti: crypto.randomUUID(),
    type: tokenType,
  };
  const encodedHeader = base64urlEncode(header);
  const encodedPayload = base64urlEncode(tokenPayload);
  const signature = signToken(encodedHeader, encodedPayload, secret);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

const verifySessionToken = (
  token,
  {
    expectedType,
    now = new Date(),
    secret,
  },
) => {
  ensureSecret(secret, expectedType === REFRESH_TOKEN_TYPE ? 'Refresh token' : 'Access token');

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

  if (header.alg !== 'HS256' || payload.type !== expectedType) {
    throw createTokenExpiredError();
  }

  if (!payload.sub || !payload.role_code || !Number.isFinite(payload.exp)) {
    throw createTokenExpiredError();
  }

  if (payload.exp <= Math.floor(now.getTime() / 1000)) {
    throw createTokenExpiredError();
  }

  return payload;
};

const createAccessToken = (
  {
    ...claims
  },
  options = {},
) =>
  signSessionToken(
    {
      ...claims,
      role_code: claims.roleCode,
      sub: claims.userId,
    },
    {
      expiresInSeconds:
        options.expiresInSeconds || sessionToken.accessExpiresInSeconds,
      issuedAt: options.issuedAt,
      secret: options.secret || sessionToken.accessSecret,
      tokenType: ACCESS_TOKEN_TYPE,
    },
  );

const createRefreshToken = (
  {
    ...claims
  },
  options = {},
) =>
  signSessionToken(
    {
      ...claims,
      role_code: claims.roleCode,
      sub: claims.userId,
    },
    {
      expiresInSeconds:
        options.expiresInSeconds || sessionToken.refreshExpiresInSeconds,
      issuedAt: options.issuedAt,
      secret: options.secret || sessionToken.refreshSecret,
      tokenType: REFRESH_TOKEN_TYPE,
    },
  );

const verifyAccessToken = (token, options = {}) =>
  verifySessionToken(token, {
    ...options,
    expectedType: ACCESS_TOKEN_TYPE,
    secret: options.secret || sessionToken.accessSecret,
  });

const verifyRefreshToken = (token, options = {}) =>
  verifySessionToken(token, {
    ...options,
    expectedType: REFRESH_TOKEN_TYPE,
    secret: options.secret || sessionToken.refreshSecret,
  });

const buildSessionTokens = (
  {
    ...claims
  },
  {
    issuedAt = new Date(),
  } = {},
) => ({
  accessToken: createAccessToken(
    {
      ...claims,
    },
    {
      issuedAt,
    },
  ),
  expiresIn: sessionToken.accessExpiresInSeconds,
  refreshExpiresIn: sessionToken.refreshExpiresInSeconds,
  refreshToken: createRefreshToken(
    {
      ...claims,
    },
    {
      issuedAt,
    },
  ),
});

const extractBearerToken = (authorizationHeader) => {
  const normalizedValue = String(authorizationHeader || '').trim();

  if (!normalizedValue) {
    throw createTokenExpiredError('Access token is invalid or expired');
  }

  const match = normalizedValue.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw createTokenExpiredError('Access token is invalid or expired');
  }

  return match[1].trim();
};

const hashSessionToken = (token) =>
  crypto.createHash('sha256').update(String(token || '')).digest('hex');

module.exports = {
  ACCESS_TOKEN_TYPE,
  REFRESH_TOKEN_TYPE,
  buildSessionTokens,
  createAccessToken,
  createRefreshToken,
  createTokenExpiredError,
  extractBearerToken,
  hashSessionToken,
  verifyAccessToken,
  verifyRefreshToken,
};
