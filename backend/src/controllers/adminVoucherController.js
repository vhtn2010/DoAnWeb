const adminVoucherService = require('../services/adminVoucherService');

const createAdminVoucher = async (req, res) => {
  const voucher = await adminVoucherService.createVoucher({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: voucher,
    message: 'Voucher created successfully',
    statusCode: 201,
  });
};

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

const updateAdminVoucher = async (req, res) => {
  const voucher = await adminVoucherService.updateVoucher({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    voucherId: req.params.voucherId,
  });

  res.success({
    data: voucher,
    message: 'Voucher updated successfully',
  });
};

const changeAdminVoucherStatus = async (req, res) => {
  const voucher = await adminVoucherService.changeVoucherStatus({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    voucherId: req.params.voucherId,
  });

  res.success({
    data: voucher,
    message: 'Voucher status updated successfully',
  });
};

const deleteAdminVoucher = async (req, res) => {
  const result = await adminVoucherService.deleteVoucher({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    voucherId: req.params.voucherId,
  });

  res.success({
    data: result,
    message: 'Voucher deleted successfully',
  });
};

const duplicateAdminVoucher = async (req, res) => {
  const voucher = await adminVoucherService.duplicateVoucher({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
    voucherId: req.params.voucherId,
  });

  res.success({
    data: voucher,
    message: 'Voucher duplicated successfully',
    statusCode: 201,
  });
};

module.exports = {
  createAdminVoucher,
  changeAdminVoucherStatus,
  deleteAdminVoucher,
  duplicateAdminVoucher,
  getAdminVoucherDetail,
  listAdminVouchers,
  updateAdminVoucher,
};
