const adminFlightDetailService = require('../services/adminFlightDetailService');

const createAdminFlightDetail = async (req, res) => {
  const data = await adminFlightDetailService.createFlightDetail({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin flight detail created successfully',
    statusCode: 201,
  });
};

const updateAdminFlightDetail = async (req, res) => {
  const data = await adminFlightDetailService.updateFlightDetail({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin flight detail updated successfully',
  });
};

const deleteAdminFlightDetail = async (req, res) => {
  const data = await adminFlightDetailService.deleteFlightDetail({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin flight detail deleted successfully',
  });
};

module.exports = {
  createAdminFlightDetail,
  deleteAdminFlightDetail,
  updateAdminFlightDetail,
};
