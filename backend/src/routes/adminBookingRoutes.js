const express = require('express');
const {
  cancelAdminBooking,
  completeAdminBooking,
  confirmAdminBooking,
  expireAdminBooking,
  getAdminBookingDetail,
  getAdminBookingStatusHistory,
  listAdminBookings,
  updateAdminBookingStatus,
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

router.get(
  '/admin/bookings/:booking_id/status-history',
  requireAdminAuth,
  adminBookingRateLimit,
  asyncHandler(getAdminBookingStatusHistory),
);

router.patch(
  '/admin/bookings/:booking_id/status',
  requireAdminAuth,
  adminBookingRateLimit,
  asyncHandler(updateAdminBookingStatus),
);

router.post(
  '/admin/bookings/:booking_id/confirm',
  requireAdminAuth,
  adminBookingRateLimit,
  asyncHandler(confirmAdminBooking),
);

router.post(
  '/admin/bookings/:booking_id/complete',
  requireAdminAuth,
  adminBookingRateLimit,
  asyncHandler(completeAdminBooking),
);

router.post(
  '/admin/bookings/:booking_id/cancel',
  requireAdminAuth,
  adminBookingRateLimit,
  asyncHandler(cancelAdminBooking),
);

router.post(
  '/admin/bookings/:booking_id/expire',
  requireAdminAuth,
  adminBookingRateLimit,
  asyncHandler(expireAdminBooking),
);

module.exports = router;
