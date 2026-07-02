const emailLogService = require('../services/emailLogService');

const listAdminEmailLogs = async (req, res) => {
  const data = await emailLogService.listAdminEmailLogs({
    auth: req.auth,
    query: req.query,
  });

  res.success({
    data: data.items,
    message: 'Email logs fetched successfully',
    meta: data.meta,
  });
};

const getAdminEmailLogDetail = async (req, res) => {
  const data = await emailLogService.getAdminEmailLogDetail({
    auth: req.auth,
    emailLogId: req.params.email_log_id,
  });

  res.success({
    data,
    message: 'Email log fetched successfully',
  });
};

const resendAdminEmailLog = async (req, res) => {
  const data = await emailLogService.resendAdminEmailLog({
    auth: req.auth,
    emailLogId: req.params.email_log_id,
  });

  res.success({
    data,
    message: 'Email resent successfully',
  });
};

module.exports = {
  getAdminEmailLogDetail,
  listAdminEmailLogs,
  resendAdminEmailLog,
};
