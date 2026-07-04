const express = require('express');
const {
  createAdminCombo,
  updateAdminCombo,
} = require('../controllers/adminComboController');
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
  createAdminFlightDetail,
  deleteAdminFlightDetail,
  updateAdminFlightDetail,
} = require('../controllers/adminFlightDetailController');
const {
  createAdminTrainDetail,
  deleteAdminTrainDetail,
  updateAdminTrainDetail,
} = require('../controllers/adminTrainDetailController');
const {
  createAdminHotelRoom,
  deleteAdminHotelRoom,
  listAdminHotelRooms,
  updateAdminHotelRoom,
} = require('../controllers/adminHotelRoomController');
const {
  addAdminServiceImage,
  deleteAdminServiceImage,
  reorderAdminServiceImages,
  updateAdminServiceImage,
} = require('../controllers/adminServiceImageController');
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
  requireAdminPermissions,
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
  requireAdminPermissions(['service.read_all']),
  adminCatalogRateLimit,
  asyncHandler(listAdminServices),
);
router.post(
  '/admin/services/combos',
  requireAdminAuth,
  requireAdminPermissions(['service.create']),
  adminCatalogRateLimit,
  asyncHandler(createAdminCombo),
);
router.patch(
  '/admin/services/combos/:service_id',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminCombo),
);
router.post(
  '/admin/services',
  requireAdminAuth,
  requireAdminPermissions(['service.create']),
  adminCatalogRateLimit,
  asyncHandler(createAdminService),
);
router.get(
  '/admin/services/:service_id',
  requireAdminAuth,
  requireAdminPermissions(['service.read_all']),
  adminCatalogRateLimit,
  asyncHandler(getAdminServiceDetail),
);
router.get(
  '/admin/hotels/:hotel_service_id/rooms',
  requireAdminAuth,
  requireAdminPermissions(['service.read_all']),
  adminCatalogRateLimit,
  asyncHandler(listAdminHotelRooms),
);
router.post(
  '/admin/services/:service_id/flight-details',
  requireAdminAuth,
  requireAdminPermissions(['service.create']),
  adminCatalogRateLimit,
  asyncHandler(createAdminFlightDetail),
);
router.patch(
  '/admin/flight-details/:flight_detail_id',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminFlightDetail),
);
router.delete(
  '/admin/flight-details/:flight_detail_id',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.delete']),
  adminCatalogRateLimit,
  asyncHandler(deleteAdminFlightDetail),
);
router.post(
  '/admin/services/:service_id/train-details',
  requireAdminAuth,
  requireAdminPermissions(['service.create']),
  adminCatalogRateLimit,
  asyncHandler(createAdminTrainDetail),
);
router.patch(
  '/admin/train-details/:train_detail_id',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminTrainDetail),
);
router.delete(
  '/admin/train-details/:train_detail_id',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.delete']),
  adminCatalogRateLimit,
  asyncHandler(deleteAdminTrainDetail),
);
router.post(
  '/admin/hotels/:hotel_service_id/rooms',
  requireAdminAuth,
  requireAdminPermissions(['service.create']),
  adminCatalogRateLimit,
  asyncHandler(createAdminHotelRoom),
);
router.patch(
  '/admin/rooms/:room_type_id',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminHotelRoom),
);
router.delete(
  '/admin/rooms/:room_type_id',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.delete']),
  adminCatalogRateLimit,
  asyncHandler(deleteAdminHotelRoom),
);
router.patch(
  '/admin/services/:service_id',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminService),
);
router.patch(
  '/admin/services/:service_id/inventory',
  requireAdminAuth,
  requireAdminPermissions(['service.inventory_update']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminServiceInventory),
);
router.post(
  '/admin/services/:service_id/images',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(addAdminServiceImage),
);
router.put(
  '/admin/services/:service_id/images/reorder',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(reorderAdminServiceImages),
);
router.patch(
  '/admin/services/:service_id/images/:image_id',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminServiceImage),
);
router.delete(
  '/admin/services/:service_id/images/:image_id',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(deleteAdminServiceImage),
);
router.post(
  '/admin/services/:service_id/submit-review',
  requireAdminAuth,
  requireAdminPermissions(['service.update']),
  adminCatalogRateLimit,
  asyncHandler(submitAdminServiceReview),
);
router.post(
  '/admin/services/:service_id/approve',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.approve']),
  adminCatalogRateLimit,
  asyncHandler(approveAdminService),
);
router.post(
  '/admin/services/:service_id/reject',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.approve']),
  adminCatalogRateLimit,
  asyncHandler(rejectAdminService),
);
router.post(
  '/admin/services/:service_id/hide',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.hide']),
  adminCatalogRateLimit,
  asyncHandler(hideAdminService),
);
router.post(
  '/admin/services/:service_id/restore',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.hide']),
  adminCatalogRateLimit,
  asyncHandler(restoreAdminService),
);
router.patch(
  '/admin/services/:service_id/status',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.hide']),
  adminCatalogRateLimit,
  asyncHandler(updateAdminServiceStatus),
);
router.delete(
  '/admin/services/:service_id',
  requireAdminAuth,
  requireAdminRoles(['admin', 'system_admin']),
  requireAdminPermissions(['service.delete']),
  adminCatalogRateLimit,
  asyncHandler(deleteAdminService),
);
module.exports = router;
