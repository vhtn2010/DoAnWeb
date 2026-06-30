const {
  API_ERROR_CODES,
  SERVICE_STATUS_VALUES,
  SERVICE_TYPE,
  SERVICE_TYPE_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminServiceCatalogRepository,
} = require('../database/adminServiceCatalogRepository');
const AppError = require('../utils/AppError');

const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_PAGE = 1;
const MAX_LIST_LIMIT = 100;
const MAX_QUERY_LENGTH = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;

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

const buildResourceNotFoundError = (message = 'Service not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

const parseOptionalEnum = ({
  allowedValues,
  field,
  value,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
    );
  }

  if (!allowedValues.includes(value)) {
    throw buildValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
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

const parseServiceId = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError('service_id', 'service_id must be a valid UUID');
  }

  const normalized = value.trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw buildValidationError('service_id', 'service_id must be a valid UUID');
  }

  return normalized;
};

const buildPaginationMeta = ({ limit, page, total }) => {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    has_next: totalPages > 0 && page < totalPages,
    limit,
    page,
    total,
    total_pages: totalPages,
  };
};

const toNumberOrNull = (value) => {
  if (value == null) {
    return null;
  }

  return Number(value);
};

const mapServiceListItem = (service) => ({
  id: service.id,
  service_code: service.service_code,
  service_type: service.service_type,
  title: service.title,
  slug: service.slug,
  short_description: service.short_description,
  provider_name: service.provider_name,
  location_text: service.location_text,
  base_price: toNumberOrNull(service.base_price),
  sale_price: toNumberOrNull(service.sale_price),
  public_price: toNumberOrNull(service.public_price),
  currency: service.currency,
  status: service.status,
  primary_image: service.primary_image || null,
  created_by: service.created_by,
  updated_by: service.updated_by,
  approved_by: service.approved_by,
  approved_at: service.approved_at,
  created_at: service.created_at,
  updated_at: service.updated_at,
  deleted_at: service.deleted_at,
});

const mapBaseDetail = (service) => ({
  id: service.id,
  service_code: service.service_code,
  service_type: service.service_type,
  title: service.title,
  slug: service.slug,
  short_description: service.short_description,
  description: service.description,
  provider_name: service.provider_name,
  location_text: service.location_text,
  base_price: toNumberOrNull(service.base_price),
  sale_price: toNumberOrNull(service.sale_price),
  public_price: toNumberOrNull(service.public_price),
  currency: service.currency,
  status: service.status,
  cancellation_policy: service.cancellation_policy,
  metadata:
    service.service_type === SERVICE_TYPE.COMBO
      ? undefined
      : service.metadata,
  created_by: service.created_by,
  updated_by: service.updated_by,
  approved_by: service.approved_by,
  approved_at: service.approved_at,
  created_at: service.created_at,
  updated_at: service.updated_at,
  deleted_at: service.deleted_at,
});

const sanitizeAdminComboItems = (comboItems) => {
  if (!Array.isArray(comboItems)) {
    return [];
  }

  const allowedKeys = new Set([
    'service_id',
    'service_type',
    'slug',
    'title',
    'short_description',
    'description',
    'location_text',
    'quantity',
    'base_price',
    'sale_price',
    'public_price',
    'reference_id',
    'start_at',
    'end_at',
    'options',
  ]);

  return comboItems
    .filter((item) => item && typeof item === 'object' && !Array.isArray(item))
    .map((item) => {
      const sanitized = {};

      for (const [key, value] of Object.entries(item)) {
        if (allowedKeys.has(key)) {
          sanitized[key] = value;
        }
      }

      if (sanitized.base_price != null) {
        sanitized.base_price = Number(sanitized.base_price);
      }

      if (sanitized.sale_price != null) {
        sanitized.sale_price = Number(sanitized.sale_price);
      }

      if (sanitized.public_price != null) {
        sanitized.public_price = Number(sanitized.public_price);
      }

      if (sanitized.quantity != null) {
        const quantity = Number(sanitized.quantity);
        sanitized.quantity = Number.isFinite(quantity)
          ? quantity
          : sanitized.quantity;
      }

      return sanitized;
    });
};

const mapTourDetail = (detail) => ({
  departure_location: detail.departure_location,
  destination_location: detail.destination_location,
  duration_days: detail.duration_days,
  duration_nights: detail.duration_nights,
  transport_type: detail.transport_type,
  max_group_size: detail.max_group_size,
  departure_schedule: detail.departure_schedule,
  itinerary: detail.itinerary,
  included_services: detail.included_services,
  excluded_services: detail.excluded_services,
  terms: detail.terms,
});

const mapHotelDetail = (detail, roomTypes) => ({
  star_rating: detail.star_rating == null ? null : Number(detail.star_rating),
  address: detail.address,
  checkin_time: detail.checkin_time,
  checkout_time: detail.checkout_time,
  amenities: detail.amenities,
  hotel_policy: detail.hotel_policy,
  room_types: roomTypes.map((room) => ({
    id: room.id,
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
  })),
});

const mapFlightDetails = (rows) =>
  rows.map((detail) => ({
    id: detail.id,
    airline_name: detail.airline_name,
    flight_number: detail.flight_number,
    departure_airport: detail.departure_airport,
    arrival_airport: detail.arrival_airport,
    departure_at: detail.departure_at,
    arrival_at: detail.arrival_at,
    cabin_class: detail.cabin_class,
    seats_total: Number(detail.seats_total),
    seats_available: Number(detail.seats_available),
    fare_price: Number(detail.fare_price),
    status: detail.status,
  }));

const mapTrainDetails = (rows) =>
  rows.map((detail) => ({
    id: detail.id,
    train_number: detail.train_number,
    departure_station: detail.departure_station,
    arrival_station: detail.arrival_station,
    departure_at: detail.departure_at,
    arrival_at: detail.arrival_at,
    seat_class: detail.seat_class,
    seats_total: Number(detail.seats_total),
    seats_available: Number(detail.seats_available),
    fare_price: Number(detail.fare_price),
    status: detail.status,
  }));

const mapImages = (rows) =>
  rows.map((image) => ({
    id: image.id,
    image_url: image.image_url,
    cloudinary_public_id: image.cloudinary_public_id,
    alt_text: image.alt_text,
    sort_order: Number(image.sort_order),
    is_primary: Boolean(image.is_primary),
    created_at: image.created_at,
  }));

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

const createAdminServiceCatalogService = ({
  repository = createAdminServiceCatalogRepository(),
} = {}) => {
  const listServices = async ({
    auth,
    limit,
    page,
    q,
    status,
    type,
  } = {}) => {
    const serviceType = parseOptionalEnum({
      allowedValues: SERVICE_TYPE_VALUES,
      field: 'type',
      value: type,
    });
    const serviceStatus = parseOptionalEnum({
      allowedValues: SERVICE_STATUS_VALUES,
      field: 'status',
      value: status,
    });
    const keyword = parseOptionalKeyword(q);
    const resolvedPage = parseBoundedInteger({
      defaultValue: DEFAULT_LIST_PAGE,
      field: 'page',
      max: Number.MAX_SAFE_INTEGER,
      value: page,
    });
    const resolvedLimit = parseBoundedInteger({
      defaultValue: DEFAULT_LIST_LIMIT,
      field: 'limit',
      max: MAX_LIST_LIMIT,
      value: limit,
    });
    const offset = (resolvedPage - 1) * resolvedLimit;
    const result = await repository.listServices({
      allowedServiceIds: resolveScopeServiceIds(auth),
      keyword,
      limit: resolvedLimit,
      offset,
      serviceStatus,
      serviceType,
    });

    return {
      meta: buildPaginationMeta({
        limit: resolvedLimit,
        page: resolvedPage,
        total: result.total,
      }),
      services: result.rows.map(mapServiceListItem),
    };
  };

  const getServiceDetail = async ({ auth, service_id: serviceId } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const service = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      serviceId: resolvedServiceId,
    });

    if (!service) {
      throw buildResourceNotFoundError();
    }

    const baseDetail = mapBaseDetail(service);
    const images = await repository.listServiceImages(resolvedServiceId);

    if (service.service_type === SERVICE_TYPE.TOUR) {
      const detail = await repository.getTourDetail(resolvedServiceId);

      return {
        ...baseDetail,
        details: detail ? mapTourDetail(detail) : null,
        images: mapImages(images),
      };
    }

    if (service.service_type === SERVICE_TYPE.HOTEL) {
      const [detail, roomTypes] = await Promise.all([
        repository.getHotelDetail(resolvedServiceId),
        repository.listRoomTypesByHotel(resolvedServiceId),
      ]);

      return {
        ...baseDetail,
        details: detail ? mapHotelDetail(detail, roomTypes) : null,
        images: mapImages(images),
      };
    }

    if (service.service_type === SERVICE_TYPE.FLIGHT) {
      const details = await repository.listFlightDetailsByService(resolvedServiceId);

      return {
        ...baseDetail,
        details: mapFlightDetails(details),
        images: mapImages(images),
      };
    }

    if (service.service_type === SERVICE_TYPE.TRAIN) {
      const details = await repository.listTrainDetailsByService(resolvedServiceId);

      return {
        ...baseDetail,
        details: mapTrainDetails(details),
        images: mapImages(images),
      };
    }

    if (service.service_type === SERVICE_TYPE.COMBO) {
      return {
        ...baseDetail,
        combo_items: sanitizeAdminComboItems(service.metadata?.combo_items),
        details: null,
        images: mapImages(images),
      };
    }

    return {
      ...baseDetail,
      details: null,
      images: mapImages(images),
    };
  };

  return {
    getServiceDetail,
    listServices,
  };
};

module.exports = Object.assign(createAdminServiceCatalogService(), {
  DEFAULT_LIST_LIMIT,
  DEFAULT_LIST_PAGE,
  MAX_LIST_LIMIT,
  createAdminServiceCatalogService,
});
