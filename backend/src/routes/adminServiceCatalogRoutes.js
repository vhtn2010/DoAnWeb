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
  updateAdminServiceInventory,
} = require('../controllers/adminServiceInventoryController');
const {
  approveAdminService,
  hideAdminService,
  rejectAdminService,
  restoreAdminService,
  submitAdminServiceReview,
  updateAdminServiceStatus,
} = require('../controllers/adminServiceWorkflowController');
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
router.patch(
  '/admin/services/:service_id/inventory',
  requireAdminAuth,
  adminCatalogRateLimit,
  asyncHandler(updateAdminServiceInventory),
);
router.post(
  '/admin/services/:service_id/submit-review',
  requireAdminAuth,
  adminCatalogRateLimit,
  asyncHandler(submitAdminServiceReview),
);
router.post(
  '/admin/services/:service_id/approve',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminCatalogRateLimit,
  asyncHandler(approveAdminService),
);
router.post(
  '/admin/services/:service_id/reject',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminCatalogRateLimit,
  asyncHandler(rejectAdminService),
);
router.post(
  '/admin/services/:service_id/hide',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminCatalogRateLimit,
  asyncHandler(hideAdminService),
);
router.post(
  '/admin/services/:service_id/restore',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminCatalogRateLimit,
  asyncHandler(restoreAdminService),
);
router.patch(
  '/admin/services/:service_id/status',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminServiceStatus),
);
router.delete(
  '/admin/services/:service_id',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  adminCatalogRateLimit,
  asyncHandler(deleteAdminService),
);

module.exports = router;
