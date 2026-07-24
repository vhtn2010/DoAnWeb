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
const ACCOUNT_DEACTIVATION_REQUEST_ACTION = 'account.deactivation_requested';
const VOUCHER_SAVE_ACTION = 'customer.voucher.save';
const MAX_VOUCHER_CODE_LENGTH = 50;
const VOUCHER_CODE_PATTERN = /^[A-Z0-9_-]{3,50}$/;
const ALLOWED_UPDATE_FIELDS = new Set(['current_password', 'full_name', 'phone']);
const ALLOWED_AVATAR_FIELDS = new Set(['avatar_url']);
const ALLOWED_PASSWORD_FIELDS = new Set(['current_password', 'new_password']);
const CURRENT_USER_VOUCHER_EXCLUDED_BOOKING_STATUSES = [
  'cancelled',
  'failed',
  'expired',
];
const LOG_METADATA_SENSITIVE_KEYS = new Set([
  'access_token',
  'authorization',
  'change_email_token',
  'current_password',
  'email_verification_token',
  'new_password',
  'password',
  'password_hash',
  'refresh_token',
  'refresh_token_hash',
  'reset_password_token',
  'secret',
  'token',
  'verification_token',
  'verification_token_hash',
]);
const DEFAULT_LOGS_PAGE = 1;
const DEFAULT_LOGS_LIMIT = 20;
const MAX_LOGS_LIMIT = 100;
const CUSTOMER_VISIBLE_LOG_ACTIONS = [
  'auth.change_email_confirmed',
  'auth.change_email_requested',
  'auth.reset_password',
  'auth.verify_email',
  'customer.booking.checkout',
  'customer.booking.contact_update',
  'payment.direct.confirm',
  'profile.avatar_update',
  'profile.change_password',
  'profile.update',
  'account.deactivation_requested',
  'admin.booking.confirm',
  'admin.booking.complete',
  'admin.booking.status_override',
];
const MAX_DEACTIVATION_REASON_LENGTH = 500;
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

const createVoucherError = (code, message) =>
  new AppError(message, {
    code,
    statusCode: 400,
  });

const normalizeSaveVoucherPayload = (payload = {}) => {
  const body = payload && typeof payload === 'object' && !Array.isArray(payload)
    ? payload
    : {};
  const code = typeof body.code === 'string'
    ? body.code.trim().toUpperCase()
    : '';

  if (!code || code.length > MAX_VOUCHER_CODE_LENGTH || !VOUCHER_CODE_PATTERN.test(code)) {
    throw createValidationError([
      {
        field: 'code',
        message: 'code must contain 3-50 uppercase letters, numbers, hyphens, or underscores',
      },
    ]);
  }

  return { code };
};

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

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

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

const maskSensitiveMetadata = (value) => {
  if (Array.isArray(value)) {
    return value.map(maskSensitiveMetadata);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        LOG_METADATA_SENSITIVE_KEYS.has(key)
          ? '[REDACTED]'
          : maskSensitiveMetadata(nestedValue),
      ]),
    );
  }

  return value;
};

const mapUserLogRow = (row) => ({
  action: row.action,
  created_at: row.created_at?.toISOString?.() || row.created_at,
  entity_id: row.entity_id,
  entity_name: row.entity_name,
  id: row.id,
  ip_address: row.ip_address,
  metadata: maskSensitiveMetadata(row.metadata || null),
  user_agent: row.user_agent,
});

const isDateWithinWindow = (value, currentTime) => {
  if (!value) {
    return false;
  }

  return currentTime <= new Date(value);
};

const formatVoucherTitle = (voucher) => {
  const promotionName = trimToNull(voucher.promotion_name);
  const discountValue = Number(voucher.discount_value || 0);

  if (promotionName) {
    return promotionName;
  }

  if (voucher.discount_type === 'percent') {
    return `Giảm ${discountValue}%`;
  }

  return `Giảm ${roundMoney(discountValue)}`;
};

const mapCurrentUserVoucherRow = (row, currentTime) => {
  const userUsageCount = Number(row.user_usage_count || 0);
  const totalUsageReached =
    row.usage_limit_total != null &&
    Number(row.used_count || 0) >= Number(row.usage_limit_total);
  const userUsageReached =
    row.usage_limit_per_user != null &&
    userUsageCount >= Number(row.usage_limit_per_user);
  const promotionActive =
    row.promotion_status === 'active' &&
    currentTime >= new Date(row.promotion_valid_from) &&
    isDateWithinWindow(row.promotion_valid_to, currentTime);
  const voucherActive =
    row.voucher_status === 'active' &&
    currentTime >= new Date(row.voucher_valid_from) &&
    isDateWithinWindow(row.voucher_valid_to, currentTime);
  const isActiveForCurrentUser =
    promotionActive &&
    voucherActive &&
    !totalUsageReached &&
    !userUsageReached;
  const status = isActiveForCurrentUser
    ? 'active'
    : userUsageCount > 0
      ? 'used'
      : 'expired';

  return {
    code: row.code,
    description:
      trimToNull(row.promotion_description) ||
      'Ưu đãi đang được áp dụng cho các dịch vụ phù hợp trên hệ thống.',
    discount_type: row.discount_type,
    discount_value: Number(row.discount_value),
    id: row.id,
    max_discount_amount:
      row.max_discount_amount == null
        ? null
        : Number(row.max_discount_amount),
    min_order_amount: Number(row.min_order_amount || 0),
    promotion: {
      id: row.promotion_id,
      name: trimToNull(row.promotion_name) || 'Ưu đãi hệ thống',
      status: row.promotion_status,
    },
    status,
    target_service_type: row.target_service_type || null,
    title: formatVoucherTitle(row),
    usage_limit_per_user: Number(row.usage_limit_per_user || 0),
    usage_limit_total:
      row.usage_limit_total == null ? null : Number(row.usage_limit_total),
    used_at: row.last_used_at?.toISOString?.() || row.last_used_at || null,
    user_usage_count: userUsageCount,
    valid_from:
      row.voucher_valid_from?.toISOString?.() || row.voucher_valid_from || null,
    valid_to:
      row.voucher_valid_to?.toISOString?.() || row.voucher_valid_to || null,
  };
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

const normalizeLogsQuery = (query = {}) => {
  const normalizedQuery =
    query && typeof query === 'object' && !Array.isArray(query) ? query : {};
  const details = [];
  const rawPage = parsePositiveInteger(normalizedQuery.page);
  const rawLimit = parsePositiveInteger(normalizedQuery.limit);

  if (Number.isNaN(rawPage) || (rawPage != null && rawPage < 1)) {
    details.push({
      field: 'page',
      message: 'page must be an integer greater than or equal to 1',
    });
  }

  if (
    Number.isNaN(rawLimit) ||
    (rawLimit != null && (rawLimit < 1 || rawLimit > MAX_LOGS_LIMIT))
  ) {
    details.push({
      field: 'limit',
      message: `limit must be an integer between 1 and ${MAX_LOGS_LIMIT}`,
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    limit: rawLimit ?? DEFAULT_LOGS_LIMIT,
    page: rawPage ?? DEFAULT_LOGS_PAGE,
  };
};

const normalizeAccountDeactivationPayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const reason = trimToNull(normalizedPayload.reason);
  const details = [];

  if (!Object.prototype.hasOwnProperty.call(normalizedPayload, 'reason')) {
    details.push({
      field: 'reason',
      message: 'reason is required',
    });
  } else if (!reason) {
    details.push({
      field: 'reason',
      message: 'reason must not be empty',
    });
  } else if (reason.length > MAX_DEACTIVATION_REASON_LENGTH) {
    details.push({
      field: 'reason',
      message: `reason must be at most ${MAX_DEACTIVATION_REASON_LENGTH} characters`,
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    reason,
  };
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
  const hasCurrentPassword = Object.prototype.hasOwnProperty.call(
    normalizedPayload,
    'current_password',
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
  const currentPassword = hasCurrentPassword
    ? String(normalizedPayload.current_password || '')
    : '';

  if (hasPhone) {
    phone = trimToNull(normalizedPayload.phone);

    if (phone && phone.length > 20) {
      details.push({
        field: 'phone',
        message: 'phone must be at most 20 characters',
      });
    }

  }

  if ((hasFullName || hasPhone) && !currentPassword) {
    details.push({
      field: 'current_password',
      message: 'current_password is required when updating profile',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    changedFields: [
      ...(hasFullName ? ['full_name'] : []),
      ...(hasPhone ? ['phone'] : []),
    ],
    currentPassword,
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

const loadCurrentUserState = async (queryExecutor, userId) => {
  const result = await queryExecutor(
    `
      SELECT
        id,
        status,
        deleted_at
      FROM users
      WHERE id = $1
      LIMIT 1
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

const ensureCurrentUserIsActive = (currentUser, action) => {
  ensureCurrentUserCanAccessProfile(currentUser, action);
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

const findPendingDeactivationRequest = async (client, userId) => {
  const result = await client.query(
    `
      SELECT id
      FROM user_logs
      WHERE user_id = $1
        AND action = $2
        AND metadata ->> 'request_status' = 'requested'
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId, ACCOUNT_DEACTIVATION_REQUEST_ACTION],
  );

  return result.rows[0] || null;
};

const listCurrentUserVoucherRows = async (queryExecutor, userId, currentTime) => {
  const result = await queryExecutor(
    `
      WITH user_voucher_usage AS (
        SELECT
          b.voucher_id,
          COUNT(*)::int AS usage_count,
          MAX(b.created_at) AS last_used_at
        FROM bookings b
        WHERE b.user_id = $1
          AND b.voucher_id IS NOT NULL
          AND b.status::text <> ALL($2::text[])
        GROUP BY b.voucher_id
      )
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
        v.status AS voucher_status,
        v.valid_from AS voucher_valid_from,
        v.valid_to AS voucher_valid_to,
        p.name AS promotion_name,
        p.description AS promotion_description,
        p.status AS promotion_status,
        p.valid_from AS promotion_valid_from,
        p.valid_to AS promotion_valid_to,
        p.target_service_type,
        COALESCE(uvu.usage_count, 0) AS user_usage_count,
        uvu.last_used_at
      FROM vouchers v
      INNER JOIN promotions p
        ON p.id = v.promotion_id
      LEFT JOIN user_voucher_usage uvu
        ON uvu.voucher_id = v.id
      LEFT JOIN user_saved_vouchers usv
        ON usv.voucher_id = v.id
        AND usv.user_id = $1
      WHERE usv.user_id IS NOT NULL
        OR COALESCE(uvu.usage_count, 0) > 0
      ORDER BY
        CASE
          WHEN (
            p.status = 'active'
            AND v.status = 'active'
            AND p.valid_from <= $3
            AND p.valid_to >= $3
            AND v.valid_from <= $3
            AND v.valid_to >= $3
            AND COALESCE(uvu.usage_count, 0) < v.usage_limit_per_user
            AND (
              v.usage_limit_total IS NULL
              OR v.used_count < v.usage_limit_total
            )
          ) THEN 0
          ELSE 1
        END ASC,
        COALESCE(uvu.last_used_at, usv.saved_at, LEAST(v.valid_to, p.valid_to)) DESC,
        v.created_at DESC,
        v.id ASC
    `,
    [
      userId,
      CURRENT_USER_VOUCHER_EXCLUDED_BOOKING_STATUSES,
      currentTime,
    ],
  );

  return result.rows;
};

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

  const getCurrentUserLogs = async ({ query, userId }) => {
    const currentUser = await loadCurrentUserState(queryImpl, userId);

    ensureCurrentUserIsActive(currentUser, 'view');
    const pagination = normalizeLogsQuery(query);
    const offset = (pagination.page - 1) * pagination.limit;
    const countResult = await queryImpl(
      `
        SELECT COUNT(*)::integer AS total
        FROM user_logs
        WHERE user_id = $1
          AND action = ANY($2::text[])
      `,
      [userId, CUSTOMER_VISIBLE_LOG_ACTIONS],
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
          AND action = ANY($2::text[])
        ORDER BY created_at DESC
        LIMIT $3
        OFFSET $4
      `,
      [userId, CUSTOMER_VISIBLE_LOG_ACTIONS, pagination.limit, offset],
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

  const getCurrentUserVouchers = async ({ userId }) => {
    const currentUser = await loadCurrentUserState(queryImpl, userId);

    ensureCurrentUserIsActive(currentUser, 'view');
    const currentTime = now();
    const rows = await listCurrentUserVoucherRows(queryImpl, userId, currentTime);

    return rows.map((row) => mapCurrentUserVoucherRow(row, currentTime));
  };

  const saveCurrentUserVoucher = async ({
    ipAddress,
    payload,
    userAgent,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const queryExecutor = client.query.bind(client);
      const currentUser = await loadCurrentUserState(queryExecutor, userId);

      ensureCurrentUserIsActive(currentUser, 'save voucher');

      const { code } = normalizeSaveVoucherPayload(payload);
      const currentTime = now();
      const voucherResult = await queryExecutor(
        `
          SELECT
            v.id,
            v.status AS voucher_status,
            v.valid_from AS voucher_valid_from,
            v.valid_to AS voucher_valid_to,
            p.status AS promotion_status,
            p.valid_from AS promotion_valid_from,
            p.valid_to AS promotion_valid_to
          FROM vouchers v
          INNER JOIN promotions p ON p.id = v.promotion_id
          WHERE UPPER(TRIM(v.code)) = $1
          LIMIT 1
        `,
        [code],
      );
      const voucher = voucherResult.rows[0] || null;

      if (!voucher) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Voucher is invalid',
        );
      }

      const voucherExpired =
        voucher.voucher_status === 'expired' ||
        currentTime > new Date(voucher.voucher_valid_to) ||
        voucher.promotion_status === 'expired' ||
        currentTime > new Date(voucher.promotion_valid_to);

      if (voucherExpired) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_EXPIRED,
          'Voucher is expired',
        );
      }

      if (voucher.voucher_status !== 'active' || voucher.promotion_status !== 'active') {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Voucher is invalid',
        );
      }

      if (
        currentTime < new Date(voucher.voucher_valid_from) ||
        currentTime < new Date(voucher.promotion_valid_from)
      ) {
        throw createVoucherError(
          API_ERROR_CODES.VOUCHER_INVALID,
          'Voucher is not active yet',
        );
      }

      const savedResult = await queryExecutor(
        `
          INSERT INTO user_saved_vouchers (user_id, voucher_id, saved_at)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, voucher_id) DO NOTHING
          RETURNING voucher_id
        `,
        [userId, voucher.id, currentTime],
      );

      await insertProfileUpdateLog(client, {
        action: VOUCHER_SAVE_ACTION,
        createdAt: currentTime,
        ipAddress,
        metadata: {
          code,
          idempotent: savedResult.rowCount === 0,
          voucher_id: voucher.id,
        },
        userAgent,
        userId,
      });

      const rows = await listCurrentUserVoucherRows(
        queryExecutor,
        userId,
        currentTime,
      );
      const savedVoucher = rows.find((row) => row.id === voucher.id);

      return mapCurrentUserVoucherRow(savedVoucher, currentTime);
    });

  const updateCurrentProfile = async ({ payload, userId, ipAddress, userAgent }) => {
    return withTransactionImpl(async (client) => {
      const currentUser = await loadEditableUser(client, userId);

      ensureCurrentUserCanAccessProfile(currentUser, 'update');
      const input = normalizeUpdateProfilePayload(payload);

      if (input.hasFullName || input.hasPhone) {
        const isCurrentPasswordValid = await bcryptCompareImpl(
          input.currentPassword,
          currentUser.password_hash,
        );

        if (!isCurrentPasswordValid) {
          throw createInvalidCredentialsError();
        }
      }

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

  const requestAccountDeactivation = async ({
    payload,
    roleCode,
    userId,
    ipAddress,
    userAgent,
  }) => {
    if (roleCode !== 'customer') {
      throw createForbiddenError(
        'Only customer accounts can request account deactivation',
      );
    }

    return withTransactionImpl(async (client) => {
      const currentUser = await loadEditableUser(client, userId);

      ensureCurrentUserIsActive(currentUser, 'request account deactivation');
      const input = normalizeAccountDeactivationPayload(payload);
      const existingRequest = await findPendingDeactivationRequest(client, userId);

      if (existingRequest) {
        throw new AppError('An account deactivation request is already pending', {
          code: API_ERROR_CODES.DUPLICATE_RESOURCE,
          statusCode: 409,
        });
      }

      const requestedAt = now();

      await insertProfileUpdateLog(client, {
        action: ACCOUNT_DEACTIVATION_REQUEST_ACTION,
        createdAt: requestedAt,
        ipAddress,
        metadata: {
          reason: input.reason,
          request_status: 'requested',
        },
        userAgent,
        userId,
      });

      return {
        request_status: 'requested',
      };
    });
  };

  return {
    getCurrentProfile,
    getCurrentUserLogs,
    getCurrentUserVouchers,
    saveCurrentUserVoucher,
    requestAccountDeactivation,
    updateCurrentAvatar,
    updateCurrentPassword,
    updateCurrentProfile,
  };
};

module.exports = createProfileService();
module.exports.PROFILE_AVATAR_UPDATE_ACTION = PROFILE_AVATAR_UPDATE_ACTION;
module.exports.ACCOUNT_DEACTIVATION_REQUEST_ACTION =
  ACCOUNT_DEACTIVATION_REQUEST_ACTION;
module.exports.PROFILE_CHANGE_PASSWORD_ACTION = PROFILE_CHANGE_PASSWORD_ACTION;
module.exports.PROFILE_UPDATE_ACTION = PROFILE_UPDATE_ACTION;
module.exports.createProfileService = createProfileService;
module.exports.maskSensitiveMetadata = maskSensitiveMetadata;
module.exports.mapUserLogRow = mapUserLogRow;
module.exports.normalizeAccountDeactivationPayload =
  normalizeAccountDeactivationPayload;
module.exports.normalizeAvatarUpdatePayload = normalizeAvatarUpdatePayload;
module.exports.normalizeLogsQuery = normalizeLogsQuery;
module.exports.normalizePasswordChangePayload = normalizePasswordChangePayload;
module.exports.normalizeUpdateProfilePayload = normalizeUpdateProfilePayload;
