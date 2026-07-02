const paymentService = require('../services/paymentService');

const setCacheHeaders = (res, seconds) => {
  res.set(
    'Cache-Control',
    `public, max-age=${seconds}, s-maxage=${seconds}, stale-while-revalidate=60`,
  );
};

const getDirectPaymentMethods = (req, res) => {
  const data = paymentService.getDirectPaymentMethods();

  setCacheHeaders(res, paymentService.DIRECT_PAYMENT_CACHE_SECONDS);
  res.success({
    data,
    message:
      data.methods.length > 0
        ? 'Direct payment methods retrieved successfully'
        : 'No direct payment methods are currently available',
  });
};

module.exports = {
  getDirectPaymentMethods,
};
