const refundService = require('../services/refundService');

const createCustomerRefundRequest = async (req, res) => {
  const result = await refundService.createCustomerRefundRequest({
    auth: req.auth,
    body: req.body,
    bookingId: req.params.booking_id,
    headers: req.headers,
  });

  res.success({
    data: result,
    message:
      result.reused === 'idempotency'
        ? 'Refund request reused from the same Idempotency-Key'
        : 'Refund request created successfully',
    statusCode: result.created ? 201 : 200,
  });
};

const listCustomerBookingRefunds = async (req, res) => {
  const data = await refundService.listCustomerBookingRefunds({
    auth: req.auth,
    bookingId: req.params.booking_id,
  });

  res.success({
    data,
    message: 'Booking refunds retrieved successfully',
  });
};

const getCustomerRefundDetail = async (req, res) => {
  const data = await refundService.getCustomerRefundDetail({
    auth: req.auth,
    refundId: req.params.refund_id,
  });

  res.success({
    data,
    message: 'Refund detail retrieved successfully',
  });
};

const cancelCustomerRefundRequest = async (req, res) => {
  const data = await refundService.cancelCustomerRefundRequest({
    auth: req.auth,
    body: req.body,
    refundId: req.params.refund_id,
  });

  res.success({
    data,
    message: 'Refund request cancelled successfully',
  });
};

module.exports = {
  cancelCustomerRefundRequest,
  createCustomerRefundRequest,
  getCustomerRefundDetail,
  listCustomerBookingRefunds,
};
