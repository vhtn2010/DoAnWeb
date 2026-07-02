const adminRefundService = require('../services/adminRefundService');

const approveAdminRefund = async (req, res) => {
  const data = await adminRefundService.approveRefund({
    auth: req.auth,
    body: req.body,
    headers: req.headers,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin refund approved successfully',
  });
};

const rejectAdminRefund = async (req, res) => {
  const data = await adminRefundService.rejectRefund({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin refund rejected successfully',
  });
};

const listAdminRefunds = async (req, res) => {
  const result = await adminRefundService.listRefunds({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: result.items,
    message: 'Admin refunds retrieved successfully',
    meta: result.meta,
  });
};

const getAdminRefundDetail = async (req, res) => {
  const data = await adminRefundService.getRefundDetail({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin refund detail retrieved successfully',
  });
};

module.exports = {
  approveAdminRefund,
  getAdminRefundDetail,
  listAdminRefunds,
  rejectAdminRefund,
};
