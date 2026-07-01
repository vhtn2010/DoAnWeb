const {
  API_ERROR_CODES,
  VOUCHER_STATUS_VALUES,
} = require('../constants/domainConstraints');
const { query } = require('../database/client');
const AppError = require('../utils/AppError');

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_QUERY_LENGTH = 100;
const VOUCHER_READ_PERMISSION = 'voucher.read_all';
const VOUCHER_STATUS_SET = new Set(VOUCHER_STATUS_VALUES);

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

const ensureActorCanReadAllVouchers = async (queryImpl, actor) => {
  const embeddedPermissions = Array.isArray(actor?.permissions)
    ? actor.permissions
    : null;
  const permissions =
    embeddedPermissions ||
    (actor?.role_id ? await loadPermissionsByRoleId(queryImpl, actor.role_id) : []);

  if (!permissions.includes(VOUCHER_READ_PERMISSION)) {
    throw buildForbiddenError();
  }
};

const createAdminVoucherService = ({
  now = () => new Date(),
  queryImpl = query,
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
    const result = await queryImpl(
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
      `,
      [normalizedVoucherId],
    );
    const voucher = result.rows[0] || null;

    if (!voucher) {
      throw buildNotFoundError();
    }

    return mapVoucherDetail(voucher, now());
  };

  return {
    getVoucherById,
    getVouchers,
  };
};

module.exports = createAdminVoucherService();
module.exports.createAdminVoucherService = createAdminVoucherService;
