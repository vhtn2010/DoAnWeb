const express = require('express');
const {
  checkoutBooking,
  getMyBookingDetail,
  getMyBookingItems,
  listMyBookings,
} = require('../controllers/bookingController');
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired } = require('../middleware/authSession');
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
  customerBookingReadRateLimit,
  asyncHandler(listMyBookings),
);

router.get(
  '/bookings/:booking_id',
  authRequired({ allowedRoles: ['customer'] }),
  customerBookingReadRateLimit,
  asyncHandler(getMyBookingDetail),
);

router.get(
  '/bookings/:booking_id/items',
  authRequired({ allowedRoles: ['customer'] }),
  customerBookingReadRateLimit,
  asyncHandler(getMyBookingItems),
);

router.post(
  '/bookings/checkout',
  authRequired({ allowedRoles: ['customer'] }),
  customerCheckoutRateLimit,
  asyncHandler(checkoutBooking),
);

module.exports = router;
