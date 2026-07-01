const adminServiceCatalogService = require('../services/adminServiceCatalogService');

const listAdminServices = async (req, res) => {
  const result = await adminServiceCatalogService.listServices({
    auth: req.auth,
    ...req.query,
  });

  res.success({
    data: result.services,
    message: 'Admin services retrieved successfully',
    meta: result.meta,
  });
};

const getAdminServiceDetail = async (req, res) => {
  const data = await adminServiceCatalogService.getServiceDetail({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service detail retrieved successfully',
  });
};

module.exports = {
  getAdminServiceDetail,
  listAdminServices,
};
