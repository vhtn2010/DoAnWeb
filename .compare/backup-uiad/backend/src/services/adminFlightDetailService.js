const {
  API_ERROR_CODES,
  CABIN_CLASS_VALUES,
  SERVICE_TYPE,
  TRANSPORT_SCHEDULE_STATUS,
  TRANSPORT_SCHEDULE_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminFlightDetailRepository,
} = require('../database/adminFlightDetailRepository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const ROUTE_LOCKED_WHEN_BOOKED_FIELDS = Object.freeze([
  'departure_airport',
  'arrival_airport',
  'departure_at',
  'arrival_at',
]);
const MUTABLE_FIELDS = Object.freeze([
  'airline_name',
  'flight_number',
  'departure_airport',
  'arrival_airport',
  'departure_at',
  'arrival_at',
  'cabin_class',
  'seats_total',
  'seats_available',
  'fare_price',
  'status',
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

const buildResourceNotFoundError = (message = 'Flight detail not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parseOptionalString = ({
  field,
  maxLength = 255,
  value,
}) => {
  if (value == null) {
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
      `${field} must be at most ${maxLength} characters long`,
    );
  }

  if (DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseRequiredString = (options) => {
  const parsed = parseOptionalString(options);

  if (!parsed) {
    throw buildValidationError(options.field, `${options.field} is required`);
  }

  return parsed;
};

const parseOptionalInteger = ({
  field,
  min = 0,
  value,
}) => {
  if (value === undefined) {
    return undefined;
  }

  if (
    (typeof value === 'string' && !/^\d+$/.test(value)) ||
    !Number.isInteger(Number(value))
  ) {
    throw buildValidationError(field, `${field} must be an integer`);
  }

  const parsed = Number(value);

  if (parsed < min) {
    throw buildValidationError(
      field,
      `${field} must be greater than or equal to ${min}`,
    );
  }

  return parsed;
};

const parseRequiredInteger = (options) => {
  if (options.value == null) {
    throw buildValidationError(options.field, `${options.field} is required`);
  }

  return parseOptionalInteger(options);
};

const parseMoney = ({
  field,
  value,
}) => {
  if (value === undefined) {
    return undefined;
  }

  if (value == null) {
    throw buildValidationError(field, `${field} is required`);
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw buildValidationError(
      field,
      `${field} must be a number greater than or equal to 0`,
    );
  }

  return parsed;
};

const parseOptionalDateTime = ({
  field,
  value,
}) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid ISO 8601 datetime`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw buildValidationError(field, `${field} must be a valid ISO 8601 datetime`);
  }

  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid ISO 8601 datetime`);
  }

  return parsed.toISOString();
};

const parseRequiredDateTime = (options) => {
  if (options.value == null) {
    throw buildValidationError(options.field, `${options.field} is required`);
  }

  return parseOptionalDateTime(options);
};

const parseCabinClass = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !CABIN_CLASS_VALUES.includes(value)) {
    throw buildValidationError(
      'cabin_class',
      `cabin_class must be one of: ${CABIN_CLASS_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseStatus = ({
  defaultValue,
  value,
}) => {
  if (value === undefined) {
    return defaultValue;
  }

  if (
    typeof value !== 'string' ||
    !TRANSPORT_SCHEDULE_STATUS_VALUES.includes(value)
  ) {
    throw buildValidationError(
      'status',
      `status must be one of: ${TRANSPORT_SCHEDULE_STATUS_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseReason = (value) =>
  parseRequiredString({
    field: 'reason',
    maxLength: 500,
    value,
  });

const ensureBodyObject = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  return body;
};

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

const mapFlightDetail = (detail) => ({
  airline_name: detail.airline_name,
  arrival_airport: detail.arrival_airport,
  arrival_at: detail.arrival_at,
  cabin_class: detail.cabin_class,
  departure_airport: detail.departure_airport,
  departure_at: detail.departure_at,
  fare_price: Number(detail.fare_price),
  flight_number: detail.flight_number,
  id: detail.id,
  seats_available: Number(detail.seats_available),
  seats_total: Number(detail.seats_total),
  service_id: detail.service_id,
  status: detail.status,
});

const validateParentFlight = (service) => {
  if (!service) {
    throw buildResourceNotFoundError('Flight service not found');
  }

  if (service.service_type !== SERVICE_TYPE.FLIGHT) {
    throw buildValidationError(
      'service_id',
      'Parent service must be a flight service',
    );
  }
};

const validateFlightRules = ({
  arrivalAirport,
  arrivalAt,
  departureAirport,
  departureAt,
  seatsAvailable,
  seatsTotal,
}) => {
  if (
    departureAirport &&
    arrivalAirport &&
    departureAirport.toLowerCase() === arrivalAirport.toLowerCase()
  ) {
    throw buildValidationError(
      'arrival_airport',
      'arrival_airport must be different from departure_airport',
    );
  }

  if (departureAt && arrivalAt) {
    const departureTime = new Date(departureAt).getTime();
    const arrivalTime = new Date(arrivalAt).getTime();

    if (!(arrivalTime > departureTime)) {
      throw buildValidationError(
        'arrival_at',
        'arrival_at must be after departure_at',
      );
    }
  }

  if (
    seatsAvailable != null &&
    seatsTotal != null &&
    seatsAvailable > seatsTotal
  ) {
    throw buildValidationError(
      'seats_available',
      'seats_available must be less than or equal to seats_total',
    );
  }
};

const createAdminFlightDetailService = ({
  repository = createAdminFlightDetailRepository(),
} = {}) => {
  const createFlightDetail = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseUuid('service_id', serviceId);
    const service = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: resolvedServiceId,
    });
    validateParentFlight(service);
    const payload = ensureBodyObject(body);

    for (const key of Object.keys(payload)) {
      if (!MUTABLE_FIELDS.includes(key)) {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const createPayload = {
      airline_name: parseRequiredString({
        field: 'airline_name',
        maxLength: 150,
        value: payload.airline_name,
      }),
      arrival_airport: parseRequiredString({
        field: 'arrival_airport',
        maxLength: 150,
        value: payload.arrival_airport,
      }),
      arrival_at: parseRequiredDateTime({
        field: 'arrival_at',
        value: payload.arrival_at,
      }),
      cabin_class: parseCabinClass(payload.cabin_class),
      departure_airport: parseRequiredString({
        field: 'departure_airport',
        maxLength: 150,
        value: payload.departure_airport,
      }),
      departure_at: parseRequiredDateTime({
        field: 'departure_at',
        value: payload.departure_at,
      }),
      fare_price: parseMoney({
        field: 'fare_price',
        value: payload.fare_price,
      }),
      flight_number: parseRequiredString({
        field: 'flight_number',
        maxLength: 30,
        value: payload.flight_number,
      }),
      seats_available: parseRequiredInteger({
        field: 'seats_available',
        min: 0,
        value: payload.seats_available,
      }),
      seats_total: parseRequiredInteger({
        field: 'seats_total',
        min: 0,
        value: payload.seats_total,
      }),
      status: parseStatus({
        defaultValue: TRANSPORT_SCHEDULE_STATUS.OPEN,
        value: payload.status,
      }),
    };

    if (!createPayload.cabin_class) {
      throw buildValidationError('cabin_class', 'cabin_class is required');
    }

    validateFlightRules({
      arrivalAirport: createPayload.arrival_airport,
      arrivalAt: createPayload.arrival_at,
      departureAirport: createPayload.departure_airport,
      departureAt: createPayload.departure_at,
      seatsAvailable: createPayload.seats_available,
      seatsTotal: createPayload.seats_total,
    });

    const created = await repository.createFlightDetail({
      actorUserId: auth.userId,
      logMetadata: {
        operation: 'create',
        service_id: resolvedServiceId,
        status: createPayload.status,
      },
      payload: createPayload,
      serviceId: resolvedServiceId,
    });

    return mapFlightDetail(created);
  };

  const updateFlightDetail = async ({
    auth,
    body,
    flight_detail_id: flightDetailId,
  } = {}) => {
    const resolvedFlightDetailId = parseUuid('flight_detail_id', flightDetailId);
    const payload = ensureBodyObject(body);

    if (Object.prototype.hasOwnProperty.call(payload, 'service_id')) {
      throw buildValidationError('service_id', 'service_id cannot be changed');
    }

    for (const key of Object.keys(payload)) {
      if (!MUTABLE_FIELDS.includes(key)) {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const currentDetail = await repository.getFlightDetailById(resolvedFlightDetailId);

    if (!currentDetail) {
      throw buildResourceNotFoundError('Flight detail not found');
    }

    const parentService = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: currentDetail.service_id,
    });
    validateParentFlight(parentService);

    const hasBookings = await repository.flightDetailHasBookings(resolvedFlightDetailId);

    if (hasBookings) {
      for (const field of ROUTE_LOCKED_WHEN_BOOKED_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(payload, field)) {
          continue;
        }

        const currentValue = currentDetail[field];
        const nextValue = field.endsWith('_at')
          ? parseOptionalDateTime({
              field,
              value: payload[field],
            })
          : parseRequiredString({
              field,
              maxLength: 150,
              value: payload[field],
            });

        if (String(currentValue) !== String(nextValue)) {
          throw buildValidationError(
            field,
            `${field} cannot be changed when the flight detail already has bookings`,
          );
        }
      }
    }

    const nextSeatsTotal = Object.prototype.hasOwnProperty.call(payload, 'seats_total')
      ? parseOptionalInteger({
          field: 'seats_total',
          min: 0,
          value: payload.seats_total,
        })
      : undefined;
    const nextSeatsAvailable = Object.prototype.hasOwnProperty.call(
      payload,
      'seats_available',
    )
      ? parseOptionalInteger({
          field: 'seats_available',
          min: 0,
          value: payload.seats_available,
        })
      : undefined;

    validateFlightRules({
      arrivalAirport: Object.prototype.hasOwnProperty.call(payload, 'arrival_airport')
        ? parseRequiredString({
            field: 'arrival_airport',
            maxLength: 150,
            value: payload.arrival_airport,
          })
        : currentDetail.arrival_airport,
      arrivalAt: Object.prototype.hasOwnProperty.call(payload, 'arrival_at')
        ? parseOptionalDateTime({
            field: 'arrival_at',
            value: payload.arrival_at,
          })
        : currentDetail.arrival_at,
      departureAirport: Object.prototype.hasOwnProperty.call(payload, 'departure_airport')
        ? parseRequiredString({
            field: 'departure_airport',
            maxLength: 150,
            value: payload.departure_airport,
          })
        : currentDetail.departure_airport,
      departureAt: Object.prototype.hasOwnProperty.call(payload, 'departure_at')
        ? parseOptionalDateTime({
            field: 'departure_at',
            value: payload.departure_at,
          })
        : currentDetail.departure_at,
      seatsAvailable: nextSeatsAvailable ?? currentDetail.seats_available,
      seatsTotal: nextSeatsTotal ?? currentDetail.seats_total,
    });

    const updatePayload = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'airline_name')) {
      updatePayload.airline_name = parseRequiredString({
        field: 'airline_name',
        maxLength: 150,
        value: payload.airline_name,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'flight_number')) {
      updatePayload.flight_number = parseRequiredString({
        field: 'flight_number',
        maxLength: 30,
        value: payload.flight_number,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'departure_airport')) {
      updatePayload.departure_airport = parseRequiredString({
        field: 'departure_airport',
        maxLength: 150,
        value: payload.departure_airport,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'arrival_airport')) {
      updatePayload.arrival_airport = parseRequiredString({
        field: 'arrival_airport',
        maxLength: 150,
        value: payload.arrival_airport,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'departure_at')) {
      updatePayload.departure_at = parseOptionalDateTime({
        field: 'departure_at',
        value: payload.departure_at,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'arrival_at')) {
      updatePayload.arrival_at = parseOptionalDateTime({
        field: 'arrival_at',
        value: payload.arrival_at,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'cabin_class')) {
      updatePayload.cabin_class = parseCabinClass(payload.cabin_class);
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'seats_total')) {
      updatePayload.seats_total = nextSeatsTotal;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'seats_available')) {
      updatePayload.seats_available = nextSeatsAvailable;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'fare_price')) {
      updatePayload.fare_price = parseMoney({
        field: 'fare_price',
        value: payload.fare_price,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      updatePayload.status = parseStatus({
        value: payload.status,
      });
    }

    if (Object.keys(updatePayload).length === 0) {
      throw buildValidationError('body', 'no updatable fields were provided');
    }

    const updated = await repository.updateFlightDetail({
      actorUserId: auth.userId,
      flightDetailId: resolvedFlightDetailId,
      logMetadata: {
        has_bookings: hasBookings,
        new_value: updatePayload,
        old_value: currentDetail,
        operation: 'update',
      },
      payload: updatePayload,
    });

    return mapFlightDetail(updated);
  };

  const deleteFlightDetail = async ({
    auth,
    body,
    flight_detail_id: flightDetailId,
  } = {}) => {
    const resolvedFlightDetailId = parseUuid('flight_detail_id', flightDetailId);
    const payload = ensureBodyObject(body);

    for (const key of Object.keys(payload)) {
      if (key !== 'reason') {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const currentDetail = await repository.getFlightDetailById(resolvedFlightDetailId);

    if (!currentDetail) {
      throw buildResourceNotFoundError('Flight detail not found');
    }

    const parentService = await repository.getServiceById({
      allowedServiceIds: null,
      serviceId: currentDetail.service_id,
    });
    validateParentFlight(parentService);

    const reason = parseReason(payload.reason);
    const hasBookings = await repository.flightDetailHasBookings(resolvedFlightDetailId);
    const updated = await repository.cancelFlightDetail({
      actorUserId: auth.userId,
      flightDetailId: resolvedFlightDetailId,
      logMetadata: {
        has_bookings: hasBookings,
        old_status: currentDetail.status,
        operation: 'delete',
        reason,
        status: TRANSPORT_SCHEDULE_STATUS.CANCELLED,
      },
    });

    return mapFlightDetail(updated);
  };

  return {
    createFlightDetail,
    deleteFlightDetail,
    updateFlightDetail,
  };
};

module.exports = Object.assign(createAdminFlightDetailService(), {
  createAdminFlightDetailService,
});
