const express = require('express');
const {
  completeBooking,
  createBookingReview,
  listServiceReviews,
} = require('../controllers/reviewController');
const asyncHandler = require('../middleware/asyncHandler');
const {
  authRequired,
  requirePermissions,
} = require('../middleware/authSession');
const createRateLimit = require('../middleware/rateLimit');

const router = express.Router();
const publicReviewRateLimit = createRateLimit({
  max: 120,
  windowMs: 60 * 1000,
});
const customerReviewRateLimit = createRateLimit({
  max: 20,
  windowMs: 60 * 1000,
});
const customerAuth = [
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['booking.read_self']),
  customerReviewRateLimit,
];

router.get(
  '/services/:service_id/reviews',
  publicReviewRateLimit,
  asyncHandler(listServiceReviews),
);
router.post(
  '/bookings/:booking_id/complete',
  ...customerAuth,
  asyncHandler(completeBooking),
);
router.post(
  '/bookings/:booking_id/reviews',
  ...customerAuth,
  asyncHandler(createBookingReview),
);

module.exports = router;
