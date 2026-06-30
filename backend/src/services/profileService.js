const { query, withTransaction } = require('../database/client');
const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const PROFILE_UPDATE_ACTION = 'profile.update';
const ALLOWED_UPDATE_FIELDS = new Set(['full_name', 'phone']);
const FORBIDDEN_UPDATE_FIELDS = [
  'avatar_url',
  'deleted_at',
  'email',
  'email_verified_at',
  'is_system_protected',
  'last_login_at',
  'password_hash',
  'role_id',
  'status',
  'user_id',
];

const createNotFoundError = (message = 'User not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const createForbiddenError = (message) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const createValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const mapCurrentProfile = (row) => ({
  avatar_url: row.avatar_url,
  created_at: row.created_at?.toISOString?.() || row.created_at,
  email: row.email,
  email_verified_at:
    row.email_verified_at?.toISOString?.() || row.email_verified_at,
  full_name: row.full_name,
  id: row.id,
  last_login_at: row.last_login_at?.toISOString?.() || row.last_login_at,
  permissions: row.permissions || [],
  phone: row.phone,
  role: {
    code: row.role_code,
    name: row.role_name,
  },
  status: row.status,
  updated_at: row.updated_at?.toISOString?.() || row.updated_at,
});

const trimToNull = (value) => {
  if (value == null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || null;
};

const normalizeUpdateProfilePayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const providedKeys = Object.keys(normalizedPayload);
  const disallowedKeys = providedKeys.filter(
    (key) => !ALLOWED_UPDATE_FIELDS.has(key),
  );
  const hasFullName = Object.prototype.hasOwnProperty.call(
    normalizedPayload,
    'full_name',
  );
  const hasPhone = Object.prototype.hasOwnProperty.call(
    normalizedPayload,
    'phone',
  );

  for (const field of disallowedKeys) {
    const isExplicitlyForbidden = FORBIDDEN_UPDATE_FIELDS.includes(field);

    details.push({
      field,
      message: isExplicitlyForbidden
        ? `${field} is not allowed in PATCH /me`
        : `${field} is not allowed`,
    });
  }

  if (!hasFullName && !hasPhone) {
    details.push({
      field: 'body',
      message: 'At least one of full_name or phone is required',
    });
  }

  let fullName;

  if (hasFullName) {
    fullName = String(normalizedPayload.full_name || '').trim();

    if (!fullName) {
      details.push({
        field: 'full_name',
        message: 'full_name must not be empty',
      });
    } else if (fullName.length > 150) {
      details.push({
        field: 'full_name',
        message: 'full_name must be at most 150 characters',
      });
    }
  }

  let phone;

  if (hasPhone) {
    phone = trimToNull(normalizedPayload.phone);

    if (phone && phone.length > 20) {
      details.push({
        field: 'phone',
        message: 'phone must be at most 20 characters',
      });
    }
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    changedFields: [
      ...(hasFullName ? ['full_name'] : []),
      ...(hasPhone ? ['phone'] : []),
    ],
    fullName,
    hasFullName,
    hasPhone,
    phone,
  };
};

const loadCurrentProfileRow = async (queryExecutor, userId) => {
  const result = await queryExecutor(
    `
      SELECT
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.avatar_url,
        u.status,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.deleted_at,
        r.code AS role_code,
        r.name AS role_name,
        COALESCE(
          array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL),
          '{}'
        ) AS permissions
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = $1
      GROUP BY
        u.id,
        u.email,
        u.full_name,
        u.phone,
        u.avatar_url,
        u.status,
        u.email_verified_at,
        u.last_login_at,
        u.created_at,
        u.updated_at,
        u.deleted_at,
        r.code,
        r.name
      LIMIT 1
    `,
    [userId],
  );

  return result.rows[0] || null;
};

const loadEditableUser = async (client, userId) => {
  const result = await client.query(
    `
      SELECT
        id,
        full_name,
        phone,
        status,
        deleted_at
      FROM users
      WHERE id = $1
      LIMIT 1
      FOR UPDATE
    `,
    [userId],
  );

  return result.rows[0] || null;
};

const ensureCurrentUserCanAccessProfile = (currentUser, action) => {
  if (!currentUser) {
    throw createNotFoundError();
  }

  if (currentUser.deleted_at != null) {
    throw createForbiddenError(
      `Deleted account is not allowed to ${action} profile`,
    );
  }

  if (currentUser.status !== USER_STATUS.ACTIVE) {
    throw createForbiddenError(
      `Account with status ${currentUser.status} is not allowed to ${action} profile`,
    );
  }
};

const insertProfileUpdateLog = async (
  client,
  {
    changedFields,
    createdAt,
    ipAddress,
    userAgent,
    userId,
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
      userId,
      PROFILE_UPDATE_ACTION,
      'users',
      userId,
      ipAddress || null,
      trimToNull(userAgent),
      JSON.stringify({
        changed_fields: changedFields,
      }),
      createdAt,
    ],
  );

const createProfileService = ({
  now = () => new Date(),
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getCurrentProfile = async ({ userId }) => {
    const currentUser = await loadCurrentProfileRow(queryImpl, userId);

    ensureCurrentUserCanAccessProfile(currentUser, 'view');

    return mapCurrentProfile(currentUser);
  };

  const updateCurrentProfile = async ({ payload, userId, ipAddress, userAgent }) => {
    const input = normalizeUpdateProfilePayload(payload);

    return withTransactionImpl(async (client) => {
      const currentUser = await loadEditableUser(client, userId);

      ensureCurrentUserCanAccessProfile(currentUser, 'update');

      const setClauses = [];
      const params = [userId];
      let parameterIndex = 2;

      if (input.hasFullName) {
        setClauses.push(`full_name = $${parameterIndex}`);
        params.push(input.fullName);
        parameterIndex += 1;
      }

      if (input.hasPhone) {
        setClauses.push(`phone = $${parameterIndex}`);
        params.push(input.phone);
        parameterIndex += 1;
      }

      const updatedAt = now();
      setClauses.push(`updated_at = $${parameterIndex}`);
      params.push(updatedAt);

      await client.query(
        `
          UPDATE users
          SET ${setClauses.join(', ')}
          WHERE id = $1
        `,
        params,
      );

      await insertProfileUpdateLog(client, {
        changedFields: input.changedFields,
        createdAt: updatedAt,
        ipAddress,
        userAgent,
        userId,
      });

      const updatedProfile = await loadCurrentProfileRow(
        client.query.bind(client),
        userId,
      );

      ensureCurrentUserCanAccessProfile(updatedProfile, 'view');

      return mapCurrentProfile(updatedProfile);
    });
  };

  return {
    getCurrentProfile,
    updateCurrentProfile,
  };
};

module.exports = createProfileService();
module.exports.PROFILE_UPDATE_ACTION = PROFILE_UPDATE_ACTION;
module.exports.createProfileService = createProfileService;
module.exports.normalizeUpdateProfilePayload = normalizeUpdateProfilePayload;
