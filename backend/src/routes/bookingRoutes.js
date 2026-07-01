const express = require('express');
const { checkoutBooking } = require('../controllers/bookingController');
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired } = require('../middleware/authSession');
const createRateLimit = require('../middleware/rateLimit');

const router = express.Router();
const customerCheckoutRateLimit = createRateLimit({
  max: 20,
  windowMs: 60 * 1000,
});

router.post(
  '/bookings/checkout',
  authRequired({ allowedRoles: ['customer'] }),
  customerCheckoutRateLimit,
  asyncHandler(checkoutBooking),
);

module.exports = router;
