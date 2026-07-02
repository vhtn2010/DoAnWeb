const express = require('express');
const { getPublicSettings } = require('../controllers/settingsController');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY = 'settings-public-read';

const router = express.Router();
const publicSettingsRateLimit = createRateLimiter({
  maxRequests: 60,
  storeKey: PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});

router.get(
  '/settings/public',
  publicSettingsRateLimit,
  asyncHandler(getPublicSettings),
);

module.exports = router;
module.exports.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY =
  PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY;
