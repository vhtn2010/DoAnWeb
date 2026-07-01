const {
  API_ERROR_CODES,
  SERVICE_TYPE,
} = require('../constants/domainConstraints');
const {
  createAdminServiceInventoryRepository,
} = require('../database/adminServiceInventoryRepository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;

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

const buildResourceNotFoundError = (message = 'Service not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const parseServiceId = (value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError('service_id', 'service_id must be a valid UUID');
  }

  return value.trim();
};

const parseReferenceUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parseTourReferenceId = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError(
      'reference_id',
      'reference_id is required for tour inventory updates',
    );
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    throw buildValidationError(
      'reference_id',
      'reference_id is required for tour inventory updates',
    );
  }

  if (normalized.length > 100 || DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(
      'reference_id',
      'reference_id contains unsupported characters',
    );
  }

  return normalized;
};

const parseAvailableQuantity = (value) => {
  if (value == null || value === '') {
    throw buildValidationError(
      'available_quantity',
      'available_quantity is required',
    );
  }

  if (
    (typeof value === 'string' && !/^\d+$/.test(value)) ||
    !Number.isInteger(Number(value))
  ) {
    throw buildValidationError(
      'available_quantity',
      'available_quantity must be a non-negative integer',
    );
  }

  const parsed = Number(value);

  if (parsed < 0) {
    throw buildValidationError(
      'available_quantity',
      'available_quantity must be a non-negative integer',
    );
  }

  return parsed;
};

const parseBody = (body) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw buildValidationError('body', 'body must be an object');
  }

  for (const key of Object.keys(body)) {
    if (!['available_quantity', 'reference_id'].includes(key)) {
      throw buildValidationError(
        key,
        `${key} is not supported in this endpoint`,
      );
    }
  }

  return {
    availableQuantity: parseAvailableQuantity(body.available_quantity),
    referenceId: body.reference_id,
  };
};

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

const normalizeScheduleIdentifier = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    return String(value);
  }

  return normalizeWhitespace(value).toLowerCase();
};

const buildScheduleIdentifierCandidates = (scheduleItem) => {
  if (!scheduleItem || typeof scheduleItem !== 'object') {
    return [];
  }

  return [
    scheduleItem.id,
    scheduleItem.reference_id,
    scheduleItem.referenceId,
    scheduleItem.date,
    scheduleItem.departure_at,
  ]
    .map(normalizeScheduleIdentifier)
    .filter(Boolean);
};

const resolveTourMaxQuantity = (detail, scheduleItem) => {
  const candidateKeys = [
    'total_slots',
    'totalSlots',
    'max_slots',
    'maxSlots',
    'capacity',
  ];

  for (const key of candidateKeys) {
    const parsed = Number(scheduleItem?.[key]);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  const maxGroupSize = Number(detail?.max_group_size);
  return Number.isFinite(maxGroupSize) && maxGroupSize >= 0
    ? maxGroupSize
    : null;
};

const resolveTourOldQuantity = (scheduleItem) => {
  const candidateKeys = [
    'available_slots',
    'availableSlots',
    'slots_available',
    'slots',
  ];

  for (const key of candidateKeys) {
    const parsed = Number(scheduleItem?.[key]);

    if (Number.isFinite(parsed) && parsed >= 0) {
      return {
        key,
        value: parsed,
      };
    }
  }

  return {
    key: 'available_slots',
    value: 0,
  };
};

const createAdminServiceInventoryService = ({
  repository = createAdminServiceInventoryRepository(),
} = {}) => {
  const updateInventory = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const parsedBody = parseBody(body || {});
    const service = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: resolvedServiceId,
    });

    if (!service) {
      throw buildResourceNotFoundError();
    }

    if (service.service_type === SERVICE_TYPE.TOUR) {
      const referenceId = parseTourReferenceId(parsedBody.referenceId);
      const detail = await repository.getTourDetail(resolvedServiceId);

      if (!detail || !Array.isArray(detail.departure_schedule)) {
        throw buildResourceNotFoundError('Tour departure schedule not found');
      }

      const normalizedReferenceId = normalizeScheduleIdentifier(referenceId);
      const scheduleIndex = detail.departure_schedule.findIndex((item) =>
        buildScheduleIdentifierCandidates(item).includes(normalizedReferenceId),
      );

      if (scheduleIndex < 0) {
        throw buildResourceNotFoundError('Tour departure schedule not found');
      }

      const existingSchedule = detail.departure_schedule[scheduleIndex];
      const maxAllowed = resolveTourMaxQuantity(detail, existingSchedule);

      if (maxAllowed != null && parsedBody.availableQuantity > maxAllowed) {
        throw buildValidationError(
          'available_quantity',
          'available_quantity must be less than or equal to the configured tour capacity',
        );
      }

      const { key, value: oldQuantity } = resolveTourOldQuantity(existingSchedule);
      const updatedSchedule = detail.departure_schedule.map((item, index) => {
        if (index !== scheduleIndex) {
          return item;
        }

        return {
          ...item,
          [key]: parsedBody.availableQuantity,
        };
      });

      await repository.updateTourInventory({
        actorUserId: auth.userId,
        inventoryMetadata: {
          inventory_field: key,
          new_value: parsedBody.availableQuantity,
          old_value: oldQuantity,
          reference_id: referenceId,
          service_type: service.service_type,
        },
        serviceId: resolvedServiceId,
        updatedSchedule,
      });

      return {
        available_quantity: parsedBody.availableQuantity,
        inventory_field: key,
        old_quantity: oldQuantity,
        reference_id: referenceId,
        service_id: resolvedServiceId,
        service_type: service.service_type,
      };
    }

    if (service.service_type === SERVICE_TYPE.HOTEL) {
      const referenceId = parseReferenceUuid('reference_id', parsedBody.referenceId);
      const roomType = await repository.getRoomTypeById(referenceId);

      if (!roomType || roomType.hotel_service_id !== resolvedServiceId) {
        throw buildResourceNotFoundError('Room inventory not found');
      }

      const totalRooms = Number(roomType.total_rooms);

      if (parsedBody.availableQuantity > totalRooms) {
        throw buildValidationError(
          'available_quantity',
          'available_quantity must be less than or equal to total_rooms',
        );
      }

      await repository.updateRoomInventory({
        actorUserId: auth.userId,
        availableQuantity: parsedBody.availableQuantity,
        inventoryMetadata: {
          inventory_field: 'available_rooms',
          new_value: parsedBody.availableQuantity,
          old_value: Number(roomType.available_rooms),
          reference_id: referenceId,
          service_type: service.service_type,
        },
        roomTypeId: referenceId,
        serviceId: resolvedServiceId,
      });

      return {
        available_quantity: parsedBody.availableQuantity,
        inventory_field: 'available_rooms',
        old_quantity: Number(roomType.available_rooms),
        reference_id: referenceId,
        service_id: resolvedServiceId,
        service_type: service.service_type,
      };
    }

    if (service.service_type === SERVICE_TYPE.FLIGHT) {
      const referenceId = parseReferenceUuid('reference_id', parsedBody.referenceId);
      const detail = await repository.getFlightDetailById(referenceId);

      if (!detail || detail.service_id !== resolvedServiceId) {
        throw buildResourceNotFoundError('Flight inventory not found');
      }

      const seatsTotal = Number(detail.seats_total);

      if (parsedBody.availableQuantity > seatsTotal) {
        throw buildValidationError(
          'available_quantity',
          'available_quantity must be less than or equal to seats_total',
        );
      }

      await repository.updateFlightInventory({
        actorUserId: auth.userId,
        availableQuantity: parsedBody.availableQuantity,
        detailId: referenceId,
        inventoryMetadata: {
          inventory_field: 'seats_available',
          new_value: parsedBody.availableQuantity,
          old_value: Number(detail.seats_available),
          reference_id: referenceId,
          service_type: service.service_type,
        },
        serviceId: resolvedServiceId,
      });

      return {
        available_quantity: parsedBody.availableQuantity,
        inventory_field: 'seats_available',
        old_quantity: Number(detail.seats_available),
        reference_id: referenceId,
        service_id: resolvedServiceId,
        service_type: service.service_type,
      };
    }

    if (service.service_type === SERVICE_TYPE.TRAIN) {
      const referenceId = parseReferenceUuid('reference_id', parsedBody.referenceId);
      const detail = await repository.getTrainDetailById(referenceId);

      if (!detail || detail.service_id !== resolvedServiceId) {
        throw buildResourceNotFoundError('Train inventory not found');
      }

      const seatsTotal = Number(detail.seats_total);

      if (parsedBody.availableQuantity > seatsTotal) {
        throw buildValidationError(
          'available_quantity',
          'available_quantity must be less than or equal to seats_total',
        );
      }

      await repository.updateTrainInventory({
        actorUserId: auth.userId,
        availableQuantity: parsedBody.availableQuantity,
        detailId: referenceId,
        inventoryMetadata: {
          inventory_field: 'seats_available',
          new_value: parsedBody.availableQuantity,
          old_value: Number(detail.seats_available),
          reference_id: referenceId,
          service_type: service.service_type,
        },
        serviceId: resolvedServiceId,
      });

      return {
        available_quantity: parsedBody.availableQuantity,
        inventory_field: 'seats_available',
        old_quantity: Number(detail.seats_available),
        reference_id: referenceId,
        service_id: resolvedServiceId,
        service_type: service.service_type,
      };
    }

    throw buildValidationError(
      'service_type',
      'inventory updates are only supported for tour, hotel, flight, and train services',
    );
  };

  return {
    updateInventory,
  };
};

module.exports = Object.assign(createAdminServiceInventoryService(), {
  createAdminServiceInventoryService,
});
