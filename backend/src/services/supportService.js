const crypto = require('node:crypto');
const {
  API_ERROR_CODES,
  SUPPORT_TICKET_PRIORITY,
  SUPPORT_TICKET_STATUS,
  SENDER_TYPE,
} = require('../constants/domainConstraints');
const { createSupportRepository } = require('../database/supportRepository');
const AppError = require('../utils/AppError');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INLINE_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const MULTILINE_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_TICKET_CODE_ATTEMPTS = 3;

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

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const parseUuid = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
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

const createSupportService = ({
  repository = createSupportRepository(),
} = {}) => {
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

  return {
    createTicket,
  };
};

module.exports = Object.assign(createSupportService(), {
  buildTicketCode,
  createSupportService,
});
