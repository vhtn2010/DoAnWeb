const adminVoucherService = require('../services/adminVoucherService');

const listAdminVouchers = async (req, res) => {
  const result = await adminVoucherService.getVouchers({
    actor: req.auth.user,
    query: req.query,
  });

  res.success({
    data: result.data,
    message: 'Vouchers retrieved successfully',
    meta: result.meta,
  });
};

const getAdminVoucherDetail = async (req, res) => {
  const voucher = await adminVoucherService.getVoucherById({
    actor: req.auth.user,
    voucherId: req.params.voucherId,
  });

  res.success({
    data: voucher,
    message: 'Voucher retrieved successfully',
  });
};

module.exports = {
  getAdminVoucherDetail,
  listAdminVouchers,
};
