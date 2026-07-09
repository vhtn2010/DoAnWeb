const adminServiceImageService = require('../services/adminServiceImageService');

const addAdminServiceImage = async (req, res) => {
  const data = await adminServiceImageService.addImage({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service image created successfully',
    statusCode: 201,
  });
};

const updateAdminServiceImage = async (req, res) => {
  const data = await adminServiceImageService.updateImage({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service image updated successfully',
  });
};

const deleteAdminServiceImage = async (req, res) => {
  const data = await adminServiceImageService.deleteImage({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service image deleted successfully',
  });
};

const reorderAdminServiceImages = async (req, res) => {
  const data = await adminServiceImageService.reorderImages({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service images reordered successfully',
  });
};

module.exports = {
  addAdminServiceImage,
  deleteAdminServiceImage,
  reorderAdminServiceImages,
  updateAdminServiceImage,
};
