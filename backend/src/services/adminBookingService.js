const {
  API_ERROR_CODES,
  BOOKING_ITEM_STATUS_VALUES,
  BOOKING_STATUS_TRANSITIONS,
  BOOKING_STATUS_VALUES,
  DOMAIN_CONSTRAINTS,
  EMAIL_STATUS,
} = require('../constants/domainConstraints');
const {
  createAdminBookingRepository,
} = require('../database/adminBookingRepository');
const { sendEmail } = require('./sendgridService');
const AppError = require('../utils/AppError');

const DEFAULT_CURRENCY = 'VND';
const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_PAGE = 1;
const MAX_LIST_LIMIT = 100;
const MAX_QUERY_LENGTH = 100;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOOKING_CONFIRMATION_RESEND_TEMPLATE_CODE =
  'BOOKING_CONFIRMATION_RESEND';
const BOOKING_CONFIRMATION_RESEND_ALLOWED_STATUSES = new Set([
  'paid',
  'confirmed',
  'in_progress',
  'completed',
]);

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

const parseBookingItemId = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError(
      'booking_item_id',
      'booking_item_id must be a valid UUID',
    );
  }

  const normalized = value.trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw buildValidationError(
      'booking_item_id',
      'booking_item_id must be a valid UUID',
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

const ensureAdminBookingItemStatusAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, [
      'booking.update_status',
      'booking.manage',
    ])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminBookingItemTravellerAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, [
      'booking.update_status',
      'booking.update_item',
      'booking.manage',
    ])
  ) {
    return;
  }

  throw buildForbiddenError();
};

const ensureAdminBookingCommunicationAccess = (auth) => {
  const role = auth?.role;

  if (!['staff', 'admin', 'system_admin'].includes(role)) {
    throw buildForbiddenError();
  }

  if (
    hasAnyPermission(auth, [
      'email.send',
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

const sanitizeBookingItemMutationResult = (item) => ({
  booking_id: item.booking_id,
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

const sanitizeBookingEmailResult = (emailLog) => ({
  booking_id: emailLog.booking_id,
  email_log_id: emailLog.id,
  provider: emailLog.provider || DOMAIN_CONSTRAINTS.emailProvider,
  sent_at: emailLog.sent_at || null,
  status: emailLog.status,
  template_code: emailLog.template_code,
  to_email: emailLog.to_email,
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

const parseRequiredBookingItemStatus = (value) => {
  if (typeof value !== 'string' || !BOOKING_ITEM_STATUS_VALUES.includes(value)) {
    throw buildValidationError(
      'status',
      `status must be one of: ${BOOKING_ITEM_STATUS_VALUES.join(', ')}`,
    );
  }

  return value;
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

const parseContactEmail = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError(
      'contact_email',
      'booking contact_email must be a valid email address',
    );
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized || !EMAIL_ADDRESS_REGEX.test(normalized)) {
    throw buildValidationError(
      'contact_email',
      'booking contact_email must be a valid email address',
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

const SENSITIVE_TRAVELLER_KEYS = [
  'password',
  'token',
  'secret',
  'card',
  'credit_card',
  'debit_card',
  'cvv',
  'cvc',
  'pin',
];

const containsSensitiveTravellerKeys = (value) => {
  if (Array.isArray(value)) {
    return value.some((entry) => containsSensitiveTravellerKeys(entry));
  }

  if (!value || typeof value !== 'object') {
    return false;
  }

  return Object.entries(value).some(([key, nestedValue]) => {
    const normalizedKey = String(key).toLowerCase();

    if (SENSITIVE_TRAVELLER_KEYS.some((needle) => normalizedKey.includes(needle))) {
      return true;
    }

    return containsSensitiveTravellerKeys(nestedValue);
  });
};

const summarizeTravellerInfoForLog = (travellerInfo) => {
  const topLevel = Array.isArray(travellerInfo)
    ? travellerInfo
    : [travellerInfo];
  const sample = topLevel.find(
    (entry) => entry && typeof entry === 'object' && !Array.isArray(entry),
  );

  return {
    payload_type: Array.isArray(travellerInfo) ? 'array' : 'object',
    traveller_count: Array.isArray(travellerInfo) ? travellerInfo.length : 1,
    top_level_keys: sample ? Object.keys(sample).sort() : [],
  };
};

const parseTravellerInfo = (value) => {
  if (!Array.isArray(value) && (!value || typeof value !== 'object')) {
    throw buildValidationError(
      'traveller_info',
      'traveller_info must be a JSON object or array',
    );
  }

  if (containsSensitiveTravellerKeys(value)) {
    throw buildValidationError(
      'traveller_info',
      'traveller_info contains restricted sensitive fields',
    );
  }

  return value;
};

const validateBookingItemStatusTransition = ({
  currentStatus,
  nextStatus,
}) => {
  if (currentStatus === nextStatus) {
    return 'idempotent';
  }

  const allowedTransitions = {
    cancelled: [],
    completed: ['refunded'],
    confirmed: ['cancelled', 'completed', 'failed', 'refunded'],
    failed: [],
    pending: ['cancelled', 'confirmed', 'failed'],
    refunded: [],
  };

  const transitions = allowedTransitions[currentStatus] || [];

  if (!transitions.includes(nextStatus)) {
    throw buildInvalidStateTransitionError(
      'Booking item state no longer allows this transition',
    );
  }

  return 'update';
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

const createAdminBookingService = ({
  repository = createAdminBookingRepository(),
  now = () => new Date(),
  sendEmailImpl = sendEmail,
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

  const updateBookingItemStatus = async ({
    auth,
    body,
    booking_item_id: bookingItemId,
  } = {}) => {
    ensureAdminBookingItemStatusAccess(auth);

    const parsedBookingItemId = parseBookingItemId(bookingItemId);
    const nextStatus = parseRequiredBookingItemStatus(body?.status);
    const reason = body?.reason == null
      ? null
      : parseOptionalReason(body.reason);

    if (
      ['cancelled', 'failed'].includes(nextStatus) &&
      !reason
    ) {
      throw buildValidationError(
        'reason',
        'reason is required when status is cancelled or failed',
      );
    }

    const item = await repository.getBookingItemById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingItemId: parsedBookingItemId,
    });

    if (!item) {
      throw buildResourceNotFoundError('Booking item not found');
    }

    const transitionResult = validateBookingItemStatusTransition({
      currentStatus: item.status,
      nextStatus,
    });

    if (transitionResult === 'idempotent') {
      return sanitizeBookingItemMutationResult(item);
    }

    const updatedItem = await repository.updateBookingItemStatus({
      actorUserId: auth?.userId || null,
      bookingItemId: parsedBookingItemId,
      fromStatus: item.status,
      reason,
      toStatus: nextStatus,
    });

    return sanitizeBookingItemMutationResult(updatedItem);
  };

  const updateBookingItemTravellerInfo = async ({
    auth,
    body,
    booking_item_id: bookingItemId,
  } = {}) => {
    ensureAdminBookingItemTravellerAccess(auth);

    const parsedBookingItemId = parseBookingItemId(bookingItemId);
    const travellerInfo = parseTravellerInfo(body?.traveller_info);
    const item = await repository.getBookingItemById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingItemId: parsedBookingItemId,
    });

    if (!item) {
      throw buildResourceNotFoundError('Booking item not found');
    }

    if (
      auth?.role === 'staff' &&
      ['completed', 'cancelled', 'refunded'].includes(item.booking_status)
    ) {
      throw buildInvalidStateTransitionError(
        'Traveller info can no longer be updated for this booking item',
      );
    }

    const updatedItem = await repository.updateBookingItemTravellerInfo({
      actorUserId: auth?.userId || null,
      bookingItemId: parsedBookingItemId,
      travellerInfo,
      travellerInfoLogSummary: summarizeTravellerInfoForLog(travellerInfo),
    });

    return sanitizeBookingItemMutationResult(updatedItem);
  };

  const resendBookingConfirmationEmail = async ({
    auth,
    booking_id: bookingId,
  } = {}) => {
    ensureAdminBookingCommunicationAccess(auth);

    const parsedBookingId = parseBookingId(bookingId);
    const booking = await repository.getBookingById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      bookingId: parsedBookingId,
    });

    if (!booking) {
      throw buildResourceNotFoundError();
    }

    const contactEmail = parseContactEmail(booking.contact_email);

    if (
      !BOOKING_CONFIRMATION_RESEND_ALLOWED_STATUSES.has(booking.status)
    ) {
      throw buildInvalidStateTransitionError(
        'Booking is not in a state that allows confirmation email resend',
      );
    }

    const items = await repository.listBookingItemsByBookingId(parsedBookingId);
    const emailContent = buildBookingConfirmationResendEmail({
      booking,
      items,
    });
    const queuedAt = now();
    const queuedEmailLog = await repository.createBookingConfirmationResendEmailLog({
      actorUserId: auth?.userId || null,
      bookingId: parsedBookingId,
      bookingStatus: booking.status,
      createdAt: queuedAt,
      subject: emailContent.subject,
      templateCode: BOOKING_CONFIRMATION_RESEND_TEMPLATE_CODE,
      toEmail: contactEmail,
      userId: booking.user_id || null,
    });

    try {
      const sendResult = await sendEmailImpl({
        html: emailContent.html,
        subject: emailContent.subject,
        text: emailContent.text,
        to: {
          email: contactEmail,
          name: booking.contact_name || undefined,
        },
      });
      const sentAt = now();
      const sentEmailLog = await repository.markBookingEmailLogSent({
        emailLogId: queuedEmailLog.id,
        messageId: sendResult.messageId,
        sentAt,
      });

      return sanitizeBookingEmailResult(sentEmailLog);
    } catch (error) {
      await repository.markBookingEmailLogFailed({
        emailLogId: queuedEmailLog.id,
        errorMessage: error?.message || 'Unknown email provider error',
      });

      throw new AppError('Failed to resend booking confirmation email', {
        code: API_ERROR_CODES.INTERNAL_ERROR,
        statusCode: 500,
      });
    }
  };

  return {
    cancelBooking,
    completeBooking,
    confirmBooking,
    expireBooking,
    getBookingDetail,
    getBookingStatusHistory,
    listBookings,
    resendBookingConfirmationEmail,
    updateBookingItemStatus,
    updateBookingItemTravellerInfo,
    updateBookingStatus,
  };
};

module.exports = Object.assign(createAdminBookingService(), {
  BOOKING_CONFIRMATION_RESEND_TEMPLATE_CODE,
  createAdminBookingService,
});
