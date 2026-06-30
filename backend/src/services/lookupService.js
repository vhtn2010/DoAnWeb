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
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const ENUMS_CACHE_SECONDS = 24 * 60 * 60;
const FEATURED_CACHE_SECONDS = 15 * 60;
const FILTER_CACHE_SECONDS = 15 * 60;
const LOCALE = 'vi-VN';
const MAX_FEATURED_LIMIT = 20;
const MAX_LOCATION_LENGTH = 100;
const MAX_LOCATION_LIMIT = 50;
const MAX_PRICE_LIMIT = Number.MAX_SAFE_INTEGER;
const MAX_QUERY_LENGTH = 100;
const MAX_SEARCH_LIMIT = 50;
const MIN_QUERY_LENGTH = 2;
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

const normalizeWhitespace = (value) => value.replace(/\s+/g, ' ').trim();

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

  return {
    getFeaturedServices,
    getPopularLocations,
    getPublicEnums,
    getServiceFilterOptions,
    searchServices,
  };
};

module.exports = Object.assign(createLookupService(), {
  DEFAULT_FEATURED_LIMIT,
  DEFAULT_LOCATION_LIMIT,
  DEFAULT_SEARCH_LIMIT,
  DEFAULT_SEARCH_PAGE,
  DEFAULT_SEARCH_SORT,
  ENUMS_CACHE_SECONDS,
  FEATURED_CACHE_SECONDS,
  FILTER_CACHE_SECONDS,
  MAX_FEATURED_LIMIT,
  MAX_LOCATION_LIMIT,
  MAX_SEARCH_LIMIT,
  PUBLIC_SERVICE_TYPE_VALUES,
  SORT_OPTION_VALUES,
  createLookupService,
});
