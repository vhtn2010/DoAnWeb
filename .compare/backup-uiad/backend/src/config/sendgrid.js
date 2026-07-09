const { sendgrid } = require('./index');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const isSendgridConfigured = () => Boolean(sendgrid.apiKey && sendgrid.fromEmail);

const ensureSendgridConfigured = () => {
  if (!isSendgridConfigured()) {
    throw new AppError('SendGrid is not configured', {
      code: API_ERROR_CODES.SENDGRID_NOT_CONFIGURED,
      statusCode: 503,
    });
  }
};

module.exports = {
  ensureSendgridConfigured,
  isSendgridConfigured,
  sendgrid,
};
