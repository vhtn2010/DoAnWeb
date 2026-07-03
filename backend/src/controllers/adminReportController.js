const adminReportService = require('../services/adminReportService');
const adminReportExportService = require('../services/adminReportExportService');

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

const exportAdminReport = async (req, res) => {
  const data = await adminReportExportService.exportReport({
    auth: req.auth,
    body: req.body,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  });

  res.success({
    data,
    message: 'Report exported successfully',
  });
};

const downloadAdminReportFile = async (req, res) => {
  const file = await adminReportExportService.getLocalExportFile({
    auth: req.auth,
    fileName: req.params.file_name,
  });

  res.setHeader('Content-Type', file.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${file.fileName}"`,
  );
  res.sendFile(file.absolutePath);
};

module.exports = {
  downloadAdminReportFile,
  exportAdminReport,
  getAdminBookingReport,
  getAdminPaymentReport,
  getAdminRevenueReport,
  getAdminServiceReport,
};
