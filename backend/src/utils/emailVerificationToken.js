const crypto = require('node:crypto');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { emailVerification } = require('../config/auth');
const AppError = require('./AppError');

const signToken = (encodedPayload, secret) =>
  crypto
    .createHmac('sha256', secret)
    .update(encodedPayload)
    .digest('base64url');

const createEmailVerificationToken = (
  payload,
  {
    expiresInMinutes = emailVerification.expiresInMinutes,
    issuedAt = new Date(),
    secret = emailVerification.secret,
  } = {},
) => {
  if (!secret) {
    throw new AppError('Email verification secret is not configured', {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  }

  const tokenPayload = {
    email: payload.email,
    exp:
      Math.floor(issuedAt.getTime() / 1000) + expiresInMinutes * 60,
    nonce: crypto.randomBytes(8).toString('hex'),
    sub: payload.userId,
    type: 'verify_email',
  };
  const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString(
    'base64url',
  );

  return `${encodedPayload}.${signToken(encodedPayload, secret)}`;
};

module.exports = {
  createEmailVerificationToken,
};
