const crypto = require('node:crypto');
const { directPayment } = require('../config');
const {
  API_ERROR_CODES,
  BOOKING_STATUS,
  DIRECT_PAYMENT_METHOD_VALUES,
  PAYMENT_PROVIDER,
  PAYMENT_STATUS,
} = require('../constants/domainConstraints');
const { createPaymentRepository } = require('../database/paymentRepository');
const AppError = require('../utils/AppError');

const DEFAULT_CURRENCY = 'VND';
const DEFAULT_DIRECT_PAYMENT_EXPIRY_HOURS = 24;
const DIRECT_PAYMENT_CACHE_SECONDS = 5 * 60;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const METHOD_DISPLAY_NAMES = Object.freeze({
  cash_at_office: 'Cash at office',
  manual_bank_transfer: 'Manual bank transfer',
  staff_collect: 'Staff collect',
});
const PAYMENT_CREATION_ALLOWED_STATUSES = Object.freeze([
  BOOKING_STATUS.PENDING_PAYMENT,
]);
const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const normalizeOptionalString = (value) => {
  if (value == null) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized ? normalized : null;
};

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const hasConfigEntries = (value) =>
  Boolean(value && typeof value === 'object' && Object.keys(value).length > 0);

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
  new AppError(message || 'The requested payment state transition is not allowed', {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const createMissingConfigError = (methodCode, fields) =>
  new AppError('Direct payment configuration not found', {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    details: [
      {
        field: 'direct_payment',
        message: `Enabled direct payment method ${methodCode} is missing required public configuration: ${fields.join(', ')}`,
      },
    ],
    statusCode: 404,
  });

const validateCustomerAuth = (auth) => {
  const actorRole = auth?.role || auth?.roleCode;

  if (actorRole !== 'customer' || !auth?.userId) {
    throw buildForbiddenError();
  }
};

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parseRequiredString = ({
  field,
  maxLength = 255,
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

  if (DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseOptionalString = ({
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

  if (DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseOptionalPhone = (value) => {
  const phone = parseOptionalString({
    field: 'payer_phone',
    maxLength: 20,
    value,
  });

  if (!phone) {
    return null;
  }

  if (!PHONE_PATTERN.test(phone)) {
    throw buildValidationError('payer_phone', 'payer_phone must be a valid phone number');
  }

  return phone;
};

const parseRequiredIdempotencyKey = (headers = {}) => {
  const value =
    headers[IDEMPOTENCY_KEY_HEADER] ?? headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()];

  if (value == null || value === '') {
    throw buildValidationError(
      IDEMPOTENCY_KEY_HEADER,
      `${IDEMPOTENCY_KEY_HEADER} is required`,
    );
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(
      IDEMPOTENCY_KEY_HEADER,
      `${IDEMPOTENCY_KEY_HEADER} must be a string`,
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw buildValidationError(
      IDEMPOTENCY_KEY_HEADER,
      `${IDEMPOTENCY_KEY_HEADER} is required`,
    );
  }

  if (normalized.length > 255) {
    throw buildValidationError(
      IDEMPOTENCY_KEY_HEADER,
      `${IDEMPOTENCY_KEY_HEADER} must be less than or equal to 255 characters`,
    );
  }

  return normalized;
};

const parseCreateBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const paymentMethod = parseRequiredString({
    field: 'payment_method',
    maxLength: 50,
    value: body.payment_method,
  });

  if (!DIRECT_PAYMENT_METHOD_VALUES.includes(paymentMethod)) {
    throw buildValidationError(
      'payment_method',
      `payment_method must be one of: ${DIRECT_PAYMENT_METHOD_VALUES.join(', ')}`,
    );
  }

  return {
    note: parseOptionalString({
      field: 'note',
      maxLength: 2000,
      value: body.note,
    }),
    payerName: parseRequiredString({
      field: 'payer_name',
      maxLength: 150,
      value: body.payer_name,
    }),
    payerPhone: parseOptionalPhone(body.payer_phone),
    paymentMethod,
  };
};

const parseCancelBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return {
    reason: parseRequiredString({
      field: 'reason',
      maxLength: 2000,
      value: body.reason,
    }),
  };
};

const assertRequiredFields = (methodCode, payload, requiredFields) => {
  const missingFields = requiredFields.filter((field) => !payload[field]);

  if (missingFields.length > 0) {
    throw createMissingConfigError(methodCode, missingFields);
  }
};

const assertRequiredAnyOf = (methodCode, payload, requiredFields) => {
  if (requiredFields.some((field) => payload[field])) {
    return;
  }

  throw createMissingConfigError(methodCode, requiredFields);
};

const sanitizeCashAtOfficeMethod = (config, fallbackHotline) => {
  const payload = {
    code: 'cash_at_office',
    name: METHOD_DISPLAY_NAMES.cash_at_office,
    office_address: normalizeOptionalString(config.office_address),
    office_hours: normalizeOptionalString(config.office_hours),
    hotline: normalizeOptionalString(config.hotline) || fallbackHotline,
    instructions: normalizeOptionalString(config.instructions),
  };

  assertRequiredFields(payload.code, payload, [
    'office_address',
    'office_hours',
    'hotline',
  ]);

  return payload;
};

const sanitizeManualBankTransferMethod = (config) => {
  const payload = {
    code: 'manual_bank_transfer',
    name: METHOD_DISPLAY_NAMES.manual_bank_transfer,
    bank_name: normalizeOptionalString(config.bank_name),
    account_number: normalizeOptionalString(config.account_number),
    account_holder: normalizeOptionalString(config.account_holder),
    branch: normalizeOptionalString(config.branch),
    transfer_content_template: normalizeOptionalString(
      config.transfer_content_template,
    ),
    instructions: normalizeOptionalString(config.instructions),
  };

  assertRequiredFields(payload.code, payload, [
    'bank_name',
    'account_number',
    'account_holder',
    'transfer_content_template',
  ]);

  return payload;
};

const sanitizeStaffCollectMethod = (config, fallbackHotline) => {
  const payload = {
    code: 'staff_collect',
    name: METHOD_DISPLAY_NAMES.staff_collect,
    hotline: normalizeOptionalString(config.hotline) || fallbackHotline,
    conditions: normalizeOptionalString(config.conditions),
    instructions: normalizeOptionalString(config.instructions),
  };

  assertRequiredAnyOf(payload.code, payload, [
    'hotline',
    'conditions',
    'instructions',
  ]);

  return payload;
};

const sanitizeMethodConfig = (methodCode, config, fallbackHotline) => {
  if (!config?.enabled) {
    return null;
  }

  if (methodCode === 'cash_at_office') {
    return sanitizeCashAtOfficeMethod(config, fallbackHotline);
  }

  if (methodCode === 'manual_bank_transfer') {
    return sanitizeManualBankTransferMethod(config);
  }

  if (methodCode === 'staff_collect') {
    return sanitizeStaffCollectMethod(config, fallbackHotline);
  }

  return null;
};

const isDirectPaymentMethodEnabled = (methodCode, directPaymentConfig) =>
  Boolean(directPaymentConfig?.methods?.[methodCode]?.enabled);

const isBookingExpired = (booking) => {
  if (!booking?.expires_at) {
    return false;
  }

  const expiresAt = new Date(booking.expires_at);

  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now();
};

const isBookingPayable = (booking) =>
  PAYMENT_CREATION_ALLOWED_STATUSES.includes(booking.status);

const buildPaymentCode = (now = new Date()) => {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();

  return `PAY${datePart}${randomPart}`;
};

const buildFallbackExpiry = (now = new Date()) =>
  new Date(
    now.getTime() + DEFAULT_DIRECT_PAYMENT_EXPIRY_HOURS * 60 * 60 * 1000,
  ).toISOString();

const sanitizeProofSummary = (rawResponse) => {
  const proof = rawResponse?.proof;

  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    return null;
  }

  return {
    bank_transaction_code: proof.bank_transaction_code || null,
    proof_image_url: proof.proof_image_url || null,
    transfer_note: proof.transfer_note || null,
    uploaded_at: proof.uploaded_at || proof.created_at || null,
  };
};

const sanitizePaymentSummary = (payment) => {
  const summary = {
    amount: roundMoney(payment.amount),
    booking_id: payment.booking_id,
    created_at: payment.created_at,
    currency: payment.currency || DEFAULT_CURRENCY,
    expired_at: payment.expired_at,
    id: payment.id,
    paid_at: payment.paid_at,
    payment_code: payment.payment_code,
    payment_method: payment.payment_method,
    provider: payment.provider,
    status: payment.status,
  };

  const proofSummary = sanitizeProofSummary(payment.raw_response);

  if (proofSummary) {
    summary.proof_summary = proofSummary;
  }

  return summary;
};

const sanitizePaymentDetail = (payment) => ({
  ...sanitizePaymentSummary(payment),
  updated_at: payment.updated_at || null,
});

const createPaymentService = ({
  directPaymentConfig = directPayment,
  repository = createPaymentRepository(),
} = {}) => {
  const getDirectPaymentMethods = () => {
    const methodsConfig = directPaymentConfig?.methods;
    const hotline = normalizeOptionalString(directPaymentConfig?.hotline);

    if (!hasConfigEntries(methodsConfig)) {
      return {
        hotline,
        methods: [],
      };
    }

    const methods = DIRECT_PAYMENT_METHOD_VALUES.reduce((accumulator, method) => {
      const payload = sanitizeMethodConfig(
        method,
        methodsConfig[method],
        hotline,
      );

      if (payload) {
        accumulator.push(payload);
      }

      return accumulator;
    }, []);

    return {
      hotline,
      methods,
    };
  };

  const createCustomerDirectPayment = async ({
    auth,
    body,
    bookingId,
    headers,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const idempotencyKey = parseRequiredIdempotencyKey(headers);
    const parsedBody = parseCreateBody(body);
    const booking = await repository.getBookingById(parsedBookingId);

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    if (booking.user_id !== auth.userId) {
      throw buildForbiddenError('You do not have permission to access this booking');
    }

    const idempotentPayment = await repository.findDirectPaymentByIdempotencyKey({
      bookingId: parsedBookingId,
      idempotencyKey,
      userId: auth.userId,
    });

    if (idempotentPayment) {
      return {
        created: false,
        payment: sanitizePaymentDetail(idempotentPayment),
        reused: 'idempotency',
      };
    }

    if (!isDirectPaymentMethodEnabled(parsedBody.paymentMethod, directPaymentConfig)) {
      throw buildValidationError(
        'payment_method',
        'payment_method is not currently available',
      );
    }

    if (!isBookingPayable(booking)) {
      throw buildInvalidStateTransitionError(
        'Booking state no longer allows direct payment creation',
      );
    }

    if (isBookingExpired(booking)) {
      throw buildInvalidStateTransitionError(
        'Booking payment window has expired',
      );
    }

    const amount = roundMoney(booking.total_amount);

    if (amount <= 0) {
      throw buildInvalidStateTransitionError(
        'Booking no longer requires direct payment',
      );
    }

    const pendingPayment =
      await repository.findLatestPendingDirectPaymentByBookingId(parsedBookingId);

    if (pendingPayment) {
      return {
        created: false,
        payment: sanitizePaymentDetail(pendingPayment),
        reused: 'pending',
      };
    }

    const createdPayment = await repository.createDirectPayment({
      actorUserId: auth.userId,
      amount,
      bookingCode: booking.booking_code,
      bookingId: parsedBookingId,
      currency: booking.currency || DEFAULT_CURRENCY,
      expiredAt: booking.expires_at || buildFallbackExpiry(),
      idempotencyKey,
      note: parsedBody.note,
      payerName: parsedBody.payerName,
      payerPhone: parsedBody.payerPhone,
      paymentCode: buildPaymentCode(),
      paymentMethod: parsedBody.paymentMethod,
    });

    return {
      created: true,
      payment: sanitizePaymentDetail(createdPayment),
      reused: null,
    };
  };

  const listCustomerBookingPayments = async ({
    auth,
    bookingId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const booking = await repository.getBookingById(parsedBookingId);

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    if (booking.user_id !== auth.userId) {
      throw buildForbiddenError('You do not have permission to access this booking');
    }

    const payments = await repository.listPaymentsByBookingId(parsedBookingId);

    return payments.map(sanitizePaymentSummary);
  };

  const getCustomerPaymentDetail = async ({
    auth,
    paymentId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError('Payment not found');
    }

    if (payment.user_id !== auth.userId) {
      throw buildForbiddenError('You do not have permission to access this payment');
    }

    return sanitizePaymentDetail(payment);
  };

  const cancelCustomerPayment = async ({
    auth,
    body,
    paymentId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const parsedBody = parseCancelBody(body);
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError('Payment not found');
    }

    if (payment.user_id !== auth.userId) {
      throw buildForbiddenError('You do not have permission to access this payment');
    }

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw buildInvalidStateTransitionError(
        'Only pending payments can be cancelled by the customer',
      );
    }

    const cancelledPayment = await repository.cancelDirectPayment({
      actorUserId: auth.userId,
      paymentId: parsedPaymentId,
      reason: parsedBody.reason,
    });

    return sanitizePaymentDetail(cancelledPayment);
  };

  return {
    cancelCustomerPayment,
    createCustomerDirectPayment,
    getCustomerPaymentDetail,
    getDirectPaymentMethods,
    listCustomerBookingPayments,
  };
};

module.exports = Object.assign(createPaymentService(), {
  DIRECT_PAYMENT_CACHE_SECONDS,
  IDEMPOTENCY_KEY_HEADER,
  METHOD_DISPLAY_NAMES,
  createPaymentService,
});
