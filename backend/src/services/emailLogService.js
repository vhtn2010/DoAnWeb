const {
  API_ERROR_CODES,
  EMAIL_STATUS_VALUES,
} = require('../constants/domainConstraints');
const { createEmailLogRepository } = require('../database/emailLogRepository');
const AppError = require('../utils/AppError');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_EMAIL_QUERY_LENGTH = 255;
const MAX_TEMPLATE_CODE_LENGTH = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEMPLATE_CODE_PATTERN = /^[A-Z0-9_:-]+$/i;
const EMAIL_QUERY_PATTERN = /^[A-Z0-9@._+-]+$/i;
const ADMIN_ALLOWED_ROLES = Object.freeze([
  'staff',
  'admin',
  'system_admin',
]);

const buildAppError = ({
  code,
  field,
  message,
  statusCode,
}) =>
  new AppError(message, {
    code,
    details: field
      ? [
          {
            field,
            message,
          },
        ]
      : undefined,
    statusCode,
  });

const buildValidationError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.VALIDATION_ERROR,
    field,
    message,
    statusCode: 400,
  });

const buildForbiddenError = (message = 'You do not have permission to access this resource') =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildResourceNotFoundError = (message = 'Resource not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parsePositiveInteger = ({
  defaultValue,
  field,
  max,
  value,
}) => {
  if (value == null || value === '') {
    return defaultValue;
  }

  if (Array.isArray(value) || !/^\d+$/.test(String(value))) {
    throw buildValidationError(field, `${field} must be a positive integer`);
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw buildValidationError(field, `${field} must be greater than or equal to 1`);
  }

  if (parsed > max) {
    throw buildValidationError(field, `${field} must be less than or equal to ${max}`);
  }

  return parsed;
};

const parseOptionalEnum = ({
  field,
  label,
  value,
  values,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string' || !values.includes(value)) {
    throw buildValidationError(field, `${field} must be one of: ${label.join(', ')}`);
  }

  return value;
};

const buildPaginationMeta = ({
  limit,
  page,
  total,
}) => {
  const normalizedTotal = Number(total || 0);
  const totalPages = normalizedTotal === 0
    ? 0
    : Math.ceil(normalizedTotal / limit);

  return {
    has_next: page < totalPages,
    limit,
    page,
    total: normalizedTotal,
    total_pages: totalPages,
  };
};

const normalizeAuth = (auth) => ({
  role: auth?.role || auth?.roleCode || null,
  tokenPayload: auth?.tokenPayload || null,
  userId: auth?.userId || null,
});

const normalizePermissionCodes = (auth) => {
  const rawPermissions =
    auth?.tokenPayload?.permission_codes ||
    auth?.tokenPayload?.permissionCodes ||
    auth?.tokenPayload?.permissions ||
    [];

  if (!Array.isArray(rawPermissions)) {
    return [];
  }

  return rawPermissions
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      if (entry && typeof entry === 'object' && typeof entry.code === 'string') {
        return entry.code.trim();
      }

      return null;
    })
    .filter(Boolean);
};

const ensureAdminEmailLogReadAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !ADMIN_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(actor);

  if (!permissionCodes.includes('email_log.read')) {
    throw buildForbiddenError();
  }

  return actor;
};

const parseOptionalEmailSearch = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError('to_email', 'to_email must be a valid email or safe partial search string');
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > MAX_EMAIL_QUERY_LENGTH) {
    throw buildValidationError(
      'to_email',
      `to_email must be less than or equal to ${MAX_EMAIL_QUERY_LENGTH} characters`,
    );
  }

  if (!EMAIL_QUERY_PATTERN.test(normalizedValue)) {
    throw buildValidationError('to_email', 'to_email must be a valid email or safe partial search string');
  }

  return normalizedValue;
};

const parseOptionalTemplateCode = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError('template_code', 'template_code must be a valid template code');
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  if (normalizedValue.length > MAX_TEMPLATE_CODE_LENGTH) {
    throw buildValidationError(
      'template_code',
      `template_code must be less than or equal to ${MAX_TEMPLATE_CODE_LENGTH} characters`,
    );
  }

  if (!TEMPLATE_CODE_PATTERN.test(normalizedValue)) {
    throw buildValidationError('template_code', 'template_code must be a valid template code');
  }

  return normalizedValue;
};

const parseAdminEmailLogListQuery = (query = {}) => ({
  limit: parsePositiveInteger({
    defaultValue: DEFAULT_LIMIT,
    field: 'limit',
    max: MAX_LIMIT,
    value: query.limit,
  }),
  page: parsePositiveInteger({
    defaultValue: DEFAULT_PAGE,
    field: 'page',
    max: Number.MAX_SAFE_INTEGER,
    value: query.page,
  }),
  status: parseOptionalEnum({
    field: 'status',
    label: EMAIL_STATUS_VALUES,
    value: query.status,
    values: EMAIL_STATUS_VALUES,
  }),
  templateCode: parseOptionalTemplateCode(query.template_code),
  toEmail: parseOptionalEmailSearch(query.to_email),
});

const sanitizeRecipientUser = (row) =>
  row.user_id == null
    ? null
    : {
        email: row.user_email || null,
        full_name: row.user_full_name || null,
        id: row.user_id,
      };

const sanitizeBookingSummary = (row) =>
  row.booking_id == null
    ? null
    : {
        booking_code: row.booking_code || null,
        id: row.booking_id,
      };

const sanitizeAdminEmailLogSummary = (row) => ({
  booking: sanitizeBookingSummary(row),
  created_at: row.created_at,
  id: row.id,
  provider: row.provider,
  recipient_user: sanitizeRecipientUser(row),
  sent_at: row.sent_at,
  status: row.status,
  subject: row.subject,
  template_code: row.template_code,
  to_email: row.to_email,
});

const sanitizeAdminEmailLogDetail = (row) => ({
  booking: sanitizeBookingSummary(row),
  created_at: row.created_at,
  error_message: row.error_message || null,
  id: row.id,
  provider: row.provider,
  provider_message_id: row.provider_message_id || null,
  recipient_user: sanitizeRecipientUser(row),
  sent_at: row.sent_at,
  status: row.status,
  subject: row.subject,
  template_code: row.template_code,
  to_email: row.to_email,
});

const createEmailLogService = ({
  repository = createEmailLogRepository(),
} = {}) => {
  const listAdminEmailLogs = async ({
    auth,
    query,
  } = {}) => {
    ensureAdminEmailLogReadAccess(auth);
    const parsedQuery = parseAdminEmailLogListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listAdminEmailLogs({
      limit: parsedQuery.limit,
      offset,
      status: parsedQuery.status,
      templateCode: parsedQuery.templateCode,
      toEmail: parsedQuery.toEmail,
    });

    return {
      items: result.rows.map(sanitizeAdminEmailLogSummary),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getAdminEmailLogDetail = async ({
    auth,
    emailLogId,
  } = {}) => {
    ensureAdminEmailLogReadAccess(auth);
    const parsedEmailLogId = parseUuid('email_log_id', emailLogId);
    const emailLog = await repository.getAdminEmailLogById(parsedEmailLogId);

    if (!emailLog) {
      throw buildResourceNotFoundError('Email log not found');
    }

    return sanitizeAdminEmailLogDetail(emailLog);
  };

  return {
    getAdminEmailLogDetail,
    listAdminEmailLogs,
  };
};

module.exports = Object.assign(createEmailLogService(), {
  createEmailLogService,
});
