const {
  API_ERROR_CODES,
  BOOKING_STATUS,
  PAYMENT_STATUS,
  REFUND_STATUS,
} = require('../constants/domainConstraints');
const refundRepository = require('../database/refundRepository');
const AppError = require('../utils/AppError');

const CUSTOMER_ROLE = 'customer';
const REFUND_REQUEST_PERMISSION = 'refund.request';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const buildValidationError = (field, message) =>
  new AppError(message, {
    code: API_ERROR_CODES.VALIDATION_ERROR,
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

const buildForbiddenError = (
  message = 'You do not have permission to access this resource',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildResourceNotFoundError = (message = 'Resource not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const buildRefundNotAllowedError = (
  message = 'This refund request is not allowed',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.REFUND_NOT_ALLOWED,
    statusCode: 400,
  });

const buildInvalidStateTransitionError = (
  message = 'The requested refund state transition is not allowed',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const validateCustomerAuth = (auth) => {
  const actorRole = auth?.role || auth?.roleCode;

  if (actorRole !== CUSTOMER_ROLE || !auth?.userId) {
    throw buildForbiddenError();
  }
};

const getPermissionCodes = (auth) => {
  const candidates = [
    auth?.permissions,
    auth?.user?.permission_codes,
    auth?.user?.permissionCodes,
    auth?.user?.permissions,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    if (Array.isArray(candidate)) {
      return candidate.map((item) => String(item || '').trim()).filter(Boolean);
    }
  }

  return [];
};

const ensureRefundRequestPermission = (auth) => {
  const permissionCodes = getPermissionCodes(auth);

  if (!permissionCodes.includes(REFUND_REQUEST_PERMISSION)) {
    throw buildForbiddenError('You do not have permission to request refunds');
  }
};

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parseRequiredString = (field, value, maxLength = 2000) => {
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

const parsePositiveAmount = (value) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw buildValidationError('amount', 'amount must be greater than 0');
  }

  return Number(parsed.toFixed(2));
};

const parseRequiredIdempotencyKey = (headers = {}) => {
  const value = headers['idempotency-key'] ?? headers['Idempotency-Key'];

  if (value == null || value === '') {
    throw buildValidationError(
      'idempotency-key',
      'Idempotency-Key header is required',
    );
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(
      'idempotency-key',
      'Idempotency-Key header must be a string',
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    throw buildValidationError(
      'idempotency-key',
      'Idempotency-Key header is required',
    );
  }

  if (normalized.length > 255) {
    throw buildValidationError(
      'idempotency-key',
      'Idempotency-Key header must be less than or equal to 255 characters',
    );
  }

  return normalized;
};

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const sanitizeRefund = (refund) => ({
  amount: roundMoney(refund.amount),
  booking_id: refund.booking_id,
  created_at: refund.created_at,
  id: refund.id,
  payment_id: refund.payment_id,
  processed_at: refund.processed_at,
  reason: refund.reason,
  refund_code: refund.refund_code,
  status: refund.status,
});

const bookingAllowsCompletedRefund = (bookingItems) =>
  bookingItems.some((item) => {
    const snapshot = item?.service_snapshot;
    const details =
      snapshot?.details && typeof snapshot.details === 'object'
        ? snapshot.details
        : {};

    if (!snapshot || typeof snapshot !== 'object') {
      return false;
    }

    return Boolean(
      snapshot.cancellation_policy ||
        snapshot.cancellationPolicy ||
        snapshot.refund_policy ||
        snapshot.refundPolicy ||
        details.cancellation_policy ||
        details.cancellationPolicy ||
        details.refund_policy ||
        details.refundPolicy,
    );
  });

const assertRefundablePayment = (payment) => {
  const allowedPaymentStatuses = [
    PAYMENT_STATUS.SUCCESS,
    PAYMENT_STATUS.RECONCILED,
    PAYMENT_STATUS.PARTIALLY_REFUNDED,
  ];

  if (!allowedPaymentStatuses.includes(payment.status)) {
    throw buildRefundNotAllowedError(
      'Only successful direct payments can be used to request a refund',
    );
  }
};

const assertRefundableBooking = ({ booking, bookingItems }) => {
  if (
    [
      BOOKING_STATUS.PENDING_PAYMENT,
      BOOKING_STATUS.PAYMENT_PROCESSING,
      BOOKING_STATUS.FAILED,
      BOOKING_STATUS.EXPIRED,
      BOOKING_STATUS.REFUNDED,
    ].includes(booking.status)
  ) {
    throw buildRefundNotAllowedError(
      'This booking is not eligible for a refund request',
    );
  }

  if (
    booking.status === BOOKING_STATUS.COMPLETED &&
    !bookingAllowsCompletedRefund(bookingItems)
  ) {
    throw buildRefundNotAllowedError(
      'This completed booking does not allow manual refunds',
    );
  }

  const allowedBookingStatuses = [
    BOOKING_STATUS.PAID,
    BOOKING_STATUS.CONFIRMED,
    BOOKING_STATUS.COMPLETED,
    BOOKING_STATUS.PARTIALLY_REFUNDED,
  ];

  if (!allowedBookingStatuses.includes(booking.status)) {
    throw buildRefundNotAllowedError(
      'This booking is not eligible for a refund request',
    );
  }
};

const createRefundService = ({
  repository = refundRepository,
} = {}) => {
  const createCustomerRefundRequest = async ({
    auth,
    body,
    bookingId,
    headers,
  } = {}) => {
    validateCustomerAuth(auth);
    ensureRefundRequestPermission(auth);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw buildValidationError('body', 'body must be an object');
    }

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const paymentId = parseUuid('payment_id', body.payment_id);
    const amount = parsePositiveAmount(body.amount);
    const reason = parseRequiredString('reason', body.reason);
    const idempotencyKey = parseRequiredIdempotencyKey(headers);
    const booking = await repository.getBookingById(parsedBookingId);

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    if (booking.user_id !== auth.userId) {
      throw buildForbiddenError(
        'You do not have permission to access this booking',
      );
    }

    const payment = await repository.getPaymentById(paymentId);

    if (!payment || payment.booking_id !== booking.id) {
      throw buildResourceNotFoundError('Payment not found');
    }

    assertRefundablePayment(payment);

    const bookingItems = await repository.listBookingItemsByBookingId(booking.id);
    assertRefundableBooking({ booking, bookingItems });

    const reservedAmount =
      await repository.sumActiveRefundAmountByPaymentId(payment.id);
    const remainingRefundableAmount = roundMoney(
      Number(payment.amount) - reservedAmount,
    );

    if (remainingRefundableAmount <= 0 || amount > remainingRefundableAmount) {
      throw buildRefundNotAllowedError(
        'Requested refund amount exceeds the remaining refundable amount',
      );
    }

    const nextBookingStatus =
      booking.status === BOOKING_STATUS.PAID ||
      booking.status === BOOKING_STATUS.CONFIRMED ||
      booking.status === BOOKING_STATUS.COMPLETED
        ? BOOKING_STATUS.REFUND_PENDING
        : null;

    const createdRefund = await repository.createRefundRequest({
      actorUserId: auth.userId,
      amount,
      booking,
      idempotencyKey,
      nextBookingStatus,
      payment,
      reason,
    });

    return {
      booking: {
        booking_code: createdRefund.booking.booking_code,
        id: createdRefund.booking.id,
        status: createdRefund.booking.status,
      },
      created: createdRefund.reused == null,
      refund: sanitizeRefund(createdRefund.refund),
      reused: createdRefund.reused || null,
    };
  };

  const listCustomerBookingRefunds = async ({
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
      throw buildForbiddenError(
        'You do not have permission to access this booking',
      );
    }

    const refunds = await repository.listRefundsByBookingId(parsedBookingId);

    return {
      booking: {
        booking_code: booking.booking_code,
        id: booking.id,
        status: booking.status,
      },
      refunds: refunds.map(sanitizeRefund),
    };
  };

  const getCustomerRefundDetail = async ({
    auth,
    refundId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedRefundId = parseUuid('refund_id', refundId);
    const refund = await repository.getRefundByIdWithBooking(parsedRefundId);

    if (!refund) {
      throw buildResourceNotFoundError('Refund not found');
    }

    if (refund.user_id !== auth.userId) {
      throw buildForbiddenError(
        'You do not have permission to access this refund',
      );
    }

    return {
      booking: {
        booking_code: refund.booking_code,
        id: refund.booking_id,
        status: refund.booking_status,
      },
      refund: sanitizeRefund(refund),
    };
  };

  const cancelCustomerRefundRequest = async ({
    auth,
    body,
    refundId,
  } = {}) => {
    validateCustomerAuth(auth);

    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw buildValidationError('body', 'body must be an object');
    }

    const parsedRefundId = parseUuid('refund_id', refundId);
    const reason = parseRequiredString('reason', body.reason);
    const refund = await repository.getRefundByIdWithBooking(parsedRefundId);

    if (!refund) {
      throw buildResourceNotFoundError('Refund not found');
    }

    if (refund.user_id !== auth.userId) {
      throw buildForbiddenError(
        'You do not have permission to access this refund',
      );
    }

    if (refund.status !== REFUND_STATUS.REQUESTED) {
      throw buildInvalidStateTransitionError(
        'Only requested refunds can be cancelled by the customer',
      );
    }

    const cancelledRefund = await repository.cancelRefundRequest({
      actorUserId: auth.userId,
      cancelReason: reason,
      refund,
    });

    return {
      booking: {
        booking_code: refund.booking_code,
        id: refund.booking_id,
        status: cancelledRefund.bookingStatus,
      },
      refund: sanitizeRefund(cancelledRefund.refund),
    };
  };

  return {
    cancelCustomerRefundRequest,
    createCustomerRefundRequest,
    getCustomerRefundDetail,
    listCustomerBookingRefunds,
  };
};

module.exports = Object.assign(createRefundService(), {
  createRefundService,
});
