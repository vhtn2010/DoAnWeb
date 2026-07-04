const {
  API_ERROR_CODES,
  BOOKING_STATUS,
  PAYMENT_METHOD_VALUES,
  PAYMENT_PROVIDER,
  PAYMENT_PROVIDER_VALUES,
  PAYMENT_STATUS,
  PAYMENT_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminPaymentRepository,
} = require('../database/adminPaymentRepository');
const AppError = require('../utils/AppError');

const DEFAULT_CURRENCY = 'VND';
const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_PAGE = 1;
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const MAX_LIST_LIMIT = 100;
const MAX_NOTE_LENGTH = 2000;
const NEXT_BOOKING_STATUS_VALUES = Object.freeze([
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.CONFIRMED,
]);
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const buildValidationError = (field, message) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        message,
      },
    ],
    statusCode: 400,
  });

const buildForbiddenError = (message = 'You do not have permission to access this resource') =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildResourceNotFoundError = (message = 'Payment not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const buildInvalidStateTransitionError = (
  message = 'Payment state no longer allows this transition',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const buildPaymentAmountMismatchError = (
  message = 'received_amount must match the payment amount',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.PAYMENT_AMOUNT_MISMATCH,
    statusCode: 400,
  });

const buildPaymentAlreadyConfirmedError = (
  message = 'Payment has already been confirmed',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.PAYMENT_ALREADY_CONFIRMED,
    statusCode: 400,
  });

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

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

const parseOptionalEnum = (field, value, allowedValues) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
    );
  }

  if (!allowedValues.includes(value)) {
    throw buildValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
    );
  }

  return value;
};

const parseOptionalDate = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid ISO date`);
  }

  const parsed = new Date(value.trim());

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid ISO date`);
  }

  return parsed.toISOString();
};

const parseRequiredDate = (field, value) => {
  const parsed = parseOptionalDate(field, value);

  if (!parsed) {
    throw buildValidationError(field, `${field} is required`);
  }

  return parsed;
};

const parseRequiredString = ({
  field,
  maxLength = MAX_NOTE_LENGTH,
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
  maxLength = MAX_NOTE_LENGTH,
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

const parseRequiredMoney = (field, value) => {
  if (value == null || value === '') {
    throw buildValidationError(field, `${field} is required`);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw buildValidationError(field, `${field} must be greater than 0`);
  }

  return roundMoney(parsed);
};

const parseRequiredIdempotencyKey = (headers = {}) => {
  const value =
    headers[IDEMPOTENCY_KEY_HEADER] ??
    headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()];

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
    has_next: normalizedTotal > 0 && page < totalPages,
    limit,
    page,
    total: normalizedTotal,
    total_pages: totalPages,
  };
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

const ensureAllowedRole = (auth) => {
  if (!['staff', 'admin', 'system_admin'].includes(auth?.role)) {
    throw buildForbiddenError();
  }
};

const ensureAllowedRoles = (auth, allowedRoles) => {
  if (!allowedRoles.includes(auth?.role)) {
    throw buildForbiddenError();
  }
};

const ensurePermission = (auth, acceptedPermissions, {
  allowWhenEmpty = false,
  allowedRoles = ['staff', 'admin', 'system_admin'],
} = {}) => {
  ensureAllowedRoles(auth, allowedRoles);
  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.length === 0) {
    if (allowWhenEmpty) {
      return;
    }

    throw buildForbiddenError();
  }

  if (acceptedPermissions.some((permissionCode) => permissionCodes.includes(permissionCode))) {
    return;
  }

  throw buildForbiddenError();
};

const ensureReadAllAccess = (auth) => {
  ensurePermission(auth, ['payment.read_all']);
};

const ensureProofAccess = (auth) => {
  ensurePermission(auth, [
    'payment.read_all',
    'payment.confirm',
  ]);
};

const ensureConfirmAccess = (auth) => {
  ensurePermission(auth, ['payment.confirm']);
};

const ensureRejectAccess = (auth) => {
  ensurePermission(auth, ['payment.reject']);
};

const ensureExpireAccess = (auth) => {
  ensurePermission(auth, [
    'payment.confirm',
    'payment.reject',
  ]);
};

const ensureReconcileAccess = (auth) => {
  ensurePermission(auth, ['payment.reconcile'], {
    allowedRoles: ['admin', 'system_admin'],
  });
};

const ensureNoteAccess = (auth) => {
  ensurePermission(auth, [
    'payment.read_all',
    'payment.confirm',
    'payment.reject',
    'payment.reconcile',
  ]);
};

const sanitizeProof = (rawResponse) => {
  const proof = rawResponse?.proof;

  if (!proof || typeof proof !== 'object' || Array.isArray(proof)) {
    return null;
  }

  return {
    bank_transaction_code: proof.bank_transaction_code || null,
    proof_image_url: proof.proof_image_url || null,
    submitted_at: proof.submitted_at || null,
    transfer_note: proof.transfer_note || null,
  };
};

const sanitizeInternalNote = (rawResponse) => {
  const internalNote = rawResponse?.internal_note;

  if (!internalNote) {
    return null;
  }

  if (typeof internalNote === 'string') {
    return {
      note: internalNote,
      updated_at: null,
      updated_by_user_id: null,
    };
  }

  if (typeof internalNote !== 'object' || Array.isArray(internalNote)) {
    return null;
  }

  return {
    note: internalNote.note || null,
    updated_at: internalNote.updated_at || null,
    updated_by_user_id: internalNote.updated_by_user_id || null,
  };
};

const sanitizeConfirmation = (rawResponse) => {
  const confirmation = rawResponse?.confirmation;

  if (!confirmation || typeof confirmation !== 'object' || Array.isArray(confirmation)) {
    return null;
  }

  return {
    collector_note: confirmation.collector_note || null,
    confirmed_at: confirmation.confirmed_at || null,
    confirmed_by_user_id: confirmation.confirmed_by_user_id || null,
    received_amount:
      confirmation.received_amount == null
        ? null
        : roundMoney(confirmation.received_amount),
    received_at: confirmation.received_at || null,
  };
};

const sanitizeReconciliation = (rawResponse) => {
  const reconciliation = rawResponse?.reconciliation;

  if (!reconciliation || typeof reconciliation !== 'object' || Array.isArray(reconciliation)) {
    return null;
  }

  return {
    note: reconciliation.note || null,
    reconciled_at: reconciliation.reconciled_at || null,
    reconciled_by_user_id: reconciliation.reconciled_by_user_id || null,
  };
};

const sanitizePaymentListItem = (row) => ({
  amount: roundMoney(row.amount),
  booking: {
    booking_code: row.booking_code,
    id: row.booking_id,
    status: row.booking_status,
  },
  created_at: row.created_at,
  currency: row.currency || DEFAULT_CURRENCY,
  customer: {
    email: row.customer_email || null,
    full_name: row.customer_full_name || null,
    id: row.customer_id || null,
    phone: row.customer_phone || null,
  },
  expired_at: row.expired_at,
  has_proof: Boolean(sanitizeProof(row.raw_response)),
  id: row.id,
  paid_at: row.paid_at,
  payment_code: row.payment_code,
  payment_method: row.payment_method,
  provider: row.provider,
  status: row.status,
  updated_at: row.updated_at || null,
});

const sanitizePaymentDetail = (row) => ({
  amount: roundMoney(row.amount),
  booking: {
    booking_code: row.booking_code,
    contact_email: row.contact_email || null,
    contact_name: row.contact_name || null,
    contact_phone: row.contact_phone || null,
    created_at: row.booking_created_at || null,
    currency: row.booking_currency || DEFAULT_CURRENCY,
    expires_at: row.booking_expires_at || null,
    id: row.booking_id,
    status: row.booking_status,
    total_amount: roundMoney(row.booking_total_amount),
  },
  confirmation: sanitizeConfirmation(row.raw_response),
  created_at: row.created_at,
  currency: row.currency || DEFAULT_CURRENCY,
  customer: {
    email: row.customer_email || null,
    full_name: row.customer_full_name || null,
    id: row.customer_id || null,
    phone: row.customer_phone || null,
  },
  expired_at: row.expired_at,
  id: row.id,
  internal_note: sanitizeInternalNote(row.raw_response),
  paid_at: row.paid_at,
  payment_code: row.payment_code,
  payment_method: row.payment_method,
  proof_summary: sanitizeProof(row.raw_response),
  provider: row.provider,
  reconciliation: sanitizeReconciliation(row.raw_response),
  status: row.status,
  updated_at: row.updated_at || null,
});

const sanitizePaymentProofDetail = (row) => ({
  amount: roundMoney(row.amount),
  booking_code: row.booking_code,
  currency: row.currency || DEFAULT_CURRENCY,
  payment_code: row.payment_code,
  payment_id: row.id,
  proof: sanitizeProof(row.raw_response),
  status: row.status,
});

const ensureDirectPayment = (payment) => {
  if (payment.provider !== PAYMENT_PROVIDER.DIRECT) {
    throw buildInvalidStateTransitionError(
      'Only direct payments can be processed with this endpoint',
    );
  }
};

const parseListQuery = (query = {}) => {
  const provider = parseOptionalEnum(
    'provider',
    query.provider,
    PAYMENT_PROVIDER_VALUES,
  );
  const method = parseOptionalEnum(
    'method',
    query.method,
    PAYMENT_METHOD_VALUES,
  );
  const status = parseOptionalEnum(
    'status',
    query.status,
    PAYMENT_STATUS_VALUES,
  );
  const from = parseOptionalDate('from', query.from);
  const to = parseOptionalDate('to', query.to);

  if (from && to && from > to) {
    throw buildValidationError('date_range', 'from must be less than or equal to to');
  }

  return {
    from,
    limit: parsePositiveInteger({
      defaultValue: DEFAULT_LIST_LIMIT,
      field: 'limit',
      max: MAX_LIST_LIMIT,
      value: query.limit,
    }),
    method,
    page: parsePositiveInteger({
      defaultValue: DEFAULT_LIST_PAGE,
      field: 'page',
      max: Number.MAX_SAFE_INTEGER,
      value: query.page,
    }),
    provider,
    status,
    to,
  };
};

const parseConfirmBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const nextBookingStatus = parseOptionalEnum(
    'next_booking_status',
    body.next_booking_status,
    NEXT_BOOKING_STATUS_VALUES,
  );

  if (!nextBookingStatus) {
    throw buildValidationError(
      'next_booking_status',
      `next_booking_status must be one of: ${NEXT_BOOKING_STATUS_VALUES.join(', ')}`,
    );
  }

  return {
    collectorNote: parseOptionalString({
      field: 'collector_note',
      maxLength: MAX_NOTE_LENGTH,
      value: body.collector_note,
    }),
    nextBookingStatus,
    receivedAmount: parseRequiredMoney('received_amount', body.received_amount),
    receivedAt: parseRequiredDate('received_at', body.received_at),
  };
};

const parseReasonBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return {
    reason: parseRequiredString({
      field: 'reason',
      maxLength: MAX_NOTE_LENGTH,
      value: body.reason,
    }),
  };
};

const parseReconciliationBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { note: null };
  }

  return {
    note: parseOptionalString({
      field: 'note',
      maxLength: MAX_NOTE_LENGTH,
      value: body.note,
    }),
  };
};

const parseNoteBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return {
    note: parseRequiredString({
      field: 'note',
      maxLength: MAX_NOTE_LENGTH,
      value: body.note,
    }),
  };
};

const isPaymentExpiredByPolicy = (payment, now) => {
  const expiresAt = payment?.booking_expires_at || payment?.expired_at;

  if (!expiresAt) {
    return false;
  }

  const parsed = new Date(expiresAt);

  if (Number.isNaN(parsed.getTime())) {
    return false;
  }

  return parsed.getTime() <= now.getTime();
};

const createAdminPaymentService = ({
  now = () => new Date(),
  repository = createAdminPaymentRepository(),
} = {}) => {
  const listPayments = async ({
    auth,
    query,
  } = {}) => {
    ensureReadAllAccess(auth);

    const parsedQuery = parseListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listPayments({
      from: parsedQuery.from,
      limit: parsedQuery.limit,
      method: parsedQuery.method,
      offset,
      provider: parsedQuery.provider,
      status: parsedQuery.status,
      to: parsedQuery.to,
    });

    return {
      items: result.rows.map(sanitizePaymentListItem),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getPaymentDetail = async ({
    auth,
    payment_id: paymentId,
  } = {}) => {
    ensureReadAllAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    return sanitizePaymentDetail(payment);
  };

  const getPaymentProof = async ({
    auth,
    payment_id: paymentId,
  } = {}) => {
    ensureProofAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    return sanitizePaymentProofDetail(payment);
  };

  const confirmPayment = async ({
    auth,
    body,
    headers,
    payment_id: paymentId,
  } = {}) => {
    ensureConfirmAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const idempotencyKey = parseRequiredIdempotencyKey(headers || {});
    const parsedBody = parseConfirmBody(body || {});
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    ensureDirectPayment(payment);

    if (parsedBody.receivedAmount !== roundMoney(payment.amount)) {
      throw buildPaymentAmountMismatchError();
    }

    const result = await repository.confirmPayment({
      actorUserId: auth.userId,
      collectorNote: parsedBody.collectorNote,
      idempotencyKey,
      nextBookingStatus: parsedBody.nextBookingStatus,
      paymentId: parsedPaymentId,
      receivedAmount: parsedBody.receivedAmount,
      receivedAt: parsedBody.receivedAt,
    });

    if (!result) {
      throw buildResourceNotFoundError();
    }

    if (result.reused === 'idempotency') {
      return sanitizePaymentDetail(result.payment);
    }

    if (result.alreadyConfirmed === true) {
      throw buildPaymentAlreadyConfirmedError();
    }

    if (result.transitionApplied === false) {
      throw buildInvalidStateTransitionError(
        'Only pending direct payments can be confirmed',
      );
    }

    if (result.bookingTransitionApplied === false) {
      throw buildInvalidStateTransitionError(
        'Booking state no longer allows payment confirmation',
      );
    }

    return sanitizePaymentDetail(result.payment);
  };

  const rejectPayment = async ({
    auth,
    body,
    payment_id: paymentId,
  } = {}) => {
    ensureRejectAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const parsedBody = parseReasonBody(body || {});
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    ensureDirectPayment(payment);

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw buildInvalidStateTransitionError(
        'Only pending payments can be rejected',
      );
    }

    const updatedPayment = await repository.rejectPayment({
      actorUserId: auth.userId,
      paymentId: parsedPaymentId,
      reason: parsedBody.reason,
    });

    if (!updatedPayment) {
      throw buildInvalidStateTransitionError(
        'Only pending payments can be rejected',
      );
    }

    return sanitizePaymentDetail(updatedPayment);
  };

  const expirePayment = async ({
    auth,
    body,
    payment_id: paymentId,
  } = {}) => {
    ensureExpireAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const parsedBody = parseReasonBody(body || {});
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    ensureDirectPayment(payment);

    if (payment.status !== PAYMENT_STATUS.PENDING) {
      throw buildInvalidStateTransitionError(
        'Only pending payments can be expired',
      );
    }

    const result = await repository.expirePayment({
      actorUserId: auth.userId,
      expireBooking:
        payment.booking_status === BOOKING_STATUS.PENDING_PAYMENT &&
        isPaymentExpiredByPolicy(payment, now()),
      paymentId: parsedPaymentId,
      reason: parsedBody.reason,
    });

    if (!result) {
      throw buildResourceNotFoundError();
    }

    if (result.transitionApplied === false) {
      throw buildInvalidStateTransitionError(
        'Only pending payments can be expired',
      );
    }

    return sanitizePaymentDetail(result.payment);
  };

  const markPaymentReconciled = async ({
    auth,
    body,
    payment_id: paymentId,
  } = {}) => {
    ensureReconcileAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const parsedBody = parseReconciliationBody(body || {});
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    ensureDirectPayment(payment);

    if (payment.status === PAYMENT_STATUS.RECONCILED) {
      return sanitizePaymentDetail(payment);
    }

    if (payment.status !== PAYMENT_STATUS.SUCCESS) {
      throw buildInvalidStateTransitionError(
        'Only successful payments can be marked as reconciled',
      );
    }

    const updatedPayment = await repository.markPaymentReconciled({
      actorUserId: auth.userId,
      note: parsedBody.note,
      paymentId: parsedPaymentId,
    });

    if (!updatedPayment) {
      throw buildInvalidStateTransitionError(
        'Only successful payments can be marked as reconciled',
      );
    }

    return sanitizePaymentDetail(updatedPayment);
  };

  const updatePaymentNote = async ({
    auth,
    body,
    payment_id: paymentId,
  } = {}) => {
    ensureNoteAccess(auth);

    const parsedPaymentId = parseUuid('payment_id', paymentId);
    const parsedBody = parseNoteBody(body || {});
    const payment = await repository.getPaymentById(parsedPaymentId);

    if (!payment) {
      throw buildResourceNotFoundError();
    }

    ensureDirectPayment(payment);

    const updatedPayment = await repository.updatePaymentInternalNote({
      actorUserId: auth.userId,
      note: parsedBody.note,
      paymentId: parsedPaymentId,
    });

    if (!updatedPayment) {
      throw buildResourceNotFoundError();
    }

    return sanitizePaymentDetail(updatedPayment);
  };

  return {
    confirmPayment,
    expirePayment,
    getPaymentDetail,
    getPaymentProof,
    listPayments,
    markPaymentReconciled,
    rejectPayment,
    updatePaymentNote,
  };
};

module.exports = Object.assign(createAdminPaymentService(), {
  DEFAULT_LIST_LIMIT,
  DEFAULT_LIST_PAGE,
  IDEMPOTENCY_KEY_HEADER,
  MAX_LIST_LIMIT,
  NEXT_BOOKING_STATUS_VALUES,
  createAdminPaymentService,
});
