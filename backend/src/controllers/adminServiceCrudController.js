const adminServiceCrudService = require('../services/adminServiceCrudService');

const createAdminService = async (req, res) => {
  const data = await adminServiceCrudService.createService({
    auth: req.auth,
    body: req.body,
  });

  res.success({
    data,
    message: 'Tạo dịch vụ thành công.',
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
    message: 'Cập nhật dịch vụ thành công.',
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
    message: 'Xóa dịch vụ thành công.',
  });
};

module.exports = {
  createAdminService,
  deleteAdminService,
  updateAdminService,
};
