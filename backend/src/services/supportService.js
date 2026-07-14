const crypto = require('node:crypto');
const {
  API_ERROR_CODES,
  DOMAIN_CONSTRAINTS,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_PRIORITY_VALUES,
  SUPPORT_TICKET_STATUS,
  SUPPORT_TICKET_STATUS_VALUES,
  SENDER_TYPE,
} = require('../constants/domainConstraints');
const { createSupportRepository } = require('../database/supportRepository');
const { sendEmail } = require('./sendgridService');
const AppError = require('../utils/AppError');
const {
  escapeHtml,
  renderEmailInfoRows,
  renderEmailLayout,
  renderEmailSection,
} = require('../utils/emailTemplate');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INLINE_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const MULTILINE_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/;
const DEFAULT_LIST_LIMIT = 20;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_LIST_LIMIT = 50;
const MAX_ADMIN_LIST_LIMIT = 100;
const MAX_TICKET_CODE_ATTEMPTS = 3;
const DEFAULT_LIST_PAGE = 1;
const SUPPORT_MANUAL_EMAIL_TEMPLATE_CODE = 'SUPPORT_MANUAL_EMAIL';
const SUPPORT_MANUAL_EMAIL_RATE_LIMIT_MAX_REQUESTS = 3;
const SUPPORT_MANUAL_EMAIL_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const supportManualEmailRateLimitStore = new Map();
const CUSTOMER_REPLY_ALLOWED_STATUSES = Object.freeze([
  SUPPORT_TICKET_STATUS.OPEN,
  'assigned',
  'waiting_customer',
  'waiting_staff',
  'resolved',
]);
const ADMIN_SUPPORT_ALLOWED_ROLES = Object.freeze([
  'staff',
  'admin',
  'system_admin',
]);
const ADMIN_SUPPORT_ASSIGN_ALLOWED_STATUSES = Object.freeze([
  SUPPORT_TICKET_STATUS.ASSIGNED,
  SUPPORT_TICKET_STATUS.WAITING_CUSTOMER,
  SUPPORT_TICKET_STATUS.WAITING_STAFF,
  SUPPORT_TICKET_STATUS.RESOLVED,
]);
const ADMIN_ASSIGNABLE_ROLE_CODES = Object.freeze([
  'staff',
  'admin',
  'system_admin',
]);
const ADMIN_SUPPORT_REPLY_ALLOWED_STATUSES = Object.freeze([
  SUPPORT_TICKET_STATUS.OPEN,
  SUPPORT_TICKET_STATUS.ASSIGNED,
  SUPPORT_TICKET_STATUS.WAITING_CUSTOMER,
  SUPPORT_TICKET_STATUS.WAITING_STAFF,
  SUPPORT_TICKET_STATUS.RESOLVED,
]);
const ADMIN_SUPPORT_CLOSE_ALLOWED_STATUSES = Object.freeze([
  SUPPORT_TICKET_STATUS.OPEN,
  SUPPORT_TICKET_STATUS.ASSIGNED,
  SUPPORT_TICKET_STATUS.WAITING_CUSTOMER,
  SUPPORT_TICKET_STATUS.WAITING_STAFF,
  SUPPORT_TICKET_STATUS.RESOLVED,
]);
const ADMIN_SUPPORT_REOPEN_ALLOWED_STATUSES = Object.freeze([
  SUPPORT_TICKET_STATUS.CLOSED,
  SUPPORT_TICKET_STATUS.RESOLVED,
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

const buildInvalidStateTransitionError = (message) =>
  new AppError(message || 'The requested support ticket state transition is not allowed', {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const buildRateLimitedError = (
  message = 'Too many support emails have been sent for this ticket recipient. Please try again later.',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.RATE_LIMITED,
    statusCode: 429,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();
const pruneRateLimitEntries = (timestamps, nowMs) =>
  timestamps.filter((timestamp) => nowMs - timestamp < SUPPORT_MANUAL_EMAIL_RATE_LIMIT_WINDOW_MS);

const parseUuid = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parseOptionalTicketStatus = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(
      'status',
      `status must be one of: ${SUPPORT_TICKET_STATUS_VALUES.join(', ')}`,
    );
  }

  if (!SUPPORT_TICKET_STATUS_VALUES.includes(value)) {
    throw buildValidationError(
      'status',
      `status must be one of: ${SUPPORT_TICKET_STATUS_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseOptionalTicketPriority = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(
      'priority',
      `priority must be one of: ${SUPPORT_TICKET_PRIORITY_VALUES.join(', ')}`,
    );
  }

  if (!SUPPORT_TICKET_PRIORITY_VALUES.includes(value)) {
    throw buildValidationError(
      'priority',
      `priority must be one of: ${SUPPORT_TICKET_PRIORITY_VALUES.join(', ')}`,
    );
  }

  return value;
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
    throw buildValidationError(
      field,
      `${field} must be greater than or equal to 1`,
    );
  }

  if (parsed > max) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${max}`,
    );
  }

  return parsed;
};

const parseRequiredInlineString = ({
  field,
  maxLength,
  value,
}) => {
  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} is required`);
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    throw buildValidationError(field, `${field} is required`);
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${maxLength} characters`,
    );
  }

  if (INLINE_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseOptionalInlineString = ({
  field,
  maxLength,
  value,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a string`);
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${maxLength} characters`,
    );
  }

  if (INLINE_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseRequiredMessage = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError('message', 'message is required');
  }

  const normalized = value.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    throw buildValidationError('message', 'message is required');
  }

  if (normalized.length > MAX_MESSAGE_LENGTH) {
    throw buildValidationError(
      'message',
      `message must be less than or equal to ${MAX_MESSAGE_LENGTH} characters`,
    );
  }

  if (MULTILINE_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError('message', 'message contains unsupported characters');
  }

  return normalized;
};

const parseOptionalMessage = ({
  field,
  maxLength = 2000,
  value,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a string`);
  }

  const normalized = value.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${maxLength} characters`,
    );
  }

  if (MULTILINE_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseOptionalEmail = (field, value) => {
  const email = parseOptionalInlineString({
    field,
    maxLength: 255,
    value,
  });

  if (!email) {
    return null;
  }

  const normalized = email.toLowerCase();

  if (!EMAIL_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} must be a valid email address`);
  }

  return normalized;
};

const parseOptionalPhone = (value) => {
  const phone = parseOptionalInlineString({
    field: 'customer_phone',
    maxLength: 20,
    value,
  });

  if (!phone) {
    return null;
  }

  if (!PHONE_PATTERN.test(phone)) {
    throw buildValidationError(
      'customer_phone',
      'customer_phone must be a valid phone number',
    );
  }

  return phone;
};

const buildTicketCode = (now = new Date()) => {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();

  return `TK${datePart}${randomPart}`;
};

const sanitizeTicketResponse = ({
  reply,
  ticket,
}) => ({
  assigned_to: ticket.assigned_to,
  booking_id: ticket.booking_id,
  closed_at: ticket.closed_at,
  created_at: ticket.created_at,
  customer_email: ticket.customer_email,
  customer_name: ticket.customer_name,
  customer_phone: ticket.customer_phone,
  first_reply: {
    created_at: reply.created_at,
    id: reply.id,
    is_internal_note: reply.is_internal_note,
    message: reply.message,
    sender_type: reply.sender_type,
  },
  id: ticket.id,
  priority: ticket.priority,
  service_id: ticket.service_id,
  status: ticket.status,
  subject: ticket.subject,
  ticket_code: ticket.ticket_code,
  updated_at: ticket.updated_at,
  user_id: ticket.user_id,
});

const sanitizeBookingSummary = (ticket) => {
  if (!ticket.booking_id) {
    return null;
  }

  return {
    booking_code: ticket.booking_code || null,
    id: ticket.booking_id,
    status: ticket.booking_status || null,
  };
};

const sanitizeServiceSummary = (ticket) => {
  if (!ticket.service_id) {
    return null;
  }

  return {
    id: ticket.service_id,
    service_type: ticket.service_type || null,
    slug: ticket.service_slug || null,
    title: ticket.service_title || null,
  };
};

const sanitizeCustomerTicketSummary = (ticket) => ({
  booking: sanitizeBookingSummary(ticket),
  closed_at: ticket.closed_at,
  created_at: ticket.created_at,
  id: ticket.id,
  priority: ticket.priority,
  service: sanitizeServiceSummary(ticket),
  status: ticket.status,
  subject: ticket.subject,
  ticket_code: ticket.ticket_code,
  updated_at: ticket.updated_at,
});

const sanitizeAdminTicketSummary = (ticket) => ({
  assigned_to: ticket.assigned_to
    ? {
        full_name: ticket.assigned_user_full_name || null,
        id: ticket.assigned_to,
        role_code: ticket.assigned_user_role_code || null,
      }
    : null,
  booking: sanitizeBookingSummary(ticket),
  closed_at: ticket.closed_at,
  created_at: ticket.created_at,
  customer: {
    email: ticket.customer_email || ticket.customer_user_email || null,
    full_name: ticket.customer_name || ticket.customer_user_full_name || null,
    id: ticket.user_id || null,
    phone: ticket.customer_phone || ticket.customer_user_phone || null,
  },
  id: ticket.id,
  priority: ticket.priority,
  service: sanitizeServiceSummary(ticket),
  status: ticket.status,
  subject: ticket.subject,
  ticket_code: ticket.ticket_code,
  updated_at: ticket.updated_at,
});

const sanitizeTicketReply = (reply) => ({
  created_at: reply.created_at,
  id: reply.id,
  message: reply.message,
  sender_type: reply.sender_type,
});

const sanitizeAdminTicketReply = (reply) => ({
  created_at: reply.created_at,
  id: reply.id,
  is_internal_note: Boolean(reply.is_internal_note),
  message: reply.message,
  sender: reply.sender_id
    ? {
        full_name: reply.sender_full_name || null,
        id: reply.sender_id,
        role_code: reply.sender_role_code || null,
        type: reply.sender_type,
      }
    : {
        full_name: null,
        id: null,
        role_code: null,
        type: reply.sender_type || SENDER_TYPE.SYSTEM,
      },
});

const sanitizeTicketDetail = ({
  replies,
  ticket,
}) => ({
  booking: sanitizeBookingSummary(ticket),
  closed_at: ticket.closed_at,
  created_at: ticket.created_at,
  customer_email: ticket.customer_email,
  customer_name: ticket.customer_name,
  customer_phone: ticket.customer_phone,
  id: ticket.id,
  priority: ticket.priority,
  replies: replies.map(sanitizeTicketReply),
  service: sanitizeServiceSummary(ticket),
  status: ticket.status,
  subject: ticket.subject,
  ticket_code: ticket.ticket_code,
  updated_at: ticket.updated_at,
});

const sanitizeAdminTicketDetail = ({
  replies,
  ticket,
}) => ({
  assigned_to: ticket.assigned_to
    ? {
        full_name: ticket.assigned_user_full_name || null,
        id: ticket.assigned_to,
        role_code: ticket.assigned_user_role_code || null,
      }
    : null,
  booking: sanitizeBookingSummary(ticket),
  closed_at: ticket.closed_at,
  created_at: ticket.created_at,
  customer: {
    email: ticket.customer_email || ticket.customer_user_email || null,
    full_name: ticket.customer_name || ticket.customer_user_full_name || null,
    id: ticket.user_id || null,
    phone: ticket.customer_phone || ticket.customer_user_phone || null,
  },
  id: ticket.id,
  priority: ticket.priority,
  replies: replies.map(sanitizeAdminTicketReply),
  service: sanitizeServiceSummary(ticket),
  status: ticket.status,
  subject: ticket.subject,
  ticket_code: ticket.ticket_code,
  updated_at: ticket.updated_at,
});

const sanitizeAdminTicketMutationResult = (ticket) => ({
  assigned_to: ticket.assigned_to || null,
  closed_at: ticket.closed_at,
  id: ticket.id,
  priority: ticket.priority,
  status: ticket.status,
  ticket_code: ticket.ticket_code,
  updated_at: ticket.updated_at,
});

const sanitizeAdminReplyMutationResult = ({
  reply,
  ticket,
}) => ({
  reply: sanitizeAdminTicketReply(reply),
  ticket: sanitizeAdminTicketMutationResult(ticket),
});

const sanitizeCustomerReplyResult = ({
  reply,
  ticket,
}) => ({
  reply: sanitizeTicketReply(reply),
  ticket: {
    closed_at: ticket.closed_at,
    id: ticket.id,
    status: ticket.status,
    ticket_code: ticket.ticket_code,
    updated_at: ticket.updated_at,
  },
});

const sanitizeCustomerCloseResult = ({
  reasonReply,
  ticket,
}) => ({
  close_reason_reply: reasonReply ? sanitizeTicketReply(reasonReply) : null,
  closed_at: ticket.closed_at,
  id: ticket.id,
  status: ticket.status,
  ticket_code: ticket.ticket_code,
  updated_at: ticket.updated_at,
});

const sanitizeAdminSupportEmailResult = ({
  emailLog,
  recipientSource,
  ticket,
}) => ({
  booking_id: emailLog.booking_id || null,
  email_log_id: emailLog.id,
  provider: emailLog.provider || DOMAIN_CONSTRAINTS.emailProvider,
  recipient_source: recipientSource,
  recipient_user_id: emailLog.user_id || null,
  sent_at: emailLog.sent_at || null,
  status: emailLog.status,
  template_code: emailLog.template_code,
  ticket_id: ticket.id,
  ticket_code: ticket.ticket_code,
  to_email: emailLog.to_email,
});

const normalizeStoredEmailCandidate = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized || !EMAIL_PATTERN.test(normalized)) {
    return null;
  }

  return normalized;
};

const resolveSupportManualEmailRecipient = (ticket) => {
  const userEmail = normalizeStoredEmailCandidate(ticket?.customer_user_email);
  const customerEmail = normalizeStoredEmailCandidate(ticket?.customer_email);

  if (ticket?.user_id) {
    if (userEmail) {
      return {
        email: userEmail,
        source: 'user',
      };
    }

    if (customerEmail) {
      return {
        email: customerEmail,
        source: 'ticket',
      };
    }
  }

  if (customerEmail) {
    return {
      email: customerEmail,
      source: 'ticket',
    };
  }

  if (userEmail) {
    return {
      email: userEmail,
      source: 'user',
    };
  }

  return null;
};

const normalizeNowValue = (value) => {
  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }

  return parsed;
};

const enforceSupportManualEmailRateLimit = ({
  recipientEmail,
  ticketId,
  timestamp,
}) => {
  const nowMs = normalizeNowValue(timestamp).getTime();
  const rateLimitKey = `${ticketId}:${recipientEmail}`;
  const recentTimestamps = pruneRateLimitEntries(
    supportManualEmailRateLimitStore.get(rateLimitKey) || [],
    nowMs,
  );

  recentTimestamps.push(nowMs);
  supportManualEmailRateLimitStore.set(rateLimitKey, recentTimestamps);

  if (recentTimestamps.length > SUPPORT_MANUAL_EMAIL_RATE_LIMIT_MAX_REQUESTS) {
    throw buildRateLimitedError();
  }
};

const buildSupportManualEmailContent = ({
  message,
  subject,
  ticket,
}) => {
  const customerName =
    ticket.customer_name ||
    ticket.customer_user_full_name ||
    'customer';
  const escapedMessage = escapeHtml(message).replace(/\n/g, '<br />');
  const ticketCode = ticket.ticket_code || ticket.id;

  return {
    html: renderEmailLayout({
      badge: 'Hỗ trợ khách hàng',
      body: [
        renderEmailSection({
          title: 'Thông tin yêu cầu',
          children: renderEmailInfoRows([
            {
              label: 'Ticket',
              value: ticket.ticket_code || ticket.id,
            },
            {
               label: 'Chủ đề',
              value: subject,
            },
          ]),
        }),
        renderEmailSection({
          title: 'Nội dung từ đội ngũ hỗ trợ',
          children: [
            '<div style="padding:16px;border:1px solid #d1d5db;border-radius:12px;background:#ffffff;color:#1f2937;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;">',
            escapedMessage,
            '</div>',
          ].join(''),
        }),
      ].join(''),
      footerNote:
        'Nếu cần thêm hỗ trợ, vui lòng phản hồi qua kênh chăm sóc khách hàng của chúng tôi.',
      greeting: `Xin chào ${customerName},`,
      intro: [
        'Đây là email hỗ trợ thủ công từ đội ngũ Net Viet Travel.',
        `Ticket ${ticketCode} đang được theo dõi bởi bộ phận chăm sóc khách hàng.`,
      ],
      preheader: `Cập nhật hỗ trợ cho ticket ${ticketCode}.`,
      title: subject,
    }),
    subject,
    text: [
      `Xin chào ${customerName},`,
      '',
      'Đây là email hỗ trợ thủ công từ đội ngũ Net Viet Travel.',
      `Ticket: ${ticket.ticket_code || ticket.id}`,
      `Chủ đề: ${subject}`,
      '',
      message,
      '',
      'Nếu cần thêm hỗ trợ, vui lòng phản hồi qua kênh chăm sóc khách hàng của chúng tôi.',
    ].join('\n'),
  };
};

const isTicketCodeDuplicateError = (error) =>
  error?.code === '23505' &&
  (
    error?.constraint === 'support_tickets_ticket_code_key' ||
    String(error?.detail || '').includes('ticket_code')
  );

const parseCreateTicketBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set([
    'booking_id',
    'customer_email',
    'customer_name',
    'customer_phone',
    'message',
    'service_id',
    'subject',
  ]);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(key, `${key} is not allowed in this endpoint`);
    }
  }

  return {
    bookingId: parseUuid('booking_id', body.booking_id),
    customerEmail: parseOptionalEmail('customer_email', body.customer_email),
    customerName: parseOptionalInlineString({
      field: 'customer_name',
      maxLength: 150,
      value: body.customer_name,
    }),
    customerPhone: parseOptionalPhone(body.customer_phone),
    message: parseRequiredMessage(body.message),
    serviceId: parseUuid('service_id', body.service_id),
    subject: parseRequiredInlineString({
      field: 'subject',
      maxLength: 255,
      value: body.subject,
    }),
  };
};

const parseListQuery = (query = {}) => ({
  limit: parsePositiveInteger({
    defaultValue: DEFAULT_LIST_LIMIT,
    field: 'limit',
    max: MAX_LIST_LIMIT,
    value: query.limit,
  }),
  page: parsePositiveInteger({
    defaultValue: DEFAULT_LIST_PAGE,
    field: 'page',
    max: Number.MAX_SAFE_INTEGER,
    value: query.page,
  }),
  status: parseOptionalTicketStatus(query.status),
});

const parseAdminListQuery = (query = {}) => ({
  assignedTo: parseUuid('assigned_to', query.assigned_to),
  limit: parsePositiveInteger({
    defaultValue: DEFAULT_LIST_LIMIT,
    field: 'limit',
    max: MAX_ADMIN_LIST_LIMIT,
    value: query.limit,
  }),
  page: parsePositiveInteger({
    defaultValue: DEFAULT_LIST_PAGE,
    field: 'page',
    max: Number.MAX_SAFE_INTEGER,
    value: query.page,
  }),
  priority: parseOptionalTicketPriority(query.priority),
  status: parseOptionalTicketStatus(query.status),
});

const parseAdminUpdateBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set(['assigned_to', 'priority', 'status']);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(key, `${key} is not allowed in this endpoint`);
    }
  }

  const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status');
  const hasPriority = Object.prototype.hasOwnProperty.call(body, 'priority');
  const hasAssignedTo = Object.prototype.hasOwnProperty.call(body, 'assigned_to');

  if (!hasStatus && !hasPriority && !hasAssignedTo) {
    throw buildValidationError(
      'body',
      'At least one of status, priority, assigned_to must be provided',
    );
  }

  const status = hasStatus
    ? parseOptionalTicketStatus(body.status)
    : undefined;
  const priority = hasPriority
    ? parseOptionalTicketPriority(body.priority)
    : undefined;
  const assignedTo = hasAssignedTo
    ? parseUuid('assigned_to', body.assigned_to)
    : undefined;

  if (hasStatus && !status) {
    throw buildValidationError(
      'status',
      `status must be one of: ${ADMIN_SUPPORT_ASSIGN_ALLOWED_STATUSES.join(', ')}`,
    );
  }

  if (status != null && !ADMIN_SUPPORT_ASSIGN_ALLOWED_STATUSES.includes(status)) {
    throw buildValidationError(
      'status',
      `status must be one of: ${ADMIN_SUPPORT_ASSIGN_ALLOWED_STATUSES.join(', ')}`,
    );
  }

  return {
    assignedTo,
    priority,
    status,
  };
};

const parseAdminAssignBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set(['assigned_to']);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(key, `${key} is not allowed in this endpoint`);
    }
  }

  return {
    assignedTo: parseUuid('assigned_to', body.assigned_to),
  };
};

const parseAdminReplyBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set(['is_internal_note', 'message']);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(key, `${key} is not allowed in this endpoint`);
    }
  }

  const message = parseRequiredMessage(body.message);
  let isInternalNote = false;

  if (Object.prototype.hasOwnProperty.call(body, 'is_internal_note')) {
    if (typeof body.is_internal_note !== 'boolean') {
      throw buildValidationError(
        'is_internal_note',
        'is_internal_note must be a boolean',
      );
    }

    isInternalNote = body.is_internal_note;
  }

  return {
    isInternalNote,
    message,
  };
};

const parseAdminSupportEmailBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set(['message', 'subject']);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(key, `${key} is not allowed in this endpoint`);
    }
  }

  return {
    message: parseRequiredMessage(body.message),
    subject: parseRequiredInlineString({
      field: 'subject',
      maxLength: 255,
      value: body.subject,
    }),
  };
};

const parseReplyBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set(['message']);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(key, `${key} is not allowed in this endpoint`);
    }
  }

  return {
    message: parseRequiredMessage(body.message),
  };
};

const parseCloseBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set(['reason']);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(key, `${key} is not allowed in this endpoint`);
    }
  }

  return {
    reason: parseOptionalMessage({
      field: 'reason',
      maxLength: 2000,
      value: body.reason,
    }),
  };
};

const parseAdminResolutionBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set(['reason']);

  for (const key of Object.keys(body)) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(key, `${key} is not allowed in this endpoint`);
    }
  }

  const reason = parseOptionalMessage({
    field: 'reason',
    maxLength: 2000,
    value: body.reason,
  });

  if (!reason) {
    throw buildValidationError('reason', 'reason is required');
  }

  return { reason };
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

const validateCustomerAuth = (auth) => {
  const actorRole = auth?.roleCode || auth?.role;

  if (actorRole !== 'customer' || !auth?.userId) {
    throw buildForbiddenError();
  }
};

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

const hasAnyPermission = (auth, acceptedPermissions) => {
  const permissionCodes = normalizePermissionCodes(auth);

  return acceptedPermissions.some((permissionCode) =>
    permissionCodes.includes(permissionCode),
  );
};

const ensureAdminSupportReadAccess = (auth) => {
  if (!ADMIN_SUPPORT_ALLOWED_ROLES.includes(auth?.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.includes('support.read_all')) {
    return;
  }

  throw buildForbiddenError();
};

const resolveAdminSupportScope = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return auth?.userId || null;
};

const canReadInternalNotes = (auth) => {
  if (auth?.role === 'admin' || auth?.role === 'system_admin') {
    return true;
  }

  return false;
};

const ensureAdminSupportAssignAccess = (auth) => {
  if (!ADMIN_SUPPORT_ALLOWED_ROLES.includes(auth?.role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, ['support.assign'])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminSupportReplyAccess = (auth) => {
  if (!ADMIN_SUPPORT_ALLOWED_ROLES.includes(auth?.role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, ['support.reply'])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminSupportEmailAccess = (auth) => {
  if (!ADMIN_SUPPORT_ALLOWED_ROLES.includes(auth?.role)) {
    throw buildForbiddenError();
  }

  if (hasAnyPermission(auth, ['email.send'])) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminSupportCloseAccess = (auth) => {
  if (!ADMIN_SUPPORT_ALLOWED_ROLES.includes(auth?.role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, ['support.close'])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminSupportManageAccess = (auth) => {
  if (!ADMIN_SUPPORT_ALLOWED_ROLES.includes(auth?.role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, ['support.close'])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureTicketAllowsAdminMutation = (ticket) => {
  if (!ticket) {
    throw buildResourceNotFoundError('Support ticket not found');
  }

  if (
    [SUPPORT_TICKET_STATUS.CLOSED, SUPPORT_TICKET_STATUS.SPAM].includes(ticket.status)
  ) {
    throw buildInvalidStateTransitionError(
      'This support ticket status does not allow admin update',
    );
  }
};

const ensureTicketAllowsManualSupportEmail = ({
  auth,
  ticket,
}) => {
  if (!ticket) {
    throw buildResourceNotFoundError('Support ticket not found');
  }

  if (
    ticket.status === SUPPORT_TICKET_STATUS.SPAM &&
    !['admin', 'system_admin'].includes(auth?.role)
  ) {
    throw buildInvalidStateTransitionError(
      'This support ticket status does not allow manual support email',
    );
  }
};

const validateAssignableAdminUser = (user) => {
  if (!user) {
    throw buildResourceNotFoundError('Assigned user was not found');
  }

  if (user.status !== 'active' || user.deleted_at) {
    throw buildValidationError(
      'assigned_to',
      'assigned_to must reference an active staff/admin user',
    );
  }

  if (!ADMIN_ASSIGNABLE_ROLE_CODES.includes(user.role_code)) {
    throw buildValidationError(
      'assigned_to',
      'assigned_to must reference a staff, admin, or system_admin user',
    );
  }
};

const resolveAdminReplySenderType = (auth) => {
  if (auth?.role === 'staff') {
    return SENDER_TYPE.STAFF;
  }

  return SENDER_TYPE.ADMIN;
};

const createSupportService = ({
  repository = createSupportRepository(),
  now = () => new Date(),
  sendEmailImpl = sendEmail,
} = {}) => {
  const getScopedAdminTicketOrThrow = async ({
    auth,
    ticketId,
  }) => {
    const staffScopeUserId = resolveAdminSupportScope(auth);
    const ticket = await repository.getTicketByIdForAdmin({
      staffScopeUserId,
      ticketId,
    });

    if (ticket) {
      return ticket;
    }

    if (auth?.role === 'staff') {
      const existingTicket = await repository.getTicketById(ticketId);

      if (existingTicket) {
        throw buildForbiddenError(
          'You do not have permission to access this support ticket',
        );
      }
    }

    throw buildResourceNotFoundError('Support ticket not found');
  };

  const createTicket = async ({
    auth,
    body,
  } = {}) => {
    const parsedBody = parseCreateTicketBody(body || {});
    const actorRole = auth?.roleCode || auth?.role || null;
    const actorUserId = auth?.userId || null;
    const actorUser = auth?.user || null;

    if (actorRole && actorRole !== 'customer') {
      throw buildForbiddenError();
    }

    const isAuthenticatedCustomer = actorRole === 'customer' && Boolean(actorUserId);
    const resolvedCustomerName =
      parsedBody.customerName ||
      (isAuthenticatedCustomer
        ? parseOptionalInlineString({
            field: 'customer_name',
            maxLength: 150,
            value: actorUser?.full_name,
          })
        : null);
    const resolvedCustomerEmail =
      parsedBody.customerEmail ||
      (isAuthenticatedCustomer
        ? parseOptionalEmail('customer_email', actorUser?.email)
        : null);

    if (!isAuthenticatedCustomer) {
      if (!resolvedCustomerName) {
        throw buildValidationError(
          'customer_name',
          'customer_name is required for guest support tickets',
        );
      }

      if (!resolvedCustomerEmail) {
        throw buildValidationError(
          'customer_email',
          'customer_email is required for guest support tickets',
        );
      }
    }

    if (parsedBody.bookingId) {
      const booking = await repository.getBookingById(parsedBody.bookingId);

      if (!booking) {
        throw buildResourceNotFoundError('Referenced booking was not found');
      }

      if (
        isAuthenticatedCustomer &&
        booking.user_id !== actorUserId
      ) {
        throw buildForbiddenError('You do not have permission to attach this booking');
      }
    }

    if (parsedBody.serviceId) {
      const service = await repository.getServiceById(parsedBody.serviceId);

      if (!service) {
        throw buildResourceNotFoundError('Referenced service was not found');
      }
    }

    let created;
    let attempt = 0;

    while (attempt < MAX_TICKET_CODE_ATTEMPTS) {
      attempt += 1;

      try {
        created = await repository.createTicket({
          reply: {
            is_internal_note: false,
            message: parsedBody.message,
            sender_id: actorUserId,
            sender_type: SENDER_TYPE.CUSTOMER,
          },
          ticket: {
            assigned_to: null,
            booking_id: parsedBody.bookingId,
            closed_at: null,
            customer_email: resolvedCustomerEmail,
            customer_name: resolvedCustomerName,
            customer_phone: parsedBody.customerPhone,
            priority: SUPPORT_TICKET_PRIORITY.NORMAL,
            service_id: parsedBody.serviceId,
            status: SUPPORT_TICKET_STATUS.OPEN,
            subject: parsedBody.subject,
            ticket_code: buildTicketCode(),
            user_id: actorUserId,
          },
        });
        break;
      } catch (error) {
        if (
          attempt < MAX_TICKET_CODE_ATTEMPTS &&
          isTicketCodeDuplicateError(error)
        ) {
          continue;
        }

        throw error;
      }
    }

    return sanitizeTicketResponse(created);
  };

  const listMyTickets = async ({
    auth,
    query,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedQuery = parseListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listTicketsByUser({
      limit: parsedQuery.limit,
      offset,
      status: parsedQuery.status,
      userId: auth.userId,
    });

    return {
      items: result.rows.map(sanitizeCustomerTicketSummary),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getMyTicketDetail = async ({
    auth,
    ticketId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const ticket = await repository.getTicketByIdAndUser({
      ticketId: parsedTicketId,
      userId: auth.userId,
    });

    if (!ticket) {
      throw buildResourceNotFoundError('Support ticket not found');
    }

    const replies = await repository.listRepliesByTicketId(parsedTicketId);
    const publicReplies = replies.filter((reply) => !reply.is_internal_note);

    return sanitizeTicketDetail({
      replies: publicReplies,
      ticket,
    });
  };

  const replyToTicket = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseReplyBody(body || {});
    const ticket = await repository.getTicketByIdAndUser({
      ticketId: parsedTicketId,
      userId: auth.userId,
    });

    if (!ticket) {
      throw buildResourceNotFoundError('Support ticket not found');
    }

    if (!CUSTOMER_REPLY_ALLOWED_STATUSES.includes(ticket.status)) {
      throw buildInvalidStateTransitionError(
        'This support ticket status does not allow customer replies',
      );
    }

    const result = await repository.addCustomerReply({
      message: parsedBody.message,
      senderId: auth.userId,
      ticketId: parsedTicketId,
      toStatus: 'waiting_staff',
    });

    return sanitizeCustomerReplyResult(result);
  };

  const closeMyTicket = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseCloseBody(body || {});
    const ticket = await repository.getTicketByIdAndUser({
      ticketId: parsedTicketId,
      userId: auth.userId,
    });

    if (!ticket) {
      throw buildResourceNotFoundError('Support ticket not found');
    }

    if (ticket.status === 'closed') {
      return sanitizeCustomerCloseResult({
        reasonReply: null,
        ticket,
      });
    }

    if (ticket.status === 'spam') {
      throw buildInvalidStateTransitionError(
        'This support ticket status does not allow customer close',
      );
    }

    const result = await repository.closeTicketByCustomer({
      reason: parsedBody.reason,
      ticketId: parsedTicketId,
    });

    return sanitizeCustomerCloseResult({
      reasonReply: result.reply,
      ticket: result.ticket,
    });
  };

  const listAdminTickets = async ({
    auth,
    query,
  } = {}) => {
    ensureAdminSupportReadAccess(auth);

    const parsedQuery = parseAdminListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listTicketsForAdmin({
      assignedTo: parsedQuery.assignedTo,
      limit: parsedQuery.limit,
      offset,
      priority: parsedQuery.priority,
      staffScopeUserId: resolveAdminSupportScope(auth),
      status: parsedQuery.status,
    });

    return {
      items: result.rows.map(sanitizeAdminTicketSummary),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getAdminTicketDetail = async ({
    auth,
    ticketId,
  } = {}) => {
    ensureAdminSupportReadAccess(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const ticket = await repository.getTicketByIdForAdmin({
      staffScopeUserId: resolveAdminSupportScope(auth),
      ticketId: parsedTicketId,
    });

    if (!ticket) {
      throw buildResourceNotFoundError('Support ticket not found');
    }

    const replies = await repository.listRepliesByTicketIdForAdmin(parsedTicketId);
    const visibleReplies = canReadInternalNotes(auth)
      ? replies
      : replies.filter((reply) => !reply.is_internal_note);

    return sanitizeAdminTicketDetail({
      replies: visibleReplies,
      ticket,
    });
  };

  const updateAdminTicket = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    ensureAdminSupportAssignAccess(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseAdminUpdateBody(body || {});
    const ticket = await repository.getTicketByIdForAdmin({
      staffScopeUserId: resolveAdminSupportScope(auth),
      ticketId: parsedTicketId,
    });

    ensureTicketAllowsAdminMutation(ticket);

    if (parsedBody.assignedTo !== undefined && parsedBody.assignedTo !== null) {
      const assignedUser = await repository.getAssignableAdminUserById(parsedBody.assignedTo);
      validateAssignableAdminUser(assignedUser);
    }

    const nextStatus = parsedBody.status !== undefined
      ? parsedBody.status
      : (
        parsedBody.assignedTo !== undefined &&
        parsedBody.assignedTo !== null &&
        ticket.status === SUPPORT_TICKET_STATUS.OPEN
          ? SUPPORT_TICKET_STATUS.ASSIGNED
          : undefined
      );
    const updates = {
      assigned_to: parsedBody.assignedTo,
      priority: parsedBody.priority,
      status: nextStatus,
    };
    const updatedTicket = await repository.updateTicketForAdmin({
      action: 'admin.support.ticket_update',
      actorUserId: auth?.userId || null,
      metadata: {
        new_values: {
          assigned_to: updates.assigned_to === undefined ? undefined : updates.assigned_to,
          priority: updates.priority,
          status: updates.status,
        },
        old_values: {
          assigned_to: ticket.assigned_to || null,
          priority: ticket.priority,
          status: ticket.status,
        },
      },
      ticketId: parsedTicketId,
      updates,
    });

    return sanitizeAdminTicketMutationResult(updatedTicket);
  };

  const assignAdminTicket = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    ensureAdminSupportAssignAccess(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseAdminAssignBody(body || {});
    const ticket = await repository.getTicketByIdForAdmin({
      staffScopeUserId: resolveAdminSupportScope(auth),
      ticketId: parsedTicketId,
    });

    ensureTicketAllowsAdminMutation(ticket);

    const assignedUser = await repository.getAssignableAdminUserById(parsedBody.assignedTo);
    validateAssignableAdminUser(assignedUser);

    const nextStatus = ticket.status === SUPPORT_TICKET_STATUS.OPEN
      ? SUPPORT_TICKET_STATUS.ASSIGNED
      : ticket.status;
    const updatedTicket = await repository.updateTicketForAdmin({
      action: 'admin.support.ticket_assign',
      actorUserId: auth?.userId || null,
      metadata: {
        new_values: {
          assigned_to: parsedBody.assignedTo,
          status: nextStatus,
        },
        old_values: {
          assigned_to: ticket.assigned_to || null,
          status: ticket.status,
        },
      },
      ticketId: parsedTicketId,
      updates: {
        assigned_to: parsedBody.assignedTo,
        status: nextStatus,
      },
    });

    return sanitizeAdminTicketMutationResult(updatedTicket);
  };

  const replyToAdminTicket = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    ensureAdminSupportReplyAccess(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseAdminReplyBody(body || {});
    const ticket = await repository.getTicketByIdForAdmin({
      staffScopeUserId: resolveAdminSupportScope(auth),
      ticketId: parsedTicketId,
    });

    ensureTicketAllowsAdminMutation(ticket);

    if (!ADMIN_SUPPORT_REPLY_ALLOWED_STATUSES.includes(ticket.status)) {
      throw buildInvalidStateTransitionError(
        'This support ticket status does not allow admin replies',
      );
    }

    const toStatus = parsedBody.isInternalNote
      ? undefined
      : SUPPORT_TICKET_STATUS.WAITING_CUSTOMER;
    const result = await repository.createAdminReply({
      action: 'admin.support.reply_create',
      actorUserId: auth?.userId || null,
      isInternalNote: parsedBody.isInternalNote,
      message: parsedBody.message,
      metadata: {
        is_internal_note: parsedBody.isInternalNote,
        previous_status: ticket.status,
        reply_type: parsedBody.isInternalNote ? 'internal_note' : 'public_reply',
        updated_status: toStatus || ticket.status,
      },
      senderType: resolveAdminReplySenderType(auth),
      ticketId: parsedTicketId,
      toStatus,
    });

    return sanitizeAdminReplyMutationResult(result);
  };

  const sendAdminTicketEmail = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    ensureAdminSupportEmailAccess(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseAdminSupportEmailBody(body || {});
    const ticket = await getScopedAdminTicketOrThrow({
      auth,
      ticketId: parsedTicketId,
    });

    ensureTicketAllowsManualSupportEmail({
      auth,
      ticket,
    });

    const recipient = resolveSupportManualEmailRecipient(ticket);

    if (!recipient) {
      throw buildValidationError(
        'to_email',
        'Support ticket does not have a valid recipient email',
      );
    }

    const queuedAt = now();
    enforceSupportManualEmailRateLimit({
      recipientEmail: recipient.email,
      ticketId: parsedTicketId,
      timestamp: queuedAt,
    });

    const emailContent = buildSupportManualEmailContent({
      message: parsedBody.message,
      subject: parsedBody.subject,
      ticket,
    });
    const queuedEmailLog = await repository.createSupportManualEmailLog({
      bookingId: ticket.booking_id || null,
      createdAt: queuedAt,
      subject: emailContent.subject,
      templateCode: SUPPORT_MANUAL_EMAIL_TEMPLATE_CODE,
      toEmail: recipient.email,
      userId: ticket.user_id || null,
    });

    try {
      const sendResult = await sendEmailImpl({
        html: emailContent.html,
        subject: emailContent.subject,
        text: emailContent.text,
        to: {
          email: recipient.email,
          name: ticket.customer_name || ticket.customer_user_full_name || undefined,
        },
      });
      const sentAt = now();
      const sentEmailLog = await repository.markSupportManualEmailLogSent({
        actorUserId: auth?.userId || null,
        emailLogId: queuedEmailLog.id,
        messageId: sendResult.messageId,
        metadata: {
          email_log_id: queuedEmailLog.id,
          provider_message_id: sendResult.messageId || null,
          recipient_source: recipient.source,
          status: 'sent',
          template_code: SUPPORT_MANUAL_EMAIL_TEMPLATE_CODE,
          ticket_status: ticket.status,
          to_email: recipient.email,
        },
        sentAt,
        ticketId: parsedTicketId,
      });

      return sanitizeAdminSupportEmailResult({
        emailLog: sentEmailLog,
        recipientSource: recipient.source,
        ticket,
      });
    } catch (error) {
      await repository.markSupportManualEmailLogFailed({
        actorUserId: auth?.userId || null,
        emailLogId: queuedEmailLog.id,
        errorMessage: error?.message || 'Unknown email provider error',
        metadata: {
          email_log_id: queuedEmailLog.id,
          error_message: error?.message || 'Unknown email provider error',
          recipient_source: recipient.source,
          status: 'failed',
          template_code: SUPPORT_MANUAL_EMAIL_TEMPLATE_CODE,
          ticket_status: ticket.status,
          to_email: recipient.email,
        },
        ticketId: parsedTicketId,
      });

      throw new AppError('Failed to send support email', {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500,
      });
    }
  };

  const closeAdminTicket = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    ensureAdminSupportCloseAccess(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseAdminResolutionBody(body || {});
    const ticket = await repository.getTicketByIdForAdmin({
      staffScopeUserId: resolveAdminSupportScope(auth),
      ticketId: parsedTicketId,
    });

    if (!ticket) {
      throw buildResourceNotFoundError('Support ticket not found');
    }

    if (ticket.status === SUPPORT_TICKET_STATUS.SPAM) {
      throw buildInvalidStateTransitionError(
        'This support ticket status does not allow admin close',
      );
    }

    if (ticket.status === SUPPORT_TICKET_STATUS.CLOSED) {
      return sanitizeAdminTicketMutationResult(ticket);
    }

    if (!ADMIN_SUPPORT_CLOSE_ALLOWED_STATUSES.includes(ticket.status)) {
      throw buildInvalidStateTransitionError(
        'This support ticket status does not allow admin close',
      );
    }

    const updatedTicket = await repository.updateTicketForAdmin({
      action: 'admin.support.ticket_close',
      actorUserId: auth?.userId || null,
      metadata: {
        new_values: {
          closed_at: 'NOW()',
          status: SUPPORT_TICKET_STATUS.CLOSED,
        },
        old_values: {
          closed_at: ticket.closed_at || null,
          status: ticket.status,
        },
        reason: parsedBody.reason,
      },
      ticketId: parsedTicketId,
      updates: {
        closed_at: new Date().toISOString(),
        status: SUPPORT_TICKET_STATUS.CLOSED,
      },
    });

    return sanitizeAdminTicketMutationResult(updatedTicket);
  };

  const reopenAdminTicket = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    ensureAdminSupportCloseAccess(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseAdminResolutionBody(body || {});
    const ticket = await repository.getTicketByIdForAdmin({
      staffScopeUserId: resolveAdminSupportScope(auth),
      ticketId: parsedTicketId,
    });

    if (!ticket) {
      throw buildResourceNotFoundError('Support ticket not found');
    }

    if (ticket.status === SUPPORT_TICKET_STATUS.SPAM) {
      throw buildInvalidStateTransitionError(
        'This support ticket status does not allow admin reopen',
      );
    }

    if (!ADMIN_SUPPORT_REOPEN_ALLOWED_STATUSES.includes(ticket.status)) {
      throw buildInvalidStateTransitionError(
        'This support ticket status does not allow admin reopen',
      );
    }

    const updatedTicket = await repository.updateTicketForAdmin({
      action: 'admin.support.ticket_reopen',
      actorUserId: auth?.userId || null,
      metadata: {
        new_values: {
          closed_at: null,
          status: SUPPORT_TICKET_STATUS.OPEN,
        },
        old_values: {
          closed_at: ticket.closed_at || null,
          status: ticket.status,
        },
        reason: parsedBody.reason,
      },
      ticketId: parsedTicketId,
      updates: {
        closed_at: null,
        status: SUPPORT_TICKET_STATUS.OPEN,
      },
    });

    return sanitizeAdminTicketMutationResult(updatedTicket);
  };

  const markAdminTicketAsSpam = async ({
    auth,
    body,
    ticketId,
  } = {}) => {
    ensureAdminSupportManageAccess(auth);

    const parsedTicketId = parseUuid('ticket_id', ticketId);
    const parsedBody = parseAdminResolutionBody(body || {});
    const ticket = await repository.getTicketByIdForAdmin({
      staffScopeUserId: resolveAdminSupportScope(auth),
      ticketId: parsedTicketId,
    });

    if (!ticket) {
      throw buildResourceNotFoundError('Support ticket not found');
    }

    if (ticket.status === SUPPORT_TICKET_STATUS.SPAM) {
      return sanitizeAdminTicketMutationResult(ticket);
    }

    const updatedTicket = await repository.updateTicketForAdmin({
      action: 'admin.support.ticket_mark_spam',
      actorUserId: auth?.userId || null,
      metadata: {
        new_values: {
          closed_at: 'NOW()',
          status: SUPPORT_TICKET_STATUS.SPAM,
        },
        old_values: {
          closed_at: ticket.closed_at || null,
          status: ticket.status,
        },
        reason: parsedBody.reason,
      },
      ticketId: parsedTicketId,
      updates: {
        closed_at: new Date().toISOString(),
        status: SUPPORT_TICKET_STATUS.SPAM,
      },
    });

    return sanitizeAdminTicketMutationResult(updatedTicket);
  };

  return {
    assignAdminTicket,
    closeAdminTicket,
    closeMyTicket,
    createTicket,
    getAdminTicketDetail,
    getMyTicketDetail,
    listAdminTickets,
    listMyTickets,
    markAdminTicketAsSpam,
    reopenAdminTicket,
    sendAdminTicketEmail,
    replyToAdminTicket,
    replyToTicket,
    updateAdminTicket,
  };
};

const clearSupportManualEmailRateLimitStore = () => {
  supportManualEmailRateLimitStore.clear();
};

module.exports = Object.assign(createSupportService(), {
  buildTicketCode,
  clearSupportManualEmailRateLimitStore,
  createSupportService,
});
