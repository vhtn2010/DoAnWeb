const adminRefundService = require('../services/adminRefundService');

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
  getAdminRefundDetail,
  listAdminRefunds,
};
