const bcrypt = require('bcryptjs');
const { passwordHash } = require('../config/auth');
const { query, withTransaction } = require('../database/client');
const { cloudinary } = require('../config/cloudinary');
const {
  API_ERROR_CODES,
  USER_STATUS,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const PROFILE_AVATAR_UPDATE_ACTION = 'profile.avatar_update';
const PROFILE_CHANGE_PASSWORD_ACTION = 'profile.change_password';
const PROFILE_UPDATE_ACTION = 'profile.update';
const ALLOWED_UPDATE_FIELDS = new Set(['full_name', 'phone']);
const ALLOWED_AVATAR_FIELDS = new Set(['avatar_url']);
const ALLOWED_PASSWORD_FIELDS = new Set(['current_password', 'new_password']);
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
const FORBIDDEN_AVATAR_FIELDS = [
  'deleted_at',
  'email',
  'email_verified_at',
  'full_name',
  'is_system_protected',
  'last_login_at',
  'password_hash',
  'phone',
  'role_id',
  'status',
  'user_id',
];
const FORBIDDEN_PASSWORD_FIELDS = [
  'avatar_url',
  'deleted_at',
  'email',
  'email_verified_at',
  'full_name',
  'is_system_protected',
  'last_login_at',
  'password_hash',
  'phone',
  'role_id',
  'status',
  'user_id',
];
const MIN_PASSWORD_LENGTH = 8;

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

const createInvalidCredentialsError = () =>
  new AppError('Current password is incorrect', {
    code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    statusCode: 401,
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

const buildDisallowedFieldDetails = (
  fields,
  {
    explicitlyForbiddenFields,
    scopeLabel,
  },
) =>
  fields.map((field) => ({
    field,
    message: explicitlyForbiddenFields.includes(field)
      ? `${field} is not allowed in ${scopeLabel}`
      : `${field} is not allowed`,
  }));

const parseHttpUrl = (value) => {
  try {
    const parsedUrl = new URL(value);

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Invalid protocol');
    }

    return parsedUrl;
  } catch (error) {
    return null;
  }
};

const isAllowedAvatarUrl = (value) => {
  const parsedUrl = parseHttpUrl(value);

  if (!parsedUrl) {
    return false;
  }

  if (parsedUrl.hostname !== 'res.cloudinary.com') {
    return false;
  }

  const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

  if (pathSegments.length < 4) {
    return false;
  }

  if (
    cloudinary.cloudName &&
    pathSegments[0] !== cloudinary.cloudName
  ) {
    return false;
  }

  return pathSegments[1] === 'image' && pathSegments[2] === 'upload';
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
    details.push(
      ...buildDisallowedFieldDetails([field], {
        explicitlyForbiddenFields: FORBIDDEN_UPDATE_FIELDS,
        scopeLabel: 'PATCH /me',
      }),
    );
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

const normalizeAvatarUpdatePayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const providedKeys = Object.keys(normalizedPayload);
  const disallowedKeys = providedKeys.filter(
    (key) => !ALLOWED_AVATAR_FIELDS.has(key),
  );
  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(
    normalizedPayload,
    'avatar_url',
  );

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        explicitlyForbiddenFields: FORBIDDEN_AVATAR_FIELDS,
        scopeLabel: 'PATCH /me/avatar',
      }),
    );
  }

  if (!hasAvatarUrl) {
    details.push({
      field: 'avatar_url',
      message: 'avatar_url is required',
    });
  }

  const avatarUrl = hasAvatarUrl
    ? String(normalizedPayload.avatar_url || '').trim()
    : null;

  if (hasAvatarUrl && !avatarUrl) {
    details.push({
      field: 'avatar_url',
      message: 'avatar_url is required',
    });
  } else if (hasAvatarUrl && !parseHttpUrl(avatarUrl)) {
    details.push({
      field: 'avatar_url',
      message: 'avatar_url must be a valid http or https URL',
    });
  } else if (hasAvatarUrl && !isAllowedAvatarUrl(avatarUrl)) {
    details.push({
      field: 'avatar_url',
      message: 'avatar_url must be a valid Cloudinary delivery URL',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    avatarUrl,
  };
};

const normalizePasswordChangePayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const providedKeys = Object.keys(normalizedPayload);
  const disallowedKeys = providedKeys.filter(
    (key) => !ALLOWED_PASSWORD_FIELDS.has(key),
  );
  const hasCurrentPassword = Object.prototype.hasOwnProperty.call(
    normalizedPayload,
    'current_password',
  );
  const hasNewPassword = Object.prototype.hasOwnProperty.call(
    normalizedPayload,
    'new_password',
  );
  const currentPassword = hasCurrentPassword
    ? String(normalizedPayload.current_password || '')
    : '';
  const newPassword = hasNewPassword
    ? String(normalizedPayload.new_password || '')
    : '';

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        explicitlyForbiddenFields: FORBIDDEN_PASSWORD_FIELDS,
        scopeLabel: 'PATCH /me/password',
      }),
    );
  }

  if (!hasCurrentPassword || !currentPassword) {
    details.push({
      field: 'current_password',
      message: 'current_password is required',
    });
  }

  if (!hasNewPassword || !newPassword) {
    details.push({
      field: 'new_password',
      message: 'new_password is required',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    currentPassword,
    newPassword,
  };
};

const validateNewPasswordPolicy = ({
  currentPassword,
  newPassword,
}) => {
  const details = [];

  if (newPassword === currentPassword) {
    details.push({
      field: 'new_password',
      message: 'new_password must be different from current_password',
    });
  }

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: 'new_password',
      message: `new_password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  if (!/[a-z]/.test(newPassword)) {
    details.push({
      field: 'new_password',
      message: 'new_password must include at least one lowercase letter',
    });
  }

  if (!/[A-Z]/.test(newPassword)) {
    details.push({
      field: 'new_password',
      message: 'new_password must include at least one uppercase letter',
    });
  }

  if (!/\d/.test(newPassword)) {
    details.push({
      field: 'new_password',
      message: 'new_password must include at least one number',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }
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
        password_hash,
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
    action = PROFILE_UPDATE_ACTION,
    changedFields,
    createdAt,
    ipAddress,
    metadata,
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
      action,
      'users',
      userId,
      ipAddress || null,
      trimToNull(userAgent),
      JSON.stringify(
        metadata || {
          changed_fields: changedFields,
        },
      ),
      createdAt,
    ],
  );

const createProfileService = ({
  bcryptCompareImpl = bcrypt.compare,
  bcryptHashImpl = bcrypt.hash,
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
    return withTransactionImpl(async (client) => {
      const currentUser = await loadEditableUser(client, userId);

      ensureCurrentUserCanAccessProfile(currentUser, 'update');
      const input = normalizeUpdateProfilePayload(payload);

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

  const updateCurrentAvatar = async ({ payload, userId, ipAddress, userAgent }) =>
    withTransactionImpl(async (client) => {
      const currentUser = await loadEditableUser(client, userId);

      ensureCurrentUserCanAccessProfile(currentUser, 'update');
      const input = normalizeAvatarUpdatePayload(payload);
      const updatedAt = now();

      await client.query(
        `
          UPDATE users
          SET
            avatar_url = $2,
            updated_at = $3
          WHERE id = $1
        `,
        [userId, input.avatarUrl, updatedAt],
      );

      await insertProfileUpdateLog(client, {
        action: PROFILE_AVATAR_UPDATE_ACTION,
        createdAt: updatedAt,
        ipAddress,
        metadata: {
          avatar_changed: true,
        },
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

  const updateCurrentPassword = async ({
    payload,
    userId,
    ipAddress,
    userAgent,
  }) =>
    withTransactionImpl(async (client) => {
      const currentUser = await loadEditableUser(client, userId);

      ensureCurrentUserCanAccessProfile(currentUser, 'update');
      const input = normalizePasswordChangePayload(payload);
      const isCurrentPasswordValid = await bcryptCompareImpl(
        input.currentPassword,
        currentUser.password_hash,
      );

      if (!isCurrentPasswordValid) {
        throw createInvalidCredentialsError();
      }

      validateNewPasswordPolicy(input);

      const updatedAt = now();
      const newPasswordHash = await bcryptHashImpl(
        input.newPassword,
        passwordHash.bcryptSaltRounds,
      );

      await client.query(
        `
          UPDATE users
          SET
            password_hash = $2,
            updated_at = $3
          WHERE id = $1
        `,
        [userId, newPasswordHash, updatedAt],
      );

      await insertProfileUpdateLog(client, {
        action: PROFILE_CHANGE_PASSWORD_ACTION,
        createdAt: updatedAt,
        ipAddress,
        metadata: {
          password_changed: true,
          sessions_revoked: false,
        },
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

  return {
    getCurrentProfile,
    updateCurrentAvatar,
    updateCurrentPassword,
    updateCurrentProfile,
  };
};

module.exports = createProfileService();
module.exports.PROFILE_AVATAR_UPDATE_ACTION = PROFILE_AVATAR_UPDATE_ACTION;
module.exports.PROFILE_CHANGE_PASSWORD_ACTION = PROFILE_CHANGE_PASSWORD_ACTION;
module.exports.PROFILE_UPDATE_ACTION = PROFILE_UPDATE_ACTION;
module.exports.createProfileService = createProfileService;
module.exports.normalizeAvatarUpdatePayload = normalizeAvatarUpdatePayload;
module.exports.normalizePasswordChangePayload = normalizePasswordChangePayload;
module.exports.normalizeUpdateProfilePayload = normalizeUpdateProfilePayload;
