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

const DEFAULT_LOCATION_LIMIT = 10;
const ENUMS_CACHE_SECONDS = 24 * 60 * 60;
const FILTER_CACHE_SECONDS = 15 * 60;
const LOCALE = 'vi-VN';
const MAX_LOCATION_LIMIT = 50;
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
      const leftIndex = indexes.has(left) ? indexes.get(left) : Number.MAX_SAFE_INTEGER;
      const rightIndex = indexes.has(right) ? indexes.get(right) : Number.MAX_SAFE_INTEGER;

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

const parseOptionalType = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || !PUBLIC_SERVICE_TYPE_VALUES.includes(value)) {
    throw buildValidationError(
      'type',
      `type must be one of: ${PUBLIC_SERVICE_TYPE_VALUES.join(', ')}`,
    );
  }

  return value;
};

const parseLocationLimit = (value) => {
  if (value == null || value === '') {
    return DEFAULT_LOCATION_LIMIT;
  }

  if (Array.isArray(value) || !/^\d+$/.test(String(value))) {
    throw buildValidationError('limit', 'limit must be a positive integer');
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw buildValidationError('limit', 'limit must be greater than or equal to 1');
  }

  return Math.min(parsed, MAX_LOCATION_LIMIT);
};

const toPublicPrice = (service) => {
  if (service.sale_price != null) {
    return Number(service.sale_price);
  }

  return Number(service.base_price);
};

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
    const resolvedType = parseOptionalType(type);
    const resolvedLimit = parseLocationLimit(limit);
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

  return {
    getPopularLocations,
    getPublicEnums,
    getServiceFilterOptions,
  };
};

module.exports = Object.assign(createLookupService(), {
  DEFAULT_LOCATION_LIMIT,
  ENUMS_CACHE_SECONDS,
  FILTER_CACHE_SECONDS,
  MAX_LOCATION_LIMIT,
  PUBLIC_SERVICE_TYPE_VALUES,
  SORT_OPTION_VALUES,
  createLookupService,
});
