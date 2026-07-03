const adminDashboardService = require('../services/adminDashboardService');

const getAdminDashboardOverview = async (req, res) => {
  const result = await adminDashboardService.getOverview({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: result.data,
    message: 'Dashboard overview retrieved successfully',
    meta: result.meta,
  });
};

const getAdminDashboardRevenueChart = async (req, res) => {
  const result = await adminDashboardService.getRevenueChart({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: result.data,
    message: 'Dashboard revenue chart retrieved successfully',
    meta: result.meta,
  });
};

const getAdminDashboardBookingChart = async (req, res) => {
  const result = await adminDashboardService.getBookingChart({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: result.data,
    message: 'Dashboard booking chart retrieved successfully',
    meta: result.meta,
  });
};

module.exports = {
  getAdminDashboardBookingChart,
  getAdminDashboardOverview,
  getAdminDashboardRevenueChart,
};
