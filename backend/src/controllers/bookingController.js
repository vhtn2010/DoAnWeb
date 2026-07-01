const bookingService = require('../services/bookingService');

const requestBookingCancellation = async (req, res) => {
  const data = await bookingService.requestBookingCancellation({
    auth: req.auth,
    body: req.body,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking cancellation request submitted successfully',
  });
};

const updateMyBookingContact = async (req, res) => {
  const data = await bookingService.updateMyBookingContact({
    auth: req.auth,
    body: req.body,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking contact updated successfully',
  });
};

const getMyBookingInvoice = async (req, res) => {
  const data = await bookingService.getMyBookingInvoice({
    auth: req.auth,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking invoice fetched successfully',
  });
};

const downloadMyBookingSummary = async (req, res) => {
  const result = await bookingService.downloadMyBookingSummary({
    auth: req.auth,
    bookingId: req.params.booking_id,
  });

  res.setHeader('Content-Type', result.contentType);
  res.setHeader('Content-Disposition', result.contentDisposition);
  res.status(200).send(result.buffer);
};

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
  downloadMyBookingSummary,
  getMyBookingInvoice,
  getMyBookingDetail,
  getMyBookingItems,
  getMyBookingStatusHistory,
  listMyBookings,
  requestBookingCancellation,
  updateMyBookingContact,
};
