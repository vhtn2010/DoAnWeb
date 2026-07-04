const express = require('express');
const {
  checkoutBooking,
  downloadMyBookingSummary,
  getMyBookingInvoice,
  getMyBookingDetail,
  getMyBookingItems,
  getMyBookingStatusHistory,
  listMyBookings,
  requestBookingCancellation,
  updateMyBookingContact,
} = require('../controllers/bookingController');
const asyncHandler = require('../middleware/asyncHandler');
const {
  authRequired,
  requirePermissions,
} = require('../middleware/authSession');
const createRateLimit = require('../middleware/rateLimit');

const router = express.Router();
const customerCheckoutRateLimit = createRateLimit({
  max: 20,
  windowMs: 60 * 1000,
});
const customerBookingReadRateLimit = createRateLimit({
  max: 120,
  windowMs: 60 * 1000,
});

router.get(
  '/bookings',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.read_self']),
  customerBookingReadRateLimit,
  asyncHandler(listMyBookings),
);

router.get(
  '/bookings/:booking_id',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.read_self']),
  customerBookingReadRateLimit,
  asyncHandler(getMyBookingDetail),
);

router.get(
  '/bookings/:booking_id/items',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.read_self']),
  customerBookingReadRateLimit,
  asyncHandler(getMyBookingItems),
);

router.get(
  '/bookings/:booking_id/status-history',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.read_self']),
  customerBookingReadRateLimit,
  asyncHandler(getMyBookingStatusHistory),
);

router.get(
  '/bookings/:booking_id/invoice',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.read_self']),
  customerBookingReadRateLimit,
  asyncHandler(getMyBookingInvoice),
);

router.get(
  '/bookings/:booking_id/download-summary',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.read_self']),
  customerBookingReadRateLimit,
  asyncHandler(downloadMyBookingSummary),
);

router.post(
  '/bookings/:booking_id/cancel-request',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.cancel']),
  customerCheckoutRateLimit,
  asyncHandler(requestBookingCancellation),
);

router.patch(
  '/bookings/:booking_id/contact',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.read_self']),
  customerCheckoutRateLimit,
  asyncHandler(updateMyBookingContact),
);

router.post(
  '/bookings/checkout',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.create']),
  customerCheckoutRateLimit,
  asyncHandler(checkoutBooking),
);

module.exports = router;
