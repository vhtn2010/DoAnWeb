const express = require('express');
const {
  getAdminBookingDetail,
  listAdminBookings,
} = require('../controllers/adminBookingController');
const {
  requireAdminAuth,
} = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const adminBookingRateLimit = createRateLimiter({
  maxRequests: 120,
  storeKey: 'admin-booking-catalog',
  windowMs: 60 * 1000,
});

router.get(
  '/admin/bookings',
  requireAdminAuth,
  adminBookingRateLimit,
  asyncHandler(listAdminBookings),
);

router.get(
  '/admin/bookings/:booking_id',
  requireAdminAuth,
  adminBookingRateLimit,
  asyncHandler(getAdminBookingDetail),
);

module.exports = router;
