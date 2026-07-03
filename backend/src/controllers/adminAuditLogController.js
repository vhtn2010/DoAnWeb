const adminAuditLogService = require('../services/adminAuditLogService');

const listAdminAuditLogs = async (req, res) => {
  const result = await adminAuditLogService.listAuditLogs({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: result.items,
    message: 'Audit logs retrieved successfully',
    meta: result.meta,
  });
};

const getAdminAuditLogDetail = async (req, res) => {
  const data = await adminAuditLogService.getAuditLogDetail({
    auth: req.auth,
    ...req.params,
  });

  res.success({
    data,
    message: 'Audit log detail retrieved successfully',
  });
};

module.exports = {
  getAdminAuditLogDetail,
  listAdminAuditLogs,
};
