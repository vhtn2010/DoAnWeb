const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { isProduction } = require('../config');
const {
  RATE_LIMIT_STORE_TYPES,
  getRateLimitConfig,
} = require('../config/rateLimit');
const AppError = require('../utils/AppError');

const stores = new Map();
let legacyStoreCounter = 0;
let redisClientPromise = null;
let redisModule = null;

const pruneEntries = (timestamps, now, windowMs) =>
  timestamps.filter((timestamp) => now - timestamp < windowMs);

const buildRateLimitBackendError = () =>
  new AppError('Rate limiting is temporarily unavailable. Please try again later.', {
    code: API_ERROR_CODES.SERVICE_UNAVAILABLE,
    statusCode: 503,
  });

const normalizeRedisStoreKey = (storeKey, rateKey, keyPrefix) =>
  `${keyPrefix}:${storeKey}:${String(rateKey || 'anonymous')}`;

const loadRedisModule = () => {
  if (redisModule) {
    return redisModule;
  }

  try {
    redisModule = require('redis');
  } catch (error) {
    throw new Error(
      'RATE_LIMIT_STORE=redis requires the "redis" package to be installed.',
    );
  }

  return redisModule;
};

const validateRateLimitConfig = () => {
  const config = getRateLimitConfig();

  if (
    !Object.values(RATE_LIMIT_STORE_TYPES).includes(config.storeType)
  ) {
    throw new Error(
      `Unsupported RATE_LIMIT_STORE "${config.storeType}". Use "memory" or "redis".`,
    );
  }

  if (isProduction && config.storeType === RATE_LIMIT_STORE_TYPES.MEMORY) {
    throw new Error(
      'In-memory rate limiting is disabled in production. Configure RATE_LIMIT_STORE=redis and RATE_LIMIT_REDIS_URL.',
    );
  }

  if (config.storeType === RATE_LIMIT_STORE_TYPES.REDIS) {
    if (!config.redisUrl) {
      throw new Error(
        'RATE_LIMIT_STORE=redis requires RATE_LIMIT_REDIS_URL or REDIS_URL.',
      );
    }

    loadRedisModule();
  }

  return config;
};

const getRedisClient = async () => {
  if (!redisClientPromise) {
    const { createClient } = loadRedisModule();
    const { redisUrl } = validateRateLimitConfig();
    const client = createClient({
      url: redisUrl,
    });

    redisClientPromise = client.connect().then(() => client).catch((error) => {
      redisClientPromise = null;
      throw error;
    });
  }

  return redisClientPromise;
};

const incrementMemoryStore = async (storeKey, rateKey, windowMs) => {
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }

  const now = Date.now();
  const store = stores.get(storeKey);
  const recentTimestamps = pruneEntries(
    store.get(rateKey) || [],
    now,
    windowMs,
  );

  recentTimestamps.push(now);
  store.set(rateKey, recentTimestamps);

  return recentTimestamps.length;
};

const incrementRedisStore = async (storeKey, rateKey, windowMs) => {
  const client = await getRedisClient();
  const { redisKeyPrefix } = validateRateLimitConfig();
  const redisKey = normalizeRedisStoreKey(storeKey, rateKey, redisKeyPrefix);
  const requestCount = await client.incr(redisKey);

  if (requestCount === 1) {
    await client.pExpire(redisKey, windowMs);
  }

  return requestCount;
};

const incrementRateLimitStore = async (storeKey, rateKey, windowMs) => {
  const config = validateRateLimitConfig();

  if (config.storeType === RATE_LIMIT_STORE_TYPES.REDIS) {
    return incrementRedisStore(storeKey, rateKey, windowMs);
  }

  return incrementMemoryStore(storeKey, rateKey, windowMs);
};

const createRateLimiter = ({
  keyGenerator = (req) => req.ip || 'anonymous',
  maxRequests,
  message = 'Too many requests. Please try again later.',
  storeKey,
  windowMs,
} = {}) => {
  if (!storeKey) {
    throw new Error('storeKey is required for createRateLimiter');
  }

  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('windowMs must be a positive number');
  }

  if (!Number.isFinite(maxRequests) || maxRequests <= 0) {
    throw new Error('maxRequests must be a positive number');
  }

  validateRateLimitConfig();

  return async (req, res, next) => {
    try {
      const rateKey = keyGenerator(req);
      const requestCount = await incrementRateLimitStore(
        storeKey,
        rateKey,
        windowMs,
      );

      if (requestCount <= maxRequests) {
        next();
        return;
      }

      next(
        new AppError(message, {
          code: API_ERROR_CODES.RATE_LIMITED,
          statusCode: 429,
        }),
      );
    } catch (error) {
      next(
        error instanceof AppError
          ? error
          : buildRateLimitBackendError(),
      );
    }
  };
};

const createRateLimit = ({
  max = 120,
  message = 'Too many requests. Please try again later.',
  windowMs = 60 * 1000,
} = {}) =>
  createRateLimiter({
    maxRequests: max,
    message,
    storeKey: `legacy-rate-limit:${legacyStoreCounter += 1}`,
    windowMs,
  });

const clearRateLimitStore = (storeKey) => {
  const { storeType } = getRateLimitConfig();

  if (storeType !== RATE_LIMIT_STORE_TYPES.MEMORY) {
    return;
  }

  if (storeKey) {
    if (stores.has(storeKey)) {
      stores.get(storeKey).clear();
    }

    return;
  }

  for (const store of stores.values()) {
    store.clear();
  }
};

module.exports = createRateLimit;
module.exports.clearRateLimitStore = clearRateLimitStore;
module.exports.createRateLimiter = createRateLimiter;
