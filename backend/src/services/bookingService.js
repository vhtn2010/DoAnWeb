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

const buildDuplicateError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    field,
    message,
    statusCode: 409,
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

const parseIdempotencyKey = (headers = {}) => {
  const value = headers[IDEMPOTENCY_KEY_HEADER] ?? headers[IDEMPOTENCY_KEY_HEADER.toLowerCase()];

  if (value == null || value === '') {
    return null;
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
    return null;
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
    const idempotencyKey = parseIdempotencyKey(headers);

    if (idempotencyKey) {
      const existingBooking = await repository.findBookingByIdempotencyKey({
        idempotencyKey,
        userId: auth.userId,
      });

      if (existingBooking) {
        throw buildDuplicateError(
          IDEMPOTENCY_KEY_HEADER,
          'A booking has already been created for this Idempotency-Key',
        );
      }
    }

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

    const cartItems = await repository.listCartItemsByCartId(parsedBody.cartId);

    if (cartItems.length === 0) {
      throw buildCartEmptyError();
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
            service_type: service.service_type,
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

  return {
    checkout,
    getMyBookingDetail,
    listMyBookings,
  };
};

module.exports = Object.assign(createBookingService(), {
  createBookingService,
});
