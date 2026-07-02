const express = require('express');
const { getDirectPaymentMethods } = require('../controllers/paymentController');
const createRateLimit = require('../middleware/rateLimit');

const router = express.Router();
const publicPaymentMethodRateLimit = createRateLimit();

router.get(
  '/payment-methods/direct',
  publicPaymentMethodRateLimit,
  getDirectPaymentMethods,
);

module.exports = router;
