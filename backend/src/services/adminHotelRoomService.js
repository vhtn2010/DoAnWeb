const {
  API_ERROR_CODES,
  SERVICE_STATUS,
  SERVICE_STATUS_VALUES,
  SERVICE_TYPE,
} = require('../constants/domainConstraints');
const {
  createAdminHotelRoomRepository,
} = require('../database/adminHotelRoomRepository');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const ROOM_MUTABLE_STATUS_VALUES = Object.freeze(
  SERVICE_STATUS_VALUES.filter((value) => value !== SERVICE_STATUS.DELETED),
);

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

const buildResourceNotFoundError = (message = 'Resource not found') =>
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

const parseOptionalStatus = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string' || !SERVICE_STATUS_VALUES.includes(value)) {
    throw buildValidationError(
      'status',
      `status must be one of: ${SERVICE_STATUS_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseMutableRoomStatus = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || !ROOM_MUTABLE_STATUS_VALUES.includes(value)) {
    throw buildValidationError(
      'status',
      `status must be one of: ${ROOM_MUTABLE_STATUS_VALUES.join(', ')}`,
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

const mapRoom = (room) => ({
  id: room.id,
  hotel_service_id: room.hotel_service_id,
  name: room.name,
  bed_type: room.bed_type,
  max_adults: Number(room.max_adults),
  max_children: Number(room.max_children),
  total_rooms: Number(room.total_rooms),
  available_rooms: Number(room.available_rooms),
  base_price: Number(room.base_price),
  description: room.description,
  status: room.status,
  created_at: room.created_at,
  updated_at: room.updated_at,
});

const validateParentHotel = (service) => {
  if (!service) {
    throw buildResourceNotFoundError('Hotel service not found');
  }

  if (service.service_type !== SERVICE_TYPE.HOTEL) {
    throw buildValidationError(
      'hotel_service_id',
      'Parent service must be a hotel service',
    );
  }
};

const validateRoomInventoryConsistency = ({
  availableRooms,
  totalRooms,
}) => {
  if (availableRooms != null && totalRooms != null && availableRooms > totalRooms) {
    throw buildValidationError(
      'available_rooms',
      'available_rooms must be less than or equal to total_rooms',
    );
  }
};

const createAdminHotelRoomService = ({
  repository = createAdminHotelRoomRepository(),
} = {}) => {
  const listRooms = async ({
    auth,
    hotel_service_id: hotelServiceId,
    status,
  } = {}) => {
    const resolvedHotelServiceId = parseUuid('hotel_service_id', hotelServiceId);
    const service = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: resolvedHotelServiceId,
    });
    validateParentHotel(service);
    const resolvedStatus = parseOptionalStatus(status);
    const rooms = await repository.listRoomsByHotel({
      hotelServiceId: resolvedHotelServiceId,
      status: resolvedStatus,
    });

    return rooms.map(mapRoom);
  };

  const createRoom = async ({
    auth,
    body,
    hotel_service_id: hotelServiceId,
  } = {}) => {
    const resolvedHotelServiceId = parseUuid('hotel_service_id', hotelServiceId);
    const service = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: resolvedHotelServiceId,
    });
    validateParentHotel(service);
    const payload = ensureBodyObject(body);

    for (const key of Object.keys(payload)) {
      if (![
        'name',
        'bed_type',
        'max_adults',
        'max_children',
        'total_rooms',
        'available_rooms',
        'base_price',
        'description',
        'status',
      ].includes(key)) {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const maxAdults = parseRequiredInteger({
      field: 'max_adults',
      min: 1,
      value: payload.max_adults,
    });
    const maxChildren = parseOptionalInteger({
      field: 'max_children',
      min: 0,
      value: payload.max_children,
    });
    const totalRooms = parseRequiredInteger({
      field: 'total_rooms',
      min: 0,
      value: payload.total_rooms,
    });
    const availableRooms = payload.available_rooms == null
      ? totalRooms
      : parseOptionalInteger({
          field: 'available_rooms',
          min: 0,
          value: payload.available_rooms,
        });
    validateRoomInventoryConsistency({
      availableRooms,
      totalRooms,
    });

    const created = await repository.createRoom({
      actorUserId: auth.userId,
      hotelServiceId: resolvedHotelServiceId,
      logMetadata: {
        hotel_service_id: resolvedHotelServiceId,
        operation: 'create',
        status: parseMutableRoomStatus(payload.status) ?? SERVICE_STATUS.ACTIVE,
      },
      payload: {
        available_rooms: availableRooms,
        base_price: parseMoney({
          field: 'base_price',
          value: payload.base_price,
        }),
        bed_type: parseOptionalString({
          field: 'bed_type',
          maxLength: 100,
          value: payload.bed_type,
        }),
        description: parseOptionalString({
          field: 'description',
          maxLength: 5000,
          value: payload.description,
        }),
        max_adults: maxAdults,
        max_children: maxChildren ?? 0,
        name: parseRequiredString({
          field: 'name',
          maxLength: 150,
          value: payload.name,
        }),
        status: parseMutableRoomStatus(payload.status) ?? SERVICE_STATUS.ACTIVE,
        total_rooms: totalRooms,
      },
    });

    return mapRoom(created);
  };

  const updateRoom = async ({
    auth,
    body,
    room_type_id: roomTypeId,
  } = {}) => {
    const resolvedRoomTypeId = parseUuid('room_type_id', roomTypeId);
    const payload = ensureBodyObject(body);

    if (Object.prototype.hasOwnProperty.call(payload, 'hotel_service_id')) {
      throw buildValidationError(
        'hotel_service_id',
        'hotel_service_id cannot be changed',
      );
    }

    for (const key of Object.keys(payload)) {
      if (![
        'name',
        'bed_type',
        'max_adults',
        'max_children',
        'total_rooms',
        'available_rooms',
        'base_price',
        'description',
        'status',
      ].includes(key)) {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const currentRoom = await repository.getRoomById(resolvedRoomTypeId);

    if (!currentRoom) {
      throw buildResourceNotFoundError('Room type not found');
    }

    if (currentRoom.status === SERVICE_STATUS.DELETED) {
      throw buildResourceNotFoundError('Room type not found');
    }

    const parentService = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: currentRoom.hotel_service_id,
    });
    validateParentHotel(parentService);

    const nextTotalRooms = Object.prototype.hasOwnProperty.call(payload, 'total_rooms')
      ? parseOptionalInteger({
          field: 'total_rooms',
          min: 0,
          value: payload.total_rooms,
        })
      : undefined;
    const nextAvailableRooms = Object.prototype.hasOwnProperty.call(payload, 'available_rooms')
      ? parseOptionalInteger({
          field: 'available_rooms',
          min: 0,
          value: payload.available_rooms,
        })
      : undefined;
    validateRoomInventoryConsistency({
      availableRooms: nextAvailableRooms ?? currentRoom.available_rooms,
      totalRooms: nextTotalRooms ?? currentRoom.total_rooms,
    });

    const updatePayload = {};

    if (Object.prototype.hasOwnProperty.call(payload, 'name')) {
      updatePayload.name = parseRequiredString({
        field: 'name',
        maxLength: 150,
        value: payload.name,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'bed_type')) {
      updatePayload.bed_type = parseOptionalString({
        field: 'bed_type',
        maxLength: 100,
        value: payload.bed_type,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'max_adults')) {
      updatePayload.max_adults = parseOptionalInteger({
        field: 'max_adults',
        min: 1,
        value: payload.max_adults,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'max_children')) {
      updatePayload.max_children = parseOptionalInteger({
        field: 'max_children',
        min: 0,
        value: payload.max_children,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'total_rooms')) {
      updatePayload.total_rooms = nextTotalRooms;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'available_rooms')) {
      updatePayload.available_rooms = nextAvailableRooms;
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'base_price')) {
      updatePayload.base_price = parseMoney({
        field: 'base_price',
        value: payload.base_price,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'description')) {
      updatePayload.description = parseOptionalString({
        field: 'description',
        maxLength: 5000,
        value: payload.description,
      });
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      updatePayload.status = parseMutableRoomStatus(payload.status);
    }

    if (Object.keys(updatePayload).length === 0) {
      throw buildValidationError('body', 'no updatable fields were provided');
    }

    const updated = await repository.updateRoom({
      actorUserId: auth.userId,
      logMetadata: {
        new_value: updatePayload,
        old_value: currentRoom,
        operation: 'update',
      },
      payload: updatePayload,
      roomTypeId: resolvedRoomTypeId,
    });

    return mapRoom(updated);
  };

  const deleteRoom = async ({
    auth,
    body,
    room_type_id: roomTypeId,
  } = {}) => {
    const resolvedRoomTypeId = parseUuid('room_type_id', roomTypeId);
    const payload = ensureBodyObject(body);

    for (const key of Object.keys(payload)) {
      if (key !== 'reason') {
        throw buildValidationError(key, `${key} is not supported in this endpoint`);
      }
    }

    const currentRoom = await repository.getRoomById(resolvedRoomTypeId);

    if (!currentRoom) {
      throw buildResourceNotFoundError('Room type not found');
    }

    if (currentRoom.status === SERVICE_STATUS.DELETED) {
      throw buildResourceNotFoundError('Room type not found');
    }

    const parentService = await repository.getServiceById({
      allowedServiceIds: null,
      serviceId: currentRoom.hotel_service_id,
    });
    validateParentHotel(parentService);
    const reason = parseReason(payload.reason);
    const hasBookings = await repository.roomHasBookings(resolvedRoomTypeId);
    const nextStatus = hasBookings
      ? SERVICE_STATUS.HIDDEN
      : SERVICE_STATUS.DELETED;
    const updated = await repository.softDeleteRoom({
      actorUserId: auth.userId,
      logMetadata: {
        has_bookings: hasBookings,
        next_status: nextStatus,
        old_status: currentRoom.status,
        operation: 'delete',
        reason,
      },
      nextStatus,
      roomTypeId: resolvedRoomTypeId,
    });

    return mapRoom(updated);
  };

  return {
    createRoom,
    deleteRoom,
    listRooms,
    updateRoom,
  };
};

module.exports = Object.assign(createAdminHotelRoomService(), {
  createAdminHotelRoomService,
});
