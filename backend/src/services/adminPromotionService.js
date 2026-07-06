const {
  API_ERROR_CODES,
  PROMOTION_STATUS,
  PROMOTION_STATUS_VALUES,
  SERVICE_TYPE_VALUES,
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
const MAX_NAME_LENGTH = 200;
const MAX_REASON_LENGTH = 500;
const PROMOTION_CREATE_PERMISSION = 'promotion.create';
const PROMOTION_UPDATE_PERMISSION = 'promotion.update';
const PROMOTION_DELETE_PERMISSION = 'promotion.delete';
const PROMOTION_READ_PERMISSION = 'promotion.read';
const VOUCHER_READ_ALL_PERMISSION = 'voucher.read_all';
const PROMOTION_DELETE_ROLE_CODES = Object.freeze(['admin', 'system_admin']);
const PROMOTION_STATUS_CHANGE_PERMISSIONS = Object.freeze([
  'promotion.change_status',
]);
const CREATE_ACTION = 'promotion.create';
const UPDATE_ACTION = 'promotion.update';
const DELETE_ACTION = 'promotion.cancel';
const STATUS_CHANGE_ACTION = 'promotion.change_status';
const PROMOTION_STATUS_SET = new Set(PROMOTION_STATUS_VALUES);
const PROMOTION_STATUS_TRANSITIONS = Object.freeze({
  [PROMOTION_STATUS.DRAFT]: Object.freeze([
    PROMOTION_STATUS.ACTIVE,
    PROMOTION_STATUS.CANCELLED,
  ]),
  [PROMOTION_STATUS.ACTIVE]: Object.freeze([
    PROMOTION_STATUS.PAUSED,
    PROMOTION_STATUS.EXPIRED,
    PROMOTION_STATUS.CANCELLED,
  ]),
  [PROMOTION_STATUS.PAUSED]: Object.freeze([
    PROMOTION_STATUS.ACTIVE,
    PROMOTION_STATUS.EXPIRED,
    PROMOTION_STATUS.CANCELLED,
  ]),
  [PROMOTION_STATUS.EXPIRED]: Object.freeze([]),
  [PROMOTION_STATUS.CANCELLED]: Object.freeze([]),
});

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

const buildNotFoundError = (message = 'Promotion not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const buildInvalidTransitionError = (
  message = 'Promotion status transition is invalid',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
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

const parsePromotionStatusValue = (field, value, details, { required = false } = {}) => {
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
      message: `${field} must be one of: ${PROMOTION_STATUS_VALUES.join(', ')}`,
    });
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!PROMOTION_STATUS_SET.has(normalized)) {
    details.push({
      field,
      message: `${field} must be one of: ${PROMOTION_STATUS_VALUES.join(', ')}`,
    });
    return null;
  }

  return normalized;
};

const parsePromotionStatusFilter = (value) => {
  if (value == null || value === '') {
    return null;
  }

  const details = [];
  const normalized = parsePromotionStatusValue('status', value, details, {
    required: true,
  });

  if (details.length > 0) {
    throw buildValidationError(details);
  }

  return normalized;
};

const parseNameValue = (field, value, details, { required = false } = {}) => {
  if (value == null) {
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

  const normalized = value.trim();

  if (!normalized) {
    details.push({
      field,
      message: `${field} must not be empty`,
    });
    return null;
  }

  if (normalized.length > MAX_NAME_LENGTH) {
    details.push({
      field,
      message: `${field} must be at most ${MAX_NAME_LENGTH} characters long`,
    });
    return null;
  }

  return normalized;
};

const parseDescriptionValue = (field, value, details) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    details.push({
      field,
      message: `${field} must be a string`,
    });
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
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

const parseTargetServiceTypeValue = (field, value, details) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value !== 'string') {
    details.push({
      field,
      message: `${field} must be one of: ${SERVICE_TYPE_VALUES.join(', ')}`,
    });
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!SERVICE_TYPE_VALUES.includes(normalized)) {
    details.push({
      field,
      message: `${field} must be one of: ${SERVICE_TYPE_VALUES.join(', ')}`,
    });
    return null;
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
    status: parsePromotionStatusFilter(queryObject.status),
  };
};

const validatePromotionWindow = ({ details, validFrom, validTo }) => {
  if (!validFrom || !validTo) {
    return;
  }

  if (validTo <= validFrom) {
    details.push({
      field: 'valid_to',
      message: 'valid_to must be greater than valid_from',
    });
  }
};

const validateCreateState = ({
  currentTime,
  details,
  validTo,
}) => {
  if (validTo && validTo <= currentTime) {
    details.push({
      field: 'valid_to',
      message: 'valid_to must be later than the current time',
    });
  }
};

const normalizeCreatePayload = (payload, currentTime) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const allowedFields = new Set([
    'name',
    'description',
    'status',
    'valid_from',
    'valid_to',
    'target_service_type',
  ]);
  const disallowedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field),
  );

  if (disallowedFields.length > 0) {
    details.push(
      ...disallowedFields.map((field) => ({
        field,
        message: `${field} is not allowed in POST /admin/promotions`,
      })),
    );
  }

  const name = parseNameValue('name', body.name, details, {
    required: true,
  });
  const description = Object.prototype.hasOwnProperty.call(body, 'description')
    ? parseDescriptionValue('description', body.description, details)
    : null;
  const status = parsePromotionStatusValue('status', body.status, details, {
    required: true,
  });
  const validFrom = parseTimestampValue('valid_from', body.valid_from, details, {
    required: true,
  });
  const validTo = parseTimestampValue('valid_to', body.valid_to, details, {
    required: true,
  });
  const targetServiceType = Object.prototype.hasOwnProperty.call(
    body,
    'target_service_type',
  )
    ? parseTargetServiceTypeValue(
        'target_service_type',
        body.target_service_type,
        details,
      )
    : null;

  validatePromotionWindow({
    details,
    validFrom,
    validTo,
  });
  validateCreateState({
    currentTime,
    details,
    status,
    validTo,
  });

  if (details.length > 0) {
    throw buildValidationError(details);
  }

  return {
    description,
    name,
    status,
    target_service_type: targetServiceType,
    valid_from: validFrom,
    valid_to: validTo,
  };
};

const normalizeUpdatePayload = (payload) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const allowedFields = new Set([
    'name',
    'description',
    'valid_from',
    'valid_to',
    'target_service_type',
  ]);

  if (Object.prototype.hasOwnProperty.call(body, 'status')) {
    details.push({
      field: 'status',
      message: 'status must be changed via PATCH /admin/promotions/{promotion_id}/status',
    });
  }

  const disallowedFields = Object.keys(body).filter(
    (field) => !allowedFields.has(field) && field !== 'status',
  );

  if (disallowedFields.length > 0) {
    details.push(
      ...disallowedFields.map((field) => ({
        field,
        message: `${field} is not allowed in PATCH /admin/promotions/{promotion_id}`,
      })),
    );
  }

  const normalized = {};

  if (Object.prototype.hasOwnProperty.call(body, 'name')) {
    normalized.name = parseNameValue('name', body.name, details, {
      required: true,
    });
  }

  if (Object.prototype.hasOwnProperty.call(body, 'description')) {
    normalized.description = parseDescriptionValue(
      'description',
      body.description,
      details,
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

  if (Object.prototype.hasOwnProperty.call(body, 'target_service_type')) {
    normalized.target_service_type = parseTargetServiceTypeValue(
      'target_service_type',
      body.target_service_type,
      details,
    );
  }

  if (Object.keys(normalized).length === 0 && details.length === 0) {
    details.push({
      field: 'body',
      message: 'At least one updatable field is required',
    });
  }

  if (details.length > 0) {
    throw buildValidationError(details);
  }

  return normalized;
};

const normalizeDeletePayload = (payload = {}) => {
  const body = ensureObjectPayload(payload);

  if (typeof body.reason !== 'string' || !body.reason.trim()) {
    throw buildValidationError([
      {
        field: 'reason',
        message: 'reason is required',
      },
    ]);
  }

  const reason = body.reason.trim();

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

const normalizeStatusPayload = (payload = {}) => {
  const body = ensureObjectPayload(payload);
  const details = [];
  const status = parsePromotionStatusValue('status', body.status, details, {
    required: true,
  });

  if (details.length > 0) {
    throw buildValidationError(details);
  }

  return {
    status,
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

const ensureActorCanReadPromotions = async (queryImpl, actor) => {
  const permissions = await resolveActorPermissions(queryImpl, actor);

  ensureActorHasAnyPermission(permissions, [PROMOTION_READ_PERMISSION]);
};

const ensureActorCanReadPromotionVouchers = async (queryImpl, actor) => {
  const permissions = await resolveActorPermissions(queryImpl, actor);

  ensureActorHasAnyPermission(permissions, [
    PROMOTION_READ_PERMISSION,
    VOUCHER_READ_ALL_PERMISSION,
  ]);
};

const mapPromotionListItem = (row) => ({
  active_voucher_count:
    row.active_voucher_count == null ? 0 : Number(row.active_voucher_count),
  created_at: toIsoString(row.created_at),
  created_by: row.created_by,
  description: row.description,
  id: row.id,
  name: row.name,
  status: row.status,
  target_service_type: row.target_service_type,
  updated_at: toIsoString(row.updated_at),
  valid_from: toIsoString(row.valid_from),
  valid_to: toIsoString(row.valid_to),
  voucher_count: row.voucher_count == null ? 0 : Number(row.voucher_count),
});

const mapPromotionDetail = (row) => ({
  active_voucher_count:
    row.active_voucher_count == null ? 0 : Number(row.active_voucher_count),
  created_at: toIsoString(row.created_at),
  created_by: row.created_by,
  created_by_user: row.created_by
    ? {
        email: row.creator_email || null,
        full_name: row.creator_full_name || null,
        id: row.created_by,
      }
    : null,
  description: row.description,
  id: row.id,
  name: row.name,
  status: row.status,
  target_service_type: row.target_service_type,
  updated_at: toIsoString(row.updated_at),
  valid_from: toIsoString(row.valid_from),
  valid_to: toIsoString(row.valid_to),
  voucher_count: row.voucher_count == null ? 0 : Number(row.voucher_count),
});

const computeVoucherAdminFlags = (voucher, promotion, currentTime) => {
  const voucherValidFrom = voucher.valid_from ? new Date(voucher.valid_from) : null;
  const voucherValidTo = voucher.valid_to ? new Date(voucher.valid_to) : null;
  const promotionValidFrom = promotion.valid_from
    ? new Date(promotion.valid_from)
    : null;
  const promotionValidTo = promotion.valid_to ? new Date(promotion.valid_to) : null;

  return {
    is_currently_usable:
      voucher.status === 'active' &&
      promotion.status === PROMOTION_STATUS.ACTIVE &&
      (!voucherValidFrom || currentTime >= voucherValidFrom) &&
      (!voucherValidTo || currentTime <= voucherValidTo) &&
      (!promotionValidFrom || currentTime >= promotionValidFrom) &&
      (!promotionValidTo || currentTime <= promotionValidTo),
    is_expired: Boolean(voucherValidTo) && currentTime > voucherValidTo,
    is_used_up:
      voucher.usage_limit_total != null &&
      Number(voucher.used_count) >= Number(voucher.usage_limit_total),
  };
};

const mapPromotionVoucherListItem = (row, promotion, currentTime) => {
  const flags = computeVoucherAdminFlags(row, promotion, currentTime);

  return {
    code: row.code,
    created_at: toIsoString(row.created_at),
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    id: row.id,
    is_currently_usable: flags.is_currently_usable,
    is_expired: flags.is_expired,
    is_used_up: flags.is_used_up,
    max_discount_amount:
      row.max_discount_amount == null ? null : Number(row.max_discount_amount),
    min_order_amount:
      row.min_order_amount == null ? null : Number(row.min_order_amount),
    promotion: {
      id: promotion.id,
      name: promotion.name,
      status: promotion.status,
      target_service_type: promotion.target_service_type,
      valid_from: toIsoString(promotion.valid_from),
      valid_to: toIsoString(promotion.valid_to),
    },
    promotion_id: row.promotion_id,
    status: row.status,
    usage_limit_per_user:
      row.usage_limit_per_user == null ? null : Number(row.usage_limit_per_user),
    usage_limit_total:
      row.usage_limit_total == null ? null : Number(row.usage_limit_total),
    used_count: row.used_count == null ? 0 : Number(row.used_count),
    valid_from: toIsoString(row.valid_from),
    valid_to: toIsoString(row.valid_to),
  };
};

const loadPromotionById = async (
  queryExecutor,
  promotionId,
  { forUpdate = false } = {},
) => {
  const result = await queryExecutor(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        p.valid_from,
        p.valid_to,
        p.target_service_type,
        p.created_by,
        p.created_at,
        p.updated_at,
        u.full_name AS creator_full_name,
        u.email AS creator_email,
        (
          SELECT COUNT(*)::integer
          FROM vouchers v
          WHERE v.promotion_id = p.id
        ) AS voucher_count,
        (
          SELECT COUNT(*)::integer
          FROM vouchers v
          WHERE v.promotion_id = p.id
            AND v.status = 'active'
        ) AS active_voucher_count
      FROM promotions p
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE OF p' : ''}
    `,
    [promotionId],
  );

  return result.rows[0] || null;
};

const listPromotions = async (queryExecutor, filters) => {
  const whereClauses = [];
  const params = [];

  if (filters.status) {
    params.push(filters.status);
    whereClauses.push(`p.status = $${params.length}`);
  }

  const whereSql =
    whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const countResult = await queryExecutor(
    `
      SELECT COUNT(*)::integer AS total
      FROM promotions p
      ${whereSql}
    `,
    params,
  );
  const total = countResult.rows[0]?.total || 0;
  const offset = (filters.page - 1) * filters.limit;
  const dataResult = await queryExecutor(
    `
      SELECT
        p.id,
        p.name,
        p.description,
        p.status,
        p.valid_from,
        p.valid_to,
        p.target_service_type,
        p.created_by,
        p.created_at,
        p.updated_at,
        (
          SELECT COUNT(*)::integer
          FROM vouchers v
          WHERE v.promotion_id = p.id
        ) AS voucher_count,
        (
          SELECT COUNT(*)::integer
          FROM vouchers v
          WHERE v.promotion_id = p.id
            AND v.status = 'active'
        ) AS active_voucher_count
      FROM promotions p
      ${whereSql}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, filters.limit, offset],
  );

  return {
    data: dataResult.rows.map(mapPromotionListItem),
    meta: buildPaginationMeta({
      limit: filters.limit,
      page: filters.page,
      total,
    }),
  };
};

const listPromotionVouchers = async (
  queryExecutor,
  promotionId,
  {
    limit,
    page,
  },
) => {
  const countResult = await queryExecutor(
    `
      SELECT COUNT(*)::integer AS total
      FROM vouchers v
      WHERE v.promotion_id = $1
    `,
    [promotionId],
  );
  const total = countResult.rows[0]?.total || 0;
  const offset = (page - 1) * limit;
  const dataResult = await queryExecutor(
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
        v.created_at
      FROM vouchers v
      WHERE v.promotion_id = $1
      ORDER BY v.created_at DESC, v.id DESC
      LIMIT $2
      OFFSET $3
    `,
    [promotionId, limit, offset],
  );

  return {
    rows: dataResult.rows,
    total,
  };
};

const loadVoucherWindowViolations = async (
  queryExecutor,
  promotionId,
  {
    validFrom,
    validTo,
  },
) => {
  const result = await queryExecutor(
    `
      SELECT
        id,
        code,
        valid_from,
        valid_to
      FROM vouchers
      WHERE promotion_id = $1
        AND status = 'active'
        AND (
          valid_from < $2
          OR valid_to > $3
        )
      ORDER BY created_at ASC, id ASC
    `,
    [promotionId, validFrom, validTo],
  );

  return result.rows;
};

const insertPromotion = async (queryExecutor, promotion, createdAt) => {
  const result = await queryExecutor(
    `
      INSERT INTO promotions (
        name,
        description,
        status,
        valid_from,
        valid_to,
        target_service_type,
        created_by,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
    [
      promotion.name,
      promotion.description,
      promotion.status,
      promotion.valid_from,
      promotion.valid_to,
      promotion.target_service_type,
      promotion.created_by,
      createdAt,
      createdAt,
    ],
  );

  return result.rows[0] || null;
};

const updatePromotionRecord = async (queryExecutor, promotionId, promotion, updatedAt) => {
  const result = await queryExecutor(
    `
      UPDATE promotions
      SET
        name = $2,
        description = $3,
        valid_from = $4,
        valid_to = $5,
        target_service_type = $6,
        updated_at = $7
      WHERE id = $1
      RETURNING id
    `,
    [
      promotionId,
      promotion.name,
      promotion.description,
      promotion.valid_from,
      promotion.valid_to,
      promotion.target_service_type,
      updatedAt,
    ],
  );

  return result.rows[0] || null;
};

const updatePromotionStatus = async (queryExecutor, promotionId, status, updatedAt) => {
  const result = await queryExecutor(
    `
      UPDATE promotions
      SET
        status = $2,
        updated_at = $3
      WHERE id = $1
      RETURNING id
    `,
    [promotionId, status, updatedAt],
  );

  return result.rows[0] || null;
};

const createChangedFieldList = (currentPromotion, nextPromotion) =>
  [
    'name',
    'description',
    'valid_from',
    'valid_to',
    'target_service_type',
  ].filter((field) => {
    const currentValue =
      currentPromotion[field] instanceof Date
        ? currentPromotion[field].toISOString()
        : currentPromotion[field]?.toISOString?.() || currentPromotion[field];
    const nextValue =
      nextPromotion[field] instanceof Date
        ? nextPromotion[field].toISOString()
        : nextPromotion[field]?.toISOString?.() || nextPromotion[field];

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
      'promotions',
      entityId,
      ipAddress || null,
      trimToNull(userAgent),
      metadata ? JSON.stringify(metadata) : null,
      createdAt,
    ],
  );

const assertPromotionCanBeUpdated = (promotion) => {
  if (
    promotion.status === PROMOTION_STATUS.CANCELLED ||
    promotion.status === PROMOTION_STATUS.EXPIRED
  ) {
    throw buildInvalidTransitionError(
      'Expired or cancelled promotions cannot be updated',
    );
  }
};

const assertPromotionTransition = ({
  currentPromotion,
  currentTime,
  nextStatus,
}) => {
  if (nextStatus === currentPromotion.status) {
    return;
  }

  const allowedTransitions =
    PROMOTION_STATUS_TRANSITIONS[currentPromotion.status] || [];

  if (!allowedTransitions.includes(nextStatus)) {
    throw buildInvalidTransitionError();
  }

  if (
    nextStatus === PROMOTION_STATUS.ACTIVE &&
    new Date(currentPromotion.valid_to) <= currentTime
  ) {
    throw buildInvalidTransitionError(
      'Cannot activate a promotion that is already expired',
    );
  }
};

const createAdminPromotionService = ({
  now = () => new Date(),
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getPromotions = async ({
    actor,
    query: rawQuery,
  }) => {
    await ensureActorCanReadPromotions(queryImpl, actor);

    const filters = normalizeListQuery(rawQuery);
    return listPromotions(queryImpl, filters);
  };

  const getPromotionById = async ({
    actor,
    promotionId,
  }) => {
    await ensureActorCanReadPromotions(queryImpl, actor);

    const normalizedPromotionId = parseUuid('promotion_id', promotionId);
    const promotion = await loadPromotionById(queryImpl, normalizedPromotionId);

    if (!promotion) {
      throw buildNotFoundError();
    }

    return mapPromotionDetail(promotion);
  };

  const getPromotionVouchers = async ({
    actor,
    promotionId,
    query: rawQuery,
  }) => {
    await ensureActorCanReadPromotionVouchers(queryImpl, actor);

    const normalizedPromotionId = parseUuid('promotion_id', promotionId);
    const filters = normalizeListQuery(rawQuery);
    const promotion = await loadPromotionById(queryImpl, normalizedPromotionId);

    if (!promotion) {
      throw buildNotFoundError();
    }

    const result = await listPromotionVouchers(queryImpl, normalizedPromotionId, {
      limit: filters.limit,
      page: filters.page,
    });
    const currentTime = now();

    return {
      meta: buildPaginationMeta({
        limit: filters.limit,
        page: filters.page,
        total: result.total,
      }),
      promotion: {
        id: promotion.id,
        name: promotion.name,
        status: promotion.status,
        target_service_type: promotion.target_service_type,
        valid_from: toIsoString(promotion.valid_from),
        valid_to: toIsoString(promotion.valid_to),
      },
      vouchers: result.rows.map((row) =>
        mapPromotionVoucherListItem(row, promotion, currentTime),
      ),
    };
  };

  const createPromotion = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    userAgent,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(permissions, [PROMOTION_CREATE_PERMISSION]);

      const currentTime = now();
      const normalizedPayload = normalizeCreatePayload(payload, currentTime);

      if (
        normalizedPayload.status === PROMOTION_STATUS.EXPIRED ||
        normalizedPayload.status === PROMOTION_STATUS.CANCELLED
      ) {
        throw buildInvalidTransitionError(
          'Cannot create a promotion with terminal status',
        );
      }

      const createdPromotionRecord = await insertPromotion(
        queryExecutor,
        {
          ...normalizedPayload,
          created_by: actorUserId,
        },
        currentTime,
      );

      await insertUserLog(client, {
        action: CREATE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: createdPromotionRecord.id,
        ipAddress,
        metadata: {
          created_by: actorUserId,
          promotion_id: createdPromotionRecord.id,
          status: normalizedPayload.status,
          target_service_type: normalizedPayload.target_service_type,
        },
        userAgent,
      });

      const createdPromotion = await loadPromotionById(
        queryExecutor,
        createdPromotionRecord.id,
      );

      return mapPromotionDetail(createdPromotion);
    });

  const updatePromotion = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    promotionId,
    userAgent,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(permissions, [PROMOTION_UPDATE_PERMISSION]);

      const normalizedPromotionId = parseUuid('promotion_id', promotionId);
      const normalizedPayload = normalizeUpdatePayload(payload);
      const currentPromotion = await loadPromotionById(
        queryExecutor,
        normalizedPromotionId,
        {
          forUpdate: true,
        },
      );

      if (!currentPromotion) {
        throw buildNotFoundError();
      }

      assertPromotionCanBeUpdated(currentPromotion);

      const nextPromotion = {
        name: normalizedPayload.name || currentPromotion.name,
        description:
          Object.prototype.hasOwnProperty.call(normalizedPayload, 'description')
            ? normalizedPayload.description
            : currentPromotion.description,
        target_service_type:
          Object.prototype.hasOwnProperty.call(
            normalizedPayload,
            'target_service_type',
          )
            ? normalizedPayload.target_service_type
            : currentPromotion.target_service_type,
        valid_from:
          normalizedPayload.valid_from || new Date(currentPromotion.valid_from),
        valid_to:
          normalizedPayload.valid_to || new Date(currentPromotion.valid_to),
      };
      const validationDetails = [];

      validatePromotionWindow({
        details: validationDetails,
        validFrom: nextPromotion.valid_from,
        validTo: nextPromotion.valid_to,
      });

      const hasWindowChange =
        Object.prototype.hasOwnProperty.call(normalizedPayload, 'valid_from') ||
        Object.prototype.hasOwnProperty.call(normalizedPayload, 'valid_to');

      if (hasWindowChange && validationDetails.length === 0) {
        const violatingVouchers = await loadVoucherWindowViolations(
          queryExecutor,
          normalizedPromotionId,
          {
            validFrom: nextPromotion.valid_from,
            validTo: nextPromotion.valid_to,
          },
        );

        if (violatingVouchers.length > 0) {
          validationDetails.push({
            field: 'valid_from',
            message:
              'Promotion time window cannot exclude active vouchers belonging to this promotion',
          });
        }
      }

      if (validationDetails.length > 0) {
        throw buildValidationError(validationDetails);
      }

      const currentTime = now();

      if (
        currentPromotion.status === PROMOTION_STATUS.ACTIVE &&
        nextPromotion.valid_to <= currentTime
      ) {
        throw buildInvalidTransitionError(
          'Active promotions cannot be updated to an expired time window',
        );
      }

      await updatePromotionRecord(
        queryExecutor,
        normalizedPromotionId,
        nextPromotion,
        currentTime,
      );

      await insertUserLog(client, {
        action: UPDATE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: normalizedPromotionId,
        ipAddress,
        metadata: {
          changed_fields: createChangedFieldList(currentPromotion, nextPromotion),
          promotion_id: normalizedPromotionId,
          status: currentPromotion.status,
        },
        userAgent,
      });

      const updatedPromotion = await loadPromotionById(
        queryExecutor,
        normalizedPromotionId,
      );

      return mapPromotionDetail(updatedPromotion);
    });

  const deletePromotion = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    promotionId,
    userAgent,
  }) => {
    ensureActorHasAnyRole(actor, PROMOTION_DELETE_ROLE_CODES);

    return withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(permissions, [PROMOTION_DELETE_PERMISSION]);

      const normalizedPromotionId = parseUuid('promotion_id', promotionId);
      const { reason } = normalizeDeletePayload(payload);
      const currentPromotion = await loadPromotionById(
        queryExecutor,
        normalizedPromotionId,
        {
          forUpdate: true,
        },
      );

      if (!currentPromotion) {
        throw buildNotFoundError();
      }

      const currentTime = now();
      const alreadyCancelled =
        currentPromotion.status === PROMOTION_STATUS.CANCELLED;

      if (!alreadyCancelled) {
        await updatePromotionStatus(
          queryExecutor,
          normalizedPromotionId,
          PROMOTION_STATUS.CANCELLED,
          currentTime,
        );
      }

      await insertUserLog(client, {
        action: DELETE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: normalizedPromotionId,
        ipAddress,
        metadata: {
          idempotent: alreadyCancelled,
          new_status: PROMOTION_STATUS.CANCELLED,
          old_status: currentPromotion.status,
          promotion_id: normalizedPromotionId,
          reason,
        },
        userAgent,
      });

      const deletedPromotion = alreadyCancelled
        ? currentPromotion
        : await loadPromotionById(queryExecutor, normalizedPromotionId);

      return {
        id: normalizedPromotionId,
        reason,
        status: deletedPromotion.status,
      };
    });
  };

  const changePromotionStatus = async ({
    actor,
    actorUserId,
    ipAddress,
    payload,
    promotionId,
    userAgent,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const permissions = await resolveActorPermissions(queryExecutor, actor);

      ensureActorHasAnyPermission(
        permissions,
        PROMOTION_STATUS_CHANGE_PERMISSIONS,
      );

      const normalizedPromotionId = parseUuid('promotion_id', promotionId);
      const { status } = normalizeStatusPayload(payload);
      const currentPromotion = await loadPromotionById(
        queryExecutor,
        normalizedPromotionId,
        {
          forUpdate: true,
        },
      );

      if (!currentPromotion) {
        throw buildNotFoundError();
      }

      const currentTime = now();

      assertPromotionTransition({
        currentPromotion,
        currentTime,
        nextStatus: status,
      });

      if (status !== currentPromotion.status) {
        await updatePromotionStatus(
          queryExecutor,
          normalizedPromotionId,
          status,
          currentTime,
        );
      }

      await insertUserLog(client, {
        action: STATUS_CHANGE_ACTION,
        actorUserId,
        createdAt: currentTime,
        entityId: normalizedPromotionId,
        ipAddress,
        metadata: {
          idempotent: status === currentPromotion.status,
          new_status: status,
          old_status: currentPromotion.status,
          promotion_id: normalizedPromotionId,
        },
        userAgent,
      });

      const updatedPromotion =
        status === currentPromotion.status
          ? currentPromotion
          : await loadPromotionById(queryExecutor, normalizedPromotionId);

      return mapPromotionDetail(updatedPromotion);
    });

  return {
    changePromotionStatus,
    createPromotion,
    deletePromotion,
    getPromotionById,
    getPromotionVouchers,
    getPromotions,
    updatePromotion,
  };
};

module.exports = createAdminPromotionService();
module.exports.createAdminPromotionService = createAdminPromotionService;
