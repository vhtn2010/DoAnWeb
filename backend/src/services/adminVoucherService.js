const {
  API_ERROR_CODES,
  DISCOUNT_TYPE,
  DOMAIN_CONSTRAINTS,
  PROMOTION_STATUS,
  VOUCHER_STATUS,
  VOUCHER_STATUS_VALUES,
} = require('../constants/domainConstraints');
const {
  query,
  withTransaction,
} = require('../database/client');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 100;
const MAX_REASON_LENGTH = 500;
const MAX_VOUCHER_CODE_LENGTH = 50;
const VOUCHER_CODE_PATTERN = /^[A-Z0-9_-]{3,50}$/;
const DEFAULT_USAGE_LIMIT_PER_USER = 1;
const VOUCHER_CREATE_PERMISSION = 'voucher.create';
const VOUCHER_READ_PERMISSION = 'voucher.read_all';
const VOUCHER_UPDATE_PERMISSIONS = Object.freeze([
  'voucher.update',
]);
const VOUCHER_UPDATE_PERMISSION = 'voucher.update';
const VOUCHER_DELETE_PERMISSION = 'voucher.delete';
const VOUCHER_DELETE_ROLE_CODES = Object.freeze(['admin', 'system_admin']);
const VOUCHER_STATUS_SET = new Set(VOUCHER_STATUS_VALUES);
const CREATE_ACTION = 'voucher.create';
const STATUS_CHANGE_ACTION = 'voucher.change_status';
const UPDATE_ACTION = 'voucher.update';
const DELETE_ACTION = 'voucher.delete';
const DUPLICATE_ACTION = 'voucher.duplicate';

const buildValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const buildForbiddenError = (message = 'Forbidden') =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildNotFoundError = (message = 'Voucher not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const buildDuplicateError = (field, message) =>
  new AppError(message, {
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    details: [
      {
        field,
        message,
      },
    ],
    statusCode: 409,
  });

const buildVoucherInvalidError = (message = 'Voucher is invalid') =>
  new AppError(message, {
    code: API_ERROR_CODES.VOUCHER_INVALID,
    statusCode: 400,
  });

const buildVoucherExpiredError = (message = 'Voucher is expired') =>
  new AppError(message, {
    code: API_ERROR_CODES.VOUCHER_EXPIRED,
    statusCode: 400,
  });

const buildVoucherUsageLimitError = (
  message = 'Voucher has reached the usage limit',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
    statusCode: 400,
  });

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError([
      {
        field,
        message: `${field} must be a valid UUID`,
      },
    ]);
  }

  return value.trim();
};

const ensureObjectPayload = (payload) =>
  payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : {};

const isUniqueViolation = (error) =>
  error?.code === '23505' || error?.constraint === 'vouchers_code_key';

const parsePositiveInteger = (field, value, fallback) => {
  if (value == null || value === '') {
    return fallback;
  }

  if (typeof value === 'string' && !/^\d+$/.test(value.trim())) {
    throw buildValidationError([
      {
        field,
        message: `${field} must be a positive integer`,
      },
    ]);
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw buildValidationError([
      {
        field,
        message: `${field} must be a positive integer`,
      },
    ]);
  }

  return parsed;
};

const normalizeQueryText = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError([
      {
        field: 'q',
        message: 'q must be a string',
      },
    ]);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > MAX_QUERY_LENGTH) {
    throw buildValidationError([
      {
        field: 'q',
        message: `q must be at most ${MAX_QUERY_LENGTH} characters long`,
      },
    ]);
  }

  return normalized;
};

const normalizeStatusFilter = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    throw buildValidationError([
      {
        field: 'status',
        message: 'status must be a string',
      },
    ]);
  }

  const normalized = value.trim().toLowerCase();

  if (!VOUCHER_STATUS_SET.has(normalized)) {
    throw buildValidationError([
      {
        field: 'status',
        message: `status must be one of: ${VOUCHER_STATUS_VALUES.join(', ')}`,
      },
    ]);
  }

  return normalized;
};

const normalizeListQuery = (queryObject = {}) => {
  const page = parsePositiveInteger('page', queryObject.page, DEFAULT_PAGE);
  const limit = parsePositiveInteger('limit', queryObject.limit, DEFAULT_LIMIT);

  if (limit > MAX_LIMIT) {
    throw buildValidationError([
      {
        field: 'limit',
        message: `limit must not exceed ${MAX_LIMIT}`,
      },
    ]);
  }

  return {
    limit,
    page,
    q: normalizeQueryText(queryObject.q),
    status: normalizeStatusFilter(queryObject.status),
  };
};

const normalizeStatusPayload = (payload = {}) => {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw buildValidationError([
      {
        field: 'status',
        message: 'status is required',
      },
    ]);
  }

  if (!Object.prototype.hasOwnProperty.call(payload, 'status')) {
    throw buildValidationError([
      {
        field: 'status',
        message: 'status is required',
      },
    ]);
  }

  return {
    status: normalizeStatusFilter(payload.status),
  };
};

const normalizeDeletePayload = (payload = {}) => {
  if (payload == null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw buildValidationError([
      {
        field: 'reason',
        message: 'reason is required',
      },
    ]);
  }

  if (typeof payload.reason !== 'string' || !payload.reason.trim()) {
    throw buildValidationError([
      {
        field: 'reason',
        message: 'reason is required',
      },
    ]);
  }

  const reason = payload.reason.trim();

  if (reason.length > MAX_REASON_LENGTH) {
    throw buildValidationError([
      {
        field: 'reason',
        message: `reason must be at most ${MAX_REASON_LENGTH} characters long`,
      },
    ]);
  }

  return {
    reason,
  };
};

const parseTimestampValue = (field, value, details, { required = false } = {}) => {
  if (value == null || value === '') {
    if (required) {
      details.push({
        field,
        message: `${field} is required`,
      });
    }

    return null;
  }

  if (typeof value !== 'string') {
    details.push({
      field,
      message: `${field} must be a valid ISO 8601 timestamp`,
    });
    return null;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    details.push({
      field,
      message: `${field} must be a valid ISO 8601 timestamp`,
    });
    return null;
  }

  return parsed;
};

const parseMoneyValue = (
  field,
  value,
  details,
  {
    allowNull = false,
    min = 0,
    required = false,
    strictPositive = false,
  } = {},
) => {
  if (value == null || value === '') {
    if (required) {
      details.push({
        field,
        message: `${field} is required`,
      });
    }

    return allowNull ? null : null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    details.push({
      field,
      message: `${field} must be a valid number`,
    });
    return null;
  }

  if (parsed < min) {
    details.push({
      field,
      message: `${field} must be greater than or equal to ${min}`,
    });
    return null;
  }

  if (strictPositive && parsed <= 0) {
    details.push({
      field,
      message: `${field} must be greater than 0`,
    });
    return null;
  }

  return parsed;
};

const parsePositiveIntegerValue = (
  field,
  value,
  details,
  {
    allowNull = false,
    required = false,
  } = {},
) => {
  if (value == null || value === '') {
    if (required) {
      details.push({
        field,
        message: `${field} is required`,
      });
    }

    return allowNull ? null : null;
  }

  const stringValue =
    typeof value === 'string' ? value.trim() : String(value);

  if (!/^\d+$/.test(stringValue)) {
    details.push({
      field,
      message: `${field} must be a positive integer`,
    });
    return null;
  }

  const parsed = Number(stringValue);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    details.push({
      field,
      message: `${field} must be a positive integer`,
    });
    return null;
  }

  return parsed;
};

const parseDiscountTypeValue = (field, value, details, { required = false } = {}) => {
  if (value == null || value === '') {
    if (required) {
      details.push({
        field,
        message: `${field} is required`,
      });
    }

    return null;
  }

  if (
    typeof value !== 'string' ||
    ![DISCOUNT_TYPE.PERCENT, DISCOUNT_TYPE.FIXED_AMOUNT].includes(value.trim())
  ) {
    details.push({
      field,
      message: `${field} must be one of: ${DISCOUNT_TYPE.PERCENT}, ${DISCOUNT_TYPE.FIXED_AMOUNT}`,
    });
    return null;
  }

  return value.trim();
};

const parseVoucherStatusValue = (field, value, details, { required = false } = {}) => {
  if (value == null || value === '') {
    if (required) {
      details.push({
        field,
        message: `${field} is required`,
      });
    }

    return null;
  }

  if (typeof value !== 'string') {
    details.push({
      field,
      message: `${field} must be one of: ${VOUCHER_STATUS_VALUES.join(', ')}`,
    });
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!VOUCHER_STATUS_SET.has(normalized)) {
    details.push({
      field,
      message: `${field} must be one of: ${VOUCHER_STATUS_VALUES.join(', ')}`,
    });
    return null;
  }

  return normalized;
};

const parseVoucherCodeValue = (field, value, details, { required = false } = {}) => {
  if (value == null || value === '') {
    if (required) {
      details.push({
        field,
        message: `${field} is required`,
      });
    }

    return null;
  }

  if (typeof value !== 'string') {
    details.push({
      field,
      message: `${field} must be a string`,
    });
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (!normalized) {
    details.push({
      field,
      message: `${field} is required`,
    });
    return null;
  }

  if (normalized.length > MAX_VOUCHER_CODE_LENGTH) {
    details.push({
      field,
      message: `${field} must be at most ${MAX_VOUCHER_CODE_LENGTH} characters long`,
    });
    return null;
  }

  if (!VOUCHER_CODE_PATTERN.test(normalized)) {
    details.push({
      field,
      message: `${field} must match ^[A-Z0-9_-]{3,50}$`,
    });
    return null;
  }

  return normalized;
};

const validateDiscountConfiguration = ({
  details,
  discountType,
  discountValue,
  maxDiscountAmount,
}) => {
  if (!discountType || discountValue == null) {
    return;
  }

  if (
    discountType === DISCOUNT_TYPE.PERCENT &&
    (discountValue <= 0 ||
      discountValue > DOMAIN_CONSTRAINTS.discountPercentMaxValue)
  ) {
    details.push({
      field: 'discount_value',
      message: `discount_value must be greater than 0 and less than or equal to ${DOMAIN_CONSTRAINTS.discountPercentMaxValue} for percent vouchers`,
    });
  }

  if (discountType === DISCOUNT_TYPE.FIXED_AMOUNT && discountValue <= 0) {
    details.push({
      field: 'discount_value',
      message: 'discount_value must be greater than 0 for fixed_amount vouchers',
    });
  }

  if (
    discountType === DISCOUNT_TYPE.PERCENT &&
    maxDiscountAmount != null &&
    maxDiscountAmount <= 0
  ) {
    details.push({
      field: 'max_discount_amount',
      message: 'max_discount_amount must be greater than 0 when provided for percent vouchers',
    });
  }
};

const validateUsageLimits = ({
  details,
  usageLimitPerUser,
  usageLimitTotal,
  usedCount = 0,
}) => {
  if (usageLimitTotal != null && usageLimitTotal < usedCount) {
    details.push({
      field: 'usage_limit_total',
      message: 'usage_limit_total must be greater than or equal to used_count',
    });
  }

  if (
    usageLimitTotal != null &&
    usageLimitPerUser != null &&
    usageLimitPerUser > usageLimitTotal
  ) {
    details.push({
      field: 'usage_limit_per_user',
      message: 'usage_limit_per_user must not exceed usage_limit_total',
    });
  }
};

const validateVoucherWindow = ({
  details,
  fieldPrefix = '',
  validFrom,
  validTo,
}) => {
  if (!validFrom || !validTo) {
    return;
  }

  if (validTo <= validFrom) {
    details.push({
      field: fieldPrefix ? `${fieldPrefix}.valid_to` : 'valid_to',
      message: 'valid_to must be greater than valid_from',
    });
  }
};

const validateVoucherWindowWithinPromotion = ({
  details,
  promotion,
  validFrom,
  validTo,
}) => {
  if (!promotion || !validFrom || !validTo) {
    return;
  }

  const promotionValidFrom = promotion.valid_from
    ? new Date(promotion.valid_from)
    : null;
  const promotionValidTo = promotion.valid_to
    ? new Date(promotion.valid_to)
    : null;

  if (promotionValidFrom && validFrom < promotionValidFrom) {
    details.push({
      field: 'valid_from',
      message: 'valid_from must be within the promotion time window',
    });
  }

  if (promotionValidTo && validTo > promotionValidTo) {
    details.push({
      field: 'valid_to',
      message: 'valid_to must be within the promotion time window',
    });
  }
};

const assertPromotionAllowsVoucherWrite = (promotion) => {
  if (!promotion) {
    throw new AppError('Promotion not found', {
      code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: 404,
    });
  }

  if (
    promotion.status === PROMOTION_STATUS.CANCELLED ||
    promotion.status === PROMOTION_STATUS.EXPIRED
  ) {
    throw buildValidationError([
      {
        field: 'promotion_id',
        message: 'promotion_id cannot reference an expired or cancelled promotion',
      },
    ]);
  }
};

const normalizeCreatePayload = (payload, currentTime) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const allowedFields = new Set([
    'promotion_id',
    'code',
    'discount_type',
    'discount_value',
    'max_discount_amount',
    'min_order_amount',
    'usage_limit_total',
    'usage_limit_per_user',
    'valid_from',
    'valid_to',
    'status',
  ]);
  const disallowedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field),
  );

  if (disallowedFields.length > 0) {
    details.push(
      ...disallowedFields.map((field) => ({
        field,
        message: `${field} is not allowed in POST /admin/vouchers`,
      })),
    );
  }

  let promotionId = null;

  if (!Object.prototype.hasOwnProperty.call(body, 'promotion_id')) {
    details.push({
      field: 'promotion_id',
      message: 'promotion_id is required',
    });
  } else {
    try {
      promotionId = parseUuid('promotion_id', body.promotion_id);
    } catch (error) {
      details.push(...(error.details || []));
    }
  }

  const code = parseVoucherCodeValue('code', body.code, details, {
    required: true,
  });
  const discountType = parseDiscountTypeValue(
    'discount_type',
    body.discount_type,
    details,
    {
      required: true,
    },
  );
  const discountValue = parseMoneyValue(
    'discount_value',
    body.discount_value,
    details,
    {
      min: 0,
      required: true,
    },
  );
  const maxDiscountAmount = Object.prototype.hasOwnProperty.call(
    body,
    'max_discount_amount',
  )
    ? parseMoneyValue('max_discount_amount', body.max_discount_amount, details, {
        allowNull: true,
        strictPositive: true,
      })
    : null;
  const minOrderAmount = Object.prototype.hasOwnProperty.call(
    body,
    'min_order_amount',
  )
    ? parseMoneyValue('min_order_amount', body.min_order_amount, details, {
        min: 0,
      })
    : 0;
  const usageLimitTotal = Object.prototype.hasOwnProperty.call(
    body,
    'usage_limit_total',
  )
    ? parsePositiveIntegerValue(
        'usage_limit_total',
        body.usage_limit_total,
        details,
        {
          allowNull: true,
        },
      )
    : null;
  const usageLimitPerUser = Object.prototype.hasOwnProperty.call(
    body,
    'usage_limit_per_user',
  )
    ? parsePositiveIntegerValue(
        'usage_limit_per_user',
        body.usage_limit_per_user,
        details,
        {
          required: true,
        },
      )
    : DEFAULT_USAGE_LIMIT_PER_USER;
  const validFrom = parseTimestampValue('valid_from', body.valid_from, details, {
    required: true,
  });
  const validTo = parseTimestampValue('valid_to', body.valid_to, details, {
    required: true,
  });
  const status = Object.prototype.hasOwnProperty.call(body, 'status')
    ? parseVoucherStatusValue('status', body.status, details, {
        required: true,
      })
    : VOUCHER_STATUS.DISABLED;

  validateDiscountConfiguration({
    details,
    discountType,
    discountValue,
    maxDiscountAmount,
  });
  validateUsageLimits({
    details,
    usageLimitPerUser,
    usageLimitTotal,
  });
  validateVoucherWindow({
    details,
    validFrom,
    validTo,
  });

  if (status === VOUCHER_STATUS.USED_UP) {
    details.push({
      field: 'status',
      message: 'status cannot be used_up when used_count starts at 0',
    });
  }

  if (
    status === VOUCHER_STATUS.ACTIVE &&
    validTo &&
    currentTime > validTo
  ) {
    details.push({
      field: 'status',
      message: 'status cannot be active when the voucher is already expired',
    });
  }

  if (details.length > 0) {
    throw buildValidationError(details);
  }

  return {
    code,
    discount_type: discountType,
    discount_value: discountValue,
    max_discount_amount: maxDiscountAmount,
    min_order_amount: minOrderAmount,
    promotion_id: promotionId,
    status,
    usage_limit_per_user: usageLimitPerUser,
    usage_limit_total: usageLimitTotal,
    valid_from: validFrom,
    valid_to: validTo,
  };
};

const normalizeUpdatePayload = (payload) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const allowedFields = new Set([
    'promotion_id',
    'code',
    'discount_type',
    'discount_value',
    'max_discount_amount',
    'min_order_amount',
    'usage_limit_total',
    'usage_limit_per_user',
    'valid_from',
    'valid_to',
  ]);

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    details.push({
      field: 'status',
      message: 'status must be changed via PATCH /admin/vouchers/{voucher_id}/status',
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'used_count')) {
    details.push({
      field: 'used_count',
      message: 'used_count cannot be updated via PATCH /admin/vouchers/{voucher_id}',
    });
  }

  const disallowedFields = Object.keys(body).filter(
    (field) =>
      !allowedFields.has(field) && field !== 'status' && field !== 'used_count',
  );

  if (disallowedFields.length > 0) {
    details.push(
      ...disallowedFields.map((field) => ({
        field,
        message: `${field} is not allowed in PATCH /admin/vouchers/{voucher_id}`,
      })),
    );
  }

  if (Object.keys(body).length === 0) {
    details.push({
      field: 'payload',
      message: 'At least one updatable field is required',
    });
  }

  let promotionId;

  if (Object.prototype.hasOwnProperty.call(body, 'promotion_id')) {
    try {
      promotionId = parseUuid('promotion_id', body.promotion_id);
    } catch (error) {
      details.push(...(error.details || []));
    }
  }

  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(body, 'code')) {
    normalized.code = parseVoucherCodeValue('code', body.code, details, {
      required: true,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'discount_type')) {
    normalized.discount_type = parseDiscountTypeValue(
      'discount_type',
      body.discount_type,
      details,
      {
        required: true,
      },
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, 'discount_value')) {
    normalized.discount_value = parseMoneyValue(
      'discount_value',
      body.discount_value,
      details,
      {
        min: 0,
        required: true,
      },
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, 'max_discount_amount')) {
    normalized.max_discount_amount = parseMoneyValue(
      'max_discount_amount',
      body.max_discount_amount,
      details,
      {
        allowNull: true,
        strictPositive: true,
      },
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, 'min_order_amount')) {
    normalized.min_order_amount = parseMoneyValue(
      'min_order_amount',
      body.min_order_amount,
      details,
      {
        min: 0,
        required: true,
      },
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, 'usage_limit_total')) {
    normalized.usage_limit_total = parsePositiveIntegerValue(
      'usage_limit_total',
      body.usage_limit_total,
      details,
      {
        allowNull: true,
      },
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, 'usage_limit_per_user')) {
    normalized.usage_limit_per_user = parsePositiveIntegerValue(
      'usage_limit_per_user',
      body.usage_limit_per_user,
      details,
      {
        required: true,
      },
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, 'valid_from')) {
    normalized.valid_from = parseTimestampValue(
      'valid_from',
      body.valid_from,
      details,
      {
        required: true,
      },
    );
  }

  if (Object.prototype.hasOwnProperty.call(body, 'valid_to')) {
    normalized.valid_to = parseTimestampValue(
      'valid_to',
      body.valid_to,
      details,
      {
        required: true,
      },
    );
  }

  if (promotionId) {
    normalized.promotion_id = promotionId;
  }

  if (details.length > 0) {
    throw buildValidationError(details);
  }

  return normalized;
};

const normalizeDuplicatePayload = (payload) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const allowedFields = new Set([
    'new_code',
    'valid_from',
    'valid_to',
  ]);
  const disallowedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field),
  );

  if (disallowedFields.length > 0) {
    details.push(
      ...disallowedFields.map((field) => ({
        field,
        message: `${field} is not allowed in POST /admin/vouchers/{voucher_id}/duplicate`,
      })),
    );
  }

  const newCode = parseVoucherCodeValue('new_code', body.new_code, details, {
    required: true,
  });
  const validFrom = Object.prototype.hasOwnProperty.call(body, 'valid_from')
    ? parseTimestampValue('valid_from', body.valid_from, details, {
        required: true,
      })
    : undefined;
  const validTo = Object.prototype.hasOwnProperty.call(body, 'valid_to')
    ? parseTimestampValue('valid_to', body.valid_to, details, {
        required: true,
      })
    : undefined;

  if (details.length > 0) {
    throw buildValidationError(details);
  }

  return {
    new_code: newCode,
    valid_from: validFrom,
    valid_to: validTo,
  };
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

const toIsoString = (value) => value?.toISOString?.() || value || null;

const toNumberOrNull = (value) => {
  if (value == null) {
    return null;
  }

  return Number(value);
};

const computeVoucherFlags = (voucher, currentTime) => ({
  is_expired:
    Boolean(voucher.valid_to) && currentTime > new Date(voucher.valid_to),
  is_used_up:
    voucher.usage_limit_total != null &&
    Number(voucher.used_count) >= Number(voucher.usage_limit_total),
});

const mapPromotionSummary = (row) => ({
  id: row.promotion_id,
  name: row.promotion_name,
  status: row.promotion_status,
});

const mapVoucherListItem = (row, currentTime) => ({
  code: row.code,
  created_at: toIsoString(row.created_at),
  discount_type: row.discount_type,
  discount_value: Number(row.discount_value),
  id: row.id,
  is_expired: computeVoucherFlags(row, currentTime).is_expired,
  max_discount_amount: toNumberOrNull(row.max_discount_amount),
  min_order_amount: toNumberOrNull(row.min_order_amount),
  promotion: mapPromotionSummary(row),
  status: row.status,
  usage_limit_per_user: Number(row.usage_limit_per_user),
  usage_limit_total:
    row.usage_limit_total == null ? null : Number(row.usage_limit_total),
  used_count: Number(row.used_count),
  valid_from: toIsoString(row.valid_from),
  valid_to: toIsoString(row.valid_to),
});

const mapVoucherDetail = (row, currentTime) => {
  const flags = computeVoucherFlags(row, currentTime);

  return {
    booking_usage_count:
      row.booking_usage_count == null ? 0 : Number(row.booking_usage_count),
    code: row.code,
    created_at: toIsoString(row.created_at),
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    id: row.id,
    is_expired: flags.is_expired,
    is_used_up: flags.is_used_up,
    max_discount_amount: toNumberOrNull(row.max_discount_amount),
    min_order_amount: toNumberOrNull(row.min_order_amount),
    promotion: {
      ...mapPromotionSummary(row),
      target_service_type: row.promotion_target_service_type,
      valid_from: toIsoString(row.promotion_valid_from),
      valid_to: toIsoString(row.promotion_valid_to),
    },
    promotion_id: row.promotion_id,
    status: row.status,
    usage_limit_per_user: Number(row.usage_limit_per_user),
    usage_limit_total:
      row.usage_limit_total == null ? null : Number(row.usage_limit_total),
    used_count: Number(row.used_count),
    valid_from: toIsoString(row.valid_from),
    valid_to: toIsoString(row.valid_to),
  };
};

const trimToNull = (value) => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();

  return normalized || null;
};

const loadPermissionsByRoleId = async (queryImpl, roleId) => {
  const result = await queryImpl(
    `
      SELECT p.code
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.code ASC
    `,
    [roleId],
  );

  return result.rows.map((row) => row.code);
};

const resolveActorPermissions = async (queryImpl, actor) => {
  const embeddedPermissions = Array.isArray(actor?.permissions)
    ? actor.permissions
    : null;

  return (
    embeddedPermissions ||
    (actor?.role_id ? await loadPermissionsByRoleId(queryImpl, actor.role_id) : [])
  );
};

const ensureActorHasAnyPermission = (permissions, requiredPermissions) => {
  if (requiredPermissions.some((permission) => permissions.includes(permission))) {
    return;
  }

  throw buildForbiddenError();
};

const normalizeActorRoleCode = (actor) => {
  const roleCode = actor?.role_code || actor?.roleCode || actor?.role;

  return typeof roleCode === 'string' ? roleCode.trim().toLowerCase() : null;
};

const ensureActorHasAnyRole = (actor, allowedRoleCodes) => {
  if (allowedRoleCodes.includes(normalizeActorRoleCode(actor))) {
    return;
  }

  throw buildForbiddenError();
};

const ensureActorCanReadAllVouchers = async (queryImpl, actor) => {
  const permissions = await resolveActorPermissions(queryImpl, actor);

  ensureActorHasAnyPermission(permissions, [VOUCHER_READ_PERMISSION]);
};

const loadVoucherById = async (queryExecutor, voucherId, { forUpdate = false } = {}) => {
  const result = await queryExecutor(
    `
      SELECT
        v.id,
        v.promotion_id,
        v.code,
        v.discount_type,
        v.discount_value,
        v.max_discount_amount,
        v.min_order_amount,
        v.usage_limit_total,
        v.usage_limit_per_user,
        v.used_count,
        v.status,
        v.valid_from,
        v.valid_to,
        v.created_at,
        p.name AS promotion_name,
        p.status AS promotion_status,
        p.valid_from AS promotion_valid_from,
        p.valid_to AS promotion_valid_to,
        p.target_service_type AS promotion_target_service_type,
        (
          SELECT COUNT(*)::integer
          FROM bookings b
          WHERE b.voucher_id = v.id
        ) AS booking_usage_count
      FROM vouchers v
      JOIN promotions p ON p.id = v.promotion_id
      WHERE v.id = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE OF v' : ''}
    `,
    [voucherId],
  );

  return result.rows[0] || null;
};

const loadPromotionById = async (queryExecutor, promotionId) => {
  const result = await queryExecutor(
    `
      SELECT
        id,
        name,
        status,
        valid_from,
        valid_to,
        target_service_type
      FROM promotions
      WHERE id = $1
      LIMIT 1
    `,
    [promotionId],
  );

  return result.rows[0] || null;
};

const loadVoucherByCode = async (queryExecutor, code) => {
  const result = await queryExecutor(
    `
      SELECT
        id,
        code
      FROM vouchers
      WHERE code = $1
      LIMIT 1
    `,
    [code],
  );

  return result.rows[0] || null;
};

const ensureVoucherCodeAvailable = async (
  queryExecutor,
  code,
  {
    excludeVoucherId = null,
    field = 'code',
  } = {},
) => {
  const existingVoucher = await loadVoucherByCode(queryExecutor, code);

  if (existingVoucher && existingVoucher.id !== excludeVoucherId) {
    throw buildDuplicateError(field, `${field} already exists`);
  }
};

const updateVoucherStatus = async (queryExecutor, { status, voucherId }) => {
  const result = await queryExecutor(
    `
      UPDATE vouchers
      SET status = $2
      WHERE id = $1
      RETURNING id
    `,
    [voucherId, status],
  );

  return result.rows[0] || null;
};

const insertVoucher = async (queryExecutor, voucher, createdAt) => {
  const result = await queryExecutor(
    `
      INSERT INTO vouchers (
        promotion_id,
        code,
        discount_type,
        discount_value,
        max_discount_amount,
        min_order_amount,
        usage_limit_total,
        usage_limit_per_user,
        used_count,
        status,
        valid_from,
        valid_to,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING id
    `,
    [
      voucher.promotion_id,
      voucher.code,
      voucher.discount_type,
      voucher.discount_value,
      voucher.max_discount_amount,
      voucher.min_order_amount,
      voucher.usage_limit_total,
      voucher.usage_limit_per_user,
      voucher.used_count,
      voucher.status,
      voucher.valid_from,
      voucher.valid_to,
      createdAt,
    ],
  );

  return result.rows[0] || null;
};

const updateVoucherRecord = async (queryExecutor, voucherId, voucher) => {
  const result = await queryExecutor(
    `
      UPDATE vouchers
      SET
        promotion_id = $2,
        code = $3,
        discount_type = $4,
        discount_value = $5,
        max_discount_amount = $6,
        min_order_amount = $7,
        usage_limit_total = $8,
        usage_limit_per_user = $9,
        valid_from = $10,
        valid_to = $11
      WHERE id = $1
      RETURNING id
    `,
    [
      voucherId,
      voucher.promotion_id,
      voucher.code,
      voucher.discount_type,
      voucher.discount_value,
      voucher.max_discount_amount,
      voucher.min_order_amount,
      voucher.usage_limit_total,
      voucher.usage_limit_per_user,
      voucher.valid_from,
      voucher.valid_to,
    ],
  );

  return result.rows[0] || null;
};

const finalizeVoucherConfiguration = ({
  details,
  promotion,
  voucher,
}) => {
  validateDiscountConfiguration({
    details,
    discountType: voucher.discount_type,
    discountValue: voucher.discount_value,
    maxDiscountAmount: voucher.max_discount_amount,
  });
  validateUsageLimits({
    details,
    usageLimitPerUser: voucher.usage_limit_per_user,
    usageLimitTotal: voucher.usage_limit_total,
    usedCount: voucher.used_count,
  });
  validateVoucherWindow({
    details,
    validFrom: voucher.valid_from,
    validTo: voucher.valid_to,
  });
  validateVoucherWindowWithinPromotion({
    details,
    promotion,
    validFrom: voucher.valid_from,
    validTo: voucher.valid_to,
  });
};

const createChangedFieldList = (currentVoucher, nextVoucher) =>
  [
    'promotion_id',
    'code',
    'discount_type',
    'discount_value',
    'max_discount_amount',
    'min_order_amount',
    'usage_limit_total',
    'usage_limit_per_user',
    'valid_from',
    'valid_to',
  ].filter((field) => {
    const currentValue =
      currentVoucher[field] instanceof Date
        ? currentVoucher[field].toISOString()
        : currentVoucher[field]?.toISOString?.() || currentVoucher[field];
    const nextValue =
      nextVoucher[field] instanceof Date
        ? nextVoucher[field].toISOString()
        : nextVoucher[field]?.toISOString?.() || nextVoucher[field];

    return currentValue !== nextValue;
  });

const insertUserLog = async (
  client,
  {
    action,
    actorUserId,
    createdAt,
    entityId,
    ipAddress,
    metadata,
    userAgent,
  },
) =>
  client.query(
    `
      INSERT INTO user_logs (
        user_id,
        action,
        entity_name,
        entity_id,
        ip_address,
        user_agent,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    `,
    [
      actorUserId || null,
      action,
      'vouchers',
      entityId,
      ipAddress || null,
      trimToNull(userAgent),
      metadata ? JSON.stringify(metadata) : null,
      createdAt,
    ],
  );

const assertVoucherCanBeActivated = (voucher, currentTime) => {
  if (
    voucher.promotion_status !== PROMOTION_STATUS.ACTIVE ||
    (voucher.promotion_valid_from &&
      currentTime < new Date(voucher.promotion_valid_from)) ||
    (voucher.promotion_valid_to &&
      currentTime > new Date(voucher.promotion_valid_to))
  ) {
    throw buildVoucherInvalidError(
      'Voucher promotion is not active or outside the valid time window',
    );
  }

  if (voucher.valid_from && currentTime < new Date(voucher.valid_from)) {
    throw buildVoucherInvalidError('Voucher is not active yet');
  }

  if (voucher.valid_to && currentTime > new Date(voucher.valid_to)) {
    throw buildVoucherExpiredError();
  }

  if (
    voucher.usage_limit_total != null &&
    Number(voucher.used_count) >= Number(voucher.usage_limit_total)
  ) {
    throw buildVoucherUsageLimitError(
      'Voucher has reached the total usage limit',
    );
  }
};

const createAdminVoucherService = ({
  now = () => new Date(),
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getVouchers = async ({
    actor,
    query: rawQuery,
  }) => {
    await ensureActorCanReadAllVouchers(queryImpl, actor);

    const filters = normalizeListQuery(rawQuery);
    const whereClauses = [];
    const params = [];

    if (filters.status) {
      params.push(filters.status);
      whereClauses.push(`v.status = $${params.length}`);
    }

    if (filters.q) {
      params.push(`%${filters.q}%`);
      whereClauses.push(
        `(v.code ILIKE $${params.length} OR p.name ILIKE $${params.length})`,
      );
    }

    const whereSql =
      whereClauses.length > 0
        ? `WHERE ${whereClauses.join(' AND ')}`
        : '';
    const countResult = await queryImpl(
      `
        SELECT COUNT(*)::integer AS total
        FROM vouchers v
        JOIN promotions p ON p.id = v.promotion_id
        ${whereSql}
      `,
      params,
    );
    const total = countResult.rows[0]?.total || 0;
    const offset = (filters.page - 1) * filters.limit;
    const dataResult = await queryImpl(
      `
        SELECT
          v.id,
          v.promotion_id,
          v.code,
          v.discount_type,
          v.discount_value,
          v.max_discount_amount,
          v.min_order_amount,
          v.usage_limit_total,
          v.usage_limit_per_user,
          v.used_count,
          v.status,
          v.valid_from,
          v.valid_to,
          v.created_at,
          p.name AS promotion_name,
          p.status AS promotion_status
        FROM vouchers v
        JOIN promotions p ON p.id = v.promotion_id
        ${whereSql}
        ORDER BY v.created_at DESC, v.id DESC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, filters.limit, offset],
    );

    return {
      data: dataResult.rows.map((row) => mapVoucherListItem(row, now())),
      meta: buildPaginationMeta({
        limit: filters.limit,
        page: filters.page,
        total,
      }),
    };
  };

  const getVoucherById = async ({
    actor,
    voucherId,
  }) => {
    await ensureActorCanReadAllVouchers(queryImpl, actor);

    const normalizedVoucherId = parseUuid('voucher_id', voucherId);
    const voucher = await loadVoucherById(queryImpl, normalizedVoucherId);

    if (!voucher) {
      throw buildNotFoundError();
    }

    return mapVoucherDetail(voucher, now());
  };

  const createVoucher = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    userAgent,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(permissions, [VOUCHER_CREATE_PERMISSION]);

      const currentTime = now();
      const normalizedPayload = normalizeCreatePayload(payload, currentTime);
      const promotion = await loadPromotionById(
        queryExecutor,
        normalizedPayload.promotion_id,
      );

      assertPromotionAllowsVoucherWrite(promotion);
      await ensureVoucherCodeAvailable(queryExecutor, normalizedPayload.code);

      const validationDetails = [];

      finalizeVoucherConfiguration({
        details: validationDetails,
        promotion,
        voucher: {
          ...normalizedPayload,
          used_count: 0,
        },
      });

      if (validationDetails.length > 0) {
        throw buildValidationError(validationDetails);
      }

      let createdVoucherRecord;

      try {
        createdVoucherRecord = await insertVoucher(
          queryExecutor,
          {
            ...normalizedPayload,
            used_count: 0,
          },
          currentTime,
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw buildDuplicateError('code', 'code already exists');
        }

        throw error;
      }

      await insertUserLog(client, {
        action: CREATE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: createdVoucherRecord.id,
        ipAddress,
        metadata: {
          code: normalizedPayload.code,
          promotion_id: normalizedPayload.promotion_id,
          status: normalizedPayload.status,
          used_count: 0,
          voucher_id: createdVoucherRecord.id,
        },
        userAgent,
      });

      const createdVoucher = await loadVoucherById(
        queryExecutor,
        createdVoucherRecord.id,
      );

      return mapVoucherDetail(createdVoucher, currentTime);
    });

  const updateVoucher = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    userAgent,
    voucherId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(permissions, [VOUCHER_UPDATE_PERMISSION]);

      const normalizedVoucherId = parseUuid('voucher_id', voucherId);
      const normalizedPayload = normalizeUpdatePayload(payload);
      const currentVoucher = await loadVoucherById(queryExecutor, normalizedVoucherId, {
        forUpdate: true,
      });

      if (!currentVoucher) {
        throw buildNotFoundError();
      }

      const nextVoucher = {
        promotion_id:
          normalizedPayload.promotion_id || currentVoucher.promotion_id,
        code: normalizedPayload.code || currentVoucher.code,
        discount_type:
          normalizedPayload.discount_type || currentVoucher.discount_type,
        discount_value:
          normalizedPayload.discount_value ?? Number(currentVoucher.discount_value),
        max_discount_amount:
          Object.prototype.hasOwnProperty.call(normalizedPayload, 'max_discount_amount')
            ? normalizedPayload.max_discount_amount
            : toNumberOrNull(currentVoucher.max_discount_amount),
        min_order_amount:
          normalizedPayload.min_order_amount ??
          Number(currentVoucher.min_order_amount),
        usage_limit_total:
          Object.prototype.hasOwnProperty.call(normalizedPayload, 'usage_limit_total')
            ? normalizedPayload.usage_limit_total
            : currentVoucher.usage_limit_total == null
              ? null
              : Number(currentVoucher.usage_limit_total),
        usage_limit_per_user:
          normalizedPayload.usage_limit_per_user ??
          Number(currentVoucher.usage_limit_per_user),
        used_count: Number(currentVoucher.used_count),
        valid_from:
          normalizedPayload.valid_from || new Date(currentVoucher.valid_from),
        valid_to:
          normalizedPayload.valid_to || new Date(currentVoucher.valid_to),
      };

      const promotion = await loadPromotionById(
        queryExecutor,
        nextVoucher.promotion_id,
      );

      assertPromotionAllowsVoucherWrite(promotion);

      const validationDetails = [];

      finalizeVoucherConfiguration({
        details: validationDetails,
        promotion,
        voucher: nextVoucher,
      });

      if (validationDetails.length > 0) {
        throw buildValidationError(validationDetails);
      }

      await ensureVoucherCodeAvailable(queryExecutor, nextVoucher.code, {
        excludeVoucherId: normalizedVoucherId,
      });

      try {
        await updateVoucherRecord(queryExecutor, normalizedVoucherId, nextVoucher);
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw buildDuplicateError('code', 'code already exists');
        }

        throw error;
      }

      const currentTime = now();
      const changedFields = createChangedFieldList(currentVoucher, nextVoucher);

      await insertUserLog(client, {
        action: UPDATE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: normalizedVoucherId,
        ipAddress,
        metadata: {
          changed_fields: changedFields,
          code: nextVoucher.code,
          previous_code: currentVoucher.code,
          used_count: Number(currentVoucher.used_count),
          voucher_id: normalizedVoucherId,
        },
        userAgent,
      });

      const updatedVoucher = await loadVoucherById(queryExecutor, normalizedVoucherId);

      return mapVoucherDetail(updatedVoucher, currentTime);
    });

  const duplicateVoucher = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    userAgent,
    voucherId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(permissions, [VOUCHER_CREATE_PERMISSION]);

      const normalizedVoucherId = parseUuid('voucher_id', voucherId);
      const normalizedPayload = normalizeDuplicatePayload(payload);
      const sourceVoucher = await loadVoucherById(queryExecutor, normalizedVoucherId, {
        forUpdate: true,
      });

      if (!sourceVoucher) {
        throw buildNotFoundError();
      }

      await ensureVoucherCodeAvailable(queryExecutor, normalizedPayload.new_code, {
        field: 'new_code',
      });

      const promotion = await loadPromotionById(
        queryExecutor,
        sourceVoucher.promotion_id,
      );

      assertPromotionAllowsVoucherWrite(promotion);

      const nextVoucher = {
        promotion_id: sourceVoucher.promotion_id,
        code: normalizedPayload.new_code,
        discount_type: sourceVoucher.discount_type,
        discount_value: Number(sourceVoucher.discount_value),
        max_discount_amount: toNumberOrNull(sourceVoucher.max_discount_amount),
        min_order_amount: Number(sourceVoucher.min_order_amount),
        usage_limit_total:
          sourceVoucher.usage_limit_total == null
            ? null
            : Number(sourceVoucher.usage_limit_total),
        usage_limit_per_user: Number(sourceVoucher.usage_limit_per_user),
        used_count: 0,
        status: VOUCHER_STATUS.DISABLED,
        valid_from:
          normalizedPayload.valid_from || new Date(sourceVoucher.valid_from),
        valid_to:
          normalizedPayload.valid_to || new Date(sourceVoucher.valid_to),
      };

      const validationDetails = [];

      finalizeVoucherConfiguration({
        details: validationDetails,
        promotion,
        voucher: nextVoucher,
      });

      if (validationDetails.length > 0) {
        throw buildValidationError(validationDetails);
      }

      const currentTime = now();
      let createdVoucherRecord;

      try {
        createdVoucherRecord = await insertVoucher(
          queryExecutor,
          nextVoucher,
          currentTime,
        );
      } catch (error) {
        if (isUniqueViolation(error)) {
          throw buildDuplicateError('new_code', 'new_code already exists');
        }

        throw error;
      }

      await insertUserLog(client, {
        action: DUPLICATE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: createdVoucherRecord.id,
        ipAddress,
        metadata: {
          new_code: nextVoucher.code,
          source_voucher_id: normalizedVoucherId,
          status: nextVoucher.status,
          used_count: 0,
          voucher_id: createdVoucherRecord.id,
        },
        userAgent,
      });

      const duplicatedVoucher = await loadVoucherById(
        queryExecutor,
        createdVoucherRecord.id,
      );

      return mapVoucherDetail(duplicatedVoucher, currentTime);
    });

  const changeVoucherStatus = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    userAgent,
    voucherId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(permissions, VOUCHER_UPDATE_PERMISSIONS);

      const normalizedVoucherId = parseUuid('voucher_id', voucherId);
      const { status } = normalizeStatusPayload(payload);
      const voucher = await loadVoucherById(queryExecutor, normalizedVoucherId, {
        forUpdate: true,
      });

      if (!voucher) {
        throw buildNotFoundError();
      }

      const currentTime = now();

      if (status === 'active') {
        assertVoucherCanBeActivated(voucher, currentTime);
      }

      await updateVoucherStatus(queryExecutor, {
        status,
        voucherId: normalizedVoucherId,
      });

      await insertUserLog(client, {
        action: STATUS_CHANGE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: normalizedVoucherId,
        ipAddress,
        metadata: {
          code: voucher.code,
          new_status: status,
          old_status: voucher.status,
          voucher_id: normalizedVoucherId,
        },
        userAgent,
      });

      const updatedVoucher = await loadVoucherById(queryExecutor, normalizedVoucherId);

      return mapVoucherDetail(updatedVoucher, currentTime);
    });

  const deleteVoucher = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    userAgent,
    voucherId,
  }) => {
    ensureActorHasAnyRole(actor, VOUCHER_DELETE_ROLE_CODES);

    return withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(permissions, [VOUCHER_DELETE_PERMISSION]);

      const normalizedVoucherId = parseUuid('voucher_id', voucherId);
      const { reason } = normalizeDeletePayload(payload);
      const voucher = await loadVoucherById(queryExecutor, normalizedVoucherId, {
        forUpdate: true,
      });

      if (!voucher) {
        throw buildNotFoundError();
      }

      const currentTime = now();

      await updateVoucherStatus(queryExecutor, {
        status: 'disabled',
        voucherId: normalizedVoucherId,
      });

      await insertUserLog(client, {
        action: DELETE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: normalizedVoucherId,
        ipAddress,
        metadata: {
          code: voucher.code,
          new_status: 'disabled',
          old_status: voucher.status,
          reason,
          voucher_id: normalizedVoucherId,
        },
        userAgent,
      });

      const updatedVoucher = await loadVoucherById(queryExecutor, normalizedVoucherId);

      return {
        code: updatedVoucher.code,
        id: updatedVoucher.id,
        reason,
        status: updatedVoucher.status,
      };
    });
  };

  return {
    createVoucher,
    changeVoucherStatus,
    deleteVoucher,
    duplicateVoucher,
    getVoucherById,
    getVouchers,
    updateVoucher,
  };
};

module.exports = createAdminVoucherService();
module.exports.createAdminVoucherService = createAdminVoucherService;
