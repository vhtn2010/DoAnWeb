const express = require('express');
const {
  getAdminPublicSettings,
  getPublicSettings,
  updateAdminPublicSettings,
} = require('../controllers/settingsController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY = 'settings-public-read';
const ADMIN_PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY = 'admin-settings-public-read';
const ADMIN_PUBLIC_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY =
  'admin-settings-public-update';

const router = express.Router();
const publicSettingsRateLimit = createRateLimiter({
  maxRequests: 60,
  storeKey: PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});
const adminPublicSettingsRateLimit = createRateLimiter({
  maxRequests: 120,
  storeKey: ADMIN_PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});
const adminPublicSettingsUpdateRateLimit = createRateLimiter({
  maxRequests: 60,
  storeKey: ADMIN_PUBLIC_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});

router.get(
  '/settings/public',
  publicSettingsRateLimit,
  asyncHandler(getPublicSettings),
);

router.get(
  '/admin/settings/public',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  adminPublicSettingsRateLimit,
  asyncHandler(getAdminPublicSettings),
);

router.patch(
  '/admin/settings/public',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  adminPublicSettingsUpdateRateLimit,
  asyncHandler(updateAdminPublicSettings),
);

module.exports = router;
module.exports.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY =
  PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY =
  ADMIN_PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_PUBLIC_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY =
  ADMIN_PUBLIC_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY;
