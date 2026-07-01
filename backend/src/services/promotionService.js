const {
  API_ERROR_CODES,
  PROMOTION_STATUS,
  SERVICE_TYPE_VALUES,
} = require('../constants/domainConstraints');
const { createPromotionRepository } = require('../database/promotionRepository');
const AppError = require('../utils/AppError');

const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;
const MAX_LIMIT = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const buildValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const buildResourceNotFoundError = (message = 'Promotion not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const toIsoString = (value) => {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString();
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

const parsePromotionId = (value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError([
      {
        field: 'promotion_id',
        message: 'promotion_id must be a valid UUID',
      },
    ]);
  }

  return value.trim();
};

const parseServiceType = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError([
      {
        field: 'service_type',
        message: `service_type must be one of: ${SERVICE_TYPE_VALUES.join(', ')}`,
      },
    ]);
  }

  const normalized = value.trim().toLowerCase();

  if (!SERVICE_TYPE_VALUES.includes(normalized)) {
    throw buildValidationError([
      {
        field: 'service_type',
        message: `service_type must be one of: ${SERVICE_TYPE_VALUES.join(', ')}`,
      },
    ]);
  }

  return normalized;
};

const parseBooleanQuery = (field, value, defaultValue) => {
  if (value == null || value === '') {
    return defaultValue;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError([
      {
        field,
        message: `${field} must be either true or false`,
      },
    ]);
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  throw buildValidationError([
    {
      field,
      message: `${field} must be either true or false`,
    },
  ]);
};

const parsePositiveInteger = (field, value, defaultValue) => {
  if (value == null || value === '') {
    return defaultValue;
  }

  if (Array.isArray(value) || !/^\d+$/.test(String(value))) {
    throw buildValidationError([
      {
        field,
        message: `${field} must be a positive integer`,
      },
    ]);
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw buildValidationError([
      {
        field,
        message: `${field} must be greater than or equal to 1`,
      },
    ]);
  }

  return parsed;
};

const normalizeListQuery = (query = {}) => {
  const limit = parsePositiveInteger('limit', query.limit, DEFAULT_LIMIT);

  if (limit > MAX_LIMIT) {
    throw buildValidationError([
      {
        field: 'limit',
        message: `limit must be less than or equal to ${MAX_LIMIT}`,
      },
    ]);
  }

  return {
    activeOnly: parseBooleanQuery('active_only', query.active_only, true),
    limit,
    page: parsePositiveInteger('page', query.page, DEFAULT_PAGE),
    serviceType: parseServiceType(query.service_type),
  };
};

const isPromotionPubliclyVisible = (promotion, currentTime) => {
  if (!promotion || promotion.status !== PROMOTION_STATUS.ACTIVE) {
    return false;
  }

  const validFrom = promotion.valid_from ? new Date(promotion.valid_from) : null;
  const validTo = promotion.valid_to ? new Date(promotion.valid_to) : null;

  if (!validFrom || !validTo) {
    return false;
  }

  return currentTime >= validFrom && currentTime <= validTo;
};

const matchesServiceTypeFilter = (promotion, serviceType) => {
  if (!serviceType) {
    return true;
  }

  return (
    promotion.target_service_type == null ||
    promotion.target_service_type === serviceType
  );
};

const mapPromotion = (promotion) => ({
  description: promotion.description,
  id: promotion.id,
  name: promotion.name,
  target_service_type: promotion.target_service_type || null,
  valid_from: toIsoString(promotion.valid_from),
  valid_to: toIsoString(promotion.valid_to),
});

const createPromotionService = ({
  now = () => new Date(),
  repository = createPromotionRepository(),
} = {}) => {
  const listPublicPromotions = async (query = {}) => {
    const filters = normalizeListQuery(query);
    const currentTime = now();
    const offset = (filters.page - 1) * filters.limit;
    const result = await repository.listPublicPromotions({
      currentTime,
      limit: filters.limit,
      offset,
      serviceType: filters.serviceType,
    });

    const promotions = (result.rows || [])
      .filter(
        (promotion) =>
          isPromotionPubliclyVisible(promotion, currentTime) &&
          matchesServiceTypeFilter(promotion, filters.serviceType),
      )
      .map(mapPromotion);

    return {
      meta: buildPaginationMeta({
        limit: filters.limit,
        page: filters.page,
        total: Number(result.total) || 0,
      }),
      promotions,
    };
  };

  const getPublicPromotionById = async ({
    promotion_id: promotionId,
  } = {}) => {
    const normalizedPromotionId = parsePromotionId(promotionId);
    const currentTime = now();
    const promotion = await repository.getPublicPromotionById({
      currentTime,
      promotionId: normalizedPromotionId,
    });

    if (!isPromotionPubliclyVisible(promotion, currentTime)) {
      throw buildResourceNotFoundError();
    }

    return mapPromotion(promotion);
  };

  return {
    getPublicPromotionById,
    listPublicPromotions,
  };
};

module.exports = createPromotionService();
module.exports.createPromotionService = createPromotionService;
