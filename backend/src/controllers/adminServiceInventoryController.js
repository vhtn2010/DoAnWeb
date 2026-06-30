const adminServiceInventoryService = require('../services/adminServiceInventoryService');

const updateAdminServiceInventory = async (req, res) => {
  const data = await adminServiceInventoryService.updateInventory({
    auth: req.auth,
    body: req.body,
    ...req.params,
  });

  res.success({
    data,
    message: 'Admin service inventory updated successfully',
  });
};

module.exports = {
  updateAdminServiceInventory,
};
