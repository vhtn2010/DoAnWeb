const reviewService = require('../services/reviewService');

const completeBooking = async (req, res) => {
  const data = await reviewService.completeBooking({
    auth: req.auth,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking marked as completed successfully',
  });
};

const createBookingReview = async (req, res) => {
  const data = await reviewService.createBookingReview({
    auth: req.auth,
    body: req.body,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Tour review submitted successfully',
    statusCode: 201,
  });
};

const listServiceReviews = async (req, res) => {
  const result = await reviewService.listServiceReviews({
    query: req.query,
    serviceId: req.params.service_id,
  });

  res.success({
    data: result.items,
    message: 'Tour reviews fetched successfully',
    meta: {
      ...result.meta,
      summary: result.summary,
    },
  });
};

module.exports = {
  completeBooking,
  createBookingReview,
  listServiceReviews,
};
