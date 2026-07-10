const crypto = require('node:crypto');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { passwordReset } = require('../config/auth');
const AppError = require('./AppError');

const signToken = (encodedPayload, secret) =>
  crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

const createTokenInvalidError = () =>
  new AppError('Reset password token is invalid or expired', {
    code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    statusCode: 401,
  });

const ensureSecret = (secret) => {
  if (!secret) {
    throw new AppError('Password reset secret is not configured', {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  }
};

const buildPasswordVersion = (passwordHash) =>
  crypto.createHash('sha256').update(String(passwordHash || '')).digest('hex');

const decodeTokenPayload = (encodedPayload) => {
  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch (error) {
    throw createTokenInvalidError();
  }
};

const isSignatureValid = (encodedPayload, signature, secret) => {
  const expectedSignature = signToken(encodedPayload, secret);
  const actualBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(actualBuffer, expectedBuffer);
};

const createResetPasswordToken = (
  payload,
  {
    expiresInMinutes = passwordReset.expiresInMinutes,
    issuedAt = new Date(),
    secret = passwordReset.secret,
  } = {},
) => {
  ensureSecret(secret);

  const tokenPayload = {
    email: payload.email,
    exp: Math.floor(issuedAt.getTime() / 1000) + expiresInMinutes * 60,
    nonce: crypto.randomBytes(8).toString('hex'),
    pwdv: payload.passwordVersion,
    sub: payload.userId,
    type: 'reset_password',
  };
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString(
    'base64url',
  );

  return `${encodedPayload}.${signToken(encodedPayload, secret)}`;
};

const verifyResetPasswordToken = (
  token,
  {
    now = new Date(),
    secret = passwordReset.secret,
  } = {},
) => {
  ensureSecret(secret);

  if (!token || typeof token !== 'string') {
    throw createTokenInvalidError();
  }

  const [encodedPayload, signature, ...remainingParts] = token.split('.');

  if (!encodedPayload || !signature || remainingParts.length > 0) {
    throw createTokenInvalidError();
  }

  if (!isSignatureValid(encodedPayload, signature, secret)) {
    throw createTokenInvalidError();
  }

  const tokenPayload = decodeTokenPayload(encodedPayload);

  if (
    tokenPayload?.type !== 'reset_password' ||
    !tokenPayload?.sub ||
    !tokenPayload?.email ||
    !tokenPayload?.pwdv ||
    !Number.isFinite(tokenPayload?.exp)
  ) {
    throw createTokenInvalidError();
  }

  if (tokenPayload.exp <= Math.floor(now.getTime() / 1000)) {
    throw createTokenInvalidError();
  }

  return tokenPayload;
};

module.exports = {
  buildPasswordVersion,
  createResetPasswordToken,
  verifyResetPasswordToken,
};
