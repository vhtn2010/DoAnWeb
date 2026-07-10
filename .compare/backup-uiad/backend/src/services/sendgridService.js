const {
  API_ERROR_CODES,
  DOMAIN_CONSTRAINTS,
} = require('../constants/domainConstraints');
const { ensureSendgridConfigured, sendgrid } = require('../config/sendgrid');
const AppError = require('../utils/AppError');
const {
  buildSendgridPayload,
  parseSendgridErrorResponse,
} = require('../utils/sendgrid');

const SENDGRID_MAIL_SEND_URL = 'https://api.sendgrid.com/v3/mail/send';

const fetchWithTimeout = async (url, { timeoutMs, ...options } = {}) => {
  const effectiveTimeoutMs =
    timeoutMs ||
    sendgrid.requestTimeoutMs ||
    DOMAIN_CONSTRAINTS.sendgridRequestTimeoutMs;

  return fetch(url, {
    ...options,
    signal: AbortSignal.timeout(effectiveTimeoutMs),
  });
};

const parseSendResult = async (response) => {
  if (response.ok) {
    return {
      accepted: true,
      messageId: response.headers.get('x-message-id') || null,
      provider: DOMAIN_CONSTRAINTS.emailProvider,
      statusCode: response.status,
    };
  }

  const errorPayload = await parseSendgridErrorResponse(response);

  throw new AppError(errorPayload.message, {
    code: API_ERROR_CODES.SENDGRID_SEND_FAILED,
    details: errorPayload.details,
    statusCode: 502,
  });
};

const sendEmail = async (payload, options = {}) => {
  ensureSendgridConfigured();

  const requestPayload = await buildSendgridPayload(payload, {
    defaultFrom: {
      email: sendgrid.fromEmail,
      name: sendgrid.fromName,
    },
  });
  const response = await fetchWithTimeout(SENDGRID_MAIL_SEND_URL, {
    body: JSON.stringify(requestPayload),
    headers: {
      Authorization: `Bearer ${sendgrid.apiKey}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
    timeoutMs: options.timeoutMs,
  });

  return parseSendResult(response);
};

const sendTemplateEmail = async (payload, options = {}) =>
  sendEmail(
    {
      ...payload,
      html: undefined,
      text: undefined,
    },
    options,
  );

module.exports = {
  sendEmail,
  sendTemplateEmail,
};
