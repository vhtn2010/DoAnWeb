const {
  API_ERROR_CODES,
  SEAT_CLASS_VALUES,
  SERVICE_TYPE,
  TRANSPORT_SCHEDULE_STATUS,
  TRANSPORT_SCHEDULE_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminTrainDetailRepository,
} = require('../database/adminTrainDetailRepository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const ROUTE_LOCKED_WHEN_BOOKED_FIELDS = Object.freeze([
  'departure_station',
  'arrival_station',
  'departure_at',
  'arrival_at',
]);
const MUTABLE_FIELDS = Object.freeze([
  'train_number',
  'departure_station',
  'arrival_station',
  'departure_at',
  'arrival_at',
  'seat_class',
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

const buildResourceNotFoundError = (message = 'Train detail not found') =>
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

const parseSeatClass = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !SEAT_CLASS_VALUES.includes(value)) {
    throw buildValidationError(
      'seat_class',
      `seat_class must be one of: ${SEAT_CLASS_VALUES.join(', ')}`,
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

const mapTrainDetail = (detail) => ({
  arrival_at: detail.arrival_at,
  arrival_station: detail.arrival_station,
  departure_at: detail.departure_at,
  departure_station: detail.departure_station,
  fare_price: Number(detail.fare_price),
  id: detail.id,
  seat_class: detail.seat_class,
  seats_available: Number(detail.seats_available),
  seats_total: Number(detail.seats_total),
  service_id: detail.service_id,
  status: detail.status,
  train_number: detail.train_number,
});

const validateParentTrain = (service) => {
  if (!service) {
    throw buildResourceNotFoundError('Train service not found');
  }

  if (service.service_type !== SERVICE_TYPE.TRAIN) {
    throw buildValidationError(
      'service_id',
      'Parent service must be a train service',
    );
  }
};

const validateTrainRules = ({
  arrivalAt,
  arrivalStation,
  departureAt,
  departureStation,
  seatsAvailable,
  seatsTotal,
}) => {
  if (
    departureStation &&
    arrivalStation &&
    departureStation.toLowerCase() === arrivalStation.toLowerCase()
  ) {
    throw buildValidationError(
      'arrival_station',
      'arrival_station must be different from departure_station',
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

const createAdminTrainDetailService = ({
  repository = createAdminTrainDetailRepository(),
} = {}) => {
  const createTrainDetail = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseUuid('service_id', serviceId);
    const service = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: resolvedServiceId,
    });
    validateParentTrain(service);
    const payload = ensureBodyObject(body);

    for (const key of Object.keys(payload)) {
      if (!MUTABLE_FIELDS.includes(key)) {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const createPayload = {
      arrival_at: parseRequiredDateTime({
        field: 'arrival_at',
        value: payload.arrival_at,
      }),
      arrival_station: parseRequiredString({
        field: 'arrival_station',
        maxLength: 150,
        value: payload.arrival_station,
      }),
      departure_at: parseRequiredDateTime({
        field: 'departure_at',
        value: payload.departure_at,
      }),
      departure_station: parseRequiredString({
        field: 'departure_station',
        maxLength: 150,
        value: payload.departure_station,
      }),
      fare_price: parseMoney({
        field: 'fare_price',
        value: payload.fare_price,
      }),
      seat_class: parseSeatClass(payload.seat_class),
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
      train_number: parseRequiredString({
        field: 'train_number',
        maxLength: 30,
        value: payload.train_number,
      }),
    };

    if (!createPayload.seat_class) {
      throw buildValidationError('seat_class', 'seat_class is required');
    }

    validateTrainRules({
      arrivalAt: createPayload.arrival_at,
      arrivalStation: createPayload.arrival_station,
      departureAt: createPayload.departure_at,
      departureStation: createPayload.departure_station,
      seatsAvailable: createPayload.seats_available,
      seatsTotal: createPayload.seats_total,
    });

    const created = await repository.createTrainDetail({
      actorUserId: auth.userId,
      logMetadata: {
        operation: 'create',
        service_id: resolvedServiceId,
        status: createPayload.status,
      },
      payload: createPayload,
      serviceId: resolvedServiceId,
    });

    return mapTrainDetail(created);
  };

  const updateTrainDetail = async ({
    auth,
    body,
    train_detail_id: trainDetailId,
  } = {}) => {
    const resolvedTrainDetailId = parseUuid('train_detail_id', trainDetailId);
    const payload = ensureBodyObject(body);

    if (Object.prototype.hasOwnProperty.call(payload, 'service_id')) {
      throw buildValidationError('service_id', 'service_id cannot be changed');
    }

    for (const key of Object.keys(payload)) {
      if (!MUTABLE_FIELDS.includes(key)) {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const currentDetail = await repository.getTrainDetailById(resolvedTrainDetailId);

    if (!currentDetail) {
      throw buildResourceNotFoundError('Train detail not found');
    }

    const parentService = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: currentDetail.service_id,
    });
    validateParentTrain(parentService);

    const hasBookings = await repository.trainDetailHasBookings(resolvedTrainDetailId);

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
            `${field} cannot be changed when the train detail already has bookings`,
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

    validateTrainRules({
      arrivalAt: Object.prototype.hasOwnProperty.call(payload, 'arrival_at')
        ? parseOptionalDateTime({
            field: 'arrival_at',
            value: payload.arrival_at,
          })
        : currentDetail.arrival_at,
      arrivalStation: Object.prototype.hasOwnProperty.call(payload, 'arrival_station')
        ? parseRequiredString({
            field: 'arrival_station',
            maxLength: 150,
            value: payload.arrival_station,
          })
        : currentDetail.arrival_station,
      departureAt: Object.prototype.hasOwnProperty.call(payload, 'departure_at')
        ? parseOptionalDateTime({
            field: 'departure_at',
            value: payload.departure_at,
          })
        : currentDetail.departure_at,
      departureStation: Object.prototype.hasOwnProperty.call(payload, 'departure_station')
        ? parseRequiredString({
            field: 'departure_station',
            maxLength: 150,
            value: payload.departure_station,
          })
        : currentDetail.departure_station,
      seatsAvailable: nextSeatsAvailable ?? currentDetail.seats_available,
      seatsTotal: nextSeatsTotal ?? currentDetail.seats_total,
    });

    const updatePayload = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'train_number')) {
      updatePayload.train_number = parseRequiredString({
        field: 'train_number',
        maxLength: 30,
        value: payload.train_number,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'departure_station')) {
      updatePayload.departure_station = parseRequiredString({
        field: 'departure_station',
        maxLength: 150,
        value: payload.departure_station,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'arrival_station')) {
      updatePayload.arrival_station = parseRequiredString({
        field: 'arrival_station',
        maxLength: 150,
        value: payload.arrival_station,
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

    if (Object.prototype.hasOwnProperty.call(payload, 'seat_class')) {
      updatePayload.seat_class = parseSeatClass(payload.seat_class);
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

    const updated = await repository.updateTrainDetail({
      actorUserId: auth.userId,
      logMetadata: {
        has_bookings: hasBookings,
        new_value: updatePayload,
        old_value: currentDetail,
        operation: 'update',
      },
      payload: updatePayload,
      trainDetailId: resolvedTrainDetailId,
    });

    return mapTrainDetail(updated);
  };

  const deleteTrainDetail = async ({
    auth,
    body,
    train_detail_id: trainDetailId,
  } = {}) => {
    const resolvedTrainDetailId = parseUuid('train_detail_id', trainDetailId);
    const payload = ensureBodyObject(body);

    for (const key of Object.keys(payload)) {
      if (key !== 'reason') {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const currentDetail = await repository.getTrainDetailById(resolvedTrainDetailId);

    if (!currentDetail) {
      throw buildResourceNotFoundError('Train detail not found');
    }

    const parentService = await repository.getServiceById({
      allowedServiceIds: null,
      serviceId: currentDetail.service_id,
    });
    validateParentTrain(parentService);

    const reason = parseReason(payload.reason);
    const hasBookings = await repository.trainDetailHasBookings(resolvedTrainDetailId);
    const updated = await repository.cancelTrainDetail({
      actorUserId: auth.userId,
      logMetadata: {
        has_bookings: hasBookings,
        old_status: currentDetail.status,
        operation: 'delete',
        reason,
        status: TRANSPORT_SCHEDULE_STATUS.CANCELLED,
      },
      trainDetailId: resolvedTrainDetailId,
    });

    return mapTrainDetail(updated);
  };

  return {
    createTrainDetail,
    deleteTrainDetail,
    updateTrainDetail,
  };
};

module.exports = Object.assign(createAdminTrainDetailService(), {
  createAdminTrainDetailService,
});
