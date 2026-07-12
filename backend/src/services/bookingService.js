const crypto = require('node:crypto');
const {
  API_ERROR_CODES,
  BOOKING_ITEM_STATUS,
  BOOKING_STATUS,
  BOOKING_STATUS_VALUES,
  CART_STATUS,
  DEFAULT_CURRENCY = 'VND',
  DISCOUNT_TYPE,
  SERVICE_TYPE,
  VOUCHER_STATUS,
} = require('../constants/domainConstraints');
const { createBookingRepository } = require('../database/bookingRepository');
const { createLookupService } = require('./lookupService');
const AppError = require('../utils/AppError');

const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9+()\-\s]{8,20}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_EXPIRY_HOURS = 24;
const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_PAGE = 1;
const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';
const MAX_LIST_LIMIT = 50;
const CANCEL_REQUEST_ALLOWED_STATUSES = Object.freeze([
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.PAYMENT_PROCESSING,
  BOOKING_STATUS.PAID,
  BOOKING_STATUS.CONFIRMED,
]);
const CONTACT_UPDATE_ALLOWED_STATUSES = Object.freeze([
  BOOKING_STATUS.PENDING_PAYMENT,
  BOOKING_STATUS.PAYMENT_PROCESSING,
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
  new AppError(message || 'The requested booking state transition is not allowed', {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const buildCartEmptyError = () =>
  new AppError('Cart is empty', {
    code: API_ERROR_CODES.CART_EMPTY,
    statusCode: 400,
  });

const buildCartItemUnavailableError = (cartItemId, message, issues) =>
  new AppError(message || 'One or more cart items are no longer available', {
    code: API_ERROR_CODES.CART_ITEM_NOT_AVAILABLE,
    details: [
      {
        cart_item_id: cartItemId,
        issues: Array.isArray(issues) ? issues : [],
      },
    ],
    statusCode: 400,
  });

const buildVoucherError = (code, field, message) =>
  buildAppError({
    code,
    field,
    message,
    statusCode: 400,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
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
  maxLength = 1000,
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

const parseContactEmail = (value) => {
  const email = parseRequiredString({
    field: 'contact_email',
    maxLength: 255,
    value,
  }).toLowerCase();

  if (!EMAIL_PATTERN.test(email)) {
    throw buildValidationError('contact_email', 'contact_email must be a valid email address');
  }

  return email;
};

const parseContactPhone = (value) => {
  const phone = parseOptionalString({
    field: 'contact_phone',
    maxLength: 20,
    value,
  });

  if (!phone) {
    return null;
  }

  if (!PHONE_PATTERN.test(phone)) {
    throw buildValidationError('contact_phone', 'contact_phone must be a valid phone number');
  }

  return phone;
};

const parseRequiredIdempotencyKey = (headers = {}) => {
  const value = headers[IDEMPOTENCY_KEY_HEADER] ?? headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()];

  if (value == null || value === '') {
    throw buildValidationError(
      IDEMPOTENCY_KEY_HEADER,
      `${IDEMPOTENCY_KEY_HEADER} is required`,
    );
  }

  if (Array.isArray(value)) {
    throw buildValidationError(
      IDEMPOTENCY_KEY_HEADER,
      `${IDEMPOTENCY_KEY_HEADER} must be a string`,
    );
  }

  if (typeof value !== 'string') {
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

const parseTravellers = (value) => {
  if (value == null) {
    return new Map();
  }

  if (!Array.isArray(value)) {
    throw buildValidationError('travellers', 'travellers must be an array');
  }

  const travellerMap = new Map();

  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw buildValidationError(
        'travellers',
        'each traveller entry must be an object with cart_item_id',
      );
    }

    const cartItemId = parseUuid('travellers.cart_item_id', entry.cart_item_id);

    if (travellerMap.has(cartItemId)) {
      throw buildValidationError(
        'travellers',
        'travellers contains duplicate cart_item_id entries',
      );
    }

    const { cart_item_id: omittedCartItemId, ...rest } = entry;
    const travellerInfo =
      entry.traveller_info != null
        ? entry.traveller_info
        : (entry.travellers != null ? entry.travellers : rest);

    travellerMap.set(cartItemId, travellerInfo);
  }

  return travellerMap;
};

const parseSelectedCartItemIds = (value) => {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw buildValidationError(
      'selected_cart_item_ids',
      'selected_cart_item_ids must be an array',
    );
  }

  return [...new Set(value.map((itemId) =>
    parseUuid('selected_cart_item_ids', itemId),
  ))];
};

const parseBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return {
    cartId: parseUuid('cart_id', body.cart_id),
    contactEmail: parseContactEmail(body.contact_email),
    contactName: parseRequiredString({
      field: 'contact_name',
      maxLength: 150,
      value: body.contact_name,
    }),
    contactPhone: parseContactPhone(body.contact_phone),
    note: parseOptionalString({
      field: 'note',
      maxLength: 2000,
      value: body.note,
    }),
    selectedCartItemIds: parseSelectedCartItemIds(body.selected_cart_item_ids),
    travellers: parseTravellers(body.travellers),
    voucherCode: parseOptionalString({
      field: 'voucher_code',
      maxLength: 50,
      value: body.voucher_code,
    }),
  };
};

const resolvePublicPrice = (service) => roundMoney(
  service.sale_price != null
    ? service.sale_price
    : service.base_price,
);

const buildBookingCode = (now = new Date()) => {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();

  return `BK${datePart}${randomPart}`;
};

const buildExpiresAt = (now = new Date()) =>
  new Date(now.getTime() + DEFAULT_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();

const buildSafeFilename = (value, fallback) => {
  const normalized = String(value || fallback || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || fallback || 'document';
};

const formatMoney = (value, currency = DEFAULT_CURRENCY) =>
  `${roundMoney(value)} ${currency || DEFAULT_CURRENCY}`;

const formatDateTime = (value) => {
  if (!value) {
    return 'N/A';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toISOString();
};

const isReceiptPaymentStatus = (status) =>
  status === 'success' ||
  status === 'reconciled' ||
  status === 'partially_refunded' ||
  status === 'refunded';

const toPdfText = (value) =>
  String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7E]/g, '?');

const buildSimplePdfBuffer = (lines) => {
  const safeLines = Array.isArray(lines) && lines.length > 0
    ? lines
    : ['Booking Summary'];
  const textOperations = [];
  let remainingLinesOnPage = 45;

  textOperations.push('BT');
  textOperations.push('/F1 12 Tf');
  textOperations.push('50 790 Td');

  for (const line of safeLines) {
    if (remainingLinesOnPage <= 0) {
      break;
    }

    textOperations.push(`(${toPdfText(line)}) Tj`);
    textOperations.push('0 -16 Td');
    remainingLinesOnPage -= 1;
  }

  textOperations.push('ET');

  const contentStream = `${textOperations.join('\n')}\n`;
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>\nendobj\n',
    `4 0 obj\n<< /Length ${Buffer.byteLength(contentStream, 'utf8')} >>\nstream\n${contentStream}endstream\nendobj\n`,
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += object;
  }

  const xrefStart = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';

  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
};

const sanitizeResponseItem = (item) => ({
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
  unit_price: roundMoney(item.unit_price),
});

const sanitizeCheckoutResponse = ({ booking, items }) => ({
  booking_code: booking.booking_code,
  contact_email: booking.contact_email,
  contact_name: booking.contact_name,
  contact_phone: booking.contact_phone,
  currency: booking.currency || DEFAULT_CURRENCY,
  discount_amount: roundMoney(booking.discount_amount),
  expires_at: booking.expires_at,
  id: booking.id,
  items: items.map(sanitizeResponseItem),
  note: booking.note,
  status: booking.status,
  subtotal_amount: roundMoney(booking.subtotal_amount),
  total_amount: roundMoney(booking.total_amount),
  voucher_id: booking.voucher_id || null,
});

const sanitizeBookingSummary = (booking) => ({
  booking_code: booking.booking_code,
  contact_name: booking.contact_name,
  created_at: booking.created_at,
  currency: booking.currency || DEFAULT_CURRENCY,
  discount_amount: roundMoney(booking.discount_amount),
  expires_at: booking.expires_at,
  id: booking.id,
  item_count: Number(booking.item_count || 0),
  status: booking.status,
  subtotal_amount: roundMoney(booking.subtotal_amount),
  total_amount: roundMoney(booking.total_amount),
});

const sanitizeBookingDetailItem = (item) => ({
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

const sanitizeSnapshotRoomType = (roomType) => {
  if (!roomType || typeof roomType !== 'object' || Array.isArray(roomType)) {
    return null;
  }

  return {
    base_price:
      roomType.base_price == null
        ? null
        : roundMoney(roomType.base_price),
    bed_type: roomType.bed_type || null,
    id: roomType.id || null,
    max_adults:
      roomType.max_adults == null
        ? null
        : Number(roomType.max_adults),
    max_children:
      roomType.max_children == null
        ? null
        : Number(roomType.max_children),
    name: roomType.name || null,
  };
};

const parseCancelRequestBody = (body = {}) => {
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

const parseContactUpdateBody = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  const allowedFields = new Set(['contact_name', 'contact_phone', 'note']);
  const providedKeys = Object.keys(body);

  if (providedKeys.length === 0) {
    throw buildValidationError(
      'body',
      'At least one of contact_name, contact_phone, or note must be provided',
    );
  }

  for (const key of providedKeys) {
    if (!allowedFields.has(key)) {
      throw buildValidationError(
        key,
        `${key} is not allowed in this endpoint`,
      );
    }
  }

  const updates = {};

  if (Object.prototype.hasOwnProperty.call(body, 'contact_name')) {
    updates.contact_name = parseRequiredString({
      field: 'contact_name',
      maxLength: 150,
      value: body.contact_name,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'contact_phone')) {
    updates.contact_phone = parseContactPhone(body.contact_phone);
  }

  if (Object.prototype.hasOwnProperty.call(body, 'note')) {
    updates.note = parseOptionalString({
      field: 'note',
      maxLength: 1000,
      value: body.note,
    });
  }

  if (Object.keys(updates).length === 0) {
    throw buildValidationError(
      'body',
      'At least one of contact_name, contact_phone, or note must be provided',
    );
  }

  return updates;
};

const sanitizeSnapshotFlight = (flight) => {
  if (!flight || typeof flight !== 'object' || Array.isArray(flight)) {
    return null;
  }

  return {
    airline_name: flight.airline_name || null,
    arrival_airport: flight.arrival_airport || null,
    arrival_at: flight.arrival_at || null,
    cabin_class: flight.cabin_class || null,
    departure_airport: flight.departure_airport || null,
    departure_at: flight.departure_at || null,
    fare_price:
      flight.fare_price == null
        ? null
        : roundMoney(flight.fare_price),
    flight_number: flight.flight_number || null,
    id: flight.id || null,
  };
};

const sanitizeSnapshotTrain = (train) => {
  if (!train || typeof train !== 'object' || Array.isArray(train)) {
    return null;
  }

  return {
    arrival_at: train.arrival_at || null,
    arrival_station: train.arrival_station || null,
    departure_at: train.departure_at || null,
    departure_station: train.departure_station || null,
    fare_price:
      train.fare_price == null
        ? null
        : roundMoney(train.fare_price),
    id: train.id || null,
    seat_class: train.seat_class || null,
    train_number: train.train_number || null,
  };
};

const sanitizeServiceSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) {
    return null;
  }

  const sanitized = {
    base_price:
      snapshot.base_price == null
        ? null
        : roundMoney(snapshot.base_price),
    cancellation_policy: snapshot.cancellation_policy || null,
    currency: snapshot.currency || DEFAULT_CURRENCY,
    description: snapshot.description || null,
    id: snapshot.id || null,
    location_text: snapshot.location_text || null,
    public_price:
      snapshot.public_price == null
        ? null
        : roundMoney(snapshot.public_price),
    reference_id: snapshot.reference_id || null,
    sale_price:
      snapshot.sale_price == null
        ? null
        : roundMoney(snapshot.sale_price),
    service_type: snapshot.service_type || null,
    short_description: snapshot.short_description || null,
    slug: snapshot.slug || null,
    title: snapshot.title || null,
  };

  const roomType = sanitizeSnapshotRoomType(snapshot.room_type);
  const flight = sanitizeSnapshotFlight(snapshot.flight);
  const train = sanitizeSnapshotTrain(snapshot.train);

  if (roomType) {
    sanitized.room_type = roomType;
  }

  if (flight) {
    sanitized.flight = flight;
  }

  if (train) {
    sanitized.train = train;
  }

  return sanitized;
};

const sanitizeBookingItemSnapshot = (item) => ({
  end_at: item.end_at,
  id: item.id,
  quantity: Number(item.quantity),
  reference_id: item.reference_id,
  service_snapshot: sanitizeServiceSnapshot(item.service_snapshot),
  service_type: item.service_type,
  start_at: item.start_at,
  status: item.status,
  title_snapshot: item.title_snapshot,
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

const sanitizeInvoiceItem = (item) => ({
  end_at: item.end_at,
  quantity: Number(item.quantity),
  service_type: item.service_type,
  start_at: item.start_at,
  status: item.status,
  title: item.title_snapshot,
  total_amount: roundMoney(item.total_amount),
  unit_price: roundMoney(item.unit_price),
});

const sanitizeInvoiceResponse = ({
  booking,
  items,
  payments,
  refunds,
}) => {
  const sanitizedPayments = payments.map(sanitizePaymentSummary);
  const documentType = sanitizedPayments.some((payment) => isReceiptPaymentStatus(payment.status))
    ? 'receipt'
    : 'proforma';

  return {
    booking_code: booking.booking_code,
    booking_id: booking.id,
    contact_email: booking.contact_email,
    contact_name: booking.contact_name,
    contact_phone: booking.contact_phone,
    created_at: booking.created_at,
    currency: booking.currency || DEFAULT_CURRENCY,
    discount_amount: roundMoney(booking.discount_amount),
    document_type: documentType,
    expires_at: booking.expires_at,
    items: items.map(sanitizeInvoiceItem),
    payments: sanitizedPayments,
    refunds: refunds.map(sanitizeRefundSummary),
    status: booking.status,
    subtotal_amount: roundMoney(booking.subtotal_amount),
    total_amount: roundMoney(booking.total_amount),
    updated_at: booking.updated_at,
  };
};

const resolveChangedByType = (history) => {
  if (!history.changed_by) {
    return 'system';
  }

  const roleCode = history.changed_by_role_code || null;

  if (!roleCode) {
    return 'system';
  }

  if (roleCode === 'customer') {
    return 'customer';
  }

  if (roleCode === 'staff') {
    return 'staff';
  }

  if (roleCode === 'admin') {
    return 'admin';
  }

  if (roleCode === 'system_admin') {
    return 'admin';
  }

  return 'system';
};

const sanitizeBookingStatusHistoryEntry = (history) => ({
  changed_by_type: resolveChangedByType(history),
  created_at: history.created_at,
  from_status: history.from_status || null,
  id: history.id,
  reason: history.reason || null,
  to_status: history.to_status,
});

const sanitizeCancelRequestResponse = (booking) => ({
  booking_code: booking.booking_code,
  id: booking.id,
  status: booking.status,
  updated_at: booking.updated_at || null,
});

const sanitizeBookingContactResponse = (booking) => ({
  booking_code: booking.booking_code,
  contact_name: booking.contact_name,
  contact_phone: booking.contact_phone,
  id: booking.id,
  note: booking.note,
  status: booking.status,
  updated_at: booking.updated_at || null,
});

const buildBookingSummaryPdfLines = ({
  booking,
  items,
  payments,
  refunds,
}) => {
  const lines = [
    'Net Viet Travel Booking Summary',
    '',
    `Booking Code: ${booking.booking_code}`,
    `Booking ID: ${booking.id}`,
    `Status: ${booking.status}`,
    `Created At: ${formatDateTime(booking.created_at)}`,
    `Updated At: ${formatDateTime(booking.updated_at)}`,
    '',
    `Customer: ${booking.contact_name}`,
    `Email: ${booking.contact_email}`,
    `Phone: ${booking.contact_phone || 'N/A'}`,
    '',
    `Subtotal: ${formatMoney(booking.subtotal_amount, booking.currency)}`,
    `Discount: ${formatMoney(booking.discount_amount, booking.currency)}`,
    `Total: ${formatMoney(booking.total_amount, booking.currency)}`,
    '',
    'Booking Items:',
  ];

  if (items.length === 0) {
    lines.push('- No items');
  } else {
    for (const item of items) {
      lines.push(`- ${item.title_snapshot} [${item.service_type}] x${Number(item.quantity)}`);
      lines.push(`  Unit: ${formatMoney(item.unit_price, booking.currency)}`);
      lines.push(`  Total: ${formatMoney(item.total_amount, booking.currency)}`);
      lines.push(`  Start: ${formatDateTime(item.start_at)}`);
      lines.push(`  End: ${formatDateTime(item.end_at)}`);
    }
  }

  lines.push('');
  lines.push('Payments:');

  if (payments.length === 0) {
    lines.push('- No payment records');
  } else {
    for (const payment of payments) {
      lines.push(`- ${payment.payment_code || payment.id}: ${payment.status}`);
      lines.push(`  Amount: ${formatMoney(payment.amount, payment.currency)}`);
      lines.push(`  Method: ${payment.payment_method || 'N/A'}`);
    }
  }

  lines.push('');
  lines.push('Refunds:');

  if (refunds.length === 0) {
    lines.push('- No refund records');
  } else {
    for (const refund of refunds) {
      lines.push(`- ${refund.refund_code || refund.id}: ${refund.status}`);
      lines.push(`  Amount: ${formatMoney(refund.amount, booking.currency)}`);
      lines.push(`  Reason: ${refund.reason || 'N/A'}`);
    }
  }

  lines.push('');
  lines.push('Generated from booking snapshot. Customer-safe export only.');

  return lines;
};

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
  discount_amount: roundMoney(booking.discount_amount),
  expires_at: booking.expires_at,
  id: booking.id,
  items: items.map(sanitizeBookingDetailItem),
  note: booking.note,
  payments: payments.map(sanitizePaymentSummary),
  refunds: refunds.map(sanitizeRefundSummary),
  status: booking.status,
  subtotal_amount: roundMoney(booking.subtotal_amount),
  total_amount: roundMoney(booking.total_amount),
  updated_at: booking.updated_at,
  voucher_id: booking.voucher_id || null,
});

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
  const actorRole = auth?.role || auth?.roleCode;

  if (actorRole !== 'customer' || !auth?.userId) {
    throw buildForbiddenError();
  }
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
  status: parseOptionalBookingStatus(query.status),
});

const buildServiceSnapshot = ({
  cartItem,
  detail,
  service,
  unitPrice,
}) => {
  const snapshot = {
    base_price: roundMoney(service.base_price),
    cancellation_policy: service.cancellation_policy || null,
    currency: service.currency || DEFAULT_CURRENCY,
    description: service.description || null,
    id: service.id,
    location_text: service.location_text || null,
    provider_name: service.provider_name || null,
    public_price: roundMoney(unitPrice),
    reference_id: cartItem.reference_id || null,
    sale_price: service.sale_price == null ? null : roundMoney(service.sale_price),
    service_code: service.service_code || null,
    service_type: service.service_type,
    short_description: service.short_description || null,
    slug: service.slug,
    title: service.title,
  };

  if (service.service_type === SERVICE_TYPE.HOTEL && detail) {
    snapshot.room_type = {
      available_rooms: Number(detail.available_rooms),
      base_price: roundMoney(detail.base_price),
      bed_type: detail.bed_type || null,
      id: detail.id,
      max_adults: Number(detail.max_adults),
      max_children: Number(detail.max_children),
      name: detail.name,
    };
  }

  if (service.service_type === SERVICE_TYPE.FLIGHT && detail) {
    snapshot.flight = {
      airline_name: detail.airline_name || null,
      arrival_airport: detail.arrival_airport,
      arrival_at: detail.arrival_at,
      cabin_class: detail.cabin_class,
      departure_airport: detail.departure_airport,
      departure_at: detail.departure_at,
      fare_price: roundMoney(detail.fare_price),
      flight_number: detail.flight_number,
      id: detail.id,
    };
  }

  if (service.service_type === SERVICE_TYPE.TRAIN && detail) {
    snapshot.train = {
      arrival_at: detail.arrival_at,
      arrival_station: detail.arrival_station,
      departure_at: detail.departure_at,
      departure_station: detail.departure_station,
      fare_price: roundMoney(detail.fare_price),
      id: detail.id,
      seat_class: detail.seat_class,
      train_number: detail.train_number,
    };
  }

  return snapshot;
};

const validateVoucher = async ({
  repository,
  subtotalAmount,
  userId,
  voucherCode,
}) => {
  if (!voucherCode) {
    return {
      discountAmount: 0,
      voucher: null,
    };
  }

  const voucher = await repository.getVoucherByCode(voucherCode);

  if (!voucher) {
    throw buildVoucherError(
      API_ERROR_CODES.VOUCHER_INVALID,
      'voucher_code',
      'voucher_code is invalid',
    );
  }

  const now = Date.now();
  const validFrom = new Date(voucher.valid_from).getTime();
  const validTo = new Date(voucher.valid_to).getTime();

  if (
    voucher.status === VOUCHER_STATUS.EXPIRED ||
    Number.isNaN(validFrom) ||
    Number.isNaN(validTo) ||
    now < validFrom ||
    now > validTo
  ) {
    throw buildVoucherError(
      API_ERROR_CODES.VOUCHER_EXPIRED,
      'voucher_code',
      'voucher_code has expired',
    );
  }

  if (voucher.status !== VOUCHER_STATUS.ACTIVE) {
    if (voucher.status === VOUCHER_STATUS.USED_UP) {
      throw buildVoucherError(
        API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
        'voucher_code',
        'voucher_code has reached its usage limit',
      );
    }

    throw buildVoucherError(
      API_ERROR_CODES.VOUCHER_INVALID,
      'voucher_code',
      'voucher_code is invalid',
    );
  }

  if (
    voucher.usage_limit_total != null &&
    Number(voucher.used_count) >= Number(voucher.usage_limit_total)
  ) {
    throw buildVoucherError(
      API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
      'voucher_code',
      'voucher_code has reached its usage limit',
    );
  }

  const userUsageCount = await repository.countActiveBookingsByVoucherAndUser({
    userId,
    voucherId: voucher.id,
  });

  if (
    voucher.usage_limit_per_user != null &&
    userUsageCount >= Number(voucher.usage_limit_per_user)
  ) {
    throw buildVoucherError(
      API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
      'voucher_code',
      'voucher_code has reached its per-user usage limit',
    );
  }

  if (subtotalAmount < roundMoney(voucher.min_order_amount)) {
    throw buildVoucherError(
      API_ERROR_CODES.VOUCHER_INVALID,
      'voucher_code',
      'booking subtotal does not meet voucher minimum order amount',
    );
  }

  let discountAmount = 0;

  if (voucher.discount_type === DISCOUNT_TYPE.PERCENT) {
    discountAmount = subtotalAmount * (Number(voucher.discount_value) / 100);
  } else {
    discountAmount = Number(voucher.discount_value);
  }

  if (voucher.max_discount_amount != null) {
    discountAmount = Math.min(
      discountAmount,
      Number(voucher.max_discount_amount),
    );
  }

  discountAmount = roundMoney(discountAmount);

  if (discountAmount < 0) {
    discountAmount = 0;
  }

  return {
    discountAmount,
    voucher,
  };
};

const createBookingService = ({
  availabilityService,
  repository = createBookingRepository(),
} = {}) => {
  const resolvedAvailabilityService =
    availabilityService || createLookupService({ repository });

  const checkout = async ({
    auth,
    body,
    headers,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBody = parseBody(body || {});
    const idempotencyKey = parseRequiredIdempotencyKey(headers);

    const cart = await repository.getCartById(parsedBody.cartId);

    if (!cart) {
      throw buildResourceNotFoundError('Cart not found');
    }

    if (cart.user_id !== auth.userId) {
      throw buildForbiddenError('You do not have permission to access this cart');
    }

    if (cart.status !== CART_STATUS.ACTIVE) {
      throw buildForbiddenError('Cart is not active');
    }

    const allCartItems = await repository.listCartItemsByCartId(parsedBody.cartId);
    const selectedCartItemIdSet = new Set(parsedBody.selectedCartItemIds);
    const cartItems = selectedCartItemIdSet.size > 0
      ? allCartItems.filter((item) => selectedCartItemIdSet.has(item.id))
      : allCartItems;

    if (cartItems.length === 0) {
      throw buildCartEmptyError();
    }

    if (selectedCartItemIdSet.size > 0 && cartItems.length !== selectedCartItemIdSet.size) {
      throw buildValidationError(
        'selected_cart_item_ids',
        'selected_cart_item_ids must belong to the target cart',
      );
    }

    const validCartItemIds = new Set(cartItems.map((item) => item.id));

    for (const cartItemId of parsedBody.travellers.keys()) {
      if (!validCartItemIds.has(cartItemId)) {
        throw buildValidationError(
          'travellers.cart_item_id',
          'travellers.cart_item_id must belong to the target cart',
        );
      }
    }

    const bookingItems = [];

    for (const cartItem of cartItems) {
      const service = await repository.getPublicServiceById(cartItem.service_id);

      if (!service) {
        throw buildCartItemUnavailableError(
          cartItem.id,
          'A cart item service is no longer available',
        );
      }

      if (
        cartItem.service_type !== service.service_type &&
        !(cartItem.service_type === SERVICE_TYPE.ROOM && service.service_type === SERVICE_TYPE.HOTEL)
      ) {
        throw buildCartItemUnavailableError(
          cartItem.id,
          'A cart item service no longer matches its current service type',
        );
      }

      let availabilityResult;

      try {
        availabilityResult = await resolvedAvailabilityService.getServiceAvailability({
          body: {
            end_at: cartItem.end_at,
            options: cartItem.options || {},
            quantity: Number(cartItem.quantity),
            reference_id: cartItem.reference_id,
            service_type: cartItem.service_type,
            start_at: cartItem.start_at,
          },
          service_id: cartItem.service_id,
        });
      } catch (error) {
        if (
          error?.code === API_ERROR_CODES.VALIDATION_ERROR ||
          error?.code === API_ERROR_CODES.RESOURCE_NOT_FOUND
        ) {
          throw buildCartItemUnavailableError(
            cartItem.id,
            'A cart item can no longer be checked for availability',
          );
        }

        throw error;
      }

      if (!availabilityResult.available) {
        throw buildCartItemUnavailableError(
          cartItem.id,
          'A cart item is no longer available',
          availabilityResult.issues,
        );
      }

      let detail = null;

      if (service.service_type === SERVICE_TYPE.HOTEL && cartItem.reference_id) {
        detail = await repository.getRoomTypeById(cartItem.reference_id);
      } else if (service.service_type === SERVICE_TYPE.FLIGHT && cartItem.reference_id) {
        detail = await repository.getFlightDetailById(cartItem.reference_id);
      } else if (service.service_type === SERVICE_TYPE.TRAIN && cartItem.reference_id) {
        detail = await repository.getTrainDetailById(cartItem.reference_id);
      }

      const unitPrice = roundMoney(availabilityResult.unit_price);
      const totalAmount = roundMoney(unitPrice * Number(cartItem.quantity));

      bookingItems.push({
        cart_item_id: cartItem.id,
        end_at: cartItem.end_at,
        quantity: Number(cartItem.quantity),
        reference_id: cartItem.reference_id,
        service_id: service.id,
        service_snapshot: buildServiceSnapshot({
          cartItem,
          detail,
          service,
          unitPrice,
        }),
        service_type: service.service_type,
        start_at: cartItem.start_at,
        status: BOOKING_ITEM_STATUS.PENDING,
        title_snapshot: service.title,
        total_amount: totalAmount,
        traveller_info: parsedBody.travellers.get(cartItem.id) ?? null,
        unit_price: unitPrice,
      });
    }

    const subtotalAmount = roundMoney(
      bookingItems.reduce((sum, item) => sum + item.total_amount, 0),
    );
    const {
      discountAmount,
      voucher,
    } = await validateVoucher({
      repository,
      subtotalAmount,
      userId: auth.userId,
      voucherCode: parsedBody.voucherCode,
    });
    const totalAmount = roundMoney(
      Math.max(0, subtotalAmount - discountAmount),
    );

    const result = await repository.createCheckout({
      actorUserId: auth.userId,
      booking: {
        booking_code: buildBookingCode(),
        contact_email: parsedBody.contactEmail,
        contact_name: parsedBody.contactName,
        contact_phone: parsedBody.contactPhone,
        currency: DEFAULT_CURRENCY,
        discount_amount: discountAmount,
        expires_at: buildExpiresAt(),
        note: parsedBody.note,
        status: BOOKING_STATUS.PENDING_PAYMENT,
        subtotal_amount: subtotalAmount,
        total_amount: totalAmount,
        user_id: auth.userId,
        voucher_id: voucher?.id || null,
      },
      bookingItems,
      cartId: parsedBody.cartId,
      checkedOutCartItemIds: cartItems.map((item) => item.id),
      idempotencyKey,
      voucherCode: parsedBody.voucherCode,
    });

    return sanitizeCheckoutResponse(result);
  };

  const listMyBookings = async ({
    auth,
    query,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedQuery = parseListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listBookingsByUser({
      limit: parsedQuery.limit,
      offset,
      status: parsedQuery.status,
      userId: auth.userId,
    });

    return {
      items: result.rows.map(sanitizeBookingSummary),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getMyBookingDetail = async ({
    auth,
    bookingId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const booking = await repository.getBookingByIdAndUser({
      bookingId: parsedBookingId,
      userId: auth.userId,
    });

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
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

  const getMyBookingItems = async ({
    auth,
    bookingId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const booking = await repository.getBookingByIdAndUser({
      bookingId: parsedBookingId,
      userId: auth.userId,
    });

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    const items = await repository.listBookingItemsByBookingId(parsedBookingId);

    return items.map(sanitizeBookingItemSnapshot);
  };

  const getMyBookingStatusHistory = async ({
    auth,
    bookingId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const booking = await repository.getBookingByIdAndUser({
      bookingId: parsedBookingId,
      userId: auth.userId,
    });

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    const histories =
      await repository.listBookingStatusHistoriesByBookingId(parsedBookingId);

    return histories.map(sanitizeBookingStatusHistoryEntry);
  };

  const getMyBookingInvoice = async ({
    auth,
    bookingId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const booking = await repository.getBookingByIdAndUser({
      bookingId: parsedBookingId,
      userId: auth.userId,
    });

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    const [items, payments, refunds] = await Promise.all([
      repository.listBookingItemsByBookingId(parsedBookingId),
      repository.listBookingPaymentsByBookingId(parsedBookingId),
      repository.listBookingRefundsByBookingId(parsedBookingId),
    ]);

    return sanitizeInvoiceResponse({
      booking,
      items,
      payments,
      refunds,
    });
  };

  const downloadMyBookingSummary = async ({
    auth,
    bookingId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const booking = await repository.getBookingByIdAndUser({
      bookingId: parsedBookingId,
      userId: auth.userId,
    });

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    const [items, payments, refunds] = await Promise.all([
      repository.listBookingItemsByBookingId(parsedBookingId),
      repository.listBookingPaymentsByBookingId(parsedBookingId),
      repository.listBookingRefundsByBookingId(parsedBookingId),
    ]);
    const filename = `${buildSafeFilename(booking.booking_code, 'booking-summary')}.pdf`;
    const lines = buildBookingSummaryPdfLines({
      booking,
      items,
      payments: payments.map(sanitizePaymentSummary),
      refunds: refunds.map(sanitizeRefundSummary),
    });

    return {
      buffer: buildSimplePdfBuffer(lines),
      contentDisposition: `attachment; filename="${filename}"`,
      contentType: 'application/pdf',
      filename,
    };
  };

  const requestBookingCancellation = async ({
    auth,
    body,
    bookingId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const parsedBody = parseCancelRequestBody(body || {});
    const booking = await repository.getBookingByIdAndUser({
      bookingId: parsedBookingId,
      userId: auth.userId,
    });

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    if (booking.status === BOOKING_STATUS.CANCEL_REQUESTED) {
      return sanitizeCancelRequestResponse(booking);
    }

    if (!CANCEL_REQUEST_ALLOWED_STATUSES.includes(booking.status)) {
      throw buildInvalidStateTransitionError(
        'This booking status does not allow a cancellation request',
      );
    }

    const updatedBooking = await repository.requestBookingCancellation({
      actorUserId: auth.userId,
      bookingId: parsedBookingId,
      fromStatus: booking.status,
      reason: parsedBody.reason,
    });

    return sanitizeCancelRequestResponse(updatedBooking);
  };

  const updateMyBookingContact = async ({
    auth,
    body,
    bookingId,
  } = {}) => {
    validateCustomerAuth(auth);

    const parsedBookingId = parseUuid('booking_id', bookingId);
    const updates = parseContactUpdateBody(body || {});
    const booking = await repository.getBookingByIdAndUser({
      bookingId: parsedBookingId,
      userId: auth.userId,
    });

    if (!booking) {
      throw buildResourceNotFoundError('Booking not found');
    }

    if (!CONTACT_UPDATE_ALLOWED_STATUSES.includes(booking.status)) {
      throw buildInvalidStateTransitionError(
        'This booking status does not allow contact updates',
      );
    }

    const updatedBooking = await repository.updateBookingContact({
      actorUserId: auth.userId,
      bookingId: parsedBookingId,
      updates,
    });

    return sanitizeBookingContactResponse(updatedBooking);
  };

  return {
    checkout,
    downloadMyBookingSummary,
    getMyBookingInvoice,
    getMyBookingDetail,
    getMyBookingItems,
    getMyBookingStatusHistory,
    listMyBookings,
    requestBookingCancellation,
    updateMyBookingContact,
  };
};

module.exports = Object.assign(createBookingService(), {
  createBookingService,
});
