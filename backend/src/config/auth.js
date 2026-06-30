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

const sessionToken = {
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '30m',
  accessExpiresInSeconds: parseDurationToSeconds(
    process.env.JWT_ACCESS_EXPIRES_IN || '30m',
    1800,
  ),
  accessSecret: process.env.JWT_ACCESS_SECRET || null,
};

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

const profileRateLimit = {
  changePasswordMaxRequests: parsePositiveInt(
    process.env.PROFILE_CHANGE_PASSWORD_RATE_LIMIT_MAX_REQUESTS,
    5,
  ),
  changePasswordWindowMs: parsePositiveInt(
    process.env.PROFILE_CHANGE_PASSWORD_RATE_LIMIT_WINDOW_MS ||
      process.env.RATE_LIMIT_WINDOW_MS,
    600000,
  ),
};

module.exports = {
  passwordHash,
  profileRateLimit,
  sessionToken,
};
