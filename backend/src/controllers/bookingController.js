const bookingService = require('../services/bookingService');

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
};
