const express = require('express');
const {
  getAdminBusinessSettings,
  getAdminDirectPaymentSettings,
  getAdminPublicSettings,
  getPublicSettings,
  updateAdminBusinessSettings,
  updateAdminDirectPaymentSettings,
  updateAdminPublicSettings,
} = require('../controllers/settingsController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY = 'settings-public-read';
const ADMIN_PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY = 'admin-settings-public-read';
const ADMIN_PUBLIC_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY =
  'admin-settings-public-update';
const ADMIN_DIRECT_PAYMENT_SETTINGS_RATE_LIMIT_STORE_KEY =
  'admin-settings-direct-payment-read';
const ADMIN_DIRECT_PAYMENT_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY =
  'admin-settings-direct-payment-update';
const ADMIN_BUSINESS_SETTINGS_RATE_LIMIT_STORE_KEY =
  'admin-settings-business-read';
const ADMIN_BUSINESS_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY =
  'admin-settings-business-update';

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
const adminDirectPaymentSettingsRateLimit = createRateLimiter({
  maxRequests: 120,
  storeKey: ADMIN_DIRECT_PAYMENT_SETTINGS_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});
const adminDirectPaymentSettingsUpdateRateLimit = createRateLimiter({
  maxRequests: 60,
  storeKey: ADMIN_DIRECT_PAYMENT_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});
const adminBusinessSettingsRateLimit = createRateLimiter({
  maxRequests: 120,
  storeKey: ADMIN_BUSINESS_SETTINGS_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});
const adminBusinessSettingsUpdateRateLimit = createRateLimiter({
  maxRequests: 60,
  storeKey: ADMIN_BUSINESS_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY,
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

router.get(
  '/admin/settings/direct-payment',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  adminDirectPaymentSettingsRateLimit,
  asyncHandler(getAdminDirectPaymentSettings),
);

router.patch(
  '/admin/settings/direct-payment',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  adminDirectPaymentSettingsUpdateRateLimit,
  asyncHandler(updateAdminDirectPaymentSettings),
);

router.get(
  '/admin/settings/business',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  adminBusinessSettingsRateLimit,
  asyncHandler(getAdminBusinessSettings),
);

router.patch(
  '/admin/settings/business',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  adminBusinessSettingsUpdateRateLimit,
  asyncHandler(updateAdminBusinessSettings),
);

module.exports = router;
module.exports.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY =
  PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY =
  ADMIN_PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_PUBLIC_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY =
  ADMIN_PUBLIC_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_DIRECT_PAYMENT_SETTINGS_RATE_LIMIT_STORE_KEY =
  ADMIN_DIRECT_PAYMENT_SETTINGS_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_DIRECT_PAYMENT_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY =
  ADMIN_DIRECT_PAYMENT_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_BUSINESS_SETTINGS_RATE_LIMIT_STORE_KEY =
  ADMIN_BUSINESS_SETTINGS_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_BUSINESS_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY =
  ADMIN_BUSINESS_SETTINGS_UPDATE_RATE_LIMIT_STORE_KEY;
