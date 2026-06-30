const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const stores = new Map();

const getStore = (storeKey) => {
  if (!stores.has(storeKey)) {
    stores.set(storeKey, new Map());
  }

  return stores.get(storeKey);
};

const clearRateLimitStore = (storeKey) => {
  if (storeKey) {
    stores.delete(storeKey);
    return;
  }

  stores.clear();
};

const createRateLimiter = ({
  keyGenerator = (req) => req.ip || 'anonymous',
  maxRequests,
  message = 'Too many requests. Please try again later.',
  storeKey = 'default',
  windowMs,
}) => (req, res, next) => {
  const store = getStore(storeKey);
  const now = Date.now();
  const key = String(keyGenerator(req) || 'anonymous');
  const entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    next();
    return;
  }

  if (entry.count >= maxRequests) {
    next(
      new AppError(message, {
        code: API_ERROR_CODES.RATE_LIMITED,
        statusCode: 429,
      }),
    );
    return;
  }

  entry.count += 1;
  next();
};

module.exports = {
  clearRateLimitStore,
  createRateLimiter,
};
