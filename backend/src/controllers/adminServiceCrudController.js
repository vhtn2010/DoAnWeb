const adminServiceCrudService = require('../services/adminServiceCrudService');

const createAdminService = async (req, res) => {
  const data = await adminServiceCrudService.createService({
    auth: req.auth,
    body: req.body,
  });

  res.success({
    data,
    message: 'Admin service created successfully',
    statusCode: 201,
  });
};

const updateAdminService = async (req, res) => {
  const data = await adminServiceCrudService.updateService({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service updated successfully',
  });
};

const deleteAdminService = async (req, res) => {
  const data = await adminServiceCrudService.deleteService({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service deleted successfully',
  });
};

module.exports = {
  createAdminService,
  deleteAdminService,
  updateAdminService,
};
