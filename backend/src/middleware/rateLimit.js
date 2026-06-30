const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const stores = new Map();

const pruneEntries = (timestamps, now, windowMs) =>
  timestamps.filter((timestamp) => now - timestamp < windowMs);

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

  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }

  const store = stores.get(storeKey);

  return (req, res, next) => {
    const now = Date.now();
    const rateKey = keyGenerator(req);
    const recentTimestamps = pruneEntries(
      store.get(rateKey) || [],
      now,
      windowMs,
    );

    recentTimestamps.push(now);
    store.set(rateKey, recentTimestamps);

    if (recentTimestamps.length > maxRequests) {
      next(
        new AppError(message, {
          code: API_ERROR_CODES.RATE_LIMITED,
          statusCode: 429,
        }),
      );
      return;
    }

    next();
  };
};

const clearRateLimitStore = (storeKey) => {
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

module.exports = {
  clearRateLimitStore,
  createRateLimiter,
};
