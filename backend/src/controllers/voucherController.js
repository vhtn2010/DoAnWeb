const voucherService = require('../services/voucherService');

const validateVoucher = async (req, res) => {
  const result = await voucherService.validateVoucher({
    payload: req.body,
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Voucher validated successfully',
  });
};

module.exports = {
  validateVoucher,
};
