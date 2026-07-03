const adminReportService = require('../services/adminReportService');

const getAdminRevenueReport = async (req, res) => {
  const data = await adminReportService.getRevenueReport({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data,
    message: 'Revenue report retrieved successfully',
  });
};

const getAdminBookingReport = async (req, res) => {
  const data = await adminReportService.getBookingReport({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data,
    message: 'Booking report retrieved successfully',
  });
};

const getAdminServiceReport = async (req, res) => {
  const data = await adminReportService.getServiceReport({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data,
    message: 'Service report retrieved successfully',
  });
};

const getAdminPaymentReport = async (req, res) => {
  const data = await adminReportService.getPaymentReport({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data,
    message: 'Payment report retrieved successfully',
  });
};

module.exports = {
  getAdminBookingReport,
  getAdminPaymentReport,
  getAdminRevenueReport,
  getAdminServiceReport,
};
