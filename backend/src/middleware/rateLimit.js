const { API_ERROR_CODES } = require('../constants/domainConstraints');

const DEFAULT_MAX_REQUESTS = 120;
const DEFAULT_WINDOW_MS = 60 * 1000;

const cleanupExpiredEntries = (store, now) => {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
};

const createRateLimit = ({
  max = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
} = {}) => {
  const store = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket?.remoteAddress || 'anonymous';

    if (store.size > max * 2) {
      cleanupExpiredEntries(store, now);
    }

    const current = store.get(key);

    if (!current || current.resetAt <= now) {
      store.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      next();
      return;
    }

    current.count += 1;

    if (current.count > max) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1000),
      );

      res.set('Retry-After', String(retryAfterSeconds));
      res.error({
        code: API_ERROR_CODES.RATE_LIMITED,
        details: [
          {
            field: 'request',
            message: `Too many requests. Retry after ${retryAfterSeconds} second(s).`,
          },
        ],
        message: 'Too many requests',
        statusCode: 429,
      });
      return;
    }

    next();
  };
};

module.exports = createRateLimit;
