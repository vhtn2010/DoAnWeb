const {
  API_ERROR_CODES,
  EMAIL_STATUS_VALUES,
} = require('../constants/domainConstraints');
const { SYSTEM_EMAIL_TEMPLATES } = require('../constants/emailTemplates');
const {
  apiPrefix,
  backendUrl,
  frontendUrl,
} = require('../config');
const {
  emailVerification,
  passwordReset,
} = require('../config/auth');
const { createEmailLogRepository } = require('../database/emailLogRepository');
const AppError = require('../utils/AppError');
const {
  AUTH_RESET_PASSWORD_TEMPLATE_CODE,
  AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
  AUTH_VERIFY_EMAIL_TEMPLATE_CODE,
  buildResetPasswordEmail,
  buildVerificationEmail,
} = require('./authService');
const { sendEmail } = require('./sendgridService');
const { createEmailVerificationToken } = require('../utils/emailVerificationToken');
const {
  buildPasswordVersion,
  createResetPasswordToken,
} = require('../utils/resetPasswordToken');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const DEFAULT_CURRENCY = 'VND';
const DEFAULT_STATS_RANGE_DAYS = 7;
const MAX_STATS_RANGE_DAYS = 366;
const MAX_LIMIT = 100;
const MAX_EMAIL_QUERY_LENGTH = 255;
const MAX_TEMPLATE_CODE_LENGTH = 100;
const MAIL_STATS_CACHE_TTL_MS = 60 * 1000;
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TEMPLATE_CODE_PATTERN = /^[A-Z0-9_:-]+$/i;
const EMAIL_QUERY_PATTERN = /^[A-Z0-9@._+-]+$/i;
const BOOKING_CONFIRMATION_RESEND_TEMPLATE_CODE =
  'BOOKING_CONFIRMATION_RESEND';
const ADMIN_USER_VERIFY_EMAIL_TEMPLATE_CODE = 'ADMIN_USER_VERIFY_EMAIL';
const ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE = 'ADMIN_RESEND_VERIFY_EMAIL';
const ADMIN_ALLOWED_ROLES = Object.freeze([
  'staff',
  'admin',
  'system_admin',
]);
const MAIL_STATS_ALLOWED_ROLES = Object.freeze([
  'admin',
  'system_admin',
]);
const mailStatsCacheStore = new Map();
const VERIFICATION_TEMPLATE_CODE_MAP = Object.freeze({
  [ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE]:
    ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
  [ADMIN_USER_VERIFY_EMAIL_TEMPLATE_CODE]:
    ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
  [AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE]:
    AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
  [AUTH_VERIFY_EMAIL_TEMPLATE_CODE]:
    AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
});

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

const normalizeWhitespace = (value) =>
  String(value || '')
    .replace(/\s+/g, ' ')
    .trim();

const roundMoney = (value) => {
  if (value == null) {
    return 0;
  }

  return Number(Number(value).toFixed(2));
};

const cloneMailStatsPayload = (payload) => ({
  by_status: { ...payload.by_status },
  by_template_code: { ...payload.by_template_code },
  bounced_rate: payload.bounced_rate,
  failed_rate: payload.failed_rate,
  from: payload.from,
  spam_reported_rate: payload.spam_reported_rate,
  to: payload.to,
  total: payload.total,
});

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parseEmailAddress = (field, value) => {
  if (typeof value !== 'string' || !EMAIL_ADDRESS_REGEX.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid email address`);
  }

  return value.trim().toLowerCase();
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

const parseDateQuery = ({
  field,
  rangeEdge,
  value,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid date or ISO datetime`);
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return null;
  }

  let parsed;

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    parsed = new Date(
      rangeEdge === 'start'
        ? `${normalizedValue}T00:00:00.000Z`
        : `${normalizedValue}T23:59:59.999Z`,
    );
  } else {
    parsed = new Date(normalizedValue);
  }

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid date or ISO datetime`);
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

const ensureAdminMailTemplateReadAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !ADMIN_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(actor);

  if (
    !permissionCodes.includes('email_log.read') &&
    !permissionCodes.includes('email.send')
  ) {
    throw buildForbiddenError();
  }

  return actor;
};

const ensureAdminMailStatsReadAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !MAIL_STATS_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(actor);

  if (
    !permissionCodes.includes('dashboard.read') &&
    !permissionCodes.includes('report.read') &&
    !permissionCodes.includes('email_log.read')
  ) {
    throw buildForbiddenError();
  }

  return actor;
};

const ensureAdminEmailLogResendAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !ADMIN_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(actor);

  if (
    !permissionCodes.includes('email.resend') &&
    !permissionCodes.includes('email.send')
  ) {
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

const sanitizeAdminEmailLogResendResult = ({
  sourceEmailLogId,
  emailLog,
}) => ({
  ...sanitizeAdminEmailLogDetail(emailLog),
  source_email_log_id: sourceEmailLogId,
});

const sanitizeMailTemplateMetadata = (template) => ({
  description: template.description,
  display_name: template.display_name,
  required_variables: [...template.required_variables],
  template_code: template.code,
});

const sanitizeMailStats = ({
  byStatus,
  byTemplateCode,
  from,
  to,
  total,
}) => ({
  by_status: { ...byStatus },
  by_template_code: { ...byTemplateCode },
  bounced_rate: total === 0 ? 0 : Number((byStatus.bounced / total).toFixed(4)),
  failed_rate: total === 0 ? 0 : Number((byStatus.failed / total).toFixed(4)),
  from,
  spam_reported_rate: total === 0
    ? 0
    : Number((byStatus.spam_reported / total).toFixed(4)),
  to,
  total,
});

const parseAdminMailStatsQuery = ({
  now,
  query = {},
}) => {
  const parsedFrom = parseDateQuery({
    field: 'from',
    rangeEdge: 'start',
    value: query.from,
  });
  const parsedTo = parseDateQuery({
    field: 'to',
    rangeEdge: 'end',
    value: query.to,
  });
  const effectiveTo = parsedTo || new Date(now.getTime());
  const effectiveFrom = parsedFrom || new Date(
    effectiveTo.getTime() - (DEFAULT_STATS_RANGE_DAYS * 24 * 60 * 60 * 1000),
  );

  if (effectiveFrom.getTime() > effectiveTo.getTime()) {
    throw buildValidationError('from', 'from must be less than or equal to to');
  }

  const rangeMs = effectiveTo.getTime() - effectiveFrom.getTime();
  const maxRangeMs = MAX_STATS_RANGE_DAYS * 24 * 60 * 60 * 1000;

  if (rangeMs > maxRangeMs) {
    throw buildValidationError(
      'to',
      `The requested date range must be less than or equal to ${MAX_STATS_RANGE_DAYS} days`,
    );
  }

  return {
    from: effectiveFrom,
    to: effectiveTo,
  };
};

const buildVerificationLinks = (token) => {
  const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '');
  const normalizedBackendUrl = backendUrl.replace(/\/$/, '');

  return {
    apiVerifyUrl: `${normalizedBackendUrl}${apiPrefix}/auth/verify-email`,
    verificationUrl: `${normalizedFrontendUrl}/verify-email?token=${encodeURIComponent(token)}`,
  };
};

const buildResetPasswordLinks = (token) => {
  const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '');
  const normalizedBackendUrl = backendUrl.replace(/\/$/, '');

  return {
    apiResetUrl: `${normalizedBackendUrl}${apiPrefix}/auth/reset-password`,
    resetUrl: `${normalizedFrontendUrl}/reset-password?token=${encodeURIComponent(token)}`,
  };
};

const buildBookingConfirmationResendEmail = ({
  booking,
  items,
}) => {
  const contactName = booking.contact_name || 'Quy khach';
  const itemLinesText = items.length === 0
    ? '- Khong co dich vu dinh kem'
    : items.map((item, index) => {
      const schedule = [
        item.start_at ? `bat dau: ${item.start_at}` : null,
        item.end_at ? `ket thuc: ${item.end_at}` : null,
      ]
        .filter(Boolean)
        .join(', ');

      return `${index + 1}. ${item.title_snapshot} (${item.service_type}) - SL ${item.quantity}${schedule ? ` - ${schedule}` : ''}`;
    }).join('\n');
  const itemLinesHtml = items.length === 0
    ? '<li>Khong co dich vu dinh kem</li>'
    : items.map((item) => {
      const schedule = [
        item.start_at ? `Bat dau: ${item.start_at}` : null,
        item.end_at ? `Ket thuc: ${item.end_at}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      return `<li><strong>${item.title_snapshot}</strong> (${item.service_type}) - SL ${item.quantity}${schedule ? ` - ${schedule}` : ''}</li>`;
    }).join('');

  return {
    html: [
      `<p>Xin chao ${contactName},</p>`,
      `<p>Chung toi gui lai email xac nhan booking <strong>${booking.booking_code}</strong>.</p>`,
      `<p>Trang thai booking hien tai: <strong>${booking.status}</strong></p>`,
      '<p>Danh sach dich vu:</p>',
      `<ul>${itemLinesHtml}</ul>`,
      `<p>Tam tinh: ${roundMoney(booking.subtotal_amount)} ${booking.currency || DEFAULT_CURRENCY}</p>`,
      `<p>Giam gia: ${roundMoney(booking.discount_amount)} ${booking.currency || DEFAULT_CURRENCY}</p>`,
      `<p>Tong thanh toan: <strong>${roundMoney(booking.total_amount)} ${booking.currency || DEFAULT_CURRENCY}</strong></p>`,
      '<p>Neu can ho tro them, vui long lien he bo phan CSKH.</p>',
    ].join(''),
    subject: `Booking ${booking.booking_code} - Gui lai email xac nhan`,
    text: [
      `Xin chao ${contactName},`,
      `Chung toi gui lai email xac nhan booking ${booking.booking_code}.`,
      `Trang thai booking: ${booking.status}`,
      'Danh sach dich vu:',
      itemLinesText,
      `Tam tinh: ${roundMoney(booking.subtotal_amount)} ${booking.currency || DEFAULT_CURRENCY}`,
      `Giam gia: ${roundMoney(booking.discount_amount)} ${booking.currency || DEFAULT_CURRENCY}`,
      `Tong thanh toan: ${roundMoney(booking.total_amount)} ${booking.currency || DEFAULT_CURRENCY}`,
      'Neu can ho tro them, vui long lien he bo phan CSKH.',
    ].join('\n'),
  };
};

const createEmailLogService = ({
  cacheStore = mailStatsCacheStore,
  cacheTtlMs = MAIL_STATS_CACHE_TTL_MS,
  repository = createEmailLogRepository(),
  createEmailVerificationTokenImpl = createEmailVerificationToken,
  createResetPasswordTokenImpl = createResetPasswordToken,
  now = () => new Date(),
  sendEmailImpl = sendEmail,
} = {}) => {
  const renderBookingResendEmail = async ({
    emailLog,
    sourceEmailLogId,
  }) => {
    if (!emailLog.booking_id) {
      throw buildValidationError(
        'booking_id',
        'booking_id is required to resend this email template',
      );
    }

    const booking = await repository.getBookingEmailContextById(emailLog.booking_id);

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found for this email log');
    }

    const items = await repository.listBookingItemsByBookingId(emailLog.booking_id);
    const emailContent = buildBookingConfirmationResendEmail({
      booking,
      items,
    });

    return {
      bookingId: booking.id,
      payload: emailContent,
      recipientName: normalizeWhitespace(booking.contact_name) || undefined,
      sourceEmailLogId,
      templateCode: BOOKING_CONFIRMATION_RESEND_TEMPLATE_CODE,
      toEmail: emailLog.to_email,
      userId: emailLog.user_id || booking.user_id || null,
    };
  };

  const renderVerificationResendEmail = async ({
    emailLog,
    resendTemplateCode,
    sourceEmailLogId,
  }) => {
    if (!emailLog.user_id) {
      throw buildValidationError(
        'user_id',
        'user_id is required to resend this email template',
      );
    }

    const user = await repository.getUserEmailContextById(emailLog.user_id);

    if (!user || user.deleted_at) {
      throw buildResourceNotFoundError('User not found for this email log');
    }

    const currentEmail = parseEmailAddress('user.email', user.email);

    if (currentEmail !== emailLog.to_email) {
      throw buildValidationError(
        'to_email',
        'Current user email no longer matches the original recipient',
      );
    }

    if (user.email_verified_at != null) {
      throw buildValidationError(
        'template_code',
        'Verification email can no longer be resent for a verified user',
      );
    }

    const token = createEmailVerificationTokenImpl({
      email: user.email,
      userId: user.id,
    });
    const { apiVerifyUrl, verificationUrl } = buildVerificationLinks(token);
    const emailContent = buildVerificationEmail({
      apiVerifyUrl,
      expiresInMinutes: emailVerification.expiresInMinutes,
      fullName: user.full_name || 'ban',
      token,
      verificationUrl,
    });

    return {
      bookingId: emailLog.booking_id || null,
      payload: emailContent,
      recipientName: normalizeWhitespace(user.full_name) || undefined,
      sourceEmailLogId,
      templateCode: resendTemplateCode,
      toEmail: currentEmail,
      userId: user.id,
    };
  };

  const renderResetPasswordResendEmail = async ({
    emailLog,
    sourceEmailLogId,
  }) => {
    if (!emailLog.user_id) {
      throw buildValidationError(
        'user_id',
        'user_id is required to resend this email template',
      );
    }

    const user = await repository.getUserEmailContextById(emailLog.user_id);

    if (!user || user.deleted_at) {
      throw buildResourceNotFoundError('User not found for this email log');
    }

    const currentEmail = parseEmailAddress('user.email', user.email);

    if (currentEmail !== emailLog.to_email) {
      throw buildValidationError(
        'to_email',
        'Current user email no longer matches the original recipient',
      );
    }

    if (!user.password_hash) {
      throw buildValidationError(
        'template_code',
        'Current user data is not sufficient to render this email again',
      );
    }

    const token = createResetPasswordTokenImpl({
      email: user.email,
      passwordVersion: buildPasswordVersion(user.password_hash),
      userId: user.id,
    });
    const { apiResetUrl, resetUrl } = buildResetPasswordLinks(token);
    const emailContent = buildResetPasswordEmail({
      apiResetUrl,
      expiresInMinutes: passwordReset.expiresInMinutes,
      fullName: user.full_name || 'ban',
      resetUrl,
      token,
    });

    return {
      bookingId: emailLog.booking_id || null,
      payload: emailContent,
      recipientName: normalizeWhitespace(user.full_name) || undefined,
      sourceEmailLogId,
      templateCode: AUTH_RESET_PASSWORD_TEMPLATE_CODE,
      toEmail: currentEmail,
      userId: user.id,
    };
  };

  const resolveResendEmailContext = async ({
    emailLog,
    sourceEmailLogId,
  }) => {
    if (emailLog.template_code === BOOKING_CONFIRMATION_RESEND_TEMPLATE_CODE) {
      return renderBookingResendEmail({
        emailLog,
        sourceEmailLogId,
      });
    }

    if (VERIFICATION_TEMPLATE_CODE_MAP[emailLog.template_code]) {
      return renderVerificationResendEmail({
        emailLog,
        resendTemplateCode: VERIFICATION_TEMPLATE_CODE_MAP[emailLog.template_code],
        sourceEmailLogId,
      });
    }

    if (emailLog.template_code === AUTH_RESET_PASSWORD_TEMPLATE_CODE) {
      return renderResetPasswordResendEmail({
        emailLog,
        sourceEmailLogId,
      });
    }

    throw buildValidationError(
      'template_code',
      'template_code is not supported for resend',
    );
  };

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

  const listAdminMailTemplates = async ({
    auth,
  } = {}) => {
    ensureAdminMailTemplateReadAccess(auth);

    if (!Array.isArray(SYSTEM_EMAIL_TEMPLATES)) {
      throw new AppError('System email templates are not configured', {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500,
      });
    }

    return SYSTEM_EMAIL_TEMPLATES.map(sanitizeMailTemplateMetadata);
  };

  const getAdminMailStats = async ({
    auth,
    query,
  } = {}) => {
    ensureAdminMailStatsReadAccess(auth);

    const currentTime = now();
    const parsedQuery = parseAdminMailStatsQuery({
      now: currentTime,
      query: query || {},
    });
    const cacheKey =
      `${parsedQuery.from.toISOString()}::${parsedQuery.to.toISOString()}`;
    const cachedEntry = cacheStore.get(cacheKey);

    if (
      cachedEntry &&
      (currentTime.getTime() - cachedEntry.createdAtMs) < cacheTtlMs
    ) {
      return cloneMailStatsPayload(cachedEntry.payload);
    }

    const stats = await repository.getAdminEmailStats({
      from: parsedQuery.from,
      to: parsedQuery.to,
    });
    const byStatus = EMAIL_STATUS_VALUES.reduce((accumulator, status) => {
      accumulator[status] = 0;
      return accumulator;
    }, {});

    for (const row of stats.byStatusRows) {
      if (row?.status && Object.prototype.hasOwnProperty.call(byStatus, row.status)) {
        byStatus[row.status] = Number(row.count || 0);
      }
    }

    const byTemplateCode = {};

    for (const row of stats.byTemplateRows) {
      if (!row?.template_code) {
        continue;
      }

      byTemplateCode[row.template_code] = Number(row.count || 0);
    }

    const payload = sanitizeMailStats({
      byStatus,
      byTemplateCode,
      from: parsedQuery.from.toISOString(),
      to: parsedQuery.to.toISOString(),
      total: Number(stats.total || 0),
    });

    cacheStore.set(cacheKey, {
      createdAtMs: currentTime.getTime(),
      payload,
    });

    return cloneMailStatsPayload(payload);
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

  const resendAdminEmailLog = async ({
    auth,
    emailLogId,
  } = {}) => {
    const actor = ensureAdminEmailLogResendAccess(auth);
    const parsedEmailLogId = parseUuid('email_log_id', emailLogId);
    const emailLog = await repository.getAdminEmailLogById(parsedEmailLogId);

    if (!emailLog) {
      throw buildResourceNotFoundError('Email log not found');
    }

    const sourceToEmail = parseEmailAddress('to_email', emailLog.to_email);
    const sourceTemplateCode = parseOptionalTemplateCode(emailLog.template_code);

    if (!sourceTemplateCode) {
      throw buildValidationError(
        'template_code',
        'template_code is required to resend this email',
      );
    }

    const resendContext = await resolveResendEmailContext({
      emailLog: {
        ...emailLog,
        template_code: sourceTemplateCode,
        to_email: sourceToEmail,
      },
      sourceEmailLogId: parsedEmailLogId,
    });
    const queuedEmailLog = await repository.createResendEmailLog({
      actorUserId: actor.userId,
      bookingId: resendContext.bookingId,
      sourceEmailLogId: parsedEmailLogId,
      subject: resendContext.payload.subject,
      templateCode: resendContext.templateCode,
      toEmail: resendContext.toEmail,
      userId: resendContext.userId,
    });

    try {
      const sendResult = await sendEmailImpl({
        html: resendContext.payload.html,
        subject: resendContext.payload.subject,
        text: resendContext.payload.text,
        to: {
          email: resendContext.toEmail,
          name: resendContext.recipientName,
        },
      });
      const sentEmailLog = await repository.markEmailLogSent({
        emailLogId: queuedEmailLog.id,
        messageId: sendResult?.messageId || null,
        sentAt: now(),
      });

      return sanitizeAdminEmailLogResendResult({
        emailLog: sentEmailLog,
        sourceEmailLogId: parsedEmailLogId,
      });
    } catch (error) {
      await repository.markEmailLogFailed({
        emailLogId: queuedEmailLog.id,
        errorMessage: error?.message || 'Unknown email provider error',
      });

      throw new AppError('Failed to resend email', {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500,
      });
    }
  };

  return {
    getAdminEmailLogDetail,
    getAdminMailStats,
    listAdminMailTemplates,
    listAdminEmailLogs,
    resendAdminEmailLog,
  };
};

const clearMailStatsCache = () => {
  mailStatsCacheStore.clear();
};

module.exports = Object.assign(createEmailLogService(), {
  clearMailStatsCache,
  createEmailLogService,
});
