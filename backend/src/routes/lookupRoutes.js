const express = require('express');
const {
  getFeaturedServices,
  getPopularLocations,
  getPublicEnums,
  getServiceAvailability,
  getServiceDetail,
  getServiceFilterOptions,
  getServiceImages,
  getServices,
} = require('../controllers/lookupController');
const asyncHandler = require('../middleware/asyncHandler');
const createRateLimit = require('../middleware/rateLimit');

const router = express.Router();
const publicLookupRateLimit = createRateLimit();
const publicSearchRateLimit = createRateLimit({
  max: 60,
  windowMs: 60 * 1000,
});

router.get('/lookups/enums', publicLookupRateLimit, getPublicEnums);
router.get(
  '/locations/popular',
  publicLookupRateLimit,
  asyncHandler(getPopularLocations),
);
router.get(
  '/services/filter-options',
  publicLookupRateLimit,
  asyncHandler(getServiceFilterOptions),
);
router.get(
  '/services/featured',
  publicSearchRateLimit,
  asyncHandler(getFeaturedServices),
);
router.get(
  '/services',
  publicSearchRateLimit,
  asyncHandler(getServices),
);
router.get(
  '/services/:service_id/images',
  publicSearchRateLimit,
  asyncHandler(getServiceImages),
);
router.get(
  '/services/:slug',
  publicSearchRateLimit,
  asyncHandler(getServiceDetail),
);
router.post(
  '/services/:service_id/availability',
  publicSearchRateLimit,
  asyncHandler(getServiceAvailability),
);

module.exports = router;
