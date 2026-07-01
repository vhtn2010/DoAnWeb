const { query } = require('../database/client');
const {
  API_ERROR_CODES,
  USER_STATUS,
  USER_STATUS_VALUES,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');
const { mapUserLogRow } = require('./profileService');

const ADMIN_ALLOWED_ROLE_CODES = new Set(['admin', 'system_admin']);
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const createNotFoundError = (message = 'User not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const trimToNull = (value) => {
  if (value == null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || null;
};

const parsePositiveInteger = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== 'string' || !/^\d+$/.test(value.trim())) {
    return Number.NaN;
  }

  return Number.parseInt(value.trim(), 10);
};

const normalizePagination = (input = {}) => {
  const details = [];
  const rawPage = parsePositiveInteger(input.page);
  const rawLimit = parsePositiveInteger(input.limit);

  if (Number.isNaN(rawPage) || (rawPage != null && rawPage < 1)) {
    details.push({
      field: 'page',
      message: 'page must be an integer greater than or equal to 1',
    });
  }

  if (
    Number.isNaN(rawLimit) ||
    (rawLimit != null && (rawLimit < 1 || rawLimit > MAX_LIMIT))
  ) {
    details.push({
      field: 'limit',
      message: `limit must be an integer between 1 and ${MAX_LIMIT}`,
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    limit: rawLimit ?? DEFAULT_LIMIT,
    page: rawPage ?? DEFAULT_PAGE,
  };
};

const normalizeUserId = (userId) => {
  const normalizedUserId = trimToNull(userId);

  if (!normalizedUserId || !UUID_PATTERN.test(normalizedUserId)) {
    throw createValidationError([
      {
        field: 'user_id',
        message: 'user_id must be a valid UUID',
      },
    ]);
  }

  return normalizedUserId;
};

const mapAdminUser = (row) => ({
  avatar_url: row.avatar_url,
  created_at: row.created_at?.toISOString?.() || row.created_at,
  deleted_at: row.deleted_at?.toISOString?.() || row.deleted_at,
  email: row.email,
  email_verified_at:
    row.email_verified_at?.toISOString?.() || row.email_verified_at,
  full_name: row.full_name,
  id: row.id,
  last_login_at: row.last_login_at?.toISOString?.() || row.last_login_at,
  phone: row.phone,
  role: {
    code: row.role_code,
    id: row.role_id,
    level: row.role_level,
    name: row.role_name,
  },
  status: row.status,
  updated_at: row.updated_at?.toISOString?.() || row.updated_at,
});

const normalizeListUsersQuery = (rawQuery = {}) => {
  const normalizedQuery =
    rawQuery && typeof rawQuery === 'object' && !Array.isArray(rawQuery)
      ? rawQuery
      : {};
  const pagination = normalizePagination(normalizedQuery);
  const details = [];
  const q = trimToNull(normalizedQuery.q);
  const roleCode = trimToNull(normalizedQuery.role);
  const status = trimToNull(normalizedQuery.status);

  if (roleCode && !/^[a-z_]+$/.test(roleCode)) {
    details.push({
      field: 'role',
      message: 'role must be a valid lowercase snake_case role code',
    });
  }

  if (status && !USER_STATUS_VALUES.includes(status)) {
    details.push({
      field: 'status',
      message: `status must be one of: ${USER_STATUS_VALUES.join(', ')}`,
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    ...pagination,
    q,
    roleCode,
    status,
  };
};

const loadRoleByCode = async (queryImpl, roleCode) => {
  const result = await queryImpl(
    `
      SELECT
        id,
        code,
        name,
        level
      FROM roles
      WHERE code = $1
      LIMIT 1
    `,
    [roleCode],
  );

  return result.rows[0] || null;
};

const loadUserById = async (queryImpl, userId) => {
  const result = await queryImpl(
    `
      SELECT
        u.id,
        u.email,
        u.phone,
        u.full_name,
        u.avatar_url,
        u.status,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.deleted_at,
        r.id AS role_id,
        r.code AS role_code,
        r.name AS role_name,
        r.level AS role_level
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] || null;
};

const createAdminUserService = ({
  queryImpl = query,
} = {}) => {
  const getUsers = async ({ query: rawQuery }) => {
    const filters = normalizeListUsersQuery(rawQuery);

    if (filters.roleCode) {
      const role = await loadRoleByCode(queryImpl, filters.roleCode);

      if (!role) {
        throw createValidationError([
          {
            field: 'role',
            message: 'role must reference an existing role code',
          },
        ]);
      }
    }

    const whereClauses = [];
    const params = [];
    let parameterIndex = 1;

    if (filters.status) {
      whereClauses.push(`u.status = $${parameterIndex}`);
      params.push(filters.status);
      parameterIndex += 1;
    } else {
      whereClauses.push(`u.status <> $${parameterIndex}`);
      params.push(USER_STATUS.DELETED);
      parameterIndex += 1;
    }

    if (filters.roleCode) {
      whereClauses.push(`r.code = $${parameterIndex}`);
      params.push(filters.roleCode);
      parameterIndex += 1;
    }

    if (filters.q) {
      whereClauses.push(
        `(u.email ILIKE $${parameterIndex} OR u.full_name ILIKE $${parameterIndex} OR u.phone ILIKE $${parameterIndex})`,
      );
      params.push(`%${filters.q}%`);
      parameterIndex += 1;
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;
    const countParams = [...params];
    const countResult = await queryImpl(
      `
        SELECT COUNT(*)::integer AS total
        FROM users u
        JOIN roles r ON r.id = u.role_id
        ${whereSql}
      `,
      countParams,
    );
    const total = countResult.rows[0]?.total || 0;
    const dataParams = [...params, filters.limit, offset];
    const listResult = await queryImpl(
      `
        SELECT
          u.id,
          u.email,
          u.phone,
          u.full_name,
          u.avatar_url,
          u.status,
          u.email_verified_at,
          u.last_login_at,
          u.created_at,
          u.updated_at,
          u.deleted_at,
          r.id AS role_id,
          r.code AS role_code,
          r.name AS role_name,
          r.level AS role_level
        FROM users u
        JOIN roles r ON r.id = u.role_id
        ${whereSql}
        ORDER BY u.created_at DESC
        LIMIT $${parameterIndex}
        OFFSET $${parameterIndex + 1}
      `,
      dataParams,
    );
    const totalPages = total === 0 ? 0 : Math.ceil(total / filters.limit);

    return {
      data: listResult.rows.map(mapAdminUser),
      meta: {
        has_next: filters.page < totalPages,
        limit: filters.limit,
        page: filters.page,
        total,
        total_pages: totalPages,
      },
    };
  };

  const getUserById = async ({ userId }) => {
    const normalizedUserId = normalizeUserId(userId);
    const user = await loadUserById(queryImpl, normalizedUserId);

    if (!user) {
      throw createNotFoundError();
    }

    return mapAdminUser(user);
  };

  const getUserLogs = async ({ query: rawQuery, userId }) => {
    const normalizedUserId = normalizeUserId(userId);
    const pagination = normalizePagination(rawQuery);
    const user = await loadUserById(queryImpl, normalizedUserId);

    if (!user) {
      throw createNotFoundError();
    }

    const offset = (pagination.page - 1) * pagination.limit;
    const countResult = await queryImpl(
      `
        SELECT COUNT(*)::integer AS total
        FROM user_logs
        WHERE user_id = $1
      `,
      [normalizedUserId],
    );
    const total = countResult.rows[0]?.total || 0;
    const logsResult = await queryImpl(
      `
        SELECT
          id,
          action,
          entity_name,
          entity_id,
          metadata,
          ip_address,
          user_agent,
          created_at
        FROM user_logs
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2
        OFFSET $3
      `,
      [normalizedUserId, pagination.limit, offset],
    );
    const totalPages =
      total === 0 ? 0 : Math.ceil(total / pagination.limit);

    return {
      data: logsResult.rows.map(mapUserLogRow),
      meta: {
        has_next: pagination.page < totalPages,
        limit: pagination.limit,
        page: pagination.page,
        total,
        total_pages: totalPages,
      },
    };
  };

  return {
    getUserById,
    getUserLogs,
    getUsers,
  };
};

module.exports = createAdminUserService();
module.exports.ADMIN_ALLOWED_ROLE_CODES = ADMIN_ALLOWED_ROLE_CODES;
module.exports.createAdminUserService = createAdminUserService;
module.exports.mapAdminUser = mapAdminUser;
module.exports.normalizeListUsersQuery = normalizeListUsersQuery;
module.exports.normalizePagination = normalizePagination;
module.exports.normalizeUserId = normalizeUserId;
