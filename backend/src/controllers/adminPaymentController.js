const adminPaymentService = require('../services/adminPaymentService');

const listAdminPayments = async (req, res) => {
  const result = await adminPaymentService.listPayments({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: result.items,
    message: 'Admin payments retrieved successfully',
    meta: result.meta,
  });
};

const getAdminPaymentDetail = async (req, res) => {
  const data = await adminPaymentService.getPaymentDetail({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin payment detail retrieved successfully',
  });
};

const getAdminPaymentProof = async (req, res) => {
  const data = await adminPaymentService.getPaymentProof({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: data.proof
      ? 'Admin payment proof retrieved successfully'
      : 'Admin payment proof is not available',
  });
};

module.exports = {
  getAdminPaymentDetail,
  getAdminPaymentProof,
  listAdminPayments,
};
