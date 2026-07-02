const express = require('express');
const {
  cancelCustomerPayment,
  createCustomerDirectPayment,
  getCustomerPaymentDetail,
  getCustomerPaymentProof,
  getDirectPaymentMethods,
  listCustomerBookingPayments,
  uploadCustomerPaymentProof,
} = require('../controllers/paymentController');
const {
  cancelCustomerRefundRequest,
  createCustomerRefundRequest,
  getCustomerRefundDetail,
  listCustomerBookingRefunds,
} = require('../controllers/refundController');
const asyncHandler = require('../middleware/asyncHandler');
const { authRequired } = require('../middleware/authSession');
const createRateLimit = require('../middleware/rateLimit');

const router = express.Router();
const publicPaymentMethodRateLimit = createRateLimit();
const customerPaymentReadRateLimit = createRateLimit({
  max: 120,
  windowMs: 60 * 1000,
});
const customerPaymentWriteRateLimit = createRateLimit({
  max: 20,
  windowMs: 60 * 1000,
});

router.get(
  '/payment-methods/direct',
  publicPaymentMethodRateLimit,
  getDirectPaymentMethods,
);

router.post(
  '/bookings/:booking_id/direct-payments',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentWriteRateLimit,
  asyncHandler(createCustomerDirectPayment),
);

router.get(
  '/bookings/:booking_id/payments',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentReadRateLimit,
  asyncHandler(listCustomerBookingPayments),
);

router.get(
  '/payments/:payment_id',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentReadRateLimit,
  asyncHandler(getCustomerPaymentDetail),
);

router.post(
  '/payments/:payment_id/cancel',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentWriteRateLimit,
  asyncHandler(cancelCustomerPayment),
);

router.post(
  '/bookings/:booking_id/refunds',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentWriteRateLimit,
  asyncHandler(createCustomerRefundRequest),
);

router.get(
  '/bookings/:booking_id/refunds',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentReadRateLimit,
  asyncHandler(listCustomerBookingRefunds),
);

router.get(
  '/refunds/:refund_id',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentReadRateLimit,
  asyncHandler(getCustomerRefundDetail),
);

router.post(
  '/refunds/:refund_id/cancel',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentWriteRateLimit,
  asyncHandler(cancelCustomerRefundRequest),
);

router.post(
  '/payments/:payment_id/proof',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentWriteRateLimit,
  asyncHandler(uploadCustomerPaymentProof),
);

router.get(
  '/payments/:payment_id/proof',
  authRequired({ allowedRoles: ['customer'] }),
  customerPaymentReadRateLimit,
  asyncHandler(getCustomerPaymentProof),
);

module.exports = router;
