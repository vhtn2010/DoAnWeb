const systemService = require('../services/systemService');
const adminSystemStatsService = require('../services/adminSystemStatsService');

const getHealth = (req, res) => {
  res.success({
    data: systemService.getHealthReport(),
    message: 'Service is healthy',
  });
};

const getLiveness = (req, res) => {
  res.success({
    data: systemService.getLivenessReport(),
    message: 'Service is live',
  });
};

const getReadiness = async (req, res) => {
  const report = await systemService.getReadinessReport();

  res.success({
    data: report,
    message: report.ready
      ? 'Service is ready'
      : 'Service dependencies are not ready',
    statusCode: report.ready ? 200 : 503,
  });
};

const getVersion = (req, res) => {
  res.success({
    data: systemService.getVersionReport(),
    message: 'Version retrieved successfully',
  });
};

const getAdminSystemStats = async (req, res) => {
  const data = await adminSystemStatsService.getSystemStats({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data,
    message: 'System stats retrieved successfully',
  });
};

module.exports = {
  getAdminSystemStats,
  getHealth,
  getLiveness,
  getReadiness,
  getVersion,
};
