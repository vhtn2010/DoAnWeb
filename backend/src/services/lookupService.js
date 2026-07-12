const {
  API_ERROR_CODES,
  CABIN_CLASS_VALUES,
  SEAT_CLASS_VALUES,
  SERVICE_TYPE,
  SERVICE_TYPE_VALUES,
  TRANSPORT_TYPE_VALUES,
} = require('../constants/domainConstraints');
const {
  createPublicSearchRepository,
} = require('../database/publicSearchRepository');
const AppError = require('../utils/AppError');

const DEFAULT_FEATURED_LIMIT = 8;
const DEFAULT_LOCATION_LIMIT = 10;
const DEFAULT_SEARCH_LIMIT = 20;
const DEFAULT_SEARCH_PAGE = 1;
const DEFAULT_SEARCH_SORT = 'newest';
const DEFAULT_AVAILABILITY_CURRENCY = 'VND';
const COMBO_CACHE_SECONDS = 15 * 60;
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const DETAIL_CACHE_SECONDS = 15 * 60;
const ENUMS_CACHE_SECONDS = 24 * 60 * 60;
const FEATURED_CACHE_SECONDS = 15 * 60;
const FILTER_CACHE_SECONDS = 15 * 60;
const IMAGE_CACHE_SECONDS = 15 * 60;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const LOCALE = 'vi-VN';
const MAX_AVAILABILITY_QUANTITY = 20;
const MAX_FEATURED_LIMIT = 20;
const MAX_LOCATION_LENGTH = 100;
const MAX_LOCATION_LIMIT = 50;
const MAX_PRICE_LIMIT = Number.MAX_SAFE_INTEGER;
const MAX_QUERY_LENGTH = 100;
const MAX_SEARCH_LIMIT = 50;
const MIN_QUERY_LENGTH = 2;
const ROOM_LIST_CACHE_SECONDS = 15 * 60;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const PUBLIC_SERVICE_TYPE_VALUES = Object.freeze(
  SERVICE_TYPE_VALUES.filter((value) => value !== SERVICE_TYPE.ROOM),
);
const SORT_OPTION_VALUES = Object.freeze([
  'price_asc',
  'price_desc',
  'newest',
  'oldest',
  'popular',
]);
const TRAIN_STATION_OPTIONS = Object.freeze([
  {
    code: 'HAN',
    city: 'Hà Nội',
    stationName: 'Ga Hà Nội',
  },
  {
    code: 'PLY',
    city: 'Phủ Lý',
    stationName: 'Ga Phủ Lý',
  },
  {
    code: 'NDI',
    city: 'Nam Định',
    stationName: 'Ga Nam Định',
  },
  {
    code: 'NBI',
    city: 'Ninh Bình',
    stationName: 'Ga Ninh Bình',
  },
  {
    code: 'THH',
    city: 'Thanh Hóa',
    stationName: 'Ga Thanh Hóa',
  },
  {
    code: 'VIN',
    city: 'Vinh',
    stationName: 'Ga Vinh',
  },
  {
    code: 'DBH',
    city: 'Đồng Hới',
    stationName: 'Ga Đồng Hới',
  },
  {
    code: 'HUE',
    city: 'Huế',
    stationName: 'Ga Huế',
  },
  {
    code: 'DNA',
    city: 'Đà Nẵng',
    stationName: 'Ga Đà Nẵng',
  },
  {
    code: 'TAM',
    city: 'Tam Kỳ',
    stationName: 'Ga Tam Kỳ',
  },
  {
    code: 'QNG',
    city: 'Quảng Ngãi',
    stationName: 'Ga Quảng Ngãi',
  },
  {
    code: 'DTR',
    city: 'Quy Nhơn',
    stationName: 'Ga Diêu Trì',
  },
  {
    code: 'THY',
    city: 'Tuy Hòa',
    stationName: 'Ga Tuy Hòa',
  },
  {
    code: 'NTR',
    city: 'Nha Trang',
    stationName: 'Ga Nha Trang',
  },
  {
    code: 'PCM',
    city: 'Phan Rang - Tháp Chàm',
    stationName: 'Ga Tháp Chàm',
  },
  {
    code: 'PHT',
    city: 'Phan Thiết',
    stationName: 'Ga Phan Thiết',
  },
  {
    code: 'SGN',
    city: 'TP. Hồ Chí Minh',
    stationName: 'Ga Sài Gòn',
    aliases: ['Hồ Chí Minh', 'Ho Chi Minh', 'Sài Gòn', 'Sai Gon'],
  },
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

const buildResourceNotFoundError = (message = 'Service not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();
const stripDiacritics = (value) =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
const normalizeSearchKey = (value) =>
  normalizeWhitespace(stripDiacritics(value)).toLocaleLowerCase(LOCALE);
const TRAIN_STATION_LOOKUP = (() => {
  const lookup = new Map();

  for (const station of TRAIN_STATION_OPTIONS) {
    const candidates = [
      station.code,
      station.city,
      station.stationName,
      `${station.city} (${station.code})`,
      station.stationName.replace(/^Ga\s+/i, ''),
      ...(Array.isArray(station.aliases) ? station.aliases : []),
    ];

    for (const candidate of candidates) {
      const normalizedCandidate = normalizeSearchKey(candidate);

      if (normalizedCandidate) {
        lookup.set(normalizedCandidate, station);
      }
    }
  }

  return lookup;
})();

const toTitleCase = (value) =>
  value
    .split(' ')
    .map((token) => {
      if (!token) {
        return token;
      }

      return (
        token.charAt(0).toLocaleUpperCase(LOCALE) +
        token.slice(1).toLocaleLowerCase(LOCALE)
      );
    })
    .join(' ');

const normalizeLocation = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = normalizeWhitespace(value);
  return normalized.length > 0 ? normalized : null;
};

const getLocationDisplayScore = (value) => {
  const lowerValue = value.toLocaleLowerCase(LOCALE);
  const upperValue = value.toLocaleUpperCase(LOCALE);

  if (value === toTitleCase(value)) {
    return 0;
  }

  if (value !== lowerValue && value !== upperValue) {
    return 1;
  }

  return 2;
};

const choosePreferredLocation = (currentValue, nextValue) => {
  if (!currentValue) {
    return nextValue;
  }

  const scoreDifference =
    getLocationDisplayScore(currentValue) - getLocationDisplayScore(nextValue);

  if (scoreDifference !== 0) {
    return scoreDifference < 0 ? currentValue : nextValue;
  }

  return currentValue.localeCompare(nextValue, LOCALE) <= 0
    ? currentValue
    : nextValue;
};

const finalizeLocationDisplay = (value) => {
  const lowerValue = value.toLocaleLowerCase(LOCALE);
  const upperValue = value.toLocaleUpperCase(LOCALE);

  if (value === lowerValue || value === upperValue) {
    return toTitleCase(lowerValue);
  }

  return value;
};

const createCanonicalSorter = (order) => {
  const indexes = new Map(order.map((value, index) => [value, index]));

  return (values) =>
    [...values].sort((left, right) => {
      const leftIndex = indexes.has(left)
        ? indexes.get(left)
        : Number.MAX_SAFE_INTEGER;
      const rightIndex = indexes.has(right)
        ? indexes.get(right)
        : Number.MAX_SAFE_INTEGER;

      if (leftIndex !== rightIndex) {
        return leftIndex - rightIndex;
      }

      return left.localeCompare(right, 'en');
    });
};

const sortByServiceTypeOrder = createCanonicalSorter(PUBLIC_SERVICE_TYPE_VALUES);
const sortByCabinClassOrder = createCanonicalSorter(CABIN_CLASS_VALUES);
const sortBySeatClassOrder = createCanonicalSorter(SEAT_CLASS_VALUES);
const sortByTransportTypeOrder = createCanonicalSorter(TRANSPORT_TYPE_VALUES);

const parsePublicServiceType = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    throw buildValidationError(
      'type',
      `type must be one of: ${PUBLIC_SERVICE_TYPE_VALUES.join(', ')}`,
    );
  }

  if (value === SERVICE_TYPE.ROOM) {
    throw buildValidationError(
      'type',
      'type=room is not supported in public service search. Use /services/{hotel_service_id}/rooms.',
    );
  }

  if (!PUBLIC_SERVICE_TYPE_VALUES.includes(value)) {
    throw buildValidationError(
      'type',
      `type must be one of: ${PUBLIC_SERVICE_TYPE_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseBoundedInteger = ({
  capAtMax = false,
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
    if (capAtMax) {
      return max;
    }

    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${max}`,
    );
  }

  return parsed;
};

const parseTextFilter = ({
  field,
  maxLength,
  minLength = 0,
  rejectDangerousCharacters = false,
  value,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a string`);
  }

  const normalized = normalizeWhitespace(value);

  if (normalized.length === 0) {
    return null;
  }

  if (normalized.length < minLength) {
    throw buildValidationError(
      field,
      `${field} must be at least ${minLength} characters long`,
    );
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be at most ${maxLength} characters long`,
    );
  }

  if (rejectDangerousCharacters && DANGEROUS_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(
      field,
      `${field} contains unsupported characters`,
    );
  }

  return normalized;
};

const parsePriceFilter = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value)) {
    throw buildValidationError(
      field,
      `${field} must be a number greater than or equal to 0`,
    );
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_PRICE_LIMIT) {
    throw buildValidationError(
      field,
      `${field} must be a number greater than or equal to 0`,
    );
  }

  return parsed;
};

const parseSearchSort = (value) => {
  if (value == null || value === '') {
    return DEFAULT_SEARCH_SORT;
  }

  if (Array.isArray(value) || !SORT_OPTION_VALUES.includes(value)) {
    throw buildValidationError(
      'sort',
      `sort must be one of: ${SORT_OPTION_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseSlug = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError('slug', 'slug is required');
  }

  const normalized = value.trim();

  if (!normalized) {
    throw buildValidationError('slug', 'slug is required');
  }

  if (normalized.length > 280) {
    throw buildValidationError(
      'slug',
      'slug must be at most 280 characters long',
    );
  }

  if (!SLUG_PATTERN.test(normalized)) {
    throw buildValidationError(
      'slug',
      'slug must contain only lowercase letters, numbers, and hyphens',
    );
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

const parseHotelServiceId = (value) => {
  if (typeof value !== 'string') {
    throw buildValidationError(
      'hotel_service_id',
      'hotel_service_id must be a valid UUID',
    );
  }

  const normalized = value.trim();

  if (!UUID_PATTERN.test(normalized)) {
    throw buildValidationError(
      'hotel_service_id',
      'hotel_service_id must be a valid UUID',
    );
  }

  return normalized;
};

const parseRequiredServiceType = (value) => {
  if (value == null || value === '') {
    throw buildValidationError('service_type', 'service_type is required');
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError('service_type', 'service_type is required');
  }

  if (value === SERVICE_TYPE.ROOM) {
    throw buildValidationError(
      'service_type',
      'service_type must be one of: tour, hotel, flight, train, combo',
    );
  }

  if (!PUBLIC_SERVICE_TYPE_VALUES.includes(value)) {
    throw buildValidationError(
      'service_type',
      'service_type must be one of: tour, hotel, flight, train, combo',
    );
  }

  return value;
};

const parseQuantity = (value) => {
  if (value == null || value === '') {
    throw buildValidationError('quantity', 'quantity is required');
  }

  if (typeof value === 'string' && !/^\d+$/.test(value)) {
    throw buildValidationError('quantity', 'quantity must be a positive integer');
  }

  if (
    typeof value === 'number' &&
    (!Number.isInteger(value) || value < 1)
  ) {
    throw buildValidationError('quantity', 'quantity must be a positive integer');
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw buildValidationError('quantity', 'quantity must be a positive integer');
  }

  if (parsed > MAX_AVAILABILITY_QUANTITY) {
    throw buildValidationError(
      'quantity',
      `quantity must be less than or equal to ${MAX_AVAILABILITY_QUANTITY}`,
    );
  }

  return parsed;
};

const parseOptionalIsoDateTime = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid ISO 8601 datetime`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid ISO 8601 datetime`);
  }

  return parsed;
};

const parseReferenceId = (value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError('reference_id', 'reference_id must be a valid UUID');
  }

  return value.trim();
};

const parseOptionalReferenceId = (value) => {
  if (value == null || value === '') {
    return null;
  }

  return parseReferenceId(value);
};

const parseOptionalGuestCount = (field, value) => {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    throw buildValidationError(field, `${field} must be a non-negative integer`);
  }

  return parsed;
};

const parseRoomGuestCount = (field, value, { defaultValue, min }) => {
  if (value == null || value === '') {
    return defaultValue;
  }

  if (Array.isArray(value) || !/^\d+$/.test(String(value))) {
    throw buildValidationError(field, `${field} must be a valid integer`);
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < min) {
    throw buildValidationError(
      field,
      `${field} must be greater than or equal to ${min}`,
    );
  }

  return parsed;
};

const parseRoomDate = (field, value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid date`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid date`);
  }

  return parsed;
};

const parseRequiredTextField = ({
  field,
  maxLength = MAX_LOCATION_LENGTH,
  value,
}) => {
  const resolvedValue = parseTextFilter({
    field,
    maxLength,
    rejectDangerousCharacters: true,
    value,
  });

  if (!resolvedValue) {
    throw buildValidationError(field, `${field} is required`);
  }

  return resolvedValue;
};

const parseOptionalEnumFilter = (field, allowedValues, value) => {
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

const parseDateOnly = (field, value) => {
  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} is required`);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw buildValidationError(field, `${field} is required`);
  }

  if (!ISO_DATE_PATTERN.test(normalized)) {
    throw buildValidationError(
      field,
      `${field} must be a valid date in YYYY-MM-DD format`,
    );
  }

  const [year, month, day] = normalized.split('-').map((part) => Number(part));
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw buildValidationError(
      field,
      `${field} must be a valid date in YYYY-MM-DD format`,
    );
  }

  return normalized;
};

const getVietnamDateString = (date = new Date()) =>
  new Date(date.getTime() + VIETNAM_UTC_OFFSET_MS).toISOString().slice(0, 10);

const parseDepartureDate = (value) => {
  const normalized = parseDateOnly('departure_date', value);

  if (normalized < getVietnamDateString()) {
    throw buildValidationError(
      'departure_date',
      'departure_date must not be in the past',
    );
  }

  return normalized;
};

const buildVietnamDateRange = (dateString) => {
  const [year, month, day] = dateString.split('-').map((part) => Number(part));

  return {
    end: new Date(Date.UTC(year, month - 1, day + 1, -7, 0, 0, 0)),
    start: new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0)),
  };
};

const toPublicPrice = (service) => {
  if (service.sale_price != null) {
    return Number(service.sale_price);
  }

  return Number(service.base_price);
};

const mapServiceCard = (service) => ({
  id: service.id,
  service_type: service.service_type,
  title: service.title,
  slug: service.slug,
  short_description: service.short_description,
  location_text: service.location_text,
  base_price:
    service.base_price == null
      ? null
      : Number(service.base_price),
  sale_price:
    service.sale_price == null
      ? null
      : Number(service.sale_price),
  public_price:
    service.public_price == null
      ? toPublicPrice(service)
      : Number(service.public_price),
  currency: service.currency || 'VND',
  primary_image: service.primary_image || null,
});

const mapBaseServiceDetail = (service) => ({
  id: service.id,
  service_type: service.service_type,
  title: service.title,
  slug: service.slug,
  short_description: service.short_description,
  description: service.description,
  provider_name: service.provider_name,
  location_text: service.location_text,
  base_price:
    service.base_price == null
      ? null
      : Number(service.base_price),
  sale_price:
    service.sale_price == null
      ? null
      : Number(service.sale_price),
  public_price:
    service.public_price == null
      ? toPublicPrice(service)
      : Number(service.public_price),
  currency: service.currency || 'VND',
  cancellation_policy: service.cancellation_policy,
  primary_image: service.primary_image || null,
});

const applyFarePriceToServiceDetail = (baseDetail, detail) => {
  if (detail.fare_price == null) {
    return baseDetail;
  }

  const farePrice = Number(detail.fare_price);

  if (!Number.isFinite(farePrice)) {
    return baseDetail;
  }

  return {
    ...baseDetail,
    base_price: farePrice,
    sale_price: farePrice,
    public_price: farePrice,
  };
};

const mapImages = (images) =>
  images.map((image) => ({
    image_url: image.image_url,
    alt_text: image.alt_text,
    sort_order: Number(image.sort_order),
    is_primary: Boolean(image.is_primary),
  }));

const mapHotelRoom = (room, currency) => ({
  id: room.id,
  name: room.name,
  bed_type: room.bed_type,
  max_adults: Number(room.max_adults),
  max_children: Number(room.max_children),
  available_rooms: Number(room.available_rooms),
  base_price:
    room.base_price == null
      ? null
      : Number(room.base_price),
  currency,
  description: room.description,
  is_available: Number(room.available_rooms) > 0,
});

const sanitizeComboItems = (comboItems) => {
  if (!Array.isArray(comboItems)) {
    return [];
  }

  const allowedKeys = new Set([
    'service_id',
    'service_type',
    'slug',
    'title',
    'location_text',
    'quantity',
    'base_price',
    'sale_price',
    'public_price',
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

      return sanitized;
    });
};

const sanitizePublicComboItems = (comboItems) => {
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

      if (sanitized.quantity != null) {
        const numericQuantity = Number(sanitized.quantity);
        sanitized.quantity = Number.isFinite(numericQuantity)
          ? numericQuantity
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

const mapHotelDetail = (detail) => ({
  star_rating:
    detail.star_rating == null
      ? null
      : Number(detail.star_rating),
  address: detail.address,
  checkin_time: detail.checkin_time,
  checkout_time: detail.checkout_time,
  amenities: detail.amenities,
  hotel_policy: detail.hotel_policy,
});

const mapFlightDetail = (detail) => ({
  id: detail.id,
  airline_name: detail.airline_name,
  flight_number: detail.flight_number,
  departure_airport: detail.departure_airport,
  arrival_airport: detail.arrival_airport,
  departure_at: detail.departure_at,
  arrival_at: detail.arrival_at,
  cabin_class: detail.cabin_class,
  seats_available: detail.seats_available,
  fare_price:
    detail.fare_price == null
      ? null
      : Number(detail.fare_price),
  status: detail.status,
  is_bookable:
    detail.status === 'open' &&
    Number(detail.seats_available) > 0 &&
    new Date(detail.departure_at).getTime() > Date.now(),
});

const mapTrainDetail = (detail) => ({
  train_number: detail.train_number,
  departure_station: detail.departure_station,
  arrival_station: detail.arrival_station,
  departure_at: detail.departure_at,
  arrival_at: detail.arrival_at,
  seat_class: detail.seat_class,
  seats_available: detail.seats_available,
  fare_price:
    detail.fare_price == null
      ? null
      : Number(detail.fare_price),
  status: detail.status,
  is_bookable:
    detail.status === 'open' &&
    Number(detail.seats_available) > 0 &&
    new Date(detail.departure_at).getTime() > Date.now(),
});

const mapFlightSearchResult = (flight) => ({
  service_id: flight.service_id,
  flight_detail_id: flight.flight_detail_id,
  slug: flight.slug,
  airline_name: flight.airline_name,
  flight_number: flight.flight_number,
  departure_airport: flight.departure_airport,
  arrival_airport: flight.arrival_airport,
  departure_at: flight.departure_at,
  arrival_at: flight.arrival_at,
  cabin_class: flight.cabin_class,
  seats_available: Number(flight.seats_available),
  fare_price:
    flight.fare_price == null
      ? null
      : Number(flight.fare_price),
  currency: flight.currency || DEFAULT_AVAILABILITY_CURRENCY,
});

const mapTrainSearchResult = (train) => ({
  service_id: train.service_id,
  train_detail_id: train.train_detail_id,
  slug: train.slug,
  train_number: train.train_number,
  departure_station: train.departure_station,
  arrival_station: train.arrival_station,
  departure_at: train.departure_at,
  arrival_at: train.arrival_at,
  seat_class: train.seat_class,
  seats_available: Number(train.seats_available),
  fare_price:
    train.fare_price == null
      ? null
      : Number(train.fare_price),
  currency: train.currency || DEFAULT_AVAILABILITY_CURRENCY,
});

const dedupeTrainSearchRows = (rows = []) => {
  const seenServiceIds = new Set();

  return rows.filter((row) => {
    const serviceId = row?.service_id;

    if (!serviceId || seenServiceIds.has(serviceId)) {
      return false;
    }

    seenServiceIds.add(serviceId);
    return true;
  });
};

const mapComboDetail = ({
  comboItems,
  isBookable,
  service,
}) => ({
  ...mapBaseServiceDetail(service),
  combo_items: comboItems,
  is_bookable: isBookable,
});

const buildPopularLocations = (services, limit) => {
  const groups = new Map();

  for (const service of services) {
    const normalizedLocation = normalizeLocation(service.location_text);

    if (!normalizedLocation) {
      continue;
    }

    const key = normalizedLocation.toLocaleLowerCase(LOCALE);
    const current = groups.get(key);

    if (!current) {
      groups.set(key, {
        location: normalizedLocation,
        service_count: 1,
      });
      continue;
    }

    current.location = choosePreferredLocation(
      current.location,
      normalizedLocation,
    );
    current.service_count += 1;
  }

  return [...groups.values()]
    .map((item) => ({
      location: finalizeLocationDisplay(item.location),
      service_count: item.service_count,
    }))
    .sort((left, right) => {
      if (right.service_count !== left.service_count) {
        return right.service_count - left.service_count;
      }

      return left.location.localeCompare(right.location, LOCALE);
    })
    .slice(0, limit);
};

const buildDistinctLocations = (services) =>
  [...new Set(
    services
      .map((service) => normalizeLocation(service.location_text))
      .filter(Boolean)
      .map((location) => finalizeLocationDisplay(location)),
  )].sort((left, right) => left.localeCompare(right, LOCALE));

const buildPriceRange = (services) => {
  const prices = services
    .map((service) => toPublicPrice(service))
    .filter((price) => Number.isFinite(price));

  if (prices.length === 0) {
    return {
      max_price: null,
      min_price: null,
    };
  }

  return {
    max_price: Math.max(...prices),
    min_price: Math.min(...prices),
  };
};

const normalizeDistinctValues = (rows, key) =>
  [...new Set(rows.map((row) => row[key]).filter(Boolean))];

const filterPublicServices = (services) =>
  services.filter((service) =>
    PUBLIC_SERVICE_TYPE_VALUES.includes(service.service_type),
  );

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

const normalizeTransportRouteIdentity = (value) =>
  String(value).toLocaleLowerCase(LOCALE);

const resolveCanonicalTrainStation = (value) => {
  const normalizedValue = normalizeSearchKey(value);

  if (!normalizedValue) {
    return null;
  }

  const station = TRAIN_STATION_LOOKUP.get(normalizedValue);
  return station ? station.stationName : String(value);
};

const normalizeTrainRouteIdentity = (value) =>
  normalizeSearchKey(resolveCanonicalTrainStation(value) ?? value);

const parseOptionalTransportRouteQuery = ({
  departureDate,
  from,
  normalizeRouteValue = normalizeTransportRouteIdentity,
  to,
}) => {
  const resolvedFrom = parseTextFilter({
    field: 'from',
    maxLength: MAX_LOCATION_LENGTH,
    rejectDangerousCharacters: true,
    value: from,
  });
  const resolvedTo = parseTextFilter({
    field: 'to',
    maxLength: MAX_LOCATION_LENGTH,
    rejectDangerousCharacters: true,
    value: to,
  });

  if (
    resolvedFrom &&
    resolvedTo &&
    normalizeRouteValue(resolvedFrom) === normalizeRouteValue(resolvedTo)
  ) {
    throw buildValidationError('route', 'from and to must be different');
  }

  return {
    departureDate:
      departureDate == null || departureDate === ''
        ? null
        : parseDepartureDate(departureDate),
    from: resolvedFrom,
    to: resolvedTo,
  };
};

const parseOptionalTrainRouteQuery = ({ departureDate, from, to }) => {
  const resolvedRoute = parseOptionalTransportRouteQuery({
    departureDate,
    from,
    normalizeRouteValue: normalizeTrainRouteIdentity,
    to,
  });

  return {
    ...resolvedRoute,
    from: resolvedRoute.from
      ? resolveCanonicalTrainStation(resolvedRoute.from) ?? resolvedRoute.from
      : null,
    to: resolvedRoute.to
      ? resolveCanonicalTrainStation(resolvedRoute.to) ?? resolvedRoute.to
      : null,
  };
};

const parseComboFilters = ({
  limit,
  location,
  max_price: maxPrice,
  min_price: minPrice,
  page,
} = {}) => {
  const resolvedLocation = parseTextFilter({
    field: 'location',
    maxLength: MAX_LOCATION_LENGTH,
    value: location,
  });
  const resolvedMinPrice = parsePriceFilter('min_price', minPrice);
  const resolvedMaxPrice = parsePriceFilter('max_price', maxPrice);

  if (
    resolvedMinPrice != null &&
    resolvedMaxPrice != null &&
    resolvedMinPrice > resolvedMaxPrice
  ) {
    throw buildValidationError(
      'price_range',
      'min_price must be less than or equal to max_price',
    );
  }

  return {
    limit: parseBoundedInteger({
      defaultValue: DEFAULT_SEARCH_LIMIT,
      field: 'limit',
      max: MAX_SEARCH_LIMIT,
      value: limit,
    }),
    location: resolvedLocation
      ? normalizeWhitespace(resolvedLocation)
      : null,
    maxPrice: resolvedMaxPrice,
    minPrice: resolvedMinPrice,
    page: parseBoundedInteger({
      defaultValue: DEFAULT_SEARCH_PAGE,
      field: 'page',
      max: MAX_PRICE_LIMIT,
      value: page,
    }),
  };
};

const parseRoomListQuery = ({
  adults,
  checkin,
  checkout,
  children,
}) => {
  const resolvedCheckin = parseRoomDate('checkin', checkin);
  const resolvedCheckout = parseRoomDate('checkout', checkout);

  if ((resolvedCheckin && !resolvedCheckout) || (!resolvedCheckin && resolvedCheckout)) {
    throw buildValidationError(
      'checkin_checkout',
      'checkin and checkout must be provided together',
    );
  }

  if (resolvedCheckin && resolvedCheckout && resolvedCheckout <= resolvedCheckin) {
    throw buildValidationError(
      'checkout',
      'checkout must be later than checkin',
    );
  }

  if (resolvedCheckin && !isFutureDate(resolvedCheckin)) {
    throw buildValidationError('checkin', 'checkin must be in the future');
  }

  return {
    adults: parseRoomGuestCount('adults', adults, {
      defaultValue: 1,
      min: 1,
    }),
    checkin: resolvedCheckin,
    checkout: resolvedCheckout,
    children: parseRoomGuestCount('children', children, {
      defaultValue: 0,
      min: 0,
    }),
  };
};

const createAvailabilityIssue = (code, message) => ({
  code,
  message,
});

const buildAvailabilityResponse = ({
  available,
  availableQuantity,
  currency = DEFAULT_AVAILABILITY_CURRENCY,
  issues = [],
  totalAmount,
  unitPrice,
}) => ({
  available,
  available_quantity: availableQuantity,
  unit_price: unitPrice,
  total_amount: totalAmount,
  currency,
  issues,
});

const buildUnavailableAvailability = ({
  availableQuantity = 0,
  currency = DEFAULT_AVAILABILITY_CURRENCY,
  issues,
  quantity = 0,
  unitPrice,
}) =>
  buildAvailabilityResponse({
    available: false,
    availableQuantity,
    currency,
    issues,
    totalAmount: unitPrice == null ? null : unitPrice * quantity,
    unitPrice,
  });

const isFutureDate = (date) => date.getTime() > Date.now();

const parseAvailabilityPayload = ({
  service,
  serviceId,
  body = {},
}) => {
  const resolvedServiceId = parseServiceId(serviceId);
  const resolvedServiceType = parseRequiredServiceType(body.service_type);
  const resolvedQuantity = parseQuantity(body.quantity);
  const resolvedStartAt = parseOptionalIsoDateTime('start_at', body.start_at);
  const resolvedEndAt = parseOptionalIsoDateTime('end_at', body.end_at);

  if (resolvedEndAt && resolvedStartAt && resolvedEndAt <= resolvedStartAt) {
    throw buildValidationError(
      'end_at',
      'end_at must be greater than start_at',
    );
  }

  if (resolvedStartAt && !isFutureDate(resolvedStartAt)) {
    throw buildValidationError(
      'start_at',
      'start_at must be in the future',
    );
  }

  if (resolvedEndAt && !isFutureDate(resolvedEndAt)) {
    throw buildValidationError(
      'end_at',
      'end_at must be in the future',
    );
  }

  if (service && resolvedServiceType !== service.service_type) {
    throw buildValidationError(
      'service_type',
      'service_type does not match the target service',
    );
  }

  return {
    endAt: resolvedEndAt,
    quantity: resolvedQuantity,
    referenceId: body.reference_id,
    serviceId: resolvedServiceId,
    serviceType: resolvedServiceType,
    startAt: resolvedStartAt,
  };
};

const resolvePublicPriceAndCurrency = (service) => ({
  currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
  unitPrice: toPublicPrice(service),
});

const extractAvailableSlotsFromSchedule = (scheduleItem) => {
  if (!scheduleItem || typeof scheduleItem !== 'object') {
    return 0;
  }

  const slotKeys = ['available_slots', 'availableSlots', 'slots_available'];

  for (const key of slotKeys) {
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

  return departureSchedule.find((item) => {
    if (!item || typeof item !== 'object') {
      return false;
    }

    return normalizeScheduleDateValue(item.date || item.departure_at) === targetDate;
  }) || null;
};

const buildSuccessfulAvailability = ({
  availableQuantity,
  currency,
  quantity,
  unitPrice,
}) =>
  buildAvailabilityResponse({
    available: quantity <= availableQuantity,
    availableQuantity,
    currency,
    issues:
      quantity <= availableQuantity
        ? []
        : [
            createAvailabilityIssue(
              'INSUFFICIENT_AVAILABILITY',
              'Requested quantity exceeds the available inventory.',
            ),
          ],
    totalAmount: unitPrice * quantity,
    unitPrice,
  });

const isPublicComboChildReference = async (repository, item) => {
  if (!item || typeof item !== 'object') {
    return false;
  }

  if (!item.service_id || !item.service_type) {
    return false;
  }

  const childService = await repository.getPublicServiceById(item.service_id);

  if (!childService) {
    return false;
  }

  return childService.service_type === item.service_type;
};

const createLookupService = ({
  repository = createPublicSearchRepository(),
} = {}) => {
  const getPublicEnums = () => ({
    cabin_class: CABIN_CLASS_VALUES,
    seat_class: SEAT_CLASS_VALUES,
    service_type: PUBLIC_SERVICE_TYPE_VALUES,
    sort_options: SORT_OPTION_VALUES,
    transport_type: TRANSPORT_TYPE_VALUES,
  });

  const getPopularLocations = async ({ limit, type } = {}) => {
    const resolvedType = parsePublicServiceType(type);
    const resolvedLimit = parseBoundedInteger({
      capAtMax: true,
      defaultValue: DEFAULT_LOCATION_LIMIT,
      field: 'limit',
      max: MAX_LOCATION_LIMIT,
      value: limit,
    });
    const services = filterPublicServices(
      await repository.listActiveServiceSummaries({
        serviceType: resolvedType,
      }),
    );

    return {
      locations: buildPopularLocations(services, resolvedLimit),
    };
  };

  const getServiceFilterOptions = async () => {
    const [
      serviceRows,
      cabinClassRows,
      seatClassRows,
      transportTypeRows,
      starRatingRows,
    ] = await Promise.all([
      repository.listActiveServiceSummaries(),
      repository.listActiveFlightCabinClasses(),
      repository.listActiveTrainSeatClasses(),
      repository.listActiveTourTransportTypes(),
      repository.listActiveHotelStarRatings(),
    ]);
    const services = filterPublicServices(serviceRows);

    const serviceTypes = sortByServiceTypeOrder(
      normalizeDistinctValues(services, 'service_type'),
    );

    const cabinClasses = sortByCabinClassOrder(
      normalizeDistinctValues(cabinClassRows, 'cabin_class').filter((value) =>
        CABIN_CLASS_VALUES.includes(value),
      ),
    );

    const seatClasses = sortBySeatClassOrder(
      normalizeDistinctValues(seatClassRows, 'seat_class').filter((value) =>
        SEAT_CLASS_VALUES.includes(value),
      ),
    );

    const transportTypes = sortByTransportTypeOrder(
      normalizeDistinctValues(transportTypeRows, 'transport_type').filter((value) =>
        TRANSPORT_TYPE_VALUES.includes(value),
      ),
    );

    const starRatings = [...new Set(
      starRatingRows
        .map((row) => Number(row.star_rating))
        .filter((value) => Number.isFinite(value)),
    )].sort((left, right) => left - right);

    return {
      cabin_classes: cabinClasses,
      locations: buildDistinctLocations(services),
      price_range: buildPriceRange(services),
      seat_classes: seatClasses,
      service_types: serviceTypes,
      sort_options: SORT_OPTION_VALUES,
      star_ratings: starRatings,
      transport_types: transportTypes,
    };
  };

  const getFeaturedServices = async ({ limit, type } = {}) => {
    const resolvedType = parsePublicServiceType(type);
    const resolvedLimit = parseBoundedInteger({
      defaultValue: DEFAULT_FEATURED_LIMIT,
      field: 'limit',
      max: MAX_FEATURED_LIMIT,
      value: limit,
    });
    const rows = await repository.listFeaturedServices({
      limit: resolvedLimit,
      serviceType: resolvedType,
    });

    return rows.map(mapServiceCard);
  };

  const getCombos = async (query = {}) => {
    const filters = parseComboFilters(query);
    const offset = (filters.page - 1) * filters.limit;
    const result = await repository.searchCombos({
      limit: filters.limit,
      location: filters.location,
      maxPrice: filters.maxPrice,
      minPrice: filters.minPrice,
      offset,
    });

    return {
      combos: result.rows.map(mapServiceCard),
      meta: buildPaginationMeta({
        limit: filters.limit,
        page: filters.page,
        total: result.total,
      }),
    };
  };

  const getComboDetail = async ({ slug } = {}) => {
    const resolvedSlug = parseSlug(slug);
    const combo = await repository.getPublicComboBySlug(resolvedSlug);

    if (!combo || combo.service_type !== SERVICE_TYPE.COMBO) {
      throw buildResourceNotFoundError();
    }

    const comboItems = sanitizePublicComboItems(combo.metadata?.combo_items);
    let isBookable = comboItems.length > 0;

    if (isBookable) {
      for (const item of comboItems) {
        if (!(await isPublicComboChildReference(repository, item))) {
          isBookable = false;
          break;
        }
      }
    }

    return mapComboDetail({
      comboItems,
      isBookable,
      service: combo,
    });
  };

  const getServiceDetail = async ({
    reference_id: referenceId,
    slug,
  } = {}) => {
    const resolvedSlug = parseSlug(slug);
    const resolvedReferenceId = parseOptionalReferenceId(referenceId);
    const service = await repository.getPublicServiceBySlug(resolvedSlug);

    if (!service) {
      throw buildResourceNotFoundError();
    }

    const baseDetail = mapBaseServiceDetail(service);

    if (service.service_type === SERVICE_TYPE.TOUR) {
      const detail = await repository.getTourDetail(service.id);

      if (!detail) {
        console.error(
          `Active public service ${service.id} (${service.slug}) is missing tour_details.`,
        );
        throw buildResourceNotFoundError();
      }

      return {
        ...baseDetail,
        details: mapTourDetail(detail),
      };
    }

    if (service.service_type === SERVICE_TYPE.HOTEL) {
      const detail = await repository.getHotelDetail(service.id);

      if (!detail) {
        console.error(
          `Active public service ${service.id} (${service.slug}) is missing hotel_details.`,
        );
        throw buildResourceNotFoundError();
      }

      return {
        ...baseDetail,
        details: mapHotelDetail(detail),
      };
    }

    if (service.service_type === SERVICE_TYPE.FLIGHT) {
      const detail = resolvedReferenceId
        ? await repository.getFlightDetailById(resolvedReferenceId)
        : await repository.getFlightDetail(service.id);

      if (!detail) {
        console.error(
          `Active public service ${service.id} (${service.slug}) is missing flight_details.`,
        );
        throw buildResourceNotFoundError();
      }

      if (detail.service_id !== service.id) {
        console.error(
          `Active public service ${service.id} (${service.slug}) is missing flight_details.`,
        );
        throw buildResourceNotFoundError();
      }

      const pricedDetail = applyFarePriceToServiceDetail(baseDetail, detail);

      return {
        ...pricedDetail,
        details: mapFlightDetail(detail),
      };
    }

    if (service.service_type === SERVICE_TYPE.TRAIN) {
      const detail = resolvedReferenceId
        ? await repository.getTrainDetailById(resolvedReferenceId)
        : await repository.getTrainDetail(service.id);

      if (!detail) {
        console.error(
          `Active public service ${service.id} (${service.slug}) is missing train_details.`,
        );
        throw buildResourceNotFoundError();
      }

      if (detail.service_id && detail.service_id !== service.id) {
        console.error(
          `Active public service ${service.id} (${service.slug}) is missing train_details.`,
        );
        throw buildResourceNotFoundError();
      }

      const pricedDetail = applyFarePriceToServiceDetail(baseDetail, detail);

      return {
        ...pricedDetail,
        details: mapTrainDetail(detail),
      };
    }

    if (service.service_type === SERVICE_TYPE.COMBO) {
      return {
        ...baseDetail,
        details: {
          combo_items: sanitizeComboItems(service.metadata?.combo_items),
        },
      };
    }

    throw buildResourceNotFoundError();
  };

  const getServiceImages = async ({ service_id: serviceId } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const service = await repository.getPublicServiceById(resolvedServiceId);

    if (!service) {
      throw buildResourceNotFoundError();
    }

    const images = await repository.listServiceImages(resolvedServiceId);
    return mapImages(images);
  };

  const getHotelRooms = async ({
    adults,
    checkin,
    checkout,
    children,
    hotel_service_id: hotelServiceId,
  } = {}) => {
    const resolvedHotelServiceId = parseHotelServiceId(hotelServiceId);
    const resolvedQuery = parseRoomListQuery({
      adults,
      checkin,
      checkout,
      children,
    });
    const service = await repository.getPublicServiceById(resolvedHotelServiceId);

    if (!service || service.service_type !== SERVICE_TYPE.HOTEL) {
      throw buildResourceNotFoundError();
    }

    const rooms = await repository.listActiveRoomTypesByHotel(
      resolvedHotelServiceId,
    );

    return rooms
      .filter((room) =>
        Number(room.max_adults) >= resolvedQuery.adults &&
        Number(room.max_children) >= resolvedQuery.children,
      )
      .map((room) =>
        mapHotelRoom(room, service.currency || DEFAULT_AVAILABILITY_CURRENCY),
      );
  };

  const evaluateAvailability = async ({
    body = {},
    expectedServiceType,
    service,
    serviceId,
  }) => {
    const parsedPayload = parseAvailabilityPayload({
      body,
      service,
      serviceId,
    });
    const serviceType = expectedServiceType || parsedPayload.serviceType;

    if (serviceType === SERVICE_TYPE.TOUR) {
      const detail = await repository.getTourDetail(service.id);

      if (!detail) {
        console.error(
          `Active public service ${service.id} (${service.slug || service.title || service.id}) is missing tour_details.`,
        );
        throw buildResourceNotFoundError();
      }

      const { currency, unitPrice } = resolvePublicPriceAndCurrency(service);
      const departureSchedule = Array.isArray(detail.departure_schedule)
        ? detail.departure_schedule
        : [];

      if (parsedPayload.startAt) {
        const matchedSchedule = findMatchingDepartureSchedule(
          departureSchedule,
          parsedPayload.startAt,
        );

        if (!matchedSchedule) {
          return buildUnavailableAvailability({
            availableQuantity: 0,
            currency,
            issues: [
              createAvailabilityIssue(
                'SCHEDULE_NOT_FOUND',
                'No departure schedule matches the requested start time.',
              ),
            ],
            quantity: parsedPayload.quantity,
            unitPrice,
          });
        }

        const availableQuantity = extractAvailableSlotsFromSchedule(
          matchedSchedule,
        );

        return buildSuccessfulAvailability({
          availableQuantity,
          currency,
          quantity: parsedPayload.quantity,
          unitPrice,
        });
      }

      const futureSchedules = departureSchedule.filter((item) => {
        const normalizedDate = normalizeScheduleDateValue(
          item?.date || item?.departure_at,
        );

        return normalizedDate
          ? new Date(`${normalizedDate}T00:00:00.000Z`).getTime() > Date.now()
          : false;
      });

      if (futureSchedules.length === 0) {
        return buildUnavailableAvailability({
          availableQuantity: 0,
          currency,
          issues: [
            createAvailabilityIssue(
              'NO_FUTURE_SCHEDULE',
              'No future departure schedule is currently available.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice,
        });
      }

      const availableQuantity = futureSchedules.reduce(
        (max, item) => Math.max(max, extractAvailableSlotsFromSchedule(item)),
        0,
      );

      return buildSuccessfulAvailability({
        availableQuantity,
        currency,
        quantity: parsedPayload.quantity,
        unitPrice,
      });
    }

    if (serviceType === SERVICE_TYPE.HOTEL) {
      if (!parsedPayload.referenceId) {
        throw buildValidationError(
          'reference_id',
          'reference_id is required for hotel availability',
        );
      }

      const referenceId = parseReferenceId(parsedPayload.referenceId);
      const roomType = await repository.getRoomTypeById(referenceId);

      if (!roomType || roomType.hotel_service_id !== service.id) {
        return buildUnavailableAvailability({
          availableQuantity: 0,
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: [
            createAvailabilityIssue(
              'ROOM_TYPE_NOT_FOUND',
              'The requested room type is not available for this hotel.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice: null,
        });
      }

      if (roomType.status !== 'active') {
        return buildUnavailableAvailability({
          availableQuantity: Number(roomType.available_rooms || 0),
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: [
            createAvailabilityIssue(
              'ROOM_TYPE_NOT_ACTIVE',
              'The requested room type is not active.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice: Number(roomType.base_price),
        });
      }

      const adults = parseOptionalGuestCount('options.adults', body.options?.adults);
      const children = parseOptionalGuestCount(
        'options.children',
        body.options?.children,
      );
      const capacityIssues = [];

      if (adults != null && adults > Number(roomType.max_adults)) {
        capacityIssues.push(
          createAvailabilityIssue(
            'MAX_ADULTS_EXCEEDED',
            'The requested number of adults exceeds the room capacity.',
          ),
        );
      }

      if (children != null && children > Number(roomType.max_children)) {
        capacityIssues.push(
          createAvailabilityIssue(
            'MAX_CHILDREN_EXCEEDED',
            'The requested number of children exceeds the room capacity.',
          ),
        );
      }

      if (capacityIssues.length > 0) {
        return buildUnavailableAvailability({
          availableQuantity: Number(roomType.available_rooms),
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: capacityIssues,
          quantity: parsedPayload.quantity,
          unitPrice: Number(roomType.base_price),
        });
      }

      return buildSuccessfulAvailability({
        availableQuantity: Number(roomType.available_rooms),
        currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
        quantity: parsedPayload.quantity,
        unitPrice: Number(roomType.base_price),
      });
    }

    if (serviceType === SERVICE_TYPE.FLIGHT) {
      if (!parsedPayload.referenceId) {
        throw buildValidationError(
          'reference_id',
          'reference_id is required for flight availability',
        );
      }

      const referenceId = parseReferenceId(parsedPayload.referenceId);
      const detail = await repository.getFlightDetailById(referenceId);

      if (!detail || detail.service_id !== service.id) {
        return buildUnavailableAvailability({
          availableQuantity: 0,
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: [
            createAvailabilityIssue(
              'FLIGHT_NOT_FOUND',
              'The requested flight inventory was not found.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice: null,
        });
      }

      if (detail.status !== 'open') {
        return buildUnavailableAvailability({
          availableQuantity: Number(detail.seats_available),
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: [
            createAvailabilityIssue(
              'FLIGHT_NOT_OPEN',
              'The requested flight is not open for booking.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice: Number(detail.fare_price),
        });
      }

      if (!isFutureDate(new Date(detail.departure_at))) {
        return buildUnavailableAvailability({
          availableQuantity: Number(detail.seats_available),
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: [
            createAvailabilityIssue(
              'FLIGHT_DEPARTED',
              'The requested flight has already departed.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice: Number(detail.fare_price),
        });
      }

      return buildSuccessfulAvailability({
        availableQuantity: Number(detail.seats_available),
        currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
        quantity: parsedPayload.quantity,
        unitPrice: Number(detail.fare_price),
      });
    }

    if (serviceType === SERVICE_TYPE.TRAIN) {
      if (!parsedPayload.referenceId) {
        throw buildValidationError(
          'reference_id',
          'reference_id is required for train availability',
        );
      }

      const referenceId = parseReferenceId(parsedPayload.referenceId);
      const detail = await repository.getTrainDetailById(referenceId);

      if (!detail || detail.service_id !== service.id) {
        return buildUnavailableAvailability({
          availableQuantity: 0,
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: [
            createAvailabilityIssue(
              'TRAIN_NOT_FOUND',
              'The requested train inventory was not found.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice: null,
        });
      }

      if (detail.status !== 'open') {
        return buildUnavailableAvailability({
          availableQuantity: Number(detail.seats_available),
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: [
            createAvailabilityIssue(
              'TRAIN_NOT_OPEN',
              'The requested train is not open for booking.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice: Number(detail.fare_price),
        });
      }

      if (!isFutureDate(new Date(detail.departure_at))) {
        return buildUnavailableAvailability({
          availableQuantity: Number(detail.seats_available),
          currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
          issues: [
            createAvailabilityIssue(
              'TRAIN_DEPARTED',
              'The requested train has already departed.',
            ),
          ],
          quantity: parsedPayload.quantity,
          unitPrice: Number(detail.fare_price),
        });
      }

      return buildSuccessfulAvailability({
        availableQuantity: Number(detail.seats_available),
        currency: service.currency || DEFAULT_AVAILABILITY_CURRENCY,
        quantity: parsedPayload.quantity,
        unitPrice: Number(detail.fare_price),
      });
    }

    if (serviceType === SERVICE_TYPE.COMBO) {
      const { currency, unitPrice } = resolvePublicPriceAndCurrency(service);
      const comboItems = Array.isArray(service.metadata?.combo_items)
        ? service.metadata.combo_items
        : [];

      if (comboItems.length === 0) {
        return buildAvailabilityResponse({
          available: true,
          availableQuantity: null,
          currency,
          issues: [],
          totalAmount: unitPrice * parsedPayload.quantity,
          unitPrice,
        });
      }

      const childResults = [];

      for (const item of comboItems) {
        if (!item || typeof item !== 'object') {
          continue;
        }

        if (!item.service_id || !item.service_type) {
          childResults.push(
            buildUnavailableAvailability({
              availableQuantity: 0,
              currency,
              issues: [
                createAvailabilityIssue(
                  'COMBO_ITEM_INVALID',
                  'A combo item is missing required availability information.',
                ),
              ],
              quantity: parsedPayload.quantity,
              unitPrice,
            }),
          );
          continue;
        }

        const childService = await repository.getPublicServiceById(item.service_id);

        if (!childService) {
          childResults.push(
            buildUnavailableAvailability({
              availableQuantity: 0,
              currency,
              issues: [
                createAvailabilityIssue(
                  'COMBO_ITEM_UNAVAILABLE',
                  'A combo item is not publicly available.',
                ),
              ],
              quantity: parsedPayload.quantity,
              unitPrice,
            }),
          );
          continue;
        }

        const childQuantity = Number(item.quantity) > 0
          ? Number(item.quantity) * parsedPayload.quantity
          : parsedPayload.quantity;

        childResults.push(
          await evaluateAvailability({
            body: {
              end_at: item.end_at || body.end_at,
              options: item.options || body.options,
              quantity: childQuantity,
              reference_id: item.reference_id,
              service_type: item.service_type,
              start_at: item.start_at || body.start_at,
            },
            expectedServiceType: item.service_type,
            service: childService,
            serviceId: item.service_id,
          }),
        );
      }

      const firstUnavailable = childResults.find((result) => !result.available);

      if (firstUnavailable) {
        return buildUnavailableAvailability({
          availableQuantity: null,
          currency,
          issues: [
            createAvailabilityIssue(
              'COMBO_ITEM_UNAVAILABLE',
              'At least one combo item is not currently available.',
            ),
            ...firstUnavailable.issues,
          ],
          quantity: parsedPayload.quantity,
          unitPrice,
        });
      }

      return buildAvailabilityResponse({
        available: true,
        availableQuantity: null,
        currency,
        issues: [],
        totalAmount: unitPrice * parsedPayload.quantity,
        unitPrice,
      });
    }

    throw buildValidationError(
      'service_type',
      'service_type must be one of: tour, hotel, flight, train, combo',
    );
  };

  const getServiceAvailability = async ({
    body = {},
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const service = await repository.getPublicServiceById(resolvedServiceId);

    if (!service) {
      throw buildResourceNotFoundError();
    }

    return evaluateAvailability({
      body,
      service,
      serviceId: resolvedServiceId,
    });
  };

  const searchServices = async ({
    limit,
    location,
    max_price: maxPrice,
    min_price: minPrice,
    page,
    q,
    sort,
    type,
  } = {}) => {
    const resolvedType = parsePublicServiceType(type);
    const resolvedKeyword = parseTextFilter({
      field: 'q',
      maxLength: MAX_QUERY_LENGTH,
      minLength: MIN_QUERY_LENGTH,
      rejectDangerousCharacters: true,
      value: q,
    });
    const resolvedLocation = parseTextFilter({
      field: 'location',
      maxLength: MAX_LOCATION_LENGTH,
      value: location,
    });
    const resolvedMinPrice = parsePriceFilter('min_price', minPrice);
    const resolvedMaxPrice = parsePriceFilter('max_price', maxPrice);

    if (
      resolvedMinPrice != null &&
      resolvedMaxPrice != null &&
      resolvedMinPrice > resolvedMaxPrice
    ) {
      throw buildValidationError(
        'price_range',
        'min_price must be less than or equal to max_price',
      );
    }

    const resolvedSort = parseSearchSort(sort);
    const resolvedPage = parseBoundedInteger({
      defaultValue: DEFAULT_SEARCH_PAGE,
      field: 'page',
      max: MAX_PRICE_LIMIT,
      value: page,
    });
    const resolvedLimit = parseBoundedInteger({
      defaultValue: DEFAULT_SEARCH_LIMIT,
      field: 'limit',
      max: MAX_SEARCH_LIMIT,
      value: limit,
    });
    const offset = (resolvedPage - 1) * resolvedLimit;
    const result = await repository.searchServices({
      keyword: resolvedKeyword,
      limit: resolvedLimit,
      location: resolvedLocation
        ? normalizeWhitespace(resolvedLocation)
        : null,
      maxPrice: resolvedMaxPrice,
      minPrice: resolvedMinPrice,
      offset,
      serviceType: resolvedType,
      sort: resolvedSort,
    });

    return {
      services: result.rows.map(mapServiceCard),
      meta: buildPaginationMeta({
        limit: resolvedLimit,
        page: resolvedPage,
        total: result.total,
      }),
    };
  };

  const searchFlights = async ({
    cabin_class: cabinClass,
    departure_date: departureDate,
    from,
    to,
  } = {}) => {
    const resolvedRoute = parseOptionalTransportRouteQuery({
      departureDate,
      from,
      to,
    });
    const resolvedCabinClass = parseOptionalEnumFilter(
      'cabin_class',
      CABIN_CLASS_VALUES,
      cabinClass,
    );
    const repositoryFilters = {};

    if (resolvedCabinClass) {
      repositoryFilters.cabinClass = resolvedCabinClass;
    }

    if (resolvedRoute.departureDate) {
      const departureRange = buildVietnamDateRange(
        resolvedRoute.departureDate,
      );
      repositoryFilters.departureDateEnd = departureRange.end;
      repositoryFilters.departureDateStart = departureRange.start;
    }

    if (resolvedRoute.from) {
      repositoryFilters.from = resolvedRoute.from.toLocaleLowerCase(LOCALE);
    }

    if (resolvedRoute.to) {
      repositoryFilters.to = resolvedRoute.to.toLocaleLowerCase(LOCALE);
    }

    const rows = await repository.searchFlights(repositoryFilters);

    return rows.map(mapFlightSearchResult);
  };

  const searchTrains = async ({
    departure_date: departureDate,
    from,
    seat_class: seatClass,
    to,
  } = {}) => {
    const resolvedRoute = parseOptionalTrainRouteQuery({
      departureDate,
      from,
      to,
    });
    const resolvedSeatClass = parseOptionalEnumFilter(
      'seat_class',
      SEAT_CLASS_VALUES,
      seatClass,
    );
    const repositoryFilters = {};

    if (resolvedSeatClass) {
      repositoryFilters.seatClass = resolvedSeatClass;
    }

    if (resolvedRoute.departureDate) {
      const departureRange = buildVietnamDateRange(
        resolvedRoute.departureDate,
      );
      repositoryFilters.departureDateEnd = departureRange.end;
      repositoryFilters.departureDateStart = departureRange.start;
    }

    if (resolvedRoute.from) {
      repositoryFilters.from = resolvedRoute.from.toLocaleLowerCase(LOCALE);
    }

    if (resolvedRoute.to) {
      repositoryFilters.to = resolvedRoute.to.toLocaleLowerCase(LOCALE);
    }

    const rows = await repository.searchTrains(repositoryFilters);
    const dedupedRows = dedupeTrainSearchRows(rows);

    return dedupedRows.map(mapTrainSearchResult);
  };

  return {
    getComboDetail,
    getCombos,
    getFeaturedServices,
    getHotelRooms,
    getPopularLocations,
    getServiceAvailability,
    getPublicEnums,
    getServiceDetail,
    getServiceFilterOptions,
    getServiceImages,
    searchFlights,
    searchServices,
    searchTrains,
  };
};

module.exports = Object.assign(createLookupService(), {
  COMBO_CACHE_SECONDS,
  DETAIL_CACHE_SECONDS,
  DEFAULT_FEATURED_LIMIT,
  DEFAULT_LOCATION_LIMIT,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_PAGE,
  DEFAULT_SEARCH_SORT,
  ENUMS_CACHE_SECONDS,
  FEATURED_CACHE_SECONDS,
  FILTER_CACHE_SECONDS,
  IMAGE_CACHE_SECONDS,
  MAX_FEATURED_LIMIT,
  MAX_LOCATION_LIMIT,
  MAX_SEARCH_LIMIT,
  PUBLIC_SERVICE_TYPE_VALUES,
  ROOM_LIST_CACHE_SECONDS,
  SORT_OPTION_VALUES,
  createLookupService,
});
