const adminServiceWorkflowService = require('../services/adminServiceWorkflowService');

const submitAdminServiceReview = async (req, res) => {
  const data = await adminServiceWorkflowService.submitReview({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service submitted for review successfully',
  });
};

const approveAdminService = async (req, res) => {
  const data = await adminServiceWorkflowService.approveService({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service approved successfully',
  });
};

const rejectAdminService = async (req, res) => {
  const data = await adminServiceWorkflowService.rejectService({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service rejected successfully',
  });
};

const hideAdminService = async (req, res) => {
  const data = await adminServiceWorkflowService.hideService({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service hidden successfully',
  });
};

const restoreAdminService = async (req, res) => {
  const data = await adminServiceWorkflowService.restoreService({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service restored successfully',
  });
};

const updateAdminServiceStatus = async (req, res) => {
  const data = await adminServiceWorkflowService.updateStatus({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service status updated successfully',
  });
};

module.exports = {
  approveAdminService,
  hideAdminService,
  rejectAdminService,
  restoreAdminService,
  submitAdminServiceReview,
  updateAdminServiceStatus,
};
