const adminComboService = require('../services/adminComboService');

const createAdminCombo = async (req, res) => {
  const data = await adminComboService.createCombo({
    auth: req.auth,
    body: req.body,
  });

  res.success({
    data,
    message: 'Admin combo created successfully',
    statusCode: 201,
  });
};

const updateAdminCombo = async (req, res) => {
  const data = await adminComboService.updateCombo({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin combo updated successfully',
  });
};

module.exports = {
  createAdminCombo,
  updateAdminCombo,
};
