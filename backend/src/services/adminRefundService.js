const {
  API_ERROR_CODES,
  PAYMENT_STATUS,
  REFUND_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminRefundRepository,
} = require('../database/adminRefundRepository');
const AppError = require('../utils/AppError');

const DEFAULT_CURRENCY = 'VND';
const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_PAGE = 1;
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const MAX_LIST_LIMIT = 100;
const MAX_NOTE_LENGTH = 2000;
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

const buildForbiddenError = (
  message = 'You do not have permission to access this resource',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildResourceNotFoundError = (message = 'Refund not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const buildInvalidStateTransitionError = (
  message = 'Refund state no longer allows this transition',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const buildRefundNotAllowedError = (
  message = 'This refund request is not allowed',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.REFUND_NOT_ALLOWED,
    statusCode: 400,
  });

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

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

const ensureReadAllAccess = (auth) => {
  if (!['staff', 'admin', 'system_admin'].includes(auth?.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.length === 0) {
    return;
  }

  if (permissionCodes.includes('refund.read_all')) {
    return;
  }

  throw buildForbiddenError();
};

const ensureApproveAccess = (auth) => {
  if (!['admin', 'system_admin'].includes(auth?.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.length === 0) {
    return;
  }

  if (permissionCodes.includes('refund.approve')) {
    return;
  }

  throw buildForbiddenError();
};

const ensureRejectAccess = (auth) => {
  if (!['admin', 'system_admin'].includes(auth?.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.length === 0) {
    return;
  }

  if (permissionCodes.includes('refund.reject')) {
    return;
  }

  throw buildForbiddenError();
};

const ensureProcessAccess = (auth) => {
  if (!['staff', 'admin', 'system_admin'].includes(auth?.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.includes('refund.process')) {
    return;
  }

  throw buildForbiddenError();
};

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

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

  const normalized = value.trim();

  if (!normalized) {
    throw buildValidationError(field, `${field} is required`);
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${maxLength} characters`,
    );
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

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${maxLength} characters`,
    );
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

const parseListQuery = (query = {}) => {
  const status = parseOptionalEnum(
    'status',
    query.status,
    REFUND_STATUS_VALUES,
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
    page: parsePositiveInteger({
      defaultValue: DEFAULT_LIST_PAGE,
      field: 'page',
      max: Number.MAX_SAFE_INTEGER,
      value: query.page,
    }),
    status,
    to,
  };
};

const parseApproveBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return {
    approvedAmount: parseRequiredMoney('approved_amount', body.approved_amount),
    note: parseOptionalString({
      field: 'note',
      value: body.note,
    }),
  };
};

const parseRejectBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return {
    reason: parseRequiredString({
      field: 'reason',
      value: body.reason,
    }),
  };
};

const parseMarkProcessingBody = (body = {}) => {
  if (body == null) {
    return {
      note: null,
    };
  }

  if (typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return {
    note: parseOptionalString({
      field: 'note',
      value: body.note,
    }),
  };
};

const parseMarkSuccessBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return {
    note: parseOptionalString({
      field: 'note',
      value: body.note,
    }),
    processedAt: parseRequiredDate('processed_at', body.processed_at),
    providerRefundId: parseOptionalString({
      field: 'provider_refund_id',
      maxLength: 255,
      value: body.provider_refund_id,
    }),
  };
};

const parseMarkFailedBody = (body = {}) => parseRejectBody(body);

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

const sanitizeInternalNote = (rawResponse) => {
  const internalNote =
    rawResponse?.internal_note ||
    rawResponse?.internal_notes ||
    null;

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

const sanitizeCancellation = (rawResponse) => {
  const cancellation = rawResponse?.cancellation;

  if (!cancellation || typeof cancellation !== 'object' || Array.isArray(cancellation)) {
    return null;
  }

  return {
    cancelled_at: cancellation.cancelled_at || null,
    cancelled_by: cancellation.cancelled_by || null,
    reason: cancellation.reason || null,
  };
};

const sanitizeUserSummary = ({
  email,
  full_name,
  id,
  phone,
}) => {
  if (!id && !full_name && !email && !phone) {
    return null;
  }

  return {
    email: email || null,
    full_name: full_name || null,
    id: id || null,
    phone: phone || null,
  };
};

const sanitizeRefundListItem = (row) => ({
  amount: roundMoney(row.amount),
  booking: {
    booking_code: row.booking_code,
    id: row.booking_id,
    status: row.booking_status,
  },
  created_at: row.created_at,
  currency: row.payment_currency || row.booking_currency || DEFAULT_CURRENCY,
  id: row.id,
  payment: {
    amount: roundMoney(row.payment_amount),
    currency: row.payment_currency || DEFAULT_CURRENCY,
    id: row.payment_id,
    paid_at: row.payment_paid_at || null,
    payment_code: row.payment_code,
    payment_method: row.payment_method,
    provider: row.payment_provider,
    status: row.payment_status,
  },
  processed_at: row.processed_at,
  reason: row.reason,
  refund_code: row.refund_code,
  requested_by: sanitizeUserSummary({
    email: row.requested_by_email,
    full_name: row.requested_by_full_name,
    id: row.requested_by_user_id,
    phone: row.requested_by_phone,
  }),
  status: row.status,
});

const sanitizeRefundDetail = (row) => ({
  amount: roundMoney(row.amount),
  approved_by: sanitizeUserSummary({
    email: row.approved_by_email,
    full_name: row.approved_by_full_name,
    id: row.approved_by_user_id,
    phone: row.approved_by_phone,
  }),
  booking: {
    booking_code: row.booking_code,
    contact_email: row.contact_email || null,
    contact_name: row.contact_name || null,
    contact_phone: row.contact_phone || null,
    created_at: row.booking_created_at || null,
    currency: row.booking_currency || DEFAULT_CURRENCY,
    customer: sanitizeUserSummary({
      email: row.customer_email,
      full_name: row.customer_full_name,
      id: row.customer_id,
      phone: row.customer_phone,
    }),
    expires_at: row.booking_expires_at || null,
    id: row.booking_id,
    status: row.booking_status,
    total_amount: roundMoney(row.booking_total_amount),
  },
  cancellation: sanitizeCancellation(row.raw_response),
  created_at: row.created_at,
  id: row.id,
  internal_note: sanitizeInternalNote(row.raw_response),
  payment: {
    amount: roundMoney(row.payment_amount),
    currency: row.payment_currency || DEFAULT_CURRENCY,
    id: row.payment_id,
    paid_at: row.payment_paid_at || null,
    payment_code: row.payment_code,
    payment_method: row.payment_method,
    provider: row.payment_provider,
    status: row.payment_status,
  },
  processed_at: row.processed_at,
  provider_refund_id: row.provider_refund_id || null,
  reason: row.reason,
  refund_code: row.refund_code,
  requested_by: sanitizeUserSummary({
    email: row.requested_by_email,
    full_name: row.requested_by_full_name,
    id: row.requested_by_user_id,
    phone: row.requested_by_phone,
  }),
  status: row.status,
});

const bookingAllowsCompletedRefund = (bookingItems) =>
  bookingItems.some((item) => {
    const snapshot = item?.service_snapshot;

    if (!snapshot || typeof snapshot !== 'object') {
      return false;
    }

    return Boolean(
      snapshot.cancellation_policy || snapshot.cancellationPolicy,
    );
  });

const assertRefundRequested = (refund) => {
  if (refund.status !== 'requested') {
    throw buildInvalidStateTransitionError(
      'Only requested refunds can be processed with this endpoint',
    );
  }
};

const assertRefundApproved = (refund) => {
  if (refund.status !== 'approved') {
    throw buildInvalidStateTransitionError(
      'Only approved refunds can be marked as processing',
    );
  }
};

const assertRefundProcessing = (refund, message) => {
  if (refund.status !== 'processing') {
    throw buildInvalidStateTransitionError(
      message || 'Only processing refunds can be handled with this endpoint',
    );
  }
};

const assertRefundablePayment = (refund) => {
  if (!['success', 'reconciled', 'partially_refunded'].includes(refund.payment_status)) {
    throw buildRefundNotAllowedError(
      'The original payment is no longer eligible for refund approval',
    );
  }
};

const assertRefundableBooking = ({
  bookingItems,
  refund,
}) => {
  if (
    [
      'pending_payment',
      'payment_processing',
      'failed',
      'expired',
      'refunded',
    ].includes(refund.booking_status)
  ) {
    throw buildRefundNotAllowedError(
      'The booking is no longer eligible for refund approval',
    );
  }

  if (
    refund.booking_status === 'completed' &&
    !bookingAllowsCompletedRefund(bookingItems)
  ) {
    throw buildRefundNotAllowedError(
      'This completed booking does not allow manual refunds',
    );
  }
};

const resolveApprovedBookingStatus = ({
  bookingItems,
  refund,
}) => {
  if (refund.booking_status === 'refund_pending') {
    return null;
  }

  if (
    refund.booking_status === 'paid' ||
    refund.booking_status === 'cancel_requested'
  ) {
    return 'refund_pending';
  }

  if (
    refund.booking_status === 'completed' &&
    bookingAllowsCompletedRefund(bookingItems)
  ) {
    return 'refund_pending';
  }

  return null;
};

const createAdminRefundService = ({
  repository = createAdminRefundRepository(),
} = {}) => {
  const listRefunds = async ({
    auth,
    query,
  } = {}) => {
    ensureReadAllAccess(auth);

    const parsedQuery = parseListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listRefunds({
      allowedServiceIds: resolveScopeServiceIds(auth),
      from: parsedQuery.from,
      limit: parsedQuery.limit,
      offset,
      status: parsedQuery.status,
      to: parsedQuery.to,
    });

    return {
      items: result.rows.map(sanitizeRefundListItem),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getRefundDetail = async ({
    auth,
    refund_id: refundId,
  } = {}) => {
    ensureReadAllAccess(auth);

    const parsedRefundId = parseUuid('refund_id', refundId);
    const refund = await repository.getRefundById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      refundId: parsedRefundId,
    });

    if (!refund) {
      throw buildResourceNotFoundError();
    }

    return sanitizeRefundDetail(refund);
  };

  const approveRefund = async ({
    auth,
    body,
    headers,
    refund_id: refundId,
  } = {}) => {
    ensureApproveAccess(auth);

    const parsedRefundId = parseUuid('refund_id', refundId);
    const parsedBody = parseApproveBody(body || {});
    const idempotencyKey = parseRequiredIdempotencyKey(headers || {});
    const refund = await repository.getRefundById({
      allowedServiceIds: null,
      refundId: parsedRefundId,
    });

    if (!refund) {
      throw buildResourceNotFoundError();
    }

    const isReplay = await repository.hasApproveLogByIdempotencyKey({
      idempotencyKey,
      refundId: parsedRefundId,
    });

    if (isReplay) {
      const latestRefund = await repository.getRefundById({
        allowedServiceIds: null,
        refundId: parsedRefundId,
      });
      return sanitizeRefundDetail(latestRefund);
    }

    assertRefundRequested(refund);
    assertRefundablePayment(refund);

    const bookingItems =
      await repository.getBookingItemsByBookingId(refund.booking_id);
    assertRefundableBooking({
      bookingItems,
      refund,
    });

    if (parsedBody.approvedAmount > roundMoney(refund.amount)) {
      throw buildRefundNotAllowedError(
        'approved_amount cannot exceed the requested refund amount',
      );
    }

    const otherReservedAmount =
      await repository.sumOtherActiveRefundAmountsByPaymentId({
        excludedRefundId: refund.id,
        paymentId: refund.payment_id,
      });
    const remainingRefundableAmount = roundMoney(
      Number(refund.payment_amount) - otherReservedAmount,
    );

    if (
      remainingRefundableAmount <= 0 ||
      parsedBody.approvedAmount > remainingRefundableAmount
    ) {
      throw buildRefundNotAllowedError(
        'approved_amount exceeds the remaining refundable amount',
      );
    }

    const result = await repository.approveRefund({
      actorUserId: auth.userId,
      approvedAmount: parsedBody.approvedAmount,
      idempotencyKey,
      nextBookingStatus: resolveApprovedBookingStatus({
        bookingItems,
        refund,
      }),
      note: parsedBody.note,
      refund,
    });

    if (!result) {
      throw buildResourceNotFoundError();
    }

    if (result.transitionApplied === false) {
      throw buildInvalidStateTransitionError(
        'Only requested refunds can be approved',
      );
    }

    return sanitizeRefundDetail(result.refund);
  };

  const rejectRefund = async ({
    auth,
    body,
    refund_id: refundId,
  } = {}) => {
    ensureRejectAccess(auth);

    const parsedRefundId = parseUuid('refund_id', refundId);
    const parsedBody = parseRejectBody(body || {});
    const refund = await repository.getRefundById({
      allowedServiceIds: null,
      refundId: parsedRefundId,
    });

    if (!refund) {
      throw buildResourceNotFoundError();
    }

    assertRefundRequested(refund);

    const result = await repository.rejectRefund({
      actorUserId: auth.userId,
      reason: parsedBody.reason,
      refund,
    });

    if (!result) {
      throw buildResourceNotFoundError();
    }

    if (result.transitionApplied === false) {
      throw buildInvalidStateTransitionError(
        'Only requested refunds can be rejected',
      );
    }

    return sanitizeRefundDetail(result.refund);
  };

  const markRefundProcessing = async ({
    auth,
    body,
    refund_id: refundId,
  } = {}) => {
    ensureProcessAccess(auth);

    const parsedRefundId = parseUuid('refund_id', refundId);
    const parsedBody = parseMarkProcessingBody(body);
    const refund = await repository.getRefundById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      refundId: parsedRefundId,
    });

    if (!refund) {
      throw buildResourceNotFoundError();
    }

    assertRefundApproved(refund);

    const result = await repository.markRefundProcessing({
      actorUserId: auth.userId,
      note: parsedBody.note,
      refundId: parsedRefundId,
    });

    if (!result) {
      throw buildResourceNotFoundError();
    }

    if (result.transitionApplied === false) {
      throw buildInvalidStateTransitionError(
        'Only approved refunds can be marked as processing',
      );
    }

    return sanitizeRefundDetail(result.refund);
  };

  const markRefundSuccess = async ({
    auth,
    body,
    headers,
    refund_id: refundId,
  } = {}) => {
    ensureProcessAccess(auth);

    const parsedRefundId = parseUuid('refund_id', refundId);
    const parsedBody = parseMarkSuccessBody(body || {});
    const idempotencyKey = parseRequiredIdempotencyKey(headers || {});
    const refund = await repository.getRefundById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      refundId: parsedRefundId,
    });

    if (!refund) {
      throw buildResourceNotFoundError();
    }

    const isReplay = await repository.hasMarkSuccessLogByIdempotencyKey({
      idempotencyKey,
      refundId: parsedRefundId,
    });

    if (isReplay) {
      const latestRefund = await repository.getRefundById({
        allowedServiceIds: resolveScopeServiceIds(auth),
        refundId: parsedRefundId,
      });
      return sanitizeRefundDetail(latestRefund);
    }

    assertRefundProcessing(
      refund,
      'Only processing refunds can be marked as successful',
    );

    if (
      ![
        PAYMENT_STATUS.SUCCESS,
        PAYMENT_STATUS.RECONCILED,
        PAYMENT_STATUS.PARTIALLY_REFUNDED,
      ].includes(refund.payment_status)
    ) {
      throw buildRefundNotAllowedError(
        'The original payment is no longer eligible for refund processing',
      );
    }

    const result = await repository.markRefundSuccess({
      actorUserId: auth.userId,
      idempotencyKey,
      note: parsedBody.note,
      processedAt: parsedBody.processedAt,
      providerRefundId: parsedBody.providerRefundId,
      refundId: parsedRefundId,
    });

    if (!result) {
      throw buildResourceNotFoundError();
    }

    if (result.transitionApplied === false) {
      throw buildInvalidStateTransitionError(
        'Only processing refunds can be marked as successful',
      );
    }

    if (result.overRefund === true) {
      throw buildRefundNotAllowedError(
        'The refund amount exceeds the remaining refundable amount',
      );
    }

    return sanitizeRefundDetail(result.refund);
  };

  const markRefundFailed = async ({
    auth,
    body,
    refund_id: refundId,
  } = {}) => {
    ensureProcessAccess(auth);

    const parsedRefundId = parseUuid('refund_id', refundId);
    const parsedBody = parseMarkFailedBody(body || {});
    const refund = await repository.getRefundById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      refundId: parsedRefundId,
    });

    if (!refund) {
      throw buildResourceNotFoundError();
    }

    assertRefundProcessing(
      refund,
      'Only processing refunds can be marked as failed',
    );

    const result = await repository.markRefundFailed({
      actorUserId: auth.userId,
      reason: parsedBody.reason,
      refundId: parsedRefundId,
    });

    if (!result) {
      throw buildResourceNotFoundError();
    }

    if (result.transitionApplied === false) {
      throw buildInvalidStateTransitionError(
        'Only processing refunds can be marked as failed',
      );
    }

    return sanitizeRefundDetail(result.refund);
  };

  return {
    approveRefund,
    getRefundDetail,
    listRefunds,
    markRefundFailed,
    markRefundProcessing,
    markRefundSuccess,
    rejectRefund,
  };
};

module.exports = Object.assign(createAdminRefundService(), {
  DEFAULT_LIST_LIMIT,
  DEFAULT_LIST_PAGE,
  IDEMPOTENCY_KEY_HEADER,
  MAX_LIST_LIMIT,
  createAdminRefundService,
});
