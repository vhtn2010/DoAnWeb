const crypto = require('node:crypto');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { changeEmail } = require('../config/auth');
const AppError = require('./AppError');

const signToken = (encodedPayload, secret) =>
  crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

const createTokenInvalidError = () =>
  new AppError('Change email token is invalid or expired', {
    code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    statusCode: 401,
  });

const ensureSecret = (secret) => {
  if (!secret) {
    throw new AppError('Change email secret is not configured', {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  }
};

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

const createChangeEmailToken = (
  payload,
  {
    expiresInMinutes = changeEmail.expiresInMinutes,
    issuedAt = new Date(),
    secret = changeEmail.secret,
  } = {},
) => {
  ensureSecret(secret);

  const tokenPayload = {
    current_email: payload.currentEmail,
    emlv: payload.emailVersion,
    exp: Math.floor(issuedAt.getTime() / 1000) + expiresInMinutes * 60,
    new_email: payload.newEmail,
    nonce: crypto.randomBytes(8).toString('hex'),
    sub: payload.userId,
    type: 'change_email',
  };
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString(
    'base64url',
  );

  return `${encodedPayload}.${signToken(encodedPayload, secret)}`;
};

const verifyChangeEmailToken = (
  token,
  {
    now = new Date(),
    secret = changeEmail.secret,
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
    tokenPayload?.type !== 'change_email' ||
    !tokenPayload?.sub ||
    !tokenPayload?.current_email ||
    !tokenPayload?.new_email ||
    !tokenPayload?.emlv ||
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
  createChangeEmailToken,
  verifyChangeEmailToken,
};
