const adminTrainDetailService = require('../services/adminTrainDetailService');

const createAdminTrainDetail = async (req, res) => {
  const data = await adminTrainDetailService.createTrainDetail({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin train detail created successfully',
    statusCode: 201,
  });
};

const updateAdminTrainDetail = async (req, res) => {
  const data = await adminTrainDetailService.updateTrainDetail({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin train detail updated successfully',
  });
};

const deleteAdminTrainDetail = async (req, res) => {
  const data = await adminTrainDetailService.deleteTrainDetail({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin train detail deleted successfully',
  });
};

module.exports = {
  createAdminTrainDetail,
  deleteAdminTrainDetail,
  updateAdminTrainDetail,
};
