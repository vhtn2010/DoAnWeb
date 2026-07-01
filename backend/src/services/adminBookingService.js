const {
  API_ERROR_CODES,
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

  return {
    getBookingDetail,
    listBookings,
  };
};

module.exports = Object.assign(createAdminBookingService(), {
  createAdminBookingService,
});
