const express = require('express');
const {
  getAdminServiceDetail,
  listAdminServices,
} = require('../controllers/adminServiceCatalogController');
const { requireAdminAuth } = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const adminCatalogRateLimit = createRateLimiter({
  maxRequests: 120,
  storeKey: 'admin-service-catalog',
  windowMs: 60 * 1000,
});

router.get(
  '/admin/services',
  requireAdminAuth,
  adminCatalogRateLimit,
  asyncHandler(listAdminServices),
);
router.get(
  '/admin/services/:service_id',
  requireAdminAuth,
  adminCatalogRateLimit,
  asyncHandler(getAdminServiceDetail),
);

module.exports = router;
