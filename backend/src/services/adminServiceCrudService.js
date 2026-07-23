const crypto = require('node:crypto');
const {
  API_ERROR_CODES,
  CABIN_CLASS_VALUES,
  SEAT_CLASS_VALUES,
  SERVICE_TYPE,
  SERVICE_TYPE_VALUES,
  SERVICE_STATUS,
  TRANSPORT_SCHEDULE_STATUS_VALUES,
  TRANSPORT_TYPE_VALUES,
} = require('../constants/domainConstraints');
const {
  createAdminServiceCrudRepository,
} = require('../database/adminServiceCrudRepository');
const {
  createAdminServiceCatalogRepository,
} = require('../database/adminServiceCatalogRepository');
const adminServiceCatalogService = require('./adminServiceCatalogService');
const AppError = require('../utils/AppError');

const DEFAULT_CURRENCY = 'VND';
const DANGEROUS_TEXT_PATTERN = /[\u0000-\u001F\u007F<>]/;
const DANGEROUS_MULTILINE_TEXT_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SERVICE_CODE_PATTERN = /^[A-Z0-9-]+$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CREATE_SERVICE_TYPE_VALUES = Object.freeze(
  SERVICE_TYPE_VALUES.filter((value) => value !== SERVICE_TYPE.ROOM),
);
const CREATE_SERVICE_STATUS_VALUES = Object.freeze([
  SERVICE_STATUS.DRAFT,
  SERVICE_STATUS.ACTIVE,
  SERVICE_STATUS.HIDDEN,
]);
const BLOCKED_UPDATE_FIELDS = new Set([
  'approved_at',
  'approved_by',
  'created_at',
  'created_by',
  'deleted_at',
  'service_type',
  'status',
  'updated_at',
  'updated_by',
]);
const BLOCKED_INVENTORY_FIELDS = new Set([
  'available_quantity',
  'available_rooms',
  'total_rooms',
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

const buildDuplicateError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    field,
    message,
    statusCode: 409,
  });

const buildInvalidStateError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
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

const slugify = (value) => {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');

  return normalized || 'service';
};

const parseRequiredString = ({
  field,
  maxLength = 255,
  value,
}) => {
  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} is required`);
  }

  const normalized = normalizeWhitespace(value);

  if (!normalized) {
    throw buildValidationError(field, `${field} is required`);
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

const parseOptionalString = ({
  field,
  maxLength = 1000,
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

const normalizeMultilineWhitespace = (value) =>
  value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .trim();

const parseOptionalMultilineString = ({
  field,
  maxLength = 1000,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a string`);
  }

  const normalized = normalizeMultilineWhitespace(value);

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be at most ${maxLength} characters long`,
    );
  }

  if (DANGEROUS_MULTILINE_TEXT_PATTERN.test(normalized)) {
    throw buildValidationError(field, `${field} contains unsupported characters`);
  }

  return normalized;
};

const parseOptionalEnum = ({
  allowedValues,
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string' || !allowedValues.includes(value)) {
    throw buildValidationError(
      field,
      `${field} must be one of: ${allowedValues.join(', ')}`,
    );
  }

  return value;
};

const parseRequiredEnum = ({
  allowedValues,
  field,
  value,
}) => {
  const parsed = parseOptionalEnum({
    allowedValues,
    field,
    value,
  });

  if (!parsed) {
    throw buildValidationError(field, `${field} is required`);
  }

  return parsed;
};

const parseMoney = ({
  allowNull = false,
  field,
  value,
}) => {
  if (value == null) {
    if (allowNull) {
      return null;
    }

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

const parseOptionalInteger = ({
  field,
  max,
  min = 0,
  value,
}) => {
  if (value == null) {
    return null;
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

  if (max != null && parsed > max) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${max}`,
    );
  }

  return parsed;
};

const parseRequiredInteger = (options) => {
  const parsed = parseOptionalInteger(options);

  if (parsed == null) {
    throw buildValidationError(options.field, `${options.field} is required`);
  }

  return parsed;
};

const parseMutableRequiredInteger = ({
  currentValue,
  field,
  isCreate,
  value,
}) => {
  if (value != null || isCreate) {
    return parseRequiredInteger({
      field,
      min: 0,
      value,
    });
  }

  return Number(currentValue);
};

const parseOptionalDateTime = ({
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a valid ISO 8601 datetime`);
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw buildValidationError(field, `${field} must be a valid ISO 8601 datetime`);
  }

  return parsed.toISOString();
};

const parseRequiredDateTime = (options) => {
  const parsed = parseOptionalDateTime(options);

  if (!parsed) {
    throw buildValidationError(options.field, `${options.field} is required`);
  }

  return parsed;
};

const parseOptionalTime = ({
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string' || !TIME_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid time`);
  }

  return value.trim();
};

const parseRequiredTime = (options) => {
  const parsed = parseOptionalTime(options);

  if (!parsed) {
    throw buildValidationError(options.field, `${options.field} is required`);
  }

  return parsed;
};

const parseOptionalPlainObject = ({
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw buildValidationError(field, `${field} must be an object`);
  }

  return value;
};

const parseOptionalArray = ({
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw buildValidationError(field, `${field} must be an array`);
  }

  return value;
};

const splitMultilineText = (value) => {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .replace(/\r/g, '\n')
    .split(/\n+|•\s*|●\s*|▪\s*|◦\s*|;\s*/g)
    .map((item) => normalizeWhitespace(String(item)))
    .filter(Boolean);
};

const normalizeLegacyTourActionSource = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  return splitMultilineText(value);
};

const parseOptionalTourActionTime = ({
  field,
  value,
}) =>
  parseOptionalString({
    field,
    maxLength: 60,
    value,
  });

const parseTourAction = ({
  action,
  dayIndex,
  fieldPrefix,
  index,
}) => {
  if (typeof action === 'string') {
    const title = parseOptionalString({
      field: `${fieldPrefix}[${index}].title`,
      maxLength: 255,
      value: action,
    });

    return title
      ? {
          description: null,
          time: null,
          title,
        }
      : null;
  }

  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    throw buildValidationError(
      `${fieldPrefix}[${index}]`,
      `${fieldPrefix}[${index}] must be an object`,
    );
  }

  const title = parseOptionalString({
    field: `${fieldPrefix}[${index}].title`,
    maxLength: 255,
    value: action.title ?? action.label ?? action.name ?? null,
  });
  const description = parseOptionalMultilineString({
    field: `${fieldPrefix}[${index}].description`,
    maxLength: 10000,
    value: action.description ?? action.summary ?? null,
  });
  const time = parseOptionalTourActionTime({
    field: `${fieldPrefix}[${index}].time`,
    value: action.time ?? null,
  });

  if (!title && !description && !time) {
    return null;
  }

  return {
    description,
    time,
    title: title || description || `Hoat dong ${dayIndex + 1}.${index + 1}`,
  };
};

const buildLegacyTourDayActions = ({
  day,
  dayIndex,
  fieldPrefix,
}) => {
  const legacyActions = Array.isArray(day.actions) && day.actions.length
    ? day.actions
    : normalizeLegacyTourActionSource(day.activities ?? day.highlights);

  if (legacyActions.length > 0) {
    return legacyActions
      .map((action, actionIndex) =>
        parseTourAction({
          action,
          dayIndex,
          fieldPrefix,
          index: actionIndex,
        }),
      )
      .filter(Boolean);
  }

  const fallbackTitle = parseOptionalString({
    field: `${fieldPrefix}.__fallback_title`,
    maxLength: 255,
    value: day.title ?? null,
  });
  const fallbackDescription = parseOptionalMultilineString({
    field: `${fieldPrefix}.__fallback_description`,
    maxLength: 10000,
    value: day.summary ?? day.description ?? null,
  });

  if (!fallbackTitle && !fallbackDescription) {
    return [];
  }

  return [
    {
      description: fallbackDescription,
      time: null,
      title: fallbackTitle || fallbackDescription || `Hoat dong ${dayIndex + 1}.1`,
    },
  ];
};

const parseTourItinerary = ({
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (!Array.isArray(value)) {
    throw buildValidationError(field, `${field} must be an array`);
  }

  return value
    .map((day, dayIndex) => {
      if (typeof day === 'string') {
        const title = parseOptionalString({
          field: `${field}[${dayIndex}]`,
          maxLength: 255,
          value: day,
        });

        if (!title) {
          return null;
        }

        return {
          actions: [
            {
              description: null,
              time: null,
              title,
            },
          ],
          day_number: dayIndex + 1,
          summary: null,
          title: null,
        };
      }

      if (!day || typeof day !== 'object' || Array.isArray(day)) {
        throw buildValidationError(
          `${field}[${dayIndex}]`,
          `${field}[${dayIndex}] must be an object`,
        );
      }

      const actions = buildLegacyTourDayActions({
        day,
        dayIndex,
        fieldPrefix: `${field}[${dayIndex}].actions`,
      });
      const title = parseOptionalString({
        field: `${field}[${dayIndex}].title`,
        maxLength: 255,
        value: day.title ?? null,
      });
      const summary = parseOptionalMultilineString({
        field: `${field}[${dayIndex}].summary`,
        maxLength: 10000,
        value: day.summary ?? day.description ?? null,
      });

      if (!title && !summary && actions.length === 0) {
        return null;
      }

      return {
        actions,
        day_number: dayIndex + 1,
        summary,
        title,
      };
    })
    .filter(Boolean);
};

const parseOptionalUuid = ({
  field,
  value,
}) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parseSlug = ({
  field = 'slug',
  required = false,
  value,
}) => {
  if (value == null) {
    if (required) {
      throw buildValidationError(field, `${field} is required`);
    }

    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError(
      field,
      `${field} must contain only lowercase letters, numbers, and hyphens`,
    );
  }

  const normalized = value.trim();

  if (!normalized) {
    if (required) {
      throw buildValidationError(field, `${field} is required`);
    }

    return null;
  }

  if (normalized.length > 280) {
    throw buildValidationError(
      field,
      `${field} must be at most 280 characters long`,
    );
  }

  if (!SLUG_PATTERN.test(normalized)) {
    throw buildValidationError(
      field,
      `${field} must contain only lowercase letters, numbers, and hyphens`,
    );
  }

  return normalized;
};

const parseServiceCode = (value) => {
  if (value == null) {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError('service_code', 'service_code must be a valid code');
  }

  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    return null;
  }

  if (normalized.length > 30 || !SERVICE_CODE_PATTERN.test(normalized)) {
    throw buildValidationError('service_code', 'service_code must be a valid code');
  }

  return normalized;
};

const parseCurrency = (value) => {
  if (value == null || value === '') {
    return DEFAULT_CURRENCY;
  }

  if (typeof value !== 'string') {
    throw buildValidationError('currency', 'currency must be a 3-letter code');
  }

  const normalized = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(normalized)) {
    throw buildValidationError('currency', 'currency must be a 3-letter code');
  }

  return normalized;
};

const parseServiceId = (value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError('service_id', 'service_id must be a valid UUID');
  }

  return value.trim();
};

const parseReason = (value) => {
  const reason = parseRequiredString({
    field: 'reason',
    maxLength: 500,
    value,
  });

  return reason;
};

const ensureSalePriceWithinBasePrice = ({
  basePrice,
  salePrice,
}) => {
  if (salePrice != null && salePrice > basePrice) {
    throw buildValidationError(
      'sale_price',
      'sale_price must be less than or equal to base_price',
    );
  }
};

const parseBaseServicePayload = ({
  allowCreate = false,
  currentService,
  payload = {},
}) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw buildValidationError('body', 'body must be an object');
  }

  for (const blockedField of BLOCKED_UPDATE_FIELDS) {
    if (!allowCreate && Object.prototype.hasOwnProperty.call(payload, blockedField)) {
      if (blockedField === 'service_type') {
        throw buildValidationError(
          'service_type',
          'service_type cannot be changed after creation',
        );
      }

      if (blockedField === 'status') {
        throw buildValidationError(
          'status',
          'status cannot be updated through this endpoint',
        );
      }

      throw buildValidationError(
        blockedField,
        `${blockedField} cannot be updated through this endpoint`,
      );
    }
  }

  const serviceType = allowCreate
    ? parseRequiredEnum({
        allowedValues: CREATE_SERVICE_TYPE_VALUES,
        field: 'service_type',
        value: payload.service_type,
      })
    : currentService.service_type;

  if (allowCreate && serviceType === SERVICE_TYPE.ROOM) {
    throw buildValidationError(
      'service_type',
      'service_type=room is not supported in this endpoint',
    );
  }

  const title = Object.prototype.hasOwnProperty.call(payload, 'title')
    ? parseRequiredString({
        field: 'title',
        maxLength: 255,
        value: payload.title,
      })
    : null;
  const shortDescription = Object.prototype.hasOwnProperty.call(payload, 'short_description')
    ? parseOptionalString({
        field: 'short_description',
        maxLength: 1000,
        value: payload.short_description,
      })
    : undefined;
  const description = Object.prototype.hasOwnProperty.call(payload, 'description')
    ? parseOptionalString({
        field: 'description',
        maxLength: 10000,
        value: payload.description,
      })
    : undefined;
  const providerName = Object.prototype.hasOwnProperty.call(payload, 'provider_name')
    ? parseOptionalString({
        field: 'provider_name',
        maxLength: 200,
        value: payload.provider_name,
      })
    : undefined;
  const locationText = Object.prototype.hasOwnProperty.call(payload, 'location_text')
    ? parseOptionalString({
        field: 'location_text',
        maxLength: 255,
        value: payload.location_text,
      })
    : undefined;
  const cancellationPolicy = Object.prototype.hasOwnProperty.call(payload, 'cancellation_policy')
    ? parseOptionalString({
        field: 'cancellation_policy',
        maxLength: 5000,
        value: payload.cancellation_policy,
      })
    : undefined;
  const metadata = Object.prototype.hasOwnProperty.call(payload, 'metadata')
    ? parseOptionalPlainObject({
        field: 'metadata',
        value: payload.metadata,
      })
    : undefined;
  const slug = Object.prototype.hasOwnProperty.call(payload, 'slug')
    ? parseSlug({
        value: payload.slug,
      })
    : undefined;
  const serviceCode = Object.prototype.hasOwnProperty.call(payload, 'service_code')
    ? parseServiceCode(payload.service_code)
    : undefined;
  const basePriceInput = allowCreate
    ? (payload.base_price ?? payload.price)
    : payload.base_price;
  const hasBasePrice = allowCreate
    ? true
    : Object.prototype.hasOwnProperty.call(payload, 'base_price');
  const basePrice = hasBasePrice
    ? parseMoney({
        field: 'base_price',
        value: basePriceInput,
      })
    : undefined;
  const salePrice = Object.prototype.hasOwnProperty.call(payload, 'sale_price')
    ? parseMoney({
        allowNull: true,
        field: 'sale_price',
        value: payload.sale_price,
      })
    : undefined;

  if (allowCreate) {
    ensureSalePriceWithinBasePrice({
      basePrice,
      salePrice,
    });
  } else if (salePrice !== undefined || basePrice !== undefined) {
    ensureSalePriceWithinBasePrice({
      basePrice: basePrice ?? Number(currentService.base_price),
      salePrice:
        salePrice === undefined
          ? (currentService.sale_price == null ? null : Number(currentService.sale_price))
          : salePrice,
    });
  }

  const currency = allowCreate || Object.prototype.hasOwnProperty.call(payload, 'currency')
    ? parseCurrency(payload.currency)
    : undefined;
  const status = allowCreate
    ? parseOptionalEnum({
        allowedValues: CREATE_SERVICE_STATUS_VALUES,
        field: 'status',
        value: payload.status,
      }) ?? SERVICE_STATUS.DRAFT
    : undefined;

  const comboItems = Object.prototype.hasOwnProperty.call(payload, 'combo_items')
    ? parseOptionalArray({
        field: 'combo_items',
        value: payload.combo_items,
      })
    : undefined;
  const detailsObject = Object.prototype.hasOwnProperty.call(payload, 'details')
    ? parseOptionalPlainObject({
        field: 'details',
        value: payload.details,
      })
    : null;

  return {
    baseFields: {
      base_price: basePrice,
      cancellation_policy: cancellationPolicy,
      currency,
      description,
      location_text: locationText,
      metadata,
      provider_name: providerName,
      sale_price: salePrice,
      service_code: serviceCode,
      short_description: shortDescription,
      slug,
      status,
      title,
    },
    comboItems,
    details: detailsObject,
    serviceType,
  };
};

const parseTourDetails = ({
  existingDetails,
  isCreate,
  value,
}) => {
  const details = value || {};
  const current = existingDetails || {};

  const parsed = {
    departure_location: details.departure_location != null
      ? parseRequiredString({ field: 'details.departure_location', value: details.departure_location })
      : current.departure_location,
    destination_location: details.destination_location != null
      ? parseRequiredString({ field: 'details.destination_location', value: details.destination_location })
      : current.destination_location,
    duration_days: details.duration_days != null
      ? parseRequiredInteger({ field: 'details.duration_days', min: 1, value: details.duration_days })
      : current.duration_days,
    duration_nights: details.duration_nights != null
      ? parseRequiredInteger({ field: 'details.duration_nights', min: 0, value: details.duration_nights })
      : current.duration_nights,
    excluded_services: details.excluded_services != null
      ? parseOptionalString({ field: 'details.excluded_services', maxLength: 10000, value: details.excluded_services })
      : current.excluded_services,
    included_services: details.included_services != null
      ? parseOptionalString({ field: 'details.included_services', maxLength: 10000, value: details.included_services })
      : current.included_services,
    itinerary: details.itinerary != null
      ? parseTourItinerary({ field: 'details.itinerary', value: details.itinerary })
      : current.itinerary ?? null,
    departure_schedule: details.departure_schedule != null ? details.departure_schedule : current.departure_schedule ?? null,
    max_group_size: details.max_group_size != null
      ? parseOptionalInteger({ field: 'details.max_group_size', min: 1, value: details.max_group_size })
      : current.max_group_size ?? null,
    terms: details.terms != null
      ? parseOptionalString({ field: 'details.terms', maxLength: 10000, value: details.terms })
      : current.terms,
    transport_type: details.transport_type != null
      ? parseRequiredEnum({ allowedValues: TRANSPORT_TYPE_VALUES, field: 'details.transport_type', value: details.transport_type })
      : current.transport_type,
  };

  if (
    !parsed.departure_location ||
    !parsed.destination_location ||
    parsed.duration_days == null ||
    parsed.duration_nights == null ||
    !parsed.transport_type
  ) {
    if (isCreate) {
      throw buildValidationError('details', 'details is required for tour services');
    }
  }

  return parsed;
};

const parseHotelDetails = ({
  existingDetails,
  isCreate,
  value,
}) => {
  const details = value || {};
  const current = existingDetails || {};

  const parsed = {
    address: details.address != null
      ? parseRequiredString({ field: 'details.address', maxLength: 2000, value: details.address })
      : current.address,
    amenities: details.amenities != null ? details.amenities : current.amenities ?? null,
    checkin_time: details.checkin_time != null
      ? parseRequiredTime({ field: 'details.checkin_time', value: details.checkin_time })
      : current.checkin_time,
    checkout_time: details.checkout_time != null
      ? parseRequiredTime({ field: 'details.checkout_time', value: details.checkout_time })
      : current.checkout_time,
    hotel_policy: details.hotel_policy != null
      ? parseOptionalString({ field: 'details.hotel_policy', maxLength: 10000, value: details.hotel_policy })
      : current.hotel_policy,
    star_rating: details.star_rating != null
      ? (() => {
          const rating = Number(details.star_rating);

          if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
            throw buildValidationError('details.star_rating', 'details.star_rating must be between 0 and 5');
          }

          return rating;
        })()
      : (current.star_rating == null ? null : Number(current.star_rating)),
  };

  if (!parsed.address || !parsed.checkin_time || !parsed.checkout_time) {
    if (isCreate) {
      throw buildValidationError('details', 'details is required for hotel services');
    }
  }

  return parsed;
};

const parseFlightDetails = ({
  existingDetails,
  isCreate,
  value,
}) => {
  const details = value || {};
  const current = existingDetails || {};

  const departureAt = details.departure_at != null
    ? parseRequiredDateTime({ field: 'details.departure_at', value: details.departure_at })
    : current.departure_at;
  const arrivalAt = details.arrival_at != null
    ? parseRequiredDateTime({ field: 'details.arrival_at', value: details.arrival_at })
    : current.arrival_at;

  if (departureAt && arrivalAt && new Date(arrivalAt) <= new Date(departureAt)) {
    throw buildValidationError(
      'details.arrival_at',
      'details.arrival_at must be later than details.departure_at',
    );
  }

  const parsed = {
    airline_name: details.airline_name != null
      ? parseRequiredString({ field: 'details.airline_name', maxLength: 150, value: details.airline_name })
      : current.airline_name,
    arrival_airport: details.arrival_airport != null
      ? parseRequiredString({ field: 'details.arrival_airport', maxLength: 150, value: details.arrival_airport })
      : current.arrival_airport,
    arrival_at: arrivalAt,
    cabin_class: details.cabin_class != null
      ? parseRequiredEnum({ allowedValues: CABIN_CLASS_VALUES, field: 'details.cabin_class', value: details.cabin_class })
      : current.cabin_class,
    departure_airport: details.departure_airport != null
      ? parseRequiredString({ field: 'details.departure_airport', maxLength: 150, value: details.departure_airport })
      : current.departure_airport,
    departure_at: departureAt,
    fare_price: details.fare_price != null
      ? parseMoney({ field: 'details.fare_price', value: details.fare_price })
      : (current.fare_price == null ? null : Number(current.fare_price)),
    flight_number: details.flight_number != null
      ? parseRequiredString({ field: 'details.flight_number', maxLength: 30, value: details.flight_number })
      : current.flight_number,
    seats_available: parseMutableRequiredInteger({
      currentValue: current.seats_available,
      field: 'details.seats_available',
      isCreate,
      value: details.seats_available,
    }),
    seats_total: parseMutableRequiredInteger({
      currentValue: current.seats_total,
      field: 'details.seats_total',
      isCreate,
      value: details.seats_total,
    }),
    status: details.status != null
      ? parseRequiredEnum({ allowedValues: TRANSPORT_SCHEDULE_STATUS_VALUES, field: 'details.status', value: details.status })
      : (current.status || 'open'),
  };

  if (parsed.seats_available > parsed.seats_total) {
    throw buildValidationError(
      'details.seats_available',
      'details.seats_available must be less than or equal to details.seats_total',
    );
  }

  if (
    !parsed.airline_name ||
    !parsed.flight_number ||
    !parsed.departure_airport ||
    !parsed.arrival_airport ||
    !parsed.departure_at ||
    !parsed.arrival_at ||
    !parsed.cabin_class ||
    parsed.fare_price == null
  ) {
    if (isCreate) {
      throw buildValidationError('details', 'details is required for flight services');
    }
  }

  return parsed;
};

const parseTrainDetails = ({
  existingDetails,
  isCreate,
  value,
}) => {
  const details = value || {};
  const current = existingDetails || {};

  const departureAt = details.departure_at != null
    ? parseRequiredDateTime({ field: 'details.departure_at', value: details.departure_at })
    : current.departure_at;
  const arrivalAt = details.arrival_at != null
    ? parseRequiredDateTime({ field: 'details.arrival_at', value: details.arrival_at })
    : current.arrival_at;

  if (departureAt && arrivalAt && new Date(arrivalAt) <= new Date(departureAt)) {
    throw buildValidationError(
      'details.arrival_at',
      'details.arrival_at must be later than details.departure_at',
    );
  }

  const parsed = {
    arrival_at: arrivalAt,
    arrival_station: details.arrival_station != null
      ? parseRequiredString({ field: 'details.arrival_station', maxLength: 150, value: details.arrival_station })
      : current.arrival_station,
    departure_at: departureAt,
    departure_station: details.departure_station != null
      ? parseRequiredString({ field: 'details.departure_station', maxLength: 150, value: details.departure_station })
      : current.departure_station,
    fare_price: details.fare_price != null
      ? parseMoney({ field: 'details.fare_price', value: details.fare_price })
      : (current.fare_price == null ? null : Number(current.fare_price)),
    seat_class: details.seat_class != null
      ? parseRequiredEnum({ allowedValues: SEAT_CLASS_VALUES, field: 'details.seat_class', value: details.seat_class })
      : current.seat_class,
    seats_available: parseMutableRequiredInteger({
      currentValue: current.seats_available,
      field: 'details.seats_available',
      isCreate,
      value: details.seats_available,
    }),
    seats_total: parseMutableRequiredInteger({
      currentValue: current.seats_total,
      field: 'details.seats_total',
      isCreate,
      value: details.seats_total,
    }),
    status: details.status != null
      ? parseRequiredEnum({ allowedValues: TRANSPORT_SCHEDULE_STATUS_VALUES, field: 'details.status', value: details.status })
      : (current.status || 'open'),
    train_number: details.train_number != null
      ? parseRequiredString({ field: 'details.train_number', maxLength: 30, value: details.train_number })
      : current.train_number,
  };

  if (parsed.seats_available > parsed.seats_total) {
    throw buildValidationError(
      'details.seats_available',
      'details.seats_available must be less than or equal to details.seats_total',
    );
  }

  if (
    !parsed.train_number ||
    !parsed.departure_station ||
    !parsed.arrival_station ||
    !parsed.departure_at ||
    !parsed.arrival_at ||
    !parsed.seat_class ||
    parsed.fare_price == null
  ) {
    if (isCreate) {
      throw buildValidationError('details', 'details is required for train services');
    }
  }

  return parsed;
};

const parseComboMetadata = ({
  currentMetadata,
  details,
  comboItems,
  metadata,
}) => {
  const baseMetadata = metadata === undefined
    ? { ...(currentMetadata || {}) }
    : { ...(metadata || {}) };
  const resolvedComboItems = comboItems ??
    details?.combo_items ??
    baseMetadata.combo_items;

  if (resolvedComboItems !== undefined) {
    baseMetadata.combo_items = parseOptionalArray({
      field: 'combo_items',
      value: resolvedComboItems,
    }) || [];
  }

  return baseMetadata;
};

const buildDetailPayload = ({
  currentDetail,
  details,
  isCreate,
  serviceType,
}) => {
  if (serviceType === SERVICE_TYPE.TOUR) {
    return parseTourDetails({
      existingDetails: currentDetail,
      isCreate,
      value: details,
    });
  }

  if (serviceType === SERVICE_TYPE.HOTEL) {
    return parseHotelDetails({
      existingDetails: currentDetail,
      isCreate,
      value: details,
    });
  }

  if (serviceType === SERVICE_TYPE.FLIGHT) {
    return parseFlightDetails({
      existingDetails: currentDetail,
      isCreate,
      value: details,
    });
  }

  if (serviceType === SERVICE_TYPE.TRAIN) {
    return parseTrainDetails({
      existingDetails: currentDetail,
      isCreate,
      value: details,
    });
  }

  return null;
};

const resolveScopeServiceIds = (auth) => {
  if (auth?.role !== 'staff') {
    return null;
  }

  return Array.isArray(auth.serviceScopeIds)
    ? auth.serviceScopeIds
    : [];
};

const createAdminServiceCrudService = ({
  catalogRepository = createAdminServiceCatalogRepository(),
  catalogService = adminServiceCatalogService,
  repository = createAdminServiceCrudRepository(),
} = {}) => {
  const ensureUniqueSlug = async ({
    excludeServiceId,
    providedSlug,
    title,
  }) => {
    if (providedSlug) {
      const existing = await repository.getServiceBySlug({
        excludeServiceId,
        slug: providedSlug,
      });

      if (existing) {
        throw buildDuplicateError('slug', 'slug already exists');
      }

      return providedSlug;
    }

    const baseSlug = slugify(title);
    let suffix = 0;

    while (true) {
      const candidate = suffix === 0 ? baseSlug : `${baseSlug}-${suffix + 1}`;
      const existing = await repository.getServiceBySlug({
        excludeServiceId,
        slug: candidate,
      });

      if (!existing) {
        return candidate;
      }

      suffix += 1;
    }
  };

  const ensureUniqueServiceCode = async ({
    excludeServiceId,
    providedCode,
  }) => {
    if (providedCode) {
      const existing = await repository.getServiceByCode({
        excludeServiceId,
        serviceCode: providedCode,
      });

      if (existing) {
        throw buildDuplicateError('service_code', 'service_code already exists');
      }

      return providedCode;
    }

    while (true) {
      const candidate = `SVC-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
      const existing = await repository.getServiceByCode({
        excludeServiceId,
        serviceCode: candidate,
      });

      if (!existing) {
        return candidate;
      }
    }
  };

  const getCurrentDetailByServiceType = async (service) => {
    if (service.service_type === SERVICE_TYPE.TOUR) {
      return catalogRepository.getTourDetail(service.id);
    }

    if (service.service_type === SERVICE_TYPE.HOTEL) {
      return catalogRepository.getHotelDetail(service.id);
    }

    if (service.service_type === SERVICE_TYPE.FLIGHT) {
      const details = await catalogRepository.listFlightDetailsByService(service.id);
      return details[0] || null;
    }

    if (service.service_type === SERVICE_TYPE.TRAIN) {
      const details = await catalogRepository.listTrainDetailsByService(service.id);
      return details[0] || null;
    }

    return null;
  };

  const createService = async ({
    auth,
    body,
  } = {}) => {
    const parsed = parseBaseServicePayload({
      allowCreate: true,
      payload: body,
    });
    const slug = await ensureUniqueSlug({
      providedSlug: parsed.baseFields.slug,
      title: parsed.baseFields.title,
    });
    const serviceCode = await ensureUniqueServiceCode({
      providedCode: parsed.baseFields.service_code,
    });
    const metadata = parsed.serviceType === SERVICE_TYPE.COMBO
      ? parseComboMetadata({
          comboItems: parsed.comboItems,
          currentMetadata: null,
          details: parsed.details,
          metadata: parsed.baseFields.metadata,
        })
      : (parsed.baseFields.metadata ?? null);
    const detailPayload = buildDetailPayload({
      currentDetail: null,
      details: parsed.details,
      isCreate: true,
      serviceType: parsed.serviceType,
    });
    const created = await repository.createService({
      actorUserId: auth.userId,
      detailPayload,
      servicePayload: {
        ...parsed.baseFields,
        currency: parsed.baseFields.currency,
        metadata,
        service_code: serviceCode,
        service_type: parsed.serviceType,
        slug,
        status: parsed.baseFields.status ?? SERVICE_STATUS.DRAFT,
      },
    }).catch((error) => {
      if (error?.code === '23505') {
        throw buildDuplicateError('resource', 'slug or service_code already exists');
      }

      throw error;
    });

    return catalogService.getServiceDetail({
      auth,
      service_id: created.id,
    });
  };

  const updateService = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const currentService = await repository.getServiceById({
      allowedServiceIds: resolveScopeServiceIds(auth),
      includeDeleted: false,
      serviceId: resolvedServiceId,
    });

    if (!currentService) {
      throw buildResourceNotFoundError();
    }

    for (const field of BLOCKED_INVENTORY_FIELDS) {
      if (Object.prototype.hasOwnProperty.call(body || {}, field)) {
        throw buildValidationError(
          field,
          `${field} cannot be updated through this endpoint`,
        );
      }
    }

    const parsed = parseBaseServicePayload({
      allowCreate: false,
      currentService,
      payload: body,
    });
    const currentDetail = await getCurrentDetailByServiceType(currentService);
    const detailPayload = parsed.details
      ? buildDetailPayload({
          currentDetail,
          details: parsed.details,
          isCreate: false,
          serviceType: currentService.service_type,
        })
      : null;
    const nextSlug = parsed.baseFields.slug === undefined
      ? undefined
      : await ensureUniqueSlug({
          excludeServiceId: resolvedServiceId,
          providedSlug: parsed.baseFields.slug,
          title: parsed.baseFields.title || currentService.title,
        });
    const nextServiceCode = parsed.baseFields.service_code === undefined
      ? undefined
      : await ensureUniqueServiceCode({
          excludeServiceId: resolvedServiceId,
          providedCode: parsed.baseFields.service_code,
        });
    const servicePayload = {};

    for (const [key, value] of Object.entries(parsed.baseFields)) {
      if (value !== undefined) {
        servicePayload[key] = value;
      }
    }

    if (nextSlug !== undefined) {
      servicePayload.slug = nextSlug;
    }

    if (nextServiceCode !== undefined) {
      servicePayload.service_code = nextServiceCode;
    }

    if (currentService.service_type === SERVICE_TYPE.COMBO) {
      if (
        parsed.baseFields.metadata !== undefined ||
        parsed.comboItems !== undefined ||
        parsed.details?.combo_items !== undefined
      ) {
        servicePayload.metadata = parseComboMetadata({
          comboItems: parsed.comboItems,
          currentMetadata: currentService.metadata,
          details: parsed.details,
          metadata: parsed.baseFields.metadata,
        });
      }
    }

    if (Object.keys(servicePayload).length === 0 && !detailPayload) {
      throw buildValidationError(
        'body',
        'no updatable fields were provided',
      );
    }

    await repository.updateService({
      actorUserId: auth.userId,
      detailPayload,
      serviceId: resolvedServiceId,
      servicePayload,
      serviceType: currentService.service_type,
    }).catch((error) => {
      if (error?.code === '23505') {
        throw buildDuplicateError('resource', 'slug or service_code already exists');
      }

      throw error;
    });

    return catalogService.getServiceDetail({
      auth,
      service_id: resolvedServiceId,
    });
  };

  const deleteService = async ({
    auth,
    body,
    service_id: serviceId,
  } = {}) => {
    const resolvedServiceId = parseServiceId(serviceId);
    const reason = parseReason(body?.reason);
    const currentService = await repository.getServiceById({
      includeDeleted: true,
      serviceId: resolvedServiceId,
    });

    if (!currentService) {
      throw buildResourceNotFoundError();
    }

    if (currentService.deleted_at != null || currentService.status === 'deleted') {
      throw buildInvalidStateError(
        'service',
        'service is already deleted',
      );
    }

    const hasBlockingBookings = await repository.hasBlockingBookings(
      resolvedServiceId,
    );

    if (hasBlockingBookings) {
      throw buildInvalidStateError(
        'service',
        'service cannot be deleted while unfinished bookings exist',
      );
    }

    const deleted = await repository.softDeleteService({
      actorUserId: auth.userId,
      reason,
      serviceId: resolvedServiceId,
    });

    return {
      deleted_at: deleted.deleted_at,
      id: deleted.id,
      status: deleted.status,
    };
  };

  return {
    createService,
    deleteService,
    updateService,
  };
};

module.exports = Object.assign(createAdminServiceCrudService(), {
  createAdminServiceCrudService,
});
