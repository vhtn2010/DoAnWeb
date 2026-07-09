const fs = require('node:fs/promises');
const path = require('node:path');

const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const AppError = require('./AppError');

const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isPlainObject = (value) =>
  value != null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  !Buffer.isBuffer(value);

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => {
      if (entry == null) {
        return false;
      }

      if (Array.isArray(entry)) {
        return entry.length > 0;
      }

      if (isPlainObject(entry)) {
        return Object.keys(entry).length > 0;
      }

      return true;
    }),
  );

const createValidationError = (message, field) =>
  new AppError(message, {
    code: API_ERROR_CODES.INVALID_EMAIL_PAYLOAD,
    details: field
      ? [
          {
            field,
            message,
          },
        ]
      : undefined,
    statusCode: 400,
  });

const normalizeEmailString = (email, field) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();

  if (!normalizedEmail) {
    throw createValidationError('Email address is required', field);
  }

  if (!EMAIL_ADDRESS_REGEX.test(normalizedEmail)) {
    throw createValidationError('Email address is invalid', field);
  }

  return normalizedEmail;
};

const buildEmailAddress = (value, field = 'email') => {
  if (typeof value === 'string') {
    return {
      email: normalizeEmailString(value, field),
    };
  }

  if (!isPlainObject(value)) {
    throw createValidationError(
      'Email address must be a string or object',
      field,
    );
  }

  const email = normalizeEmailString(value.email, `${field}.email`);
  const name = value.name == null ? null : String(value.name).trim();

  return compactObject({
    email,
    name: name || null,
  });
};

const normalizeRecipients = (value, field = 'to', { required = true } = {}) => {
  if (value == null) {
    if (required) {
      throw createValidationError('At least one recipient is required', field);
    }

    return undefined;
  }

  const recipients = Array.isArray(value) ? value : [value];

  if (recipients.length === 0 && required) {
    throw createValidationError('At least one recipient is required', field);
  }

  return recipients.map((recipient, index) =>
    buildEmailAddress(recipient, `${field}[${index}]`),
  );
};

const normalizeStringMap = (value, field) => {
  if (value == null) {
    return undefined;
  }

  if (!isPlainObject(value)) {
    throw createValidationError('Expected an object of key-value pairs', field);
  }

  return compactObject(
    Object.entries(value).reduce((accumulator, [key, entry]) => {
      accumulator[key] = entry == null ? null : String(entry);
      return accumulator;
    }, {}),
  );
};

const normalizeCategories = (value) => {
  if (value == null) {
    return undefined;
  }

  const categories = (Array.isArray(value) ? value : [value])
    .map((entry) => String(entry).trim())
    .filter(Boolean);

  return categories.length > 0 ? categories : undefined;
};

const toBase64Content = async (attachment, field) => {
  if (attachment.contentBase64) {
    return String(attachment.contentBase64);
  }

  if (Buffer.isBuffer(attachment.buffer)) {
    return attachment.buffer.toString('base64');
  }

  if (attachment.path) {
    const fileBuffer = await fs.readFile(attachment.path);
    return fileBuffer.toString('base64');
  }

  if (Buffer.isBuffer(attachment.content)) {
    return attachment.content.toString('base64');
  }

  if (typeof attachment.content === 'string') {
    return Buffer.from(attachment.content).toString('base64');
  }

  throw createValidationError('Attachment content is required', field);
};

const normalizeAttachment = async (value, index = 0) => {
  const field = `attachments[${index}]`;

  if (!isPlainObject(value)) {
    throw createValidationError('Attachment must be an object', field);
  }

  const filename = String(value.filename || '').trim();

  if (!filename) {
    throw createValidationError('Attachment filename is required', `${field}.filename`);
  }

  let content;

  try {
    content = await toBase64Content(value, `${field}.content`);
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw createValidationError(
      `Attachment file could not be read: ${path.basename(value.path || filename)}`,
      `${field}.path`,
    );
  }

  return compactObject({
    content,
    disposition: value.disposition || 'attachment',
    filename,
    type: value.type || null,
    content_id: value.contentId || null,
  });
};

const normalizeAttachments = async (value) => {
  if (value == null) {
    return undefined;
  }

  const attachments = Array.isArray(value) ? value : [value];

  if (attachments.length === 0) {
    return undefined;
  }

  return Promise.all(
    attachments.map((attachment, index) => normalizeAttachment(attachment, index)),
  );
};

const buildSendgridPayload = async (payload = {}, options = {}) => {
  const from = buildEmailAddress(payload.from || options.defaultFrom, 'from');
  const subject = payload.subject == null ? null : String(payload.subject).trim();
  const hasTemplate = Boolean(payload.templateId);
  const text = payload.text == null ? null : String(payload.text);
  const html = payload.html == null ? null : String(payload.html);

  if (!subject && !hasTemplate) {
    throw createValidationError('subject or templateId is required', 'subject');
  }

  if (!hasTemplate && !text && !html) {
    throw createValidationError(
      'text or html content is required when templateId is missing',
      'content',
    );
  }

  const personalizations = [
    compactObject({
      to: normalizeRecipients(payload.to, 'to'),
      cc: normalizeRecipients(payload.cc, 'cc', {
        required: false,
      }),
      bcc: normalizeRecipients(payload.bcc, 'bcc', {
        required: false,
      }),
      dynamic_template_data: isPlainObject(payload.dynamicTemplateData)
        ? payload.dynamicTemplateData
        : payload.dynamicTemplateData == null
          ? undefined
          : (() => {
              throw createValidationError(
                'dynamicTemplateData must be an object',
                'dynamicTemplateData',
              );
            })(),
      custom_args: normalizeStringMap(payload.customArgs, 'customArgs'),
    }),
  ];

  const content = [];

  if (text) {
    content.push({
      type: 'text/plain',
      value: text,
    });
  }

  if (html) {
    content.push({
      type: 'text/html',
      value: html,
    });
  }

  return compactObject({
    from,
    personalizations,
    reply_to: payload.replyTo
      ? buildEmailAddress(payload.replyTo, 'replyTo')
      : undefined,
    subject: subject || null,
    content: content.length > 0 ? content : undefined,
    template_id: hasTemplate ? String(payload.templateId).trim() : undefined,
    attachments: await normalizeAttachments(payload.attachments),
    categories: normalizeCategories(payload.categories),
    headers: normalizeStringMap(payload.headers, 'headers'),
    mail_settings:
      payload.sandboxMode == null
        ? undefined
        : {
            sandbox_mode: {
              enable: Boolean(payload.sandboxMode),
            },
          },
  });
};

const parseSendgridErrorResponse = async (response) => {
  const rawBody = await response.text().catch(() => '');

  if (!rawBody) {
    return {
      details: undefined,
      message: 'SendGrid send failed',
    };
  }

  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch (error) {
    return {
      details: undefined,
      message: rawBody,
    };
  }

  const details = Array.isArray(payload.errors)
    ? payload.errors.map((entry, index) => ({
        field: entry.field || `sendgrid.errors[${index}]`,
        message: entry.help
          ? `${entry.message} (${entry.help})`
          : entry.message,
      }))
    : undefined;

  return {
    details,
    message:
      payload.errors?.[0]?.message || payload.message || 'SendGrid send failed',
  };
};

module.exports = {
  buildEmailAddress,
  buildSendgridPayload,
  normalizeAttachment,
  normalizeAttachments,
  normalizeCategories,
  normalizeRecipients,
  normalizeStringMap,
  parseSendgridErrorResponse,
};
