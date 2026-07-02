const adminPaymentService = require('../services/adminPaymentService');

const confirmAdminPayment = async (req, res) => {
  const data = await adminPaymentService.confirmPayment({
    auth: req.auth,
    body: req.body,
    headers: req.headers,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin payment confirmed successfully',
  });
};

const rejectAdminPayment = async (req, res) => {
  const data = await adminPaymentService.rejectPayment({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin payment rejected successfully',
  });
};

const expireAdminPayment = async (req, res) => {
  const data = await adminPaymentService.expirePayment({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin payment expired successfully',
  });
};

const markAdminPaymentReconciled = async (req, res) => {
  const data = await adminPaymentService.markPaymentReconciled({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin payment reconciled successfully',
  });
};

const updateAdminPaymentNote = async (req, res) => {
  const data = await adminPaymentService.updatePaymentNote({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin payment note updated successfully',
  });
};

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
  confirmAdminPayment,
  expireAdminPayment,
  getAdminPaymentDetail,
  getAdminPaymentProof,
  listAdminPayments,
  markAdminPaymentReconciled,
  rejectAdminPayment,
  updateAdminPaymentNote,
};
