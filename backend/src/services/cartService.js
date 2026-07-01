const {
  API_ERROR_CODES,
  CART_STATUS,
  DOMAIN_CONSTRAINTS,
  SERVICE_TYPE,
  SERVICE_TYPE_VALUES,
} = require('../constants/domainConstraints');
const { withTransaction } = require('../database/client');
const { createCartRepository } = require('../database/cartRepository');
const AppError = require('../utils/AppError');

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
const ADD_SCOPE_LABEL = 'POST /cart/items';
const UPDATE_SCOPE_LABEL = 'PATCH /cart/items/{cart_item_id}';

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
  const subtotalAmount = items.reduce(
    (total, item) => total + item.total_amount,
    0,
  );
  const quantityTotal = items.reduce(
    (total, item) => total + item.quantity,
    0,
  );

  return {
    currency: DOMAIN_CONSTRAINTS.defaultCurrency,
    item_count: items.length,
    quantity_total: quantityTotal,
    subtotal_amount: subtotalAmount,
    total_amount: subtotalAmount,
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
  item_count: 0,
  quantity_total: 0,
  subtotal_amount: 0,
  total_amount: 0,
});

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
    clearCartItems,
    deleteCartItem,
    getActiveCart,
    updateCartItem,
  };
};

module.exports = createCartService();
module.exports.createCartService = createCartService;
