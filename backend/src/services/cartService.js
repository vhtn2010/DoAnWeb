const {
  API_ERROR_CODES,
  CART_STATUS,
  DISCOUNT_TYPE,
  DOMAIN_CONSTRAINTS,
  PROMOTION_STATUS,
  SERVICE_TYPE,
  SERVICE_TYPE_VALUES,
  VOUCHER_STATUS,
} = require('../constants/domainConstraints');
const { withTransaction } = require('../database/client');
const { createCartRepository } = require('../database/cartRepository');
const AppError = require('../utils/AppError');
const {
  calculateItemPricing,
  calculatePricingSummary,
} = require('../utils/pricing');

const UNIQUE_VIOLATION_ERROR_CODE = '23505';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROOM_BASED_SERVICE_TYPES = new Set([SERVICE_TYPE.HOTEL, SERVICE_TYPE.ROOM]);
const ADD_ALLOWED_FIELDS = new Set([
  'end_at',
  'options',
  'quantity',
  'reference_id',
  'service_id',
  'service_type',
  'start_at',
]);
const UPDATE_ALLOWED_FIELDS = new Set([
  'end_at',
  'options',
  'quantity',
  'start_at',
]);
const APPLY_VOUCHER_ALLOWED_FIELDS = new Set(['code', 'selected_cart_item_ids']);
const MERGE_ALLOWED_FIELDS = new Set(['guest_items']);
const SUMMARY_ALLOWED_QUERY_FIELDS = new Set(['voucher_code']);
const VALIDATE_ALLOWED_FIELDS = new Set(['selected_cart_item_ids', 'voucher_code']);
const ADD_SCOPE_LABEL = 'POST /cart/items';
const UPDATE_SCOPE_LABEL = 'PATCH /cart/items/{cart_item_id}';
const APPLY_VOUCHER_SCOPE_LABEL = 'POST /cart/apply-voucher';
const REMOVE_VOUCHER_SCOPE_LABEL = 'DELETE /cart/voucher';
const MERGE_SCOPE_LABEL = 'POST /cart/merge';
const SUMMARY_SCOPE_LABEL = 'GET /cart/summary';
const VALIDATE_SCOPE_LABEL = 'POST /cart/validate';
const MAX_VOUCHER_CODE_LENGTH = 50;
const MAX_GUEST_ITEMS = 50;

const toIsoString = (value) => value?.toISOString?.() || value || null;

const toNumber = (value) => {
  if (value == null) {
    return null;
  }

  return Number(value);
};

const isPlainObject = (value) =>
  value != null &&
  typeof value === 'object' &&
  !Array.isArray(value) &&
  Object.getPrototypeOf(value) === Object.prototype;

const stableStringify = (value) => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
};

const buildServiceDetails = (item) => {
  if (item.service_type === SERVICE_TYPE.TOUR) {
    return {
      departure_location: item.departure_location,
      destination_location: item.destination_location,
      duration_days:
        item.duration_days == null ? null : Number(item.duration_days),
      duration_nights:
        item.duration_nights == null ? null : Number(item.duration_nights),
      transport_type: item.transport_type,
    };
  }

  if (ROOM_BASED_SERVICE_TYPES.has(item.service_type)) {
    return {
      address: item.address,
      checkin_time: item.checkin_time,
      checkout_time: item.checkout_time,
      star_rating:
        item.star_rating == null ? null : Number(item.star_rating),
    };
  }

  return null;
};

const buildSelection = (item) => {
  if (ROOM_BASED_SERVICE_TYPES.has(item.service_type) && item.room_type_id) {
    return {
      available_rooms:
        item.room_type_available_rooms == null
          ? null
          : Number(item.room_type_available_rooms),
      base_price: toNumber(item.room_type_base_price),
      bed_type: item.room_type_bed_type,
      id: item.room_type_id,
      max_adults:
        item.room_type_max_adults == null
          ? null
          : Number(item.room_type_max_adults),
      max_children:
        item.room_type_max_children == null
          ? null
          : Number(item.room_type_max_children),
      name: item.room_type_name,
      status: item.room_type_status,
      type: 'room_type',
    };
  }

  if (item.service_type === SERVICE_TYPE.FLIGHT && item.flight_detail_id) {
    return {
      airline_name: item.airline_name,
      arrival_airport: item.arrival_airport,
      arrival_at: toIsoString(item.arrival_at),
      cabin_class: item.cabin_class,
      departure_airport: item.departure_airport,
      departure_at: toIsoString(item.departure_at),
      fare_price: toNumber(item.fare_price),
      flight_number: item.flight_number,
      id: item.flight_detail_id,
      seats_available:
        item.seats_available == null ? null : Number(item.seats_available),
      status: item.flight_status,
      type: 'flight_detail',
    };
  }

  if (item.service_type === SERVICE_TYPE.TRAIN && item.train_detail_id) {
    return {
      arrival_at: toIsoString(item.train_arrival_at),
      arrival_station: item.arrival_station,
      departure_at: toIsoString(item.train_departure_at),
      departure_station: item.departure_station,
      fare_price: toNumber(item.train_fare_price),
      id: item.train_detail_id,
      seat_class: item.seat_class,
      seats_available:
        item.train_seats_available == null
          ? null
          : Number(item.train_seats_available),
      status: item.train_status,
      train_number: item.train_number,
      type: 'train_detail',
    };
  }

  return null;
};

const mapCartItem = (item) => {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unit_price_snapshot);
  const totalAmount = unitPrice * quantity;

  return {
    created_at: toIsoString(item.created_at),
    end_at: toIsoString(item.end_at),
    id: item.id,
    options: item.options || null,
    quantity,
    reference_id: item.reference_id,
    selection: buildSelection(item),
    service: {
      base_price: toNumber(item.base_price),
      cancellation_policy: item.cancellation_policy,
      currency: item.currency || DOMAIN_CONSTRAINTS.defaultCurrency,
      current_price: toNumber(item.current_price),
      details: buildServiceDetails(item),
      id: item.service_id,
      location_text: item.location_text,
      primary_image: item.primary_image || null,
      sale_price: toNumber(item.sale_price),
      service_type: item.service_type,
      short_description: item.short_description,
      slug: item.slug,
      status: item.service_status,
      title: item.title,
    },
    service_id: item.service_id,
    service_type: item.service_type,
    start_at: toIsoString(item.start_at),
    total_amount: totalAmount,
    unit_price_snapshot: unitPrice,
  };
};

const buildSummaryFromItems = (items) => {
  const summary = calculatePricingSummary(items);

  return {
    currency: summary.currency,
    discount_amount: summary.discount_amount,
    item_count: summary.item_count,
    pricing_breakdown: summary.pricing_breakdown,
    quantity_total: summary.quantity_total,
    service_fee_amount: summary.service_fee_amount,
    subtotal_amount: summary.subtotal_amount,
    surcharge_amount: summary.surcharge_amount,
    tax_and_fee_amount: summary.tax_and_fee_amount,
    total_amount: summary.total_amount,
    vat_amount: summary.vat_amount,
  };
};

const mapCart = (cart, itemRows) => {
  const items = itemRows.map(mapCartItem);

  return {
    created_at: toIsoString(cart.created_at),
    id: cart.id,
    items,
    status: cart.status,
    summary: buildSummaryFromItems(items),
    updated_at: toIsoString(cart.updated_at),
  };
};

const createValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const createResourceNotFoundError = (message) =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const createCartItemNotAvailableError = (
  message = 'Requested cart item is not available',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.CART_ITEM_NOT_AVAILABLE,
    statusCode: 400,
  });

const createCartEmptyError = (message = 'Cart is empty') =>
  new AppError(message, {
    code: API_ERROR_CODES.CART_EMPTY,
    statusCode: 400,
  });

const createVoucherError = (code, message) =>
  new AppError(message, {
    code,
    statusCode: 400,
  });

const createInternalError = (message) =>
  new AppError(message, {
    code: API_ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
  });

const logMultipleActiveCarts = (logger, userId, carts) => {
  if (carts.length <= 1) {
    return;
  }

  logger.error(
    `Detected multiple active carts for user ${userId}. Using newest cart ${carts[0].id}.`,
  );
};

const ensureObjectPayload = (payload) =>
  payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : {};

const buildDisallowedFieldDetails = (
  fields,
  {
    scopeLabel,
  },
) =>
  fields.map((field) => ({
    field,
    message: `${field} is not allowed in ${scopeLabel}`,
  }));

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw createValidationError([
      {
        field,
        message: `${field} must be a valid UUID`,
      },
    ]);
  }

  return value.trim();
};

const parsePositiveInteger = (field, value) => {
  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) {
    throw createValidationError([
      {
        field,
        message: `${field} must be a positive integer`,
      },
    ]);
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw createValidationError([
      {
        field,
        message: `${field} must be a positive integer`,
      },
    ]);
  }

  return parsed;
};

const parseOptionalIsoDateTime = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw createValidationError([
      {
        field,
        message: `${field} must be a valid ISO 8601 datetime`,
      },
    ]);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw createValidationError([
      {
        field,
        message: `${field} must be a valid ISO 8601 datetime`,
      },
    ]);
  }

  return parsed;
};

const normalizeOptions = (field, value) => {
  if (value == null) {
    return null;
  }

  if (!isPlainObject(value)) {
    throw createValidationError([
      {
        field,
        message: `${field} must be an object`,
      },
    ]);
  }

  return value;
};

const roundMoney = (value) => Number(value.toFixed(2));

const validateDateRange = ({ endAt, startAt }) => {
  if (startAt && endAt && endAt <= startAt) {
    throw createValidationError([
      {
        field: 'end_at',
        message: 'end_at must be greater than start_at',
      },
    ]);
  }
};

const normalizeAddPayload = (payload = {}) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const providedKeys = Object.keys(body);
  const disallowedKeys = providedKeys.filter((key) => !ADD_ALLOWED_FIELDS.has(key));

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        scopeLabel: ADD_SCOPE_LABEL,
      }),
    );
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'service_id')) {
    details.push({
      field: 'service_id',
      message: 'service_id is required',
    });
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'service_type')) {
    details.push({
      field: 'service_type',
      message: 'service_type is required',
    });
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'quantity')) {
    details.push({
      field: 'quantity',
      message: 'quantity is required',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  const serviceId = parseUuid('service_id', body.service_id);
  const serviceType = typeof body.service_type === 'string'
    ? body.service_type.trim()
    : null;

  if (!SERVICE_TYPE_VALUES.includes(serviceType)) {
    throw createValidationError([
      {
        field: 'service_type',
        message: `service_type must be one of: ${SERVICE_TYPE_VALUES.join(', ')}`,
      },
    ]);
  }

  const quantity = parsePositiveInteger('quantity', body.quantity);
  const startAt = parseOptionalIsoDateTime('start_at', body.start_at);
  const endAt = parseOptionalIsoDateTime('end_at', body.end_at);
  const referenceId =
    body.reference_id == null || body.reference_id === ''
      ? null
      : parseUuid('reference_id', body.reference_id);
  const options = normalizeOptions('options', body.options);

  validateDateRange({ endAt, startAt });

  return {
    endAt,
    options,
    quantity,
    referenceId,
    serviceId,
    serviceType,
    startAt,
  };
};

const normalizeUpdatePayload = (payload = {}) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const providedKeys = Object.keys(body);
  const disallowedKeys = providedKeys.filter((key) => !UPDATE_ALLOWED_FIELDS.has(key));

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        scopeLabel: UPDATE_SCOPE_LABEL,
      }),
    );
  }

  if (providedKeys.length === 0) {
    details.push({
      field: 'body',
      message: 'At least one updatable field is required',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  const hasQuantity = Object.prototype.hasOwnProperty.call(body, 'quantity');
  const hasStartAt = Object.prototype.hasOwnProperty.call(body, 'start_at');
  const hasEndAt = Object.prototype.hasOwnProperty.call(body, 'end_at');
  const hasOptions = Object.prototype.hasOwnProperty.call(body, 'options');
  const quantity = hasQuantity
    ? parsePositiveInteger('quantity', body.quantity)
    : null;
  const startAt = hasStartAt
    ? parseOptionalIsoDateTime('start_at', body.start_at)
    : null;
  const endAt = hasEndAt
    ? parseOptionalIsoDateTime('end_at', body.end_at)
    : null;
  const options = hasOptions ? normalizeOptions('options', body.options) : null;

  return {
    hasEndAt,
    hasOptions,
    hasQuantity,
    hasStartAt,
    options,
    quantity,
    endAt,
    startAt,
  };
};

const normalizeSummaryQuery = (query = {}) => {
  const queryObject = ensureObjectPayload(query);
  const details = [];
  const providedKeys = Object.keys(queryObject);
  const disallowedKeys = providedKeys.filter(
    (key) => !SUMMARY_ALLOWED_QUERY_FIELDS.has(key),
  );

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        scopeLabel: SUMMARY_SCOPE_LABEL,
      }),
    );
  }

  if (!Object.prototype.hasOwnProperty.call(queryObject, 'voucher_code')) {
    if (details.length > 0) {
      throw createValidationError(details);
    }

    return {
      voucherCode: null,
    };
  }

  const { voucher_code: voucherCode } = queryObject;

  if (voucherCode == null || voucherCode === '') {
    if (details.length > 0) {
      throw createValidationError(details);
    }

    return {
      voucherCode: null,
    };
  }

  if (typeof voucherCode !== 'string') {
    details.push({
      field: 'voucher_code',
      message: 'voucher_code must be a string',
    });
  } else {
    const normalizedVoucherCode = voucherCode.trim().toUpperCase();

    if (normalizedVoucherCode.length > MAX_VOUCHER_CODE_LENGTH) {
      details.push({
        field: 'voucher_code',
        message: `voucher_code must not exceed ${MAX_VOUCHER_CODE_LENGTH} characters`,
      });
    }

    if (details.length > 0) {
      throw createValidationError(details);
    }

    return {
      voucherCode: normalizedVoucherCode || null,
    };
  }

  throw createValidationError(details);
};

const normalizeValidatePayload = (payload = {}) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const providedKeys = Object.keys(body);
  const disallowedKeys = providedKeys.filter(
    (key) => !VALIDATE_ALLOWED_FIELDS.has(key),
  );

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        scopeLabel: VALIDATE_SCOPE_LABEL,
      }),
    );
  }

  let selectedCartItemIds = [];

  if (Object.prototype.hasOwnProperty.call(body, 'selected_cart_item_ids')) {
    if (!Array.isArray(body.selected_cart_item_ids)) {
      details.push({
        field: 'selected_cart_item_ids',
        message: 'selected_cart_item_ids must be an array',
      });
    } else {
      selectedCartItemIds = [...new Set(body.selected_cart_item_ids.map((itemId) =>
        parseUuid('selected_cart_item_ids', itemId),
      ))];
    }
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'voucher_code')) {
    if (details.length > 0) {
      throw createValidationError(details);
    }

    return {
      selectedCartItemIds,
      voucherCode: null,
    };
  }

  const { voucher_code: voucherCode } = body;

  if (voucherCode == null || voucherCode === '') {
    if (details.length > 0) {
      throw createValidationError(details);
    }

    return {
      selectedCartItemIds,
      voucherCode: null,
    };
  }

  if (typeof voucherCode !== 'string') {
    details.push({
      field: 'voucher_code',
      message: 'voucher_code must be a string',
    });
  } else {
    const normalizedVoucherCode = voucherCode.trim().toUpperCase();

    if (normalizedVoucherCode.length > MAX_VOUCHER_CODE_LENGTH) {
      details.push({
        field: 'voucher_code',
        message: `voucher_code must not exceed ${MAX_VOUCHER_CODE_LENGTH} characters`,
      });
    }

    if (details.length > 0) {
      throw createValidationError(details);
    }

    return {
      selectedCartItemIds,
      voucherCode: normalizedVoucherCode || null,
    };
  }

  throw createValidationError(details);
};

const normalizeApplyVoucherPayload = (payload = {}) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const providedKeys = Object.keys(body);
  const disallowedKeys = providedKeys.filter(
    (key) => !APPLY_VOUCHER_ALLOWED_FIELDS.has(key),
  );

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        scopeLabel: APPLY_VOUCHER_SCOPE_LABEL,
      }),
    );
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'code')) {
    details.push({
      field: 'code',
      message: 'code is required',
    });
  }

  let selectedCartItemIds = [];

  if (Object.prototype.hasOwnProperty.call(body, 'selected_cart_item_ids')) {
    if (!Array.isArray(body.selected_cart_item_ids)) {
      details.push({
        field: 'selected_cart_item_ids',
        message: 'selected_cart_item_ids must be an array',
      });
    } else {
      selectedCartItemIds = [...new Set(body.selected_cart_item_ids.map((itemId) =>
        parseUuid('selected_cart_item_ids', itemId),
      ))];
    }
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  if (typeof body.code !== 'string') {
    throw createValidationError([
      {
        field: 'code',
        message: 'code must be a string',
      },
    ]);
  }

  const code = body.code.trim().toUpperCase();

  if (!code) {
    throw createValidationError([
      {
        field: 'code',
        message: 'code is required',
      },
    ]);
  }

  if (code.length > MAX_VOUCHER_CODE_LENGTH) {
    throw createValidationError([
      {
        field: 'code',
        message: `code must not exceed ${MAX_VOUCHER_CODE_LENGTH} characters`,
      },
    ]);
  }

  return {
    code,
    selectedCartItemIds,
  };
};

const normalizeMergePayload = (payload = {}) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const providedKeys = Object.keys(body);
  const disallowedKeys = providedKeys.filter(
    (key) => !MERGE_ALLOWED_FIELDS.has(key),
  );

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        scopeLabel: MERGE_SCOPE_LABEL,
      }),
    );
  }

  if (!Object.prototype.hasOwnProperty.call(body, 'guest_items')) {
    details.push({
      field: 'guest_items',
      message: 'guest_items is required',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  if (!Array.isArray(body.guest_items)) {
    throw createValidationError([
      {
        field: 'guest_items',
        message: 'guest_items must be an array',
      },
    ]);
  }

  if (body.guest_items.length > MAX_GUEST_ITEMS) {
    throw createValidationError([
      {
        field: 'guest_items',
        message: `guest_items must not contain more than ${MAX_GUEST_ITEMS} items`,
      },
    ]);
  }

  return {
    guestItems: body.guest_items,
  };
};

const parseOptionalGuestCount = (field, value) => {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw createValidationError([
      {
        field,
        message: `${field} must be a non-negative integer`,
      },
    ]);
  }

  return parsed;
};

const resolvePublicPriceAndCurrency = (service) => ({
  currency: service.currency || DOMAIN_CONSTRAINTS.defaultCurrency,
  unitPrice:
    service.sale_price == null
      ? Number(service.base_price)
      : Number(service.sale_price),
});

const extractAvailableSlotsFromSchedule = (scheduleItem) => {
  if (!scheduleItem || typeof scheduleItem !== 'object') {
    return 0;
  }

  for (const key of ['available_slots', 'availableSlots', 'slots_available']) {
    const value = Number(scheduleItem[key]);

    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }

  return 0;
};

const normalizeScheduleDateValue = (value) => {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
};

const findMatchingDepartureSchedule = (departureSchedule, startAt) => {
  if (!Array.isArray(departureSchedule) || !startAt) {
    return null;
  }

  const targetDate = startAt.toISOString().slice(0, 10);

  return (
    departureSchedule.find((item) => {
      if (!item || typeof item !== 'object') {
        return false;
      }

      return normalizeScheduleDateValue(item.date || item.departure_at) === targetDate;
    }) || null
  );
};

const isFutureDate = (date) => date.getTime() > Date.now();

const normalizeOptionsForEquality = (options) => stableStringify(options || null);

const datesEqual = (left, right) => {
  if (left == null && right == null) {
    return true;
  }

  if (left == null || right == null) {
    return false;
  }

  return new Date(left).getTime() === new Date(right).getTime();
};

const findDuplicateItem = (items, candidate) =>
  items.find((item) => {
    return (
      item.service_id === candidate.serviceId &&
      item.service_type === candidate.serviceType &&
      item.reference_id === candidate.referenceId &&
      datesEqual(item.start_at, candidate.startAt) &&
      datesEqual(item.end_at, candidate.endAt) &&
      normalizeOptionsForEquality(item.options) ===
        normalizeOptionsForEquality(candidate.options)
    );
  }) || null;

const ensureServiceIsAvailableForCart = (service, requestedServiceType) => {
  if (!service) {
    throw createResourceNotFoundError('Service not found');
  }

  if (service.service_type !== requestedServiceType) {
    throw createValidationError([
      {
        field: 'service_type',
        message: 'service_type does not match the target service',
      },
    ]);
  }

  if (service.deleted_at != null || service.status !== 'active') {
    throw createCartItemNotAvailableError('Service is not available');
  }
};

const resolveAvailability = async (
  queryExecutor,
  repository,
  service,
  {
    options,
    quantity,
    referenceId,
    serviceType,
    startAt,
  },
) => {
  if (serviceType === SERVICE_TYPE.TOUR) {
    const detail = await repository.getTourDetail(queryExecutor, service.id);

    if (!detail) {
      throw createCartItemNotAvailableError('Tour is not available');
    }

    const { currency, unitPrice } = resolvePublicPriceAndCurrency(service);
    const departureSchedule = Array.isArray(detail.departure_schedule)
      ? detail.departure_schedule
      : [];

    if (startAt) {
      const matchedSchedule = findMatchingDepartureSchedule(
        departureSchedule,
        startAt,
      );

      if (
        !matchedSchedule ||
        !isFutureDate(new Date(`${startAt.toISOString().slice(0, 10)}T00:00:00.000Z`))
      ) {
        throw createCartItemNotAvailableError('Tour departure is not available');
      }

      const availableQuantity = extractAvailableSlotsFromSchedule(matchedSchedule);

      if (quantity > availableQuantity) {
        throw createCartItemNotAvailableError('Requested quantity exceeds available tour slots');
      }

      return {
        availableQuantity,
        currency,
        unitPrice,
      };
    }

    const futureSchedules = departureSchedule.filter((item) => {
      const normalizedDate = normalizeScheduleDateValue(
        item?.date || item?.departure_at,
      );

      if (!normalizedDate) {
        return false;
      }

      return isFutureDate(new Date(`${normalizedDate}T00:00:00.000Z`));
    });

    if (futureSchedules.length === 0) {
      throw createCartItemNotAvailableError('Tour is not available');
    }

    const availableQuantity = futureSchedules.reduce(
      (max, item) => Math.max(max, extractAvailableSlotsFromSchedule(item)),
      0,
    );

    if (quantity > availableQuantity) {
      throw createCartItemNotAvailableError('Requested quantity exceeds available tour slots');
    }

    return {
      availableQuantity,
      currency,
      unitPrice,
    };
  }

  if (ROOM_BASED_SERVICE_TYPES.has(serviceType)) {
    if (!referenceId) {
      throw createValidationError([
        {
          field: 'reference_id',
          message: 'reference_id is required for hotel or room cart items',
        },
      ]);
    }

    const roomType = await repository.getRoomTypeById(queryExecutor, referenceId);

    if (!roomType || roomType.hotel_service_id !== service.id) {
      throw createCartItemNotAvailableError('Room type is not available for this service');
    }

    if (roomType.status !== 'active') {
      throw createCartItemNotAvailableError('Room type is not available');
    }

    const adults = parseOptionalGuestCount('options.adults', options?.adults);
    const children = parseOptionalGuestCount(
      'options.children',
      options?.children,
    );

    if (adults != null && adults > Number(roomType.max_adults)) {
      throw createCartItemNotAvailableError('Requested adults exceed room capacity');
    }

    if (children != null && children > Number(roomType.max_children)) {
      throw createCartItemNotAvailableError('Requested children exceed room capacity');
    }

    const availableQuantity = Number(roomType.available_rooms);

    if (quantity > availableQuantity) {
      throw createCartItemNotAvailableError('Requested quantity exceeds available rooms');
    }

    return {
      availableQuantity,
      currency: service.currency || DOMAIN_CONSTRAINTS.defaultCurrency,
      unitPrice: Number(roomType.base_price),
    };
  }

  if (serviceType === SERVICE_TYPE.FLIGHT) {
    if (!referenceId) {
      throw createValidationError([
        {
          field: 'reference_id',
          message: 'reference_id is required for flight cart items',
        },
      ]);
    }

    const detail = await repository.getFlightDetailById(queryExecutor, referenceId);

    if (!detail || detail.service_id !== service.id) {
      throw createCartItemNotAvailableError('Flight detail is not available for this service');
    }

    if (detail.status !== 'open' || !isFutureDate(new Date(detail.departure_at))) {
      throw createCartItemNotAvailableError('Flight is not available');
    }

    const availableQuantity = Number(detail.seats_available);

    if (quantity > availableQuantity) {
      throw createCartItemNotAvailableError('Requested quantity exceeds available flight seats');
    }

    return {
      availableQuantity,
      currency: service.currency || DOMAIN_CONSTRAINTS.defaultCurrency,
      unitPrice: Number(detail.fare_price),
    };
  }

  if (serviceType === SERVICE_TYPE.TRAIN) {
    if (!referenceId) {
      throw createValidationError([
        {
          field: 'reference_id',
          message: 'reference_id is required for train cart items',
        },
      ]);
    }

    const detail = await repository.getTrainDetailById(queryExecutor, referenceId);

    if (!detail || detail.service_id !== service.id) {
      throw createCartItemNotAvailableError('Train detail is not available for this service');
    }

    if (detail.status !== 'open' || !isFutureDate(new Date(detail.departure_at))) {
      throw createCartItemNotAvailableError('Train is not available');
    }

    const availableQuantity = Number(detail.seats_available);

    if (quantity > availableQuantity) {
      throw createCartItemNotAvailableError('Requested quantity exceeds available train seats');
    }

    return {
      availableQuantity,
      currency: service.currency || DOMAIN_CONSTRAINTS.defaultCurrency,
      unitPrice: Number(detail.fare_price),
    };
  }

  const { currency, unitPrice } = resolvePublicPriceAndCurrency(service);

  return {
    availableQuantity: null,
    currency,
    unitPrice,
  };
};

const findMappedCartItem = (items, cartItemId) =>
  items.find((item) => item.id === cartItemId) || null;

const buildEmptySummary = () => ({
  currency: DOMAIN_CONSTRAINTS.defaultCurrency,
  discount_amount: 0,
  item_count: 0,
  pricing_breakdown: {
    items: [],
    vat_rate: 0.08,
  },
  quantity_total: 0,
  service_fee_amount: 0,
  subtotal_amount: 0,
  surcharge_amount: 0,
  tax_and_fee_amount: 0,
  total_amount: 0,
  vat_amount: 0,
});

const buildPricingSummary = (
  items,
  {
    cartId = null,
    discountAmount = 0,
    voucher = null,
  } = {},
) => {
  const summary = calculatePricingSummary(items, {
    cartId,
    discountAmount,
    voucher,
  });

  return summary;
};

const buildEmptyPricingSummary = ({ cartId = null, voucher = null } = {}) => ({
  cart_id: cartId,
  currency: DOMAIN_CONSTRAINTS.defaultCurrency,
  discount_amount: 0,
  item_count: 0,
  pricing_breakdown: {
    items: [],
    vat_rate: 0.08,
  },
  quantity_total: 0,
  service_fee_amount: 0,
  subtotal_amount: 0,
  surcharge_amount: 0,
  tax_and_fee_amount: 0,
  total_amount: 0,
  vat_amount: 0,
  voucher,
});

const buildVoucherIssue = (code, message) => ({
  code,
  message,
});

const buildVoucherResponse = (
  voucherCode,
  {
    applied = false,
    discountAmount = 0,
    issue = null,
    voucher = null,
  } = {},
) => {
  if (!voucherCode) {
    return null;
  }

  const normalizedCode = String(voucher?.code || voucherCode)
    .trim()
    .toUpperCase();

  return {
    applied,
    code: normalizedCode,
    discount_amount: roundMoney(Math.max(discountAmount, 0)),
    discount_type: voucher?.discount_type || null,
    discount_value:
      voucher?.discount_value == null ? null : Number(voucher.discount_value),
    issue,
    max_discount_amount:
      voucher?.max_discount_amount == null
        ? null
        : Number(voucher.max_discount_amount),
    min_order_amount:
      voucher?.min_order_amount == null ? null : Number(voucher.min_order_amount),
    promotion_id: voucher?.promotion_id || null,
    target_service_type: voucher?.target_service_type || null,
  };
};

const buildCartValidationIssue = (
  code,
  message,
  {
    cartItemId = null,
    scope = 'cart',
    serviceId = null,
    voucherCode = null,
  } = {},
) => ({
  cart_item_id: cartItemId,
  code,
  message,
  scope,
  service_id: serviceId,
  voucher_code: voucherCode,
});

const resolveCurrentUnitPriceFromItemRow = (itemRow) => {
  if (!itemRow) {
    return null;
  }

  if (
    ROOM_BASED_SERVICE_TYPES.has(itemRow.service_type) &&
    itemRow.room_type_base_price != null
  ) {
    return Number(itemRow.room_type_base_price);
  }

  if (itemRow.service_type === SERVICE_TYPE.FLIGHT && itemRow.fare_price != null) {
    return Number(itemRow.fare_price);
  }

  if (
    itemRow.service_type === SERVICE_TYPE.TRAIN &&
    itemRow.train_fare_price != null
  ) {
    return Number(itemRow.train_fare_price);
  }

  if (itemRow.current_price != null) {
    return Number(itemRow.current_price);
  }

  return null;
};

const buildValidationServiceSummary = (itemRecord, service, itemRow) => ({
  currency:
    service?.currency ||
    itemRow?.currency ||
    DOMAIN_CONSTRAINTS.defaultCurrency,
  id: itemRecord.service_id,
  service_type: service?.service_type || itemRecord.service_type,
  status: service?.status || itemRow?.service_status || null,
  title: service?.title || itemRow?.title || null,
});

const mapCartItemRecordForValidation = (itemRecord, itemRow, service) => {
  const quantity = Number(itemRecord.quantity);
  const snapshotUnitPrice = Number(itemRecord.unit_price_snapshot);
  const snapshotTotalAmount = roundMoney(snapshotUnitPrice * Math.max(quantity, 0));
  const currentUnitPrice = resolveCurrentUnitPriceFromItemRow(itemRow);

  return {
    available_quantity: null,
    created_at: toIsoString(itemRecord.created_at),
    current_total_amount:
      currentUnitPrice == null
        ? snapshotTotalAmount
        : roundMoney(currentUnitPrice * Math.max(quantity, 0)),
    current_unit_price: currentUnitPrice,
    end_at: toIsoString(itemRecord.end_at),
    id: itemRecord.id,
    issues: [],
    options: itemRecord.options || null,
    price_changed:
      currentUnitPrice == null
        ? false
        : roundMoney(currentUnitPrice) !== roundMoney(snapshotUnitPrice),
    quantity,
    reference_id: itemRecord.reference_id,
    service: buildValidationServiceSummary(itemRecord, service, itemRow),
    service_id: itemRecord.service_id,
    service_type: itemRecord.service_type,
    snapshot_total_amount: snapshotTotalAmount,
    start_at: toIsoString(itemRecord.start_at),
    unit_price_snapshot: snapshotUnitPrice,
    valid: true,
  };
};

const buildValidationSummary = (
  items,
  {
    cartId,
    discountAmount = 0,
    voucher = null,
  },
) => {
  const pricingItems = items.map((item) => ({
    options: item.options,
    quantity: item.quantity,
    service_type: item.service_type,
    total_amount: getItemEffectiveTotalAmount(item),
    unit_price_snapshot: item.current_unit_price ?? item.unit_price_snapshot,
  }));
  const pricingSummary = buildPricingSummary(pricingItems, {
    cartId,
    discountAmount,
    voucher,
  });

  return {
    ...pricingSummary,
    snapshot_subtotal_amount: roundMoney(
      items.reduce(
        (total, item) => total + item.snapshot_total_amount,
        0,
      ),
    ),
  };
};

const buildVoucherValidationResult = (
  voucherCode,
  {
    code,
    discountAmount = 0,
    message,
    voucher = null,
  } = {},
) => {
  const issue =
    code && message
      ? buildVoucherIssue(code, message)
      : null;

  return {
    discountAmount,
    issue,
    voucher: buildVoucherResponse(voucherCode, {
      applied: discountAmount > 0 && !issue,
      discountAmount,
      issue,
      voucher,
    }),
  };
};

const getItemEffectiveTotalAmount = (item) =>
  roundMoney(
    item.current_total_amount ??
      calculateItemPricing(item).subtotal_amount ??
      item.total_amount ??
      0,
  );

const isWithinVoucherWindow = (currentTime, validFrom, validTo) => {
  if (validFrom && currentTime < new Date(validFrom)) {
    return false;
  }

  if (validTo && currentTime > new Date(validTo)) {
    return false;
  }

  return true;
};

const calculateEligibleSubtotal = (items, targetServiceType) => {
  if (!targetServiceType) {
    return items.reduce(
      (total, item) => total + calculateItemPricing(item).subtotal_amount,
      0,
    );
  }

  return items.reduce((total, item) => {
    if (item.service_type !== targetServiceType) {
      return total;
    }

    return total + calculateItemPricing(item).subtotal_amount;
  }, 0);
};

const calculateVoucherDiscount = (
  voucher,
  {
    eligibleSubtotal,
    subtotalAmount,
  },
) => {
  let discountAmount = 0;

  if (voucher.discount_type === DISCOUNT_TYPE.PERCENT) {
    discountAmount =
      (eligibleSubtotal * Number(voucher.discount_value)) /
      DOMAIN_CONSTRAINTS.discountPercentMaxValue;
  } else if (voucher.discount_type === DISCOUNT_TYPE.FIXED_AMOUNT) {
    discountAmount = Number(voucher.discount_value);
  }

  if (voucher.max_discount_amount != null) {
    discountAmount = Math.min(
      discountAmount,
      Number(voucher.max_discount_amount),
    );
  }

  discountAmount = Math.min(discountAmount, eligibleSubtotal, subtotalAmount);

  return roundMoney(Math.max(discountAmount, 0));
};

const evaluateVoucherForCartValidation = async (
  queryExecutor,
  items,
  {
    currentTime,
    repository,
    userId,
    voucherCode,
  },
) => {
  if (!voucherCode) {
    return {
      discountAmount: 0,
      issue: null,
      voucher: null,
    };
  }

  const voucher = await repository.getVoucherByCode(queryExecutor, voucherCode);

  if (!voucher || voucher.voucher_status !== VOUCHER_STATUS.ACTIVE) {
    return buildVoucherValidationResult(voucherCode, {
      code: API_ERROR_CODES.VOUCHER_INVALID,
      message: 'Voucher is invalid',
      voucher,
    });
  }

  if (
    !isWithinVoucherWindow(
      currentTime,
      voucher.voucher_valid_from,
      voucher.voucher_valid_to,
    ) ||
    voucher.promotion_status !== PROMOTION_STATUS.ACTIVE ||
    !isWithinVoucherWindow(
      currentTime,
      voucher.promotion_valid_from,
      voucher.promotion_valid_to,
    )
  ) {
    return buildVoucherValidationResult(voucherCode, {
      code: API_ERROR_CODES.VOUCHER_EXPIRED,
      message: 'Voucher is expired or outside the valid time window',
      voucher,
    });
  }

  if (
    voucher.usage_limit_total != null &&
    Number(voucher.used_count) >= Number(voucher.usage_limit_total)
  ) {
    return buildVoucherValidationResult(voucherCode, {
      code: API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
      message: 'Voucher has reached the total usage limit',
      voucher,
    });
  }

  const userUsageCount = await repository.countUserVoucherUsages(
    queryExecutor,
    {
      userId,
      voucherId: voucher.id,
    },
  );

  if (userUsageCount >= Number(voucher.usage_limit_per_user)) {
    return buildVoucherValidationResult(voucherCode, {
      code: API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
      message: 'User has reached the voucher usage limit',
      voucher,
    });
  }

  const subtotalAmount = roundMoney(
    items.reduce((total, item) => total + getItemEffectiveTotalAmount(item), 0),
  );
  const pricingItems = items.map((item) => ({
    options: item.options,
    quantity: item.quantity,
    service_type: item.service_type,
    total_amount: getItemEffectiveTotalAmount(item),
    unit_price_snapshot: item.unit_price_snapshot,
  }));

  if (subtotalAmount < Number(voucher.min_order_amount)) {
    return buildVoucherValidationResult(voucherCode, {
      code: API_ERROR_CODES.VOUCHER_INVALID,
      message: 'Cart subtotal does not meet the voucher minimum order amount',
      voucher,
    });
  }

  const eligibleSubtotal = calculateEligibleSubtotal(
    pricingItems,
    voucher.target_service_type,
  );

  if (eligibleSubtotal <= 0) {
    return buildVoucherValidationResult(voucherCode, {
      code: API_ERROR_CODES.VOUCHER_INVALID,
      message: 'Voucher does not apply to the current cart items',
      voucher,
    });
  }

  const discountAmount = calculateVoucherDiscount(voucher, {
    eligibleSubtotal,
    subtotalAmount,
  });

  return buildVoucherValidationResult(voucherCode, {
    discountAmount,
    voucher,
  });
};

const assertVoucherCanBeApplied = (voucherResult) => {
  if (!voucherResult.issue) {
    return;
  }

  throw createVoucherError(
    voucherResult.issue.code,
    voucherResult.issue.message,
  );
};

const createCartService = ({
  logger = console,
  now = () => new Date(),
  repository = createCartRepository(),
  withTransactionImpl = withTransaction,
} = {}) => {
  const resolveActiveCart = async (
    queryExecutor,
    userId,
    {
      createIfMissing = false,
    } = {},
  ) => {
    let activeCarts = await repository.findActiveCartsByUser(queryExecutor, userId);

    logMultipleActiveCarts(logger, userId, activeCarts);

    let activeCart = activeCarts[0] || null;

    if (!activeCart && createIfMissing) {
      try {
        activeCart = await repository.createActiveCart(queryExecutor, {
          createdAt: now(),
          userId,
        });
      } catch (error) {
        if (error?.code !== UNIQUE_VIOLATION_ERROR_CODE) {
          throw error;
        }

        activeCarts = await repository.findActiveCartsByUser(queryExecutor, userId);
        logMultipleActiveCarts(logger, userId, activeCarts);
        activeCart = activeCarts[0] || null;
      }
    }

    if (!activeCart && createIfMissing) {
      throw createInternalError('Unable to resolve active cart');
    }

    return activeCart;
  };

  const loadMappedCart = async (queryExecutor, cart) => {
    const itemRows = await repository.listCartItems(queryExecutor, cart.id);
    return mapCart(cart, itemRows);
  };

  const getActiveCart = async ({ userId }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const activeCart = await resolveActiveCart(queryExecutor, userId, {
        createIfMissing: true,
      });

      return loadMappedCart(queryExecutor, activeCart);
    });

  const getCartSummary = async ({
    query,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const {
        voucherCode,
      } = normalizeSummaryQuery(query);
      const activeCart = await resolveActiveCart(queryExecutor, userId);

      if (!activeCart || activeCart.status !== CART_STATUS.ACTIVE) {
        return buildEmptyPricingSummary();
      }

      const itemRows = await repository.listCartItems(queryExecutor, activeCart.id);
      const items = itemRows.map(mapCartItem);

      if (items.length === 0) {
        return buildEmptyPricingSummary({
          cartId: activeCart.id,
        });
      }

      if (!voucherCode) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
        });
      }

      const voucher = await repository.getVoucherByCode(queryExecutor, voucherCode);

      if (!voucher) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'VOUCHER_NOT_FOUND',
              'Voucher does not exist',
            ),
          }),
        });
      }

      if (voucher.voucher_status !== VOUCHER_STATUS.ACTIVE) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'VOUCHER_INACTIVE',
              'Voucher is not active',
            ),
            voucher,
          }),
        });
      }

      const currentTime = now();

      if (
        !isWithinVoucherWindow(
          currentTime,
          voucher.voucher_valid_from,
          voucher.voucher_valid_to,
        )
      ) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'VOUCHER_EXPIRED',
              'Voucher is outside the valid time window',
            ),
            voucher,
          }),
        });
      }

      if (voucher.promotion_status !== PROMOTION_STATUS.ACTIVE) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'PROMOTION_INACTIVE',
              'Promotion is not active',
            ),
            voucher,
          }),
        });
      }

      if (
        !isWithinVoucherWindow(
          currentTime,
          voucher.promotion_valid_from,
          voucher.promotion_valid_to,
        )
      ) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'PROMOTION_EXPIRED',
              'Promotion is outside the valid time window',
            ),
            voucher,
          }),
        });
      }

      const subtotalAmount = items.reduce(
        (total, item) => total + item.total_amount,
        0,
      );

      if (
        voucher.usage_limit_total != null &&
        Number(voucher.used_count) >= Number(voucher.usage_limit_total)
      ) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'VOUCHER_USAGE_LIMIT_REACHED',
              'Voucher has reached the total usage limit',
            ),
            voucher,
          }),
        });
      }

      const userUsageCount = await repository.countUserVoucherUsages(
        queryExecutor,
        {
          userId,
          voucherId: voucher.id,
        },
      );

      if (userUsageCount >= Number(voucher.usage_limit_per_user)) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'VOUCHER_USER_LIMIT_REACHED',
              'User has reached the voucher usage limit',
            ),
            voucher,
          }),
        });
      }

      if (subtotalAmount < Number(voucher.min_order_amount)) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'VOUCHER_MIN_ORDER_NOT_MET',
              'Cart subtotal does not meet the minimum order amount',
            ),
            voucher,
          }),
        });
      }

      const eligibleSubtotal = calculateEligibleSubtotal(
        items,
        voucher.target_service_type,
      );

      if (eligibleSubtotal <= 0) {
        return buildPricingSummary(items, {
          cartId: activeCart.id,
          voucher: buildVoucherResponse(voucherCode, {
            issue: buildVoucherIssue(
              'VOUCHER_NOT_APPLICABLE',
              'Voucher does not apply to the current cart items',
            ),
            voucher,
          }),
        });
      }

      const discountAmount = calculateVoucherDiscount(voucher, {
        eligibleSubtotal,
        subtotalAmount,
      });

      return buildPricingSummary(items, {
        cartId: activeCart.id,
        discountAmount,
        voucher: buildVoucherResponse(voucherCode, {
          applied: discountAmount > 0,
          discountAmount,
          voucher,
        }),
      });
    });

  const validateCart = async ({
    payload,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const {
        selectedCartItemIds,
        voucherCode,
      } = normalizeValidatePayload(payload);
      const activeCart = await resolveActiveCart(queryExecutor, userId);

      if (!activeCart || activeCart.status !== CART_STATUS.ACTIVE) {
        throw createCartEmptyError();
      }

      const allItemRecords = await repository.listCartItemRecords(
        queryExecutor,
        activeCart.id,
      );
      const selectedCartItemIdSet = new Set(selectedCartItemIds);
      const itemRecords = selectedCartItemIdSet.size > 0
        ? allItemRecords.filter((itemRecord) => selectedCartItemIdSet.has(itemRecord.id))
        : allItemRecords;

      if (itemRecords.length === 0) {
        throw createCartEmptyError();
      }

      if (selectedCartItemIdSet.size > 0 && itemRecords.length !== selectedCartItemIdSet.size) {
        throw createValidationError([
          {
            field: 'selected_cart_item_ids',
            message: 'selected_cart_item_ids must belong to the active cart',
          },
        ]);
      }

      const itemRows = await repository.listCartItems(queryExecutor, activeCart.id);
      const itemRowsById = new Map(itemRows.map((itemRow) => [itemRow.id, itemRow]));
      const issues = [];
      const items = [];

      for (const itemRecord of itemRecords) {
        const itemRow = itemRowsById.get(itemRecord.id) || null;
        const service = await repository.getServiceById(
          queryExecutor,
          itemRecord.service_id,
        );
        const item = mapCartItemRecordForValidation(itemRecord, itemRow, service);
        const addItemIssue = (code, message) => {
          const issue = buildCartValidationIssue(code, message, {
            cartItemId: item.id,
            scope: 'item',
            serviceId: item.service_id,
          });

          item.issues.push(issue);
          issues.push(issue);
        };

        if (!Number.isInteger(item.quantity) || item.quantity < 1) {
          addItemIssue(
            API_ERROR_CODES.VALIDATION_ERROR,
            'Cart item quantity must be greater than 0',
          );
        }

        if (!service) {
          addItemIssue(
            API_ERROR_CODES.RESOURCE_NOT_FOUND,
            'Service no longer exists',
          );
          item.valid = false;
          items.push(item);
          continue;
        }

        item.service = buildValidationServiceSummary(itemRecord, service, itemRow);

        if (service.service_type !== itemRecord.service_type) {
          addItemIssue(
            'SERVICE_TYPE_MISMATCH',
            'Cart item service type no longer matches the service',
          );
          item.valid = false;
          items.push(item);
          continue;
        }

        if (service.deleted_at != null || service.status !== 'active') {
          addItemIssue(
            'SERVICE_NOT_ACTIVE',
            'Service is not active and cannot be checked out',
          );
          item.valid = false;
          items.push(item);
          continue;
        }

        if (item.quantity >= 1) {
          try {
            const availability = await resolveAvailability(
              queryExecutor,
              repository,
              service,
              {
                options: itemRecord.options,
                quantity: item.quantity,
                referenceId: itemRecord.reference_id,
                serviceType: itemRecord.service_type,
                startAt: itemRecord.start_at ? new Date(itemRecord.start_at) : null,
              },
            );

            item.available_quantity = availability.availableQuantity;

            if (item.current_unit_price == null && availability.unitPrice != null) {
              item.current_unit_price = Number(availability.unitPrice);
              item.current_total_amount = roundMoney(
                item.current_unit_price * item.quantity,
              );
              item.price_changed =
                roundMoney(item.current_unit_price) !==
                roundMoney(item.unit_price_snapshot);
            }
          } catch (error) {
            addItemIssue(
              error?.code || API_ERROR_CODES.CART_ITEM_NOT_AVAILABLE,
              error?.message || 'Cart item is not available',
            );
          }
        }

        if (item.current_unit_price != null && item.price_changed) {
          addItemIssue(
            'PRICE_CHANGED',
            'Current price is different from the price saved in cart',
          );
        }

        item.valid = item.issues.length === 0;
        items.push(item);
      }

      const voucherResult = await evaluateVoucherForCartValidation(
        queryExecutor,
        items,
        {
          currentTime: now(),
          repository,
          userId,
          voucherCode,
        },
      );

      if (voucherResult.issue) {
        issues.push(
          buildCartValidationIssue(
            voucherResult.issue.code,
            voucherResult.issue.message,
            {
              scope: 'voucher',
              voucherCode,
            },
          ),
        );
      }

      return {
        cart_id: activeCart.id,
        issues,
        items,
        selected_item_ids: itemRecords.map((itemRecord) => itemRecord.id),
        summary: buildValidationSummary(items, {
          cartId: activeCart.id,
          discountAmount: voucherResult.discountAmount,
          voucher: voucherResult.voucher,
        }),
        valid: issues.length === 0,
      };
    });

  const applyCartVoucher = async ({
    payload,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const {
        code,
        selectedCartItemIds,
      } = normalizeApplyVoucherPayload(payload);
      const activeCart = await resolveActiveCart(queryExecutor, userId);

      if (!activeCart || activeCart.status !== CART_STATUS.ACTIVE) {
        throw createCartEmptyError();
      }

      const allItemRows = await repository.listCartItems(queryExecutor, activeCart.id);
      const selectedCartItemIdSet = new Set(selectedCartItemIds);
      const itemRows = selectedCartItemIdSet.size > 0
        ? allItemRows.filter((itemRow) => selectedCartItemIdSet.has(itemRow.id))
        : allItemRows;
      const items = itemRows.map(mapCartItem);

      if (items.length === 0) {
        throw createCartEmptyError();
      }

      if (selectedCartItemIdSet.size > 0 && itemRows.length !== selectedCartItemIdSet.size) {
        throw createValidationError([
          {
            field: 'selected_cart_item_ids',
            message: 'selected_cart_item_ids must belong to the active cart',
          },
        ]);
      }

      const voucherResult = await evaluateVoucherForCartValidation(
        queryExecutor,
        items,
        {
          currentTime: now(),
          repository,
          userId,
          voucherCode: code,
        },
      );

      assertVoucherCanBeApplied(voucherResult);

      const summary = buildPricingSummary(items, {
        cartId: activeCart.id,
        discountAmount: voucherResult.discountAmount,
        voucher: voucherResult.voucher,
      });

      return {
        cart_id: activeCart.id,
        final_total_amount: summary.total_amount,
        summary,
        voucher: voucherResult.voucher,
      };
    });

  const removeCartVoucher = async ({ userId }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const activeCart = await resolveActiveCart(queryExecutor, userId);

      if (!activeCart || activeCart.status !== CART_STATUS.ACTIVE) {
        return {
          cart_id: null,
          removed: true,
          summary: buildEmptyPricingSummary(),
        };
      }

      const itemRows = await repository.listCartItems(queryExecutor, activeCart.id);
      const items = itemRows.map(mapCartItem);
      const summary =
        items.length > 0
          ? buildPricingSummary(items, {
              cartId: activeCart.id,
            })
          : buildEmptyPricingSummary({
              cartId: activeCart.id,
            });

      return {
        cart_id: activeCart.id,
        removed: true,
        summary,
      };
    });

  const mergeGuestCart = async ({
    payload,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const {
        guestItems,
      } = normalizeMergePayload(payload);

      if (guestItems.length === 0) {
        const activeCart = await resolveActiveCart(queryExecutor, userId);

        if (!activeCart || activeCart.status !== CART_STATUS.ACTIVE) {
          return {
            cart: null,
            merged_item_count: 0,
            summary: buildEmptySummary(),
          };
        }

        const mappedCart = await loadMappedCart(queryExecutor, activeCart);

        return {
          cart: mappedCart,
          merged_item_count: 0,
          summary: mappedCart.summary,
        };
      }

      const normalizedGuestItems = guestItems.map((item) => normalizeAddPayload(item));
      const activeCart = await resolveActiveCart(queryExecutor, userId, {
        createIfMissing: true,
      });
      const existingItems = await repository.listCartItemRecords(
        queryExecutor,
        activeCart.id,
      );

      for (const input of normalizedGuestItems) {
        const service = await repository.getServiceById(queryExecutor, input.serviceId);

        ensureServiceIsAvailableForCart(service, input.serviceType);

        const duplicateItem = findDuplicateItem(existingItems, input);
        const targetQuantity = duplicateItem
          ? Number(duplicateItem.quantity) + input.quantity
          : input.quantity;
        const availability = await resolveAvailability(
          queryExecutor,
          repository,
          service,
          {
            options: input.options,
            quantity: targetQuantity,
            referenceId: input.referenceId,
            serviceType: input.serviceType,
            startAt: input.startAt,
          },
        );

        if (duplicateItem) {
          await repository.updateCartItem(queryExecutor, {
            cartItemId: duplicateItem.id,
            endAt: input.endAt,
            options: input.options,
            quantity: targetQuantity,
            startAt: input.startAt,
            unitPriceSnapshot: availability.unitPrice,
          });

          duplicateItem.end_at = input.endAt;
          duplicateItem.options = input.options;
          duplicateItem.quantity = targetQuantity;
          duplicateItem.start_at = input.startAt;
          duplicateItem.unit_price_snapshot = availability.unitPrice;
        } else {
          const created = await repository.insertCartItem(queryExecutor, {
            cartId: activeCart.id,
            createdAt: now(),
            endAt: input.endAt,
            options: input.options,
            quantity: input.quantity,
            referenceId: input.referenceId,
            serviceId: input.serviceId,
            serviceType: input.serviceType,
            startAt: input.startAt,
            unitPriceSnapshot: availability.unitPrice,
          });

          existingItems.push(created);
        }
      }

      const touchedCart = await repository.touchCart(queryExecutor, {
        cartId: activeCart.id,
        updatedAt: now(),
      });
      const mappedCart = await loadMappedCart(queryExecutor, touchedCart);

      return {
        cart: mappedCart,
        merged_item_count: normalizedGuestItems.length,
        summary: mappedCart.summary,
      };
    });

  const addCartItem = async ({ payload, userId }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const input = normalizeAddPayload(payload);
      const service = await repository.getServiceById(queryExecutor, input.serviceId);

      ensureServiceIsAvailableForCart(service, input.serviceType);

      const activeCart = await resolveActiveCart(queryExecutor, userId, {
        createIfMissing: true,
      });
      const existingItems = await repository.listCartItemRecords(
        queryExecutor,
        activeCart.id,
      );
      const duplicateItem = findDuplicateItem(existingItems, input);
      const targetQuantity = duplicateItem
        ? Number(duplicateItem.quantity) + input.quantity
        : input.quantity;
      const availability = await resolveAvailability(queryExecutor, repository, service, {
        options: input.options,
        quantity: targetQuantity,
        referenceId: input.referenceId,
        serviceType: input.serviceType,
        startAt: input.startAt,
      });

      let targetItemId;

      if (duplicateItem) {
        const updated = await repository.updateCartItem(queryExecutor, {
          cartItemId: duplicateItem.id,
          endAt: input.endAt,
          options: input.options,
          quantity: targetQuantity,
          startAt: input.startAt,
          unitPriceSnapshot: availability.unitPrice,
        });

        targetItemId = updated.id;
      } else {
        const created = await repository.insertCartItem(queryExecutor, {
          cartId: activeCart.id,
          createdAt: now(),
          endAt: input.endAt,
          options: input.options,
          quantity: input.quantity,
          referenceId: input.referenceId,
          serviceId: input.serviceId,
          serviceType: input.serviceType,
          startAt: input.startAt,
          unitPriceSnapshot: availability.unitPrice,
        });

        targetItemId = created.id;
      }

      const touchedCart = await repository.touchCart(queryExecutor, {
        cartId: activeCart.id,
        updatedAt: now(),
      });
      const mappedCart = await loadMappedCart(queryExecutor, touchedCart);

      return {
        cart_id: mappedCart.id,
        cart_item_id: targetItemId,
        summary: mappedCart.summary,
      };
    });

  const updateCartItem = async ({
    cartItemId,
    payload,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const normalizedCartItemId = parseUuid('cart_item_id', cartItemId);
      const input = normalizeUpdatePayload(payload);
      const activeCart = await resolveActiveCart(queryExecutor, userId);

      if (!activeCart || activeCart.status !== CART_STATUS.ACTIVE) {
        throw createResourceNotFoundError('Cart item not found');
      }

      const currentItem = await repository.getCartItemById(
        queryExecutor,
        activeCart.id,
        normalizedCartItemId,
      );

      if (!currentItem) {
        throw createResourceNotFoundError('Cart item not found');
      }

      const nextStartAt = input.hasStartAt ? input.startAt : currentItem.start_at;
      const nextEndAt = input.hasEndAt ? input.endAt : currentItem.end_at;
      const nextQuantity = input.hasQuantity
        ? input.quantity
        : Number(currentItem.quantity);
      const nextOptions = input.hasOptions ? input.options : currentItem.options;

      validateDateRange({
        endAt: nextEndAt ? new Date(nextEndAt) : null,
        startAt: nextStartAt ? new Date(nextStartAt) : null,
      });

      const service = await repository.getServiceById(
        queryExecutor,
        currentItem.service_id,
      );

      ensureServiceIsAvailableForCart(service, currentItem.service_type);

      const availability = await resolveAvailability(queryExecutor, repository, service, {
        options: nextOptions,
        quantity: nextQuantity,
        referenceId: currentItem.reference_id,
        serviceType: currentItem.service_type,
        startAt: nextStartAt ? new Date(nextStartAt) : null,
      });
      const shouldRefreshPriceSnapshot =
        input.hasStartAt || input.hasEndAt || input.hasOptions;
      const unitPriceSnapshot = shouldRefreshPriceSnapshot
        ? availability.unitPrice
        : Number(currentItem.unit_price_snapshot);

      await repository.updateCartItem(queryExecutor, {
        cartItemId: currentItem.id,
        endAt: nextEndAt,
        options: nextOptions,
        quantity: nextQuantity,
        startAt: nextStartAt,
        unitPriceSnapshot,
      });

      const touchedCart = await repository.touchCart(queryExecutor, {
        cartId: activeCart.id,
        updatedAt: now(),
      });
      const mappedCart = await loadMappedCart(queryExecutor, touchedCart);
      const updatedItem = findMappedCartItem(mappedCart.items, currentItem.id);

      return {
        cart_id: mappedCart.id,
        cart_item: updatedItem,
        summary: mappedCart.summary,
      };
    });

  const deleteCartItem = async ({ cartItemId, userId }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const normalizedCartItemId = parseUuid('cart_item_id', cartItemId);
      const activeCart = await resolveActiveCart(queryExecutor, userId);

      if (!activeCart || activeCart.status !== CART_STATUS.ACTIVE) {
        throw createResourceNotFoundError('Cart item not found');
      }

      const currentItem = await repository.getCartItemById(
        queryExecutor,
        activeCart.id,
        normalizedCartItemId,
      );

      if (!currentItem) {
        throw createResourceNotFoundError('Cart item not found');
      }

      await repository.deleteCartItem(queryExecutor, currentItem.id);

      const touchedCart = await repository.touchCart(queryExecutor, {
        cartId: activeCart.id,
        updatedAt: now(),
      });
      const mappedCart = await loadMappedCart(queryExecutor, touchedCart);

      return {
        cart_id: mappedCart.id,
        deleted_item_id: currentItem.id,
        summary: mappedCart.summary,
      };
    });

  const clearCartItems = async ({ userId }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const activeCart = await resolveActiveCart(queryExecutor, userId);

      if (!activeCart || activeCart.status !== CART_STATUS.ACTIVE) {
        return {
          cart_id: null,
          summary: buildEmptySummary(),
        };
      }

      await repository.clearCartItems(queryExecutor, activeCart.id);

      await repository.touchCart(queryExecutor, {
        cartId: activeCart.id,
        updatedAt: now(),
      });

      return {
        cart_id: activeCart.id,
        summary: buildEmptySummary(),
      };
    });

  return {
    addCartItem,
    applyCartVoucher,
    clearCartItems,
    deleteCartItem,
    getActiveCart,
    getCartSummary,
    mergeGuestCart,
    removeCartVoucher,
    validateCart,
    updateCartItem,
  };
};

module.exports = createCartService();
module.exports.createCartService = createCartService;
