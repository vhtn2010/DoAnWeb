const paymentService = require('../services/paymentService');

const setCacheHeaders = (res, seconds) => {
  res.set(
    'Cache-Control',
    `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=60`,
  );
};

const getDirectPaymentMethods = async (req, res) => {
  const data = await paymentService.getDirectPaymentMethods();

  setCacheHeaders(res, paymentService.DIRECT_PAYMENT_CACHE_SECONDS);
  res.success({
    data,
    message:
      data.methods.length > 0
        ? 'Direct payment methods retrieved successfully'
        : 'No direct payment methods are currently available',
  });
};

const createCustomerDirectPayment = async (req, res) => {
  const result = await paymentService.createCustomerDirectPayment({
    auth: req.auth,
    body: req.body,
    bookingId: req.params.booking_id,
    headers: req.headers,
  });

  res.success({
    data: result.payment,
    message:
      result.reused === 'idempotency'
        ? 'Direct payment reused from the same Idempotency-Key'
        : result.reused === 'pending'
          ? 'Existing pending direct payment returned successfully'
          : 'Direct payment created successfully',
    statusCode: result.created ? 201 : 200,
  });
};

const listCustomerBookingPayments = async (req, res) => {
  const data = await paymentService.listCustomerBookingPayments({
    auth: req.auth,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking payments retrieved successfully',
  });
};

const getCustomerPaymentDetail = async (req, res) => {
  const data = await paymentService.getCustomerPaymentDetail({
    auth: req.auth,
    paymentId: req.params.payment_id,
  });

  res.success({
    data,
    message: 'Payment detail retrieved successfully',
  });
};

const cancelCustomerPayment = async (req, res) => {
  const data = await paymentService.cancelCustomerPayment({
    auth: req.auth,
    body: req.body,
    paymentId: req.params.payment_id,
  });

  res.success({
    data,
    message: 'Payment cancelled successfully',
  });
};

const uploadCustomerPaymentProof = async (req, res) => {
  const data = await paymentService.uploadCustomerPaymentProof({
    auth: req.auth,
    body: req.body,
    paymentId: req.params.payment_id,
  });

  res.success({
    data,
    message: 'Payment proof uploaded successfully',
  });
};

const getCustomerPaymentProof = async (req, res) => {
  const data = await paymentService.getCustomerPaymentProof({
    auth: req.auth,
    paymentId: req.params.payment_id,
  });

  res.success({
    data,
    message: data.proof
      ? 'Payment proof retrieved successfully'
      : 'Payment proof is not available',
  });
};

module.exports = {
  cancelCustomerPayment,
  createCustomerDirectPayment,
  getCustomerPaymentDetail,
  getCustomerPaymentProof,
  getDirectPaymentMethods,
  listCustomerBookingPayments,
  uploadCustomerPaymentProof,
};
