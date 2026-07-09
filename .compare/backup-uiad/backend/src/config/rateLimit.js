const { isProduction } = require('./index');

const RATE_LIMIT_STORE_TYPES = Object.freeze({
  MEMORY: 'memory',
  REDIS: 'redis',
});

const getRateLimitStoreType = () => {
  const configuredStoreType = process.env.RATE_LIMIT_STORE;

  if (configuredStoreType == null || configuredStoreType === '') {
    return isProduction
      ? RATE_LIMIT_STORE_TYPES.REDIS
      : RATE_LIMIT_STORE_TYPES.MEMORY;
  }

  return String(configuredStoreType).trim().toLowerCase();
};

const getRateLimitConfig = () => ({
  redisKeyPrefix:
    process.env.RATE_LIMIT_REDIS_KEY_PREFIX || 'net-viet-travel:rate-limit',
  redisUrl: process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL || null,
  storeType: getRateLimitStoreType(),
});

module.exports = {
  RATE_LIMIT_STORE_TYPES,
  getRateLimitConfig,
};
