const parsePositiveInt = (value, fallback) => {
  const parsedValue = Number.parseInt(value, 10);

  if (Number.isFinite(parsedValue) && parsedValue > 0) {
    return parsedValue;
  }

  return fallback;
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

const authRateLimit = {
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
};

module.exports = {
  authRateLimit,
  emailVerification,
  passwordHash,
};
