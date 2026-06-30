const express = require('express');
const {
  getPopularLocations,
  getPublicEnums,
  getServiceFilterOptions,
} = require('../controllers/lookupController');
const asyncHandler = require('../middleware/asyncHandler');
const createRateLimit = require('../middleware/rateLimit');

const router = express.Router();
const publicLookupRateLimit = createRateLimit();

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

module.exports = router;
