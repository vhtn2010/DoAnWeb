const {
  API_ERROR_CODES,
  BOOKING_STATUS_TRANSITIONS,
  BOOKING_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminBookingRepository,
} = require('../database/adminBookingRepository');
const AppError = require('../utils/AppError');

const DEFAULT_CURRENCY = 'VND';
const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_PAGE = 1;
const MAX_LIST_LIMIT = 100;
const MAX_QUERY_LENGTH = 100;
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

const buildResourceNotFoundError = (message = 'Booking not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const buildInvalidStateTransitionError = (
  message = 'Booking state no longer allows this transition',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const roundMoney = (value) => {
  if (value == null) {
    return 0;
  }

  return Number(Number(value).toFixed(2));
};

const parseOptionalBookingStatus = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(
      'status',
      `status must be one of: ${BOOKING_STATUS_VALUES.join(', ')}`,
    );
  }

  if (!BOOKING_STATUS_VALUES.includes(value)) {
    throw buildValidationError(
      'status',
      `status must be one of: ${BOOKING_STATUS_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseBoundedInteger = ({
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

const parseOptionalKeyword = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError('q', 'q must be a string');
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > MAX_QUERY_LENGTH) {
    throw buildValidationError(
      'q',
      `q must be at most ${MAX_QUERY_LENGTH} characters long`,
    );
  }

  if (DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError('q', 'q contains unsupported characters');
  }

  return normalized;
};

const parseOptionalDate = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid ISO date`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid ISO date`);
  }

  return parsed.toISOString();
};

const parseBookingId = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError('booking_id', 'booking_id must be a valid UUID');
  }

  const normalized = value.trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw buildValidationError('booking_id', 'booking_id must be a valid UUID');
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

const hasAnyPermission = (auth, acceptedPermissions) => {
  const permissionCodes = normalizePermissionCodes(auth);

  return acceptedPermissions.some((permissionCode) =>
    permissionCodes.includes(permissionCode),
  );
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

const ensureAdminBookingReadAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (permissionCodes.length === 0) {
    return;
  }

  if (
    permissionCodes.includes('booking.read_all') ||
    permissionCodes.includes('booking.manage')
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminBookingStatusAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (
    permissionCodes.includes('booking.update_status') ||
    permissionCodes.includes('booking.manage')
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminBookingConfirmAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, [
      'booking.confirm',
      'booking.update_status',
      'booking.manage',
    ])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminBookingCompleteAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, [
      'booking.complete',
      'booking.update_status',
      'booking.manage',
    ])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminBookingCancelAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, [
      'booking.cancel',
      'booking.update_status',
      'booking.manage',
    ])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminBookingExpireAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, [
      'booking.expire',
      'booking.update_status',
      'booking.manage',
    ])
  ) {
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

const sanitizeCustomerSummary = (booking) => ({
  email: booking.customer_email || null,
  full_name: booking.customer_full_name || null,
  id: booking.user_id,
  phone: booking.customer_phone || null,
});

const sanitizeBookingSummary = (booking) => ({
  booking_code: booking.booking_code,
  contact_email: booking.contact_email,
  contact_name: booking.contact_name,
  contact_phone: booking.contact_phone,
  created_at: booking.created_at,
  currency: booking.currency || DEFAULT_CURRENCY,
  customer: sanitizeCustomerSummary(booking),
  discount_amount: roundMoney(booking.discount_amount),
  expires_at: booking.expires_at,
  id: booking.id,
  item_count: Number(booking.item_count || 0),
  status: booking.status,
  subtotal_amount: roundMoney(booking.subtotal_amount),
  total_amount: roundMoney(booking.total_amount),
  updated_at: booking.updated_at,
});

const sanitizeBookingItemSummary = (item) => ({
  end_at: item.end_at,
  id: item.id,
  quantity: Number(item.quantity),
  reference_id: item.reference_id,
  service_id: item.service_id,
  service_type: item.service_type,
  start_at: item.start_at,
  status: item.status,
  title: item.title_snapshot,
  total_amount: roundMoney(item.total_amount),
  traveller_info: item.traveller_info ?? null,
  unit_price: roundMoney(item.unit_price),
});

const sanitizePaymentSummary = (payment) => ({
  amount: roundMoney(payment.amount),
  created_at: payment.created_at,
  currency: payment.currency || DEFAULT_CURRENCY,
  expired_at: payment.expired_at,
  id: payment.id,
  paid_at: payment.paid_at,
  payment_code: payment.payment_code,
  payment_method: payment.payment_method,
  provider: payment.provider,
  status: payment.status,
});

const sanitizeRefundSummary = (refund) => ({
  amount: roundMoney(refund.amount),
  created_at: refund.created_at,
  id: refund.id,
  payment_id: refund.payment_id,
  processed_at: refund.processed_at,
  reason: refund.reason,
  refund_code: refund.refund_code,
  status: refund.status,
});

const mapChangedByType = (roleCode) => {
  if (!roleCode) {
    return 'system';
  }

  if (roleCode === 'system_admin' || roleCode === 'admin') {
    return 'admin';
  }

  if (roleCode === 'staff') {
    return 'staff';
  }

  if (roleCode === 'customer') {
    return 'customer';
  }

  return 'system';
};

const sanitizeStatusHistoryEntry = ({
  auth,
  entry,
}) => {
  if (!entry.changed_by) {
    return {
      changed_by: 'system',
      created_at: entry.created_at,
      from_status: entry.from_status,
      id: entry.id,
      reason: entry.reason,
      to_status: entry.to_status,
    };
  }

  const changedByType = mapChangedByType(entry.changed_by_role_code);

  if (auth?.role === 'staff') {
    return {
      changed_by: {
        id: entry.changed_by,
        type: changedByType,
      },
      created_at: entry.created_at,
      from_status: entry.from_status,
      id: entry.id,
      reason: entry.reason,
      to_status: entry.to_status,
    };
  }

  return {
    changed_by: {
      full_name: entry.changed_by_full_name || null,
      id: entry.changed_by,
      role_code: entry.changed_by_role_code || null,
      type: changedByType,
    },
    created_at: entry.created_at,
    from_status: entry.from_status,
    id: entry.id,
    reason: entry.reason,
    to_status: entry.to_status,
  };
};

const sanitizeBookingStatusUpdateResult = (booking) => ({
  booking_code: booking.booking_code,
  id: booking.id,
  status: booking.status,
  updated_at: booking.updated_at,
});

const sanitizeBookingDetail = ({
  booking,
  items,
  payments,
  refunds,
}) => ({
  booking_code: booking.booking_code,
  contact_email: booking.contact_email,
  contact_name: booking.contact_name,
  contact_phone: booking.contact_phone,
  created_at: booking.created_at,
  currency: booking.currency || DEFAULT_CURRENCY,
  customer: sanitizeCustomerSummary(booking),
  discount_amount: roundMoney(booking.discount_amount),
  expires_at: booking.expires_at,
  id: booking.id,
  items: items.map(sanitizeBookingItemSummary),
  note: booking.note,
  payments: payments.map(sanitizePaymentSummary),
  refunds: refunds.map(sanitizeRefundSummary),
  status: booking.status,
  subtotal_amount: roundMoney(booking.subtotal_amount),
  total_amount: roundMoney(booking.total_amount),
  updated_at: booking.updated_at,
  user_id: booking.user_id,
  voucher_id: booking.voucher_id || null,
});

const parseRequiredBookingStatus = (value) => {
  const parsed = parseOptionalBookingStatus(value);

  if (!parsed) {
    throw buildValidationError(
      'status',
      `status must be one of: ${BOOKING_STATUS_VALUES.join(', ')}`,
    );
  }

  return parsed;
};

const parseRequiredReason = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError('reason', 'reason is required');
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    throw buildValidationError('reason', 'reason is required');
  }

  if (normalized.length > 1000) {
    throw buildValidationError(
      'reason',
      'reason must be at most 1000 characters long',
    );
  }

  if (DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(
      'reason',
      'reason contains unsupported characters',
    );
  }

  return normalized;
};

const parseOptionalReason = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError('reason', 'reason must be a string');
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > 1000) {
    throw buildValidationError(
      'reason',
      'reason must be at most 1000 characters long',
    );
  }

  if (DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(
      'reason',
      'reason contains unsupported characters',
    );
  }

  return normalized;
};

const hasSuccessfulPaymentForOverride = (payments) =>
  payments.some((payment) =>
    ['success', 'reconciled'].includes(payment.status),
  );

const hasSuccessfulRefundForOverride = (refunds) =>
  refunds.some((refund) => refund.status === 'success');

const hasSufficientSuccessfulPaymentForConfirmation = ({
  booking,
  payments,
}) => {
  const successfulTotal = payments.reduce((sum, payment) => {
    if (!['success', 'reconciled'].includes(payment.status)) {
      return sum;
    }

    return sum + roundMoney(payment.amount);
  }, 0);

  return successfulTotal >= roundMoney(booking.total_amount);
};

const buildCurrentBookingStatusResult = (booking) =>
  sanitizeBookingStatusUpdateResult({
    booking_code: booking.booking_code,
    id: booking.id,
    status: booking.status,
    updated_at: booking.updated_at,
  });

const createAdminBookingService = ({
  repository = createAdminBookingRepository(),
} = {}) => {
  const listBookings = async ({
    auth,
    query,
  } = {}) => {
    ensureAdminBookingReadAccess(auth);

    const bookingStatus = parseOptionalBookingStatus(query?.status);
    const from = parseOptionalDate('from', query?.from);
    const to = parseOptionalDate('to', query?.to);

    if (from && to && new Date(from).getTime() > new Date(to).getTime()) {
      throw buildValidationError('from', 'from must be less than or equal to to');
    }

    const keyword = parseOptionalKeyword(query?.q);
    const page = parseBoundedInteger({
      defaultValue: DEFAULT_LIST_PAGE,
      field: 'page',
      max: Number.MAX_SAFE_INTEGER,
      value: query?.page,
    });
    const limit = parseBoundedInteger({
      defaultValue: DEFAULT_LIST_LIMIT,
      field: 'limit',
      max: MAX_LIST_LIMIT,
      value: query?.limit,
    });
    const offset = (page - 1) * limit;
    const result = await repository.listBookings({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingStatus,
      from,
      keyword,
      limit,
      offset,
      to,
    });

    return {
      items: result.rows.map(sanitizeBookingSummary),
      meta: buildPaginationMeta({
        limit,
        page,
        total: result.total,
      }),
    };
  };

  const getBookingDetail = async ({
    auth,
    booking_id: bookingId,
  } = {}) => {
    ensureAdminBookingReadAccess(auth);

    const parsedBookingId = parseBookingId(bookingId);
    const booking = await repository.getBookingById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingId: parsedBookingId,
    });

    if (!booking) {
      throw buildResourceNotFoundError();
    }

    const [items, payments, refunds] = await Promise.all([
      repository.listBookingItemsByBookingId(parsedBookingId),
      repository.listBookingPaymentsByBookingId(parsedBookingId),
      repository.listBookingRefundsByBookingId(parsedBookingId),
    ]);

    return sanitizeBookingDetail({
      booking,
      items,
      payments,
      refunds,
    });
  };

  const getBookingStatusHistory = async ({
    auth,
    booking_id: bookingId,
  } = {}) => {
    ensureAdminBookingReadAccess(auth);

    const parsedBookingId = parseBookingId(bookingId);
    const booking = await repository.getBookingById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingId: parsedBookingId,
    });

    if (!booking) {
      throw buildResourceNotFoundError();
    }

    const histories =
      await repository.listBookingStatusHistoriesByBookingId(parsedBookingId);

    return histories.map((entry) =>
      sanitizeStatusHistoryEntry({
        auth,
        entry,
      }));
  };

  const updateBookingStatus = async ({
    auth,
    body,
    booking_id: bookingId,
  } = {}) => {
    ensureAdminBookingStatusAccess(auth);

    const parsedBookingId = parseBookingId(bookingId);
    const nextStatus = parseRequiredBookingStatus(body?.status);
    const reason = parseRequiredReason(body?.reason);
    const booking = await repository.getBookingById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingId: parsedBookingId,
    });

    if (!booking) {
      throw buildResourceNotFoundError();
    }

    const currentStatus = booking.status;

    if (currentStatus === nextStatus) {
      throw buildInvalidStateTransitionError(
        'Booking is already in the requested status',
      );
    }

    const allowedTransitions = BOOKING_STATUS_TRANSITIONS[currentStatus] || [];

    if (!allowedTransitions.includes(nextStatus)) {
      throw buildInvalidStateTransitionError();
    }

    if (nextStatus === 'paid' && auth?.role !== 'system_admin') {
      const payments =
        await repository.listBookingPaymentsByBookingId(parsedBookingId);

      if (!hasSuccessfulPaymentForOverride(payments)) {
        throw buildInvalidStateTransitionError(
          'Booking cannot be marked as paid without a successful payment',
        );
      }
    }

    if (nextStatus === 'refunded' && auth?.role !== 'system_admin') {
      const refunds =
        await repository.listBookingRefundsByBookingId(parsedBookingId);

      if (!hasSuccessfulRefundForOverride(refunds)) {
        throw buildInvalidStateTransitionError(
          'Booking cannot be marked as refunded without a successful refund',
        );
      }
    }

    const updatedBooking = await repository.updateBookingStatus({
      actorUserId: auth?.userId || null,
      bookingId: parsedBookingId,
      fromStatus: currentStatus,
      reason,
      toStatus: nextStatus,
    });

    return sanitizeBookingStatusUpdateResult(updatedBooking);
  };

  const confirmBooking = async ({
    auth,
    body,
    booking_id: bookingId,
  } = {}) => {
    ensureAdminBookingConfirmAccess(auth);

    const parsedBookingId = parseBookingId(bookingId);
    const reason = parseOptionalReason(body?.reason);
    const booking = await repository.getBookingById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingId: parsedBookingId,
    });

    if (!booking) {
      throw buildResourceNotFoundError();
    }

    if (booking.status === 'confirmed') {
      return buildCurrentBookingStatusResult(booking);
    }

    if (booking.status !== 'paid') {
      throw buildInvalidStateTransitionError(
        'Only paid bookings can be confirmed',
      );
    }

    const payments =
      await repository.listBookingPaymentsByBookingId(parsedBookingId);

    if (!hasSufficientSuccessfulPaymentForConfirmation({ booking, payments })) {
      throw buildInvalidStateTransitionError(
        'Booking cannot be confirmed without sufficient successful payment',
      );
    }

    const updatedBooking = await repository.confirmBooking({
      actorUserId: auth?.userId || null,
      bookingId: parsedBookingId,
      reason,
    });

    return sanitizeBookingStatusUpdateResult(updatedBooking);
  };

  const completeBooking = async ({
    auth,
    body,
    booking_id: bookingId,
  } = {}) => {
    ensureAdminBookingCompleteAccess(auth);

    const parsedBookingId = parseBookingId(bookingId);
    const reason = parseOptionalReason(body?.reason);
    const booking = await repository.getBookingById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingId: parsedBookingId,
    });

    if (!booking) {
      throw buildResourceNotFoundError();
    }

    if (booking.status === 'completed') {
      return buildCurrentBookingStatusResult(booking);
    }

    if (booking.status !== 'in_progress') {
      throw buildInvalidStateTransitionError(
        'Only in_progress bookings can be completed',
      );
    }

    const updatedBooking = await repository.completeBooking({
      actorUserId: auth?.userId || null,
      bookingId: parsedBookingId,
      reason,
    });

    return sanitizeBookingStatusUpdateResult(updatedBooking);
  };

  const cancelBooking = async ({
    auth,
    body,
    booking_id: bookingId,
  } = {}) => {
    ensureAdminBookingCancelAccess(auth);

    const parsedBookingId = parseBookingId(bookingId);
    const reason = parseRequiredReason(body?.reason);
    const booking = await repository.getBookingById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingId: parsedBookingId,
    });

    if (!booking) {
      throw buildResourceNotFoundError();
    }

    if (booking.status === 'cancelled') {
      return buildCurrentBookingStatusResult(booking);
    }

    if (
      ![
        'pending_payment',
        'paid',
        'confirmed',
        'cancel_requested',
        'refund_pending',
      ].includes(booking.status)
    ) {
      throw buildInvalidStateTransitionError(
        'Booking is not in a state that allows cancellation',
      );
    }

    const updatedBooking = await repository.cancelBooking({
      actorUserId: auth?.userId || null,
      bookingId: parsedBookingId,
      fromStatus: booking.status,
      reason,
    });

    return sanitizeBookingStatusUpdateResult(updatedBooking);
  };

  const expireBooking = async ({
    auth,
    body,
    booking_id: bookingId,
  } = {}) => {
    ensureAdminBookingExpireAccess(auth);

    const parsedBookingId = parseBookingId(bookingId);
    const reason = parseRequiredReason(body?.reason);
    const booking = await repository.getBookingById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingId: parsedBookingId,
    });

    if (!booking) {
      throw buildResourceNotFoundError();
    }

    if (booking.status === 'expired') {
      return buildCurrentBookingStatusResult(booking);
    }

    if (booking.status !== 'pending_payment') {
      throw buildInvalidStateTransitionError(
        'Only pending_payment bookings can be expired',
      );
    }

    if (!booking.expires_at) {
      throw buildInvalidStateTransitionError(
        'Booking cannot be expired before expires_at is reached',
      );
    }

    if (new Date(booking.expires_at).getTime() > Date.now()) {
      throw buildInvalidStateTransitionError(
        'Booking cannot be expired before expires_at is reached',
      );
    }

    const updatedBooking = await repository.expireBooking({
      actorUserId: auth?.userId || null,
      bookingId: parsedBookingId,
      reason,
    });

    return sanitizeBookingStatusUpdateResult(updatedBooking);
  };

  return {
    cancelBooking,
    completeBooking,
    confirmBooking,
    expireBooking,
    getBookingDetail,
    getBookingStatusHistory,
    listBookings,
    updateBookingStatus,
  };
};

module.exports = Object.assign(createAdminBookingService(), {
  createAdminBookingService,
});
