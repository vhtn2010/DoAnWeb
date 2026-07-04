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
const {
  authRequired,
  requirePermissions,
} = require('../middleware/authSession');
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
  asyncHandler(getDirectPaymentMethods),
);

router.post(
  '/bookings/:booking_id/direct-payments',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['payment.create_direct']),
  customerPaymentWriteRateLimit,
  asyncHandler(createCustomerDirectPayment),
);

router.get(
  '/bookings/:booking_id/payments',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['payment.read_self']),
  customerPaymentReadRateLimit,
  asyncHandler(listCustomerBookingPayments),
);

router.get(
  '/payments/:payment_id',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['payment.read_self']),
  customerPaymentReadRateLimit,
  asyncHandler(getCustomerPaymentDetail),
);

router.post(
  '/payments/:payment_id/cancel',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['payment.create_direct']),
  customerPaymentWriteRateLimit,
  asyncHandler(cancelCustomerPayment),
);

router.post(
  '/bookings/:booking_id/refunds',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['refund.request']),
  customerPaymentWriteRateLimit,
  asyncHandler(createCustomerRefundRequest),
);

router.get(
  '/bookings/:booking_id/refunds',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['refund.read_self']),
  customerPaymentReadRateLimit,
  asyncHandler(listCustomerBookingRefunds),
);

router.get(
  '/refunds/:refund_id',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['refund.read_self']),
  customerPaymentReadRateLimit,
  asyncHandler(getCustomerRefundDetail),
);

router.post(
  '/refunds/:refund_id/cancel',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['refund.read_self']),
  customerPaymentWriteRateLimit,
  asyncHandler(cancelCustomerRefundRequest),
);

router.post(
  '/payments/:payment_id/proof',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['payment.create_direct']),
  customerPaymentWriteRateLimit,
  asyncHandler(uploadCustomerPaymentProof),
);

router.get(
  '/payments/:payment_id/proof',
  authRequired({ allowedRoles: ['customer'] }),
  requirePermissions(['payment.read_self']),
  customerPaymentReadRateLimit,
  asyncHandler(getCustomerPaymentProof),
);

module.exports = router;
