const express = require('express');
const {
  getAdminServiceDetail,
  listAdminServices,
} = require('../controllers/adminServiceCatalogController');
const {
  createAdminService,
  deleteAdminService,
  updateAdminService,
} = require('../controllers/adminServiceCrudController');
const {
  requireAdminAuth,
  requireAdminRoles,
} = require('../middleware/adminAuth');
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
router.post(
  '/admin/services',
  requireAdminAuth,
  adminCatalogRateLimit,
  asyncHandler(createAdminService),
);
router.get(
  '/admin/services/:service_id',
  requireAdminAuth,
  adminCatalogRateLimit,
  asyncHandler(getAdminServiceDetail),
);
router.patch(
  '/admin/services/:service_id',
  requireAdminAuth,
  adminCatalogRateLimit,
  asyncHandler(updateAdminService),
);
router.delete(
  '/admin/services/:service_id',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminCatalogRateLimit,
  asyncHandler(deleteAdminService),
);

module.exports = router;
