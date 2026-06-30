const parsePositiveInt = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return fallback;
};

const parseDurationToSeconds = (value, fallback) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }

  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return fallback;
  }

  if (/^\d+$/.test(normalizedValue)) {
    return Number.parseInt(normalizedValue, 10);
  }

  const match = normalizedValue.match(/^(\d+)\s*([smhd])$/i);

  if (!match) {
    return fallback;
  }

  const amount = Number.parseInt(match[1], 10);
  const unit = match[2].toLowerCase();
  const unitToSeconds = {
    d: 86400,
    h: 3600,
    m: 60,
    s: 1,
  };

  return amount * unitToSeconds[unit];
};

const passwordHash = {
  bcryptSaltRounds: parsePositiveInt(process.env.BCRYPT_SALT_ROUNDS, 10),
};

const emailVerification = {
  expiresInMinutes: parsePositiveInt(
    process.env.EMAIL_VERIFICATION_EXPIRES_IN_MINUTES,
    1440,
  ),
  secret:
    process.env.EMAIL_VERIFICATION_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    process.env.JWT_REFRESH_SECRET ||
    null,
};

const passwordReset = {
  expiresInMinutes: parsePositiveInt(
    process.env.PASSWORD_RESET_EXPIRES_IN_MINUTES,
    30,
  ),
  secret:
    process.env.PASSWORD_RESET_SECRET ||
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    null,
};

const changeEmail = {
  expiresInMinutes: parsePositiveInt(
    process.env.CHANGE_EMAIL_EXPIRES_IN_MINUTES,
    30,
  ),
  secret:
    process.env.CHANGE_EMAIL_SECRET ||
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    null,
};

const sessionToken = {
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '30m',
  accessExpiresInSeconds: parseDurationToSeconds(
    process.env.JWT_ACCESS_EXPIRES_IN || '30m',
    1800,
  ),
  accessSecret:
    process.env.JWT_ACCESS_SECRET ||
    process.env.EMAIL_VERIFICATION_SECRET ||
    null,
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  refreshExpiresInSeconds: parseDurationToSeconds(
    process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    604800,
  ),
  refreshSecret:
    process.env.JWT_REFRESH_SECRET ||
    process.env.JWT_ACCESS_SECRET ||
    null,
};

const authRateLimit = {
  loginMaxRequests: parsePositiveInt(
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS,
    10,
  ),
  loginWindowMs: parsePositiveInt(
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS ||
      process.env.RATE_LIMIT_WINDOW_MS,
    600000,
  ),
  forgotPasswordMaxRequests: parsePositiveInt(
    process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_MAX_REQUESTS,
    5,
  ),
  forgotPasswordWindowMs: parsePositiveInt(
    process.env.AUTH_FORGOT_PASSWORD_RATE_LIMIT_WINDOW_MS ||
      process.env.RATE_LIMIT_WINDOW_MS,
    600000,
  ),
  changeEmailRequestMaxRequests: parsePositiveInt(
    process.env.AUTH_CHANGE_EMAIL_REQUEST_RATE_LIMIT_MAX_REQUESTS,
    5,
  ),
  changeEmailRequestWindowMs: parsePositiveInt(
    process.env.AUTH_CHANGE_EMAIL_REQUEST_RATE_LIMIT_WINDOW_MS ||
      process.env.RATE_LIMIT_WINDOW_MS,
    600000,
  ),
  registerMaxRequests: parsePositiveInt(
    process.env.AUTH_REGISTER_RATE_LIMIT_MAX_REQUESTS ||
      process.env.RATE_LIMIT_MAX_REQUESTS,
    10,
  ),
  registerWindowMs: parsePositiveInt(
    process.env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS ||
      process.env.RATE_LIMIT_WINDOW_MS,
    600000,
  ),
  resendVerificationMaxRequests: parsePositiveInt(
    process.env.AUTH_RESEND_VERIFICATION_RATE_LIMIT_MAX_REQUESTS,
    5,
  ),
  resendVerificationWindowMs: parsePositiveInt(
    process.env.AUTH_RESEND_VERIFICATION_RATE_LIMIT_WINDOW_MS ||
      process.env.RATE_LIMIT_WINDOW_MS,
    600000,
  ),
  resetPasswordMaxRequests: parsePositiveInt(
    process.env.AUTH_RESET_PASSWORD_RATE_LIMIT_MAX_REQUESTS,
    5,
  ),
  resetPasswordWindowMs: parsePositiveInt(
    process.env.AUTH_RESET_PASSWORD_RATE_LIMIT_WINDOW_MS ||
      process.env.RATE_LIMIT_WINDOW_MS,
    600000,
  ),
};

module.exports = {
  authRateLimit,
  changeEmail,
  emailVerification,
  passwordHash,
  passwordReset,
  sessionToken,
};
