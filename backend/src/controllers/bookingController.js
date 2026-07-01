const bookingService = require('../services/bookingService');

const getMyBookingDetail = async (req, res) => {
  const data = await bookingService.getMyBookingDetail({
    auth: req.auth,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking detail fetched successfully',
  });
};

const getMyBookingItems = async (req, res) => {
  const data = await bookingService.getMyBookingItems({
    auth: req.auth,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking items fetched successfully',
  });
};

const getMyBookingStatusHistory = async (req, res) => {
  const data = await bookingService.getMyBookingStatusHistory({
    auth: req.auth,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking status history fetched successfully',
  });
};

const listMyBookings = async (req, res) => {
  const data = await bookingService.listMyBookings({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: data.items,
    message: 'Bookings fetched successfully',
    meta: data.meta,
  });
};

const checkoutBooking = async (req, res) => {
  const data = await bookingService.checkout({
    auth: req.auth,
    body: req.body,
    headers: req.headers,
  });

  res.success({
    data,
    message: 'Booking checkout completed successfully',
    statusCode: 201,
  });
};

module.exports = {
  checkoutBooking,
  getMyBookingDetail,
  getMyBookingItems,
  getMyBookingStatusHistory,
  listMyBookings,
};
