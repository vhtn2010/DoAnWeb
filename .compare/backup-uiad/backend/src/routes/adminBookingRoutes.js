const express = require('express');
const {
  cancelAdminBooking,
  completeAdminBooking,
  confirmAdminBooking,
  expireAdminBooking,
  getAdminBookingDetail,
  getAdminBookingStatusHistory,
  listAdminBookings,
  resendAdminBookingConfirmationEmail,
  updateAdminBookingItemStatus,
  updateAdminBookingItemTravellerInfo,
  updateAdminBookingStatus,
} = require('../controllers/adminBookingController');
const {
  requireAdminAuth,
  requireAdminPermissions,
} = require('../middleware/adminAuth');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const adminBookingRateLimit = createRateLimiter({
  maxRequests: 120,
  storeKey: 'admin-booking-catalog',
  windowMs: 60 * 1000,
});
const adminBookingCommunicationRateLimit = createRateLimiter({
  keyGenerator: (req) =>
    `admin-booking-resend:${req.auth?.userId || 'anonymous'}:${req.params?.booking_id || 'unknown'}:${req.ip || 'anonymous'}`,
  maxRequests: 3,
  message: 'Too many booking confirmation email resend attempts. Please try again later.',
  storeKey: 'admin-booking-resend-confirmation-email',
  windowMs: 15 * 60 * 1000,
});

router.get(
  '/admin/bookings',
  requireAdminAuth,
  requireAdminPermissions(['booking.read_all']),
  adminBookingRateLimit,
  asyncHandler(listAdminBookings),
);

router.get(
  '/admin/bookings/:booking_id',
  requireAdminAuth,
  requireAdminPermissions(['booking.read_all']),
  adminBookingRateLimit,
  asyncHandler(getAdminBookingDetail),
);

router.get(
  '/admin/bookings/:booking_id/status-history',
  requireAdminAuth,
  requireAdminPermissions(['booking.read_all']),
  adminBookingRateLimit,
  asyncHandler(getAdminBookingStatusHistory),
);

router.patch(
  '/admin/bookings/:booking_id/status',
  requireAdminAuth,
  requireAdminPermissions(['booking.update_status']),
  adminBookingRateLimit,
  asyncHandler(updateAdminBookingStatus),
);

router.post(
  '/admin/bookings/:booking_id/confirm',
  requireAdminAuth,
  requireAdminPermissions(['booking.update_status']),
  adminBookingRateLimit,
  asyncHandler(confirmAdminBooking),
);

router.post(
  '/admin/bookings/:booking_id/complete',
  requireAdminAuth,
  requireAdminPermissions(['booking.update_status']),
  adminBookingRateLimit,
  asyncHandler(completeAdminBooking),
);

router.post(
  '/admin/bookings/:booking_id/cancel',
  requireAdminAuth,
  requireAdminPermissions(['booking.cancel']),
  adminBookingRateLimit,
  asyncHandler(cancelAdminBooking),
);

router.post(
  '/admin/bookings/:booking_id/expire',
  requireAdminAuth,
  requireAdminPermissions(['booking.update_status']),
  adminBookingRateLimit,
  asyncHandler(expireAdminBooking),
);

router.post(
  '/admin/bookings/:booking_id/resend-confirmation-email',
  requireAdminAuth,
  requireAdminPermissions(['email.resend']),
  adminBookingCommunicationRateLimit,
  asyncHandler(resendAdminBookingConfirmationEmail),
);

router.patch(
  '/admin/booking-items/:booking_item_id/status',
  requireAdminAuth,
  requireAdminPermissions(['booking.update_status']),
  adminBookingRateLimit,
  asyncHandler(updateAdminBookingItemStatus),
);

router.patch(
  '/admin/booking-items/:booking_item_id/traveller-info',
  requireAdminAuth,
  requireAdminPermissions(['booking.update_status']),
  adminBookingRateLimit,
  asyncHandler(updateAdminBookingItemTravellerInfo),
);

module.exports = router;
