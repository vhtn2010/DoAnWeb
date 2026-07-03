const bcrypt = require('bcryptjs');
const { apiPrefix, backendUrl, frontendUrl } = require('../config');
const { passwordHash, emailVerification } = require('../config/auth');
const { query, withTransaction } = require('../database/client');
const {
  API_ERROR_CODES,
  DOMAIN_CONSTRAINTS,
  EMAIL_STATUS,
  USER_STATUS,
  USER_STATUS_VALUES,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');
const {
  AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
  buildVerificationEmail,
  MIN_PASSWORD_LENGTH,
} = require('./authService');
const { mapUserLogRow } = require('./profileService');
const {
  createEmailVerificationToken,
  hashEmailVerificationToken,
} = require('../utils/emailVerificationToken');
const { sendEmail } = require('./sendgridService');

const ADMIN_ALLOWED_ROLE_CODES = new Set(['admin', 'system_admin']);
const ADMIN_USER_CREATE_ACTION = 'admin.user.create';
const ADMIN_USER_CHANGE_STATUS_ACTION = 'admin.user.change_status';
const ADMIN_USER_CHANGE_ROLE_ACTION = 'admin.user.change_role';
const ADMIN_USER_SOFT_DELETE_ACTION = 'admin.user.soft_delete';
const ADMIN_USER_RESEND_VERIFICATION_ACTION =
  'admin.user.resend_verification_email';
const ADMIN_USER_UPDATE_PROFILE_ACTION = 'admin.user.update_profile';
const ADMIN_USER_VERIFY_EMAIL_TEMPLATE_CODE = 'ADMIN_USER_VERIFY_EMAIL';
const ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE =
  AUTH_RESEND_VERIFY_EMAIL_TEMPLATE_CODE;
const CUSTOMER_ROLE_CODE = 'customer';
const SYSTEM_ADMIN_ROLE_CODE = 'system_admin';
const EMAIL_ADDRESS_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const STATUS_CHANGEABLE_VALUES = ['locked', 'suspended', 'disabled', 'active', 'deleted'];
const ALLOWED_CREATE_FIELDS = new Set([
  'email',
  'password',
  'full_name',
  'phone',
  'role_code',
]);
const ALLOWED_UPDATE_FIELDS = new Set(['full_name', 'phone', 'avatar_url']);
const FORBIDDEN_CREATE_FIELDS = [
  'avatar_url',
  'created_at',
  'deleted_at',
  'email_verified_at',
  'is_system_protected',
  'last_login_at',
  'password_hash',
  'role_id',
  'status',
  'updated_at',
];
const FORBIDDEN_UPDATE_FIELDS = [
  'created_at',
  'deleted_at',
  'email',
  'email_verified_at',
  'is_system_protected',
  'last_login_at',
  'password',
  'password_hash',
  'role_code',
  'role_id',
  'status',
  'updated_at',
];
const FORBIDDEN_STATUS_FIELDS = [
  'deleted_at',
  'email',
  'email_verified_at',
  'full_name',
  'is_system_protected',
  'last_login_at',
  'password',
  'password_hash',
  'phone',
  'role_code',
  'role_id',
];
const FORBIDDEN_DELETE_FIELDS = [
  'status',
  'deleted_at',
  'email',
  'email_verified_at',
  'full_name',
  'is_system_protected',
  'last_login_at',
  'password',
  'password_hash',
  'phone',
  'role_code',
  'role_id',
];
const FORBIDDEN_ROLE_FIELDS = [
  'deleted_at',
  'email',
  'email_verified_at',
  'full_name',
  'is_system_protected',
  'last_login_at',
  'password',
  'password_hash',
  'phone',
  'status',
  'updated_at',
];
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

const createDuplicateEmailError = () =>
  new AppError('Email already exists', {
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    details: [
      {
        field: 'email',
        message: 'Email already exists',
      },
    ],
    statusCode: 409,
  });

const createForbiddenError = (message, details) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    details,
    statusCode: 403,
  });

const createInvalidStateTransitionError = (
  message = 'User is not in a state that allows verification email resend',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const createInternalError = (
  message = 'Unable to complete admin user request',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
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

const compactObject = (value) =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  );

const isUniqueViolation = (error) =>
  error?.code === '23505' || error?.constraint === 'users_email_key';

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

  return pathSegments.length >= 4 &&
    pathSegments[1] === 'image' &&
    pathSegments[2] === 'upload';
};

const normalizeRecipientEmail = (email) => {
  const normalizedEmail = trimToNull(email)?.toLowerCase();

  if (!normalizedEmail || !EMAIL_ADDRESS_REGEX.test(normalizedEmail)) {
    throw createValidationError([
      {
        field: 'email',
        message: 'email is invalid',
      },
    ]);
  }

  return normalizedEmail;
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

const normalizeCreateUserPayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const providedKeys = Object.keys(normalizedPayload);
  const disallowedKeys = providedKeys.filter(
    (key) => !ALLOWED_CREATE_FIELDS.has(key),
  );

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        explicitlyForbiddenFields: FORBIDDEN_CREATE_FIELDS,
        scopeLabel: 'POST /admin/users',
      }),
    );
  }

  const email = String(normalizedPayload.email || '').trim().toLowerCase();
  const password = String(normalizedPayload.password || '');
  const fullName = String(normalizedPayload.full_name || '').trim();
  const phone = trimToNull(normalizedPayload.phone);
  const roleCode = trimToNull(normalizedPayload.role_code);

  if (!email) {
    details.push({
      field: 'email',
      message: 'email is required',
    });
  } else if (!EMAIL_ADDRESS_REGEX.test(email)) {
    details.push({
      field: 'email',
      message: 'email is invalid',
    });
  }

  if (!password) {
    details.push({
      field: 'password',
      message: 'password is required',
    });
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: 'password',
      message: `password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  if (!fullName) {
    details.push({
      field: 'full_name',
      message: 'full_name is required',
    });
  } else if (fullName.length > 150) {
    details.push({
      field: 'full_name',
      message: 'full_name must be at most 150 characters',
    });
  }

  if (phone && phone.length > 20) {
    details.push({
      field: 'phone',
      message: 'phone must be at most 20 characters',
    });
  }

  if (!roleCode) {
    details.push({
      field: 'role_code',
      message: 'role_code is required',
    });
  } else if (!/^[a-z_]+$/.test(roleCode)) {
    details.push({
      field: 'role_code',
      message: 'role_code must be a valid lowercase snake_case role code',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    email,
    fullName,
    password,
    phone,
    roleCode,
  };
};

const normalizeUpdateUserPayload = (payload = {}) => {
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
  const hasAvatarUrl = Object.prototype.hasOwnProperty.call(
    normalizedPayload,
    'avatar_url',
  );

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        explicitlyForbiddenFields: FORBIDDEN_UPDATE_FIELDS,
        scopeLabel: 'PATCH /admin/users/{user_id}',
      }),
    );
  }

  if (!hasFullName && !hasPhone && !hasAvatarUrl) {
    details.push({
      field: 'body',
      message: 'At least one of full_name, phone, or avatar_url is required',
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

  let avatarUrl;

  if (hasAvatarUrl) {
    avatarUrl =
      normalizedPayload.avatar_url == null
        ? null
        : String(normalizedPayload.avatar_url).trim();

    if (avatarUrl && !parseHttpUrl(avatarUrl)) {
      details.push({
        field: 'avatar_url',
        message: 'avatar_url must be a valid http or https URL',
      });
    } else if (avatarUrl && !isAllowedAvatarUrl(avatarUrl)) {
      details.push({
        field: 'avatar_url',
        message: 'avatar_url must be a valid Cloudinary delivery URL',
      });
    }
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    avatarUrl,
    changedFields: [
      ...(hasFullName ? ['full_name'] : []),
      ...(hasPhone ? ['phone'] : []),
      ...(hasAvatarUrl ? ['avatar_url'] : []),
    ],
    fullName,
    hasAvatarUrl,
    hasFullName,
    hasPhone,
    phone,
  };
};

const normalizeStatusChangePayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const providedKeys = Object.keys(normalizedPayload);
  const allowedFields = new Set(['status', 'reason']);
  const disallowedKeys = providedKeys.filter((key) => !allowedFields.has(key));

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        explicitlyForbiddenFields: FORBIDDEN_STATUS_FIELDS,
        scopeLabel: 'PATCH /admin/users/{user_id}/status',
      }),
    );
  }

  const status = trimToNull(normalizedPayload.status);
  const reason = trimToNull(normalizedPayload.reason);

  if (!status) {
    details.push({
      field: 'status',
      message: 'status is required',
    });
  } else if (!STATUS_CHANGEABLE_VALUES.includes(status)) {
    details.push({
      field: 'status',
      message: `status must be one of: ${STATUS_CHANGEABLE_VALUES.join(', ')}`,
    });
  }

  if (
    ['locked', 'suspended', 'disabled', 'deleted'].includes(status) &&
    !reason
  ) {
    details.push({
      field: 'reason',
      message: 'reason is required for the requested status transition',
    });
  }

  if (reason && reason.length > 500) {
    details.push({
      field: 'reason',
      message: 'reason must be at most 500 characters',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    reason,
    status,
  };
};

const normalizeDeleteUserPayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const providedKeys = Object.keys(normalizedPayload);
  const allowedFields = new Set(['reason']);
  const disallowedKeys = providedKeys.filter((key) => !allowedFields.has(key));

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        explicitlyForbiddenFields: FORBIDDEN_DELETE_FIELDS,
        scopeLabel: 'DELETE /admin/users/{user_id}',
      }),
    );
  }

  const reason = trimToNull(normalizedPayload.reason);

  if (!reason) {
    details.push({
      field: 'reason',
      message: 'reason is required',
    });
  } else if (reason.length > 500) {
    details.push({
      field: 'reason',
      message: 'reason must be at most 500 characters',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    reason,
  };
};

const normalizeRoleAssignPayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const providedKeys = Object.keys(normalizedPayload);
  const allowedFields = new Set(['role_code']);
  const disallowedKeys = providedKeys.filter((key) => !allowedFields.has(key));

  if (disallowedKeys.length > 0) {
    details.push(
      ...buildDisallowedFieldDetails(disallowedKeys, {
        explicitlyForbiddenFields: FORBIDDEN_ROLE_FIELDS,
        scopeLabel: 'PATCH /admin/users/{user_id}/role',
      }),
    );
  }

  const roleCode = trimToNull(normalizedPayload.role_code);

  if (!roleCode) {
    details.push({
      field: 'role_code',
      message: 'role_code is required',
    });
  } else if (!/^[a-z_]+$/.test(roleCode)) {
    details.push({
      field: 'role_code',
      message: 'role_code must be a valid lowercase snake_case role code',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    roleCode,
  };
};

const buildVerificationLinks = (token) => {
  const normalizedFrontendUrl = frontendUrl.replace(/\/$/, '');
  const normalizedBackendUrl = backendUrl.replace(/\/$/, '');

  return {
    apiVerifyUrl: `${normalizedBackendUrl}${apiPrefix}/auth/verify-email`,
    verificationUrl: `${normalizedFrontendUrl}/verify-email?token=${encodeURIComponent(token)}`,
  };
};

const loadRoleByCode = async (queryExecutor, roleCode) => {
  const result = await queryExecutor(
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

const loadUserByEmail = async (queryExecutor, email) => {
  const result = await queryExecutor(
    `
      SELECT
        u.id,
        u.email
      FROM users u
      WHERE u.email = $1
      LIMIT 1
    `,
    [email],
  );

  return result.rows[0] || null;
};

const loadUserById = async (
  queryExecutor,
  userId,
  { forUpdate = false } = {},
) => {
  const result = await queryExecutor(
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
        u.is_system_protected,
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
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [userId],
  );

  return result.rows[0] || null;
};

const loadActorById = async (queryExecutor, actorUserId) => {
  const actor = await loadUserById(queryExecutor, actorUserId);

  if (!actor) {
    throw createNotFoundError('Authenticated admin user not found');
  }

  return actor;
};

const loadPermissionsByRoleId = async (queryExecutor, roleId) => {
  const result = await queryExecutor(
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

const insertUserLog = async (
  client,
  {
    action,
    createdAt,
    entityId,
    entityName = 'users',
    ipAddress,
    metadata,
    targetUserId,
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
      targetUserId || null,
      action,
      entityName,
      entityId || null,
      ipAddress || null,
      trimToNull(userAgent),
      metadata ? JSON.stringify(metadata) : null,
      createdAt,
    ],
  );

const queueEmailLog = async (
  client,
  {
    createdAt,
    subject,
    templateCode,
    toEmail,
    userId,
  },
) =>
  client.query(
    `
      INSERT INTO email_logs (
        user_id,
        booking_id,
        to_email,
        subject,
        template_code,
        status,
        provider,
        provider_message_id,
        error_message,
        sent_at,
        created_at
      )
      VALUES ($1, NULL, $2, $3, $4, $5, $6, NULL, NULL, NULL, $7)
      RETURNING id
    `,
    [
      userId,
      toEmail,
      subject,
      templateCode,
      EMAIL_STATUS.QUEUED,
      DOMAIN_CONSTRAINTS.emailProvider,
      createdAt,
    ],
  );

const markEmailLogSent = async (
  client,
  {
    emailLogId,
    messageId,
    sentAt,
  },
) =>
  client.query(
    `
      UPDATE email_logs
      SET
        status = $2,
        provider_message_id = $3,
        error_message = NULL,
        sent_at = $4
      WHERE id = $1
    `,
    [
      emailLogId,
      EMAIL_STATUS.SENT,
      messageId || null,
      sentAt,
    ],
  );

const ensureActorCanCreateRole = (actor, targetRole) => {
  if (targetRole.code === CUSTOMER_ROLE_CODE) {
    throw createForbiddenError(
      'Customer accounts must be created through the public auth registration flow',
    );
  }

  if (targetRole.code === SYSTEM_ADMIN_ROLE_CODE) {
    throw createForbiddenError(
      'system_admin accounts cannot be created through this API',
    );
  }

  if (actor.role_code === 'admin') {
    if (targetRole.code === 'admin') {
      throw createForbiddenError('Admin cannot create another admin user');
    }

    if (targetRole.level >= actor.role_level) {
      throw createForbiddenError(
        'Admin can only create users with a lower role level',
      );
    }
  }

  if (actor.role_code === 'system_admin' && targetRole.level >= actor.role_level) {
    throw createForbiddenError(
      'Target role level must be lower than the system admin actor',
    );
  }
};

const ensureActorCanUpdateTarget = (actor, targetUser) => {
  if (targetUser.deleted_at != null || targetUser.status === USER_STATUS.DELETED) {
    throw createForbiddenError('Deleted users cannot be updated');
  }

  if (actor.role_code === 'admin') {
    if (targetUser.role_code === SYSTEM_ADMIN_ROLE_CODE) {
      throw createForbiddenError('Admin cannot update a system admin user');
    }

    if (targetUser.role_level >= actor.role_level) {
      throw createForbiddenError(
        'Admin can only update users with a lower role level',
      );
    }
  }
};

const ensureActorCanManageTargetLifecycle = (actor, targetUser) => {
  if (actor.id === targetUser.id) {
    throw createForbiddenError(
      'Admin users cannot manage their own lifecycle through this API',
    );
  }

  if (actor.role_code === 'admin') {
    if (targetUser.role_code === SYSTEM_ADMIN_ROLE_CODE) {
      throw createForbiddenError(
        'Admin cannot manage the lifecycle of a system admin user',
      );
    }

    if (targetUser.role_level >= actor.role_level) {
      throw createForbiddenError(
        'Admin can only manage lifecycle for users with a lower role level',
      );
    }
  }
};

const ensureActorCanResendVerificationEmail = (actor, permissions) => {
  if (!ADMIN_ALLOWED_ROLE_CODES.has(actor.role_code)) {
    throw createForbiddenError('Only admin users can resend verification emails');
  }

  if (
    !permissions.includes('email.send') &&
    !permissions.includes('user.update_status')
  ) {
    throw createForbiddenError(
      'You do not have permission to resend verification emails',
    );
  }
};

const ensureActorCanChangeRole = (actor, targetUser, targetRole) => {
  if (actor.role_code !== SYSTEM_ADMIN_ROLE_CODE) {
    throw createForbiddenError(
      'Only system admin can change a user primary role',
    );
  }

  if (targetUser.deleted_at != null || targetUser.status === USER_STATUS.DELETED) {
    throw createForbiddenError('Deleted users cannot change role');
  }

  if (targetUser.is_system_protected) {
    throw createForbiddenError('System protected users cannot change role');
  }

  if (actor.id === targetUser.id) {
    throw createForbiddenError(
      'System admin cannot change their own primary role through this API',
    );
  }

  if (targetRole.code === SYSTEM_ADMIN_ROLE_CODE) {
    throw createForbiddenError(
      'system_admin role cannot be assigned through this API',
    );
  }

  if (targetRole.code === CUSTOMER_ROLE_CODE) {
    throw createForbiddenError(
      'customer role cannot be assigned through this API',
    );
  }
};

const buildLifecycleAuditMetadata = ({
  actorUserId,
  fromStatus,
  reason,
  sessionsRevoked,
  targetUserId,
  toStatus,
  verificationTokenHash,
}) =>
  compactObject({
    actor_user_id: actorUserId,
    from_status: fromStatus,
    reason,
    sessions_revoked: sessionsRevoked,
    target_user_id: targetUserId,
    to_status: toStatus,
    verification_token_hash: verificationTokenHash,
  });

const createAdminUserService = ({
  bcryptHashImpl = bcrypt.hash,
  createEmailVerificationTokenImpl = createEmailVerificationToken,
  hashEmailVerificationTokenImpl = hashEmailVerificationToken,
  now = () => new Date(),
  queryImpl = query,
  sendEmailImpl = sendEmail,
  withTransactionImpl = withTransaction,
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

  const createUser = async ({
    actorUserId,
    ipAddress,
    payload,
    userAgent,
  }) => {
    const input = normalizeCreateUserPayload(payload);

    try {
      return await withTransactionImpl(async (client) => {
        const actor = await loadActorById(client.query.bind(client), actorUserId);
        const existingUser = await loadUserByEmail(
          client.query.bind(client),
          input.email,
        );

        if (existingUser) {
          throw createDuplicateEmailError();
        }

        const targetRole = await loadRoleByCode(
          client.query.bind(client),
          input.roleCode,
        );

        if (!targetRole) {
          throw new AppError('Role not found', {
            code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
            statusCode: 404,
          });
        }

        ensureActorCanCreateRole(actor, targetRole);

        const createdAt = now();
        const passwordHashValue = await bcryptHashImpl(
          input.password,
          passwordHash.bcryptSaltRounds,
        );
        const userResult = await client.query(
          `
            INSERT INTO users (
              role_id,
              email,
              phone,
              password_hash,
              full_name,
              avatar_url,
              status,
              email_verified_at,
              last_login_at,
              is_system_protected,
              created_at,
              updated_at,
              deleted_at
            )
            VALUES (
              $1, $2, $3, $4, $5, NULL, $6, NULL, NULL, FALSE, $7, $7, NULL
            )
            RETURNING id
          `,
          [
            targetRole.id,
            input.email,
            input.phone,
            passwordHashValue,
            input.fullName,
            USER_STATUS.PENDING_VERIFICATION,
            createdAt,
          ],
        );
        const createdUserId = userResult.rows[0].id;
        const createdUser = await loadUserById(
          client.query.bind(client),
          createdUserId,
        );
        const token = createEmailVerificationTokenImpl({
          email: createdUser.email,
          userId: createdUser.id,
        });
        const tokenHash = hashEmailVerificationTokenImpl(token);
        const { apiVerifyUrl, verificationUrl } = buildVerificationLinks(token);
        const emailContent = buildVerificationEmail({
          apiVerifyUrl,
          expiresInMinutes: emailVerification.expiresInMinutes,
          fullName: createdUser.full_name,
          token,
          verificationUrl,
        });
        const emailLogResult = await queueEmailLog(client, {
          createdAt,
          subject: emailContent.subject,
          templateCode: ADMIN_USER_VERIFY_EMAIL_TEMPLATE_CODE,
          toEmail: createdUser.email,
          userId: createdUser.id,
        });
        const sendResult = await sendEmailImpl({
          html: emailContent.html,
          subject: emailContent.subject,
          text: emailContent.text,
          to: {
            email: createdUser.email,
            name: createdUser.full_name,
          },
        });
        const sentAt = now();

        await markEmailLogSent(client, {
          emailLogId: emailLogResult.rows[0].id,
          messageId: sendResult.messageId,
          sentAt,
        });

        await insertUserLog(client, {
          action: ADMIN_USER_CREATE_ACTION,
          createdAt: sentAt,
          entityId: createdUser.id,
          ipAddress,
          metadata: {
            actor_user_id: actorUserId,
            email: createdUser.email,
            role_code: createdUser.role_code,
            status: createdUser.status,
            target_user_id: createdUser.id,
            verification_token_hash: tokenHash,
          },
          targetUserId: createdUser.id,
          userAgent,
        });

        return mapAdminUser(createdUser);
      });
    } catch (error) {
      if (error.code === API_ERROR_CODES.SENDGRID_NOT_CONFIGURED) {
        throw createInternalError('Email verification service is not configured');
      }

      if (error.code === API_ERROR_CODES.SENDGRID_SEND_FAILED) {
        throw createInternalError('Failed to send verification email');
      }

      if (isUniqueViolation(error)) {
        throw createDuplicateEmailError();
      }

      throw error;
    }
  };

  const updateUser = async ({
    actorUserId,
    ipAddress,
    payload,
    userAgent,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const normalizedUserId = normalizeUserId(userId);
      const actor = await loadActorById(client.query.bind(client), actorUserId);
      const targetUser = await loadUserById(
        client.query.bind(client),
        normalizedUserId,
        {
          forUpdate: true,
        },
      );

      if (!targetUser) {
        throw createNotFoundError();
      }

      ensureActorCanUpdateTarget(actor, targetUser);
      const input = normalizeUpdateUserPayload(payload);
      const setClauses = [];
      const params = [normalizedUserId];
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

      if (input.hasAvatarUrl) {
        setClauses.push(`avatar_url = $${parameterIndex}`);
        params.push(input.avatarUrl);
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

      await insertUserLog(client, {
        action: ADMIN_USER_UPDATE_PROFILE_ACTION,
        createdAt: updatedAt,
        entityId: normalizedUserId,
        ipAddress,
        metadata: compactObject({
          actor_user_id: actorUserId,
          changed_fields: input.changedFields,
          target_user_id: normalizedUserId,
        }),
        targetUserId: normalizedUserId,
        userAgent,
      });

      const updatedUser = await loadUserById(
        client.query.bind(client),
        normalizedUserId,
      );

      return mapAdminUser(updatedUser);
    });

  const changeUserStatus = async ({
    actorUserId,
    ipAddress,
    payload,
    userAgent,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const normalizedUserId = normalizeUserId(userId);
      const actor = await loadActorById(client.query.bind(client), actorUserId);
      const targetUser = await loadUserById(
        client.query.bind(client),
        normalizedUserId,
        {
          forUpdate: true,
        },
      );

      if (!targetUser) {
        throw createNotFoundError();
      }

      ensureActorCanManageTargetLifecycle(actor, targetUser);
      const input = normalizeStatusChangePayload(payload);

      if (input.status === USER_STATUS.DELETED && targetUser.is_system_protected) {
        throw createForbiddenError(
          'System protected users cannot be deleted',
        );
      }

      if (input.status === USER_STATUS.ACTIVE) {
        if (targetUser.deleted_at != null) {
          throw createForbiddenError('Deleted users cannot be reactivated');
        }

        if (targetUser.email_verified_at == null) {
          throw createForbiddenError(
            'User email must be verified before activating the account',
          );
        }

        if (
          ![
            USER_STATUS.LOCKED,
            USER_STATUS.SUSPENDED,
            USER_STATUS.DISABLED,
            USER_STATUS.ACTIVE,
          ].includes(targetUser.status)
        ) {
          throw createForbiddenError(
            `Account with status ${targetUser.status} cannot be activated through this endpoint`,
          );
        }
      }

      if (targetUser.status === USER_STATUS.DELETED && input.status !== USER_STATUS.DELETED) {
        throw createForbiddenError(
          'Deleted users cannot be transitioned through this endpoint',
        );
      }

      const updatedAt = now();
      const sessionsRevoked = input.status !== USER_STATUS.ACTIVE;
      const deletedAtValue =
        input.status === USER_STATUS.DELETED ? updatedAt : null;

      await client.query(
        `
          UPDATE users
          SET
            status = $2,
            deleted_at = $3,
            updated_at = $4
          WHERE id = $1
        `,
        [
          normalizedUserId,
          input.status,
          deletedAtValue,
          updatedAt,
        ],
      );

      await insertUserLog(client, {
        action: ADMIN_USER_CHANGE_STATUS_ACTION,
        createdAt: updatedAt,
        entityId: normalizedUserId,
        ipAddress,
        metadata: buildLifecycleAuditMetadata({
          actorUserId,
          fromStatus: targetUser.status,
          reason: input.reason,
          sessionsRevoked,
          targetUserId: normalizedUserId,
          toStatus: input.status,
        }),
        targetUserId: normalizedUserId,
        userAgent,
      });

      const updatedUser = await loadUserById(
        client.query.bind(client),
        normalizedUserId,
      );

      return {
        ...mapAdminUser(updatedUser),
        sessions_revoked: sessionsRevoked,
      };
    });

  const deleteUser = async ({
    actorUserId,
    ipAddress,
    payload,
    userAgent,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const normalizedUserId = normalizeUserId(userId);
      const actor = await loadActorById(client.query.bind(client), actorUserId);
      const targetUser = await loadUserById(
        client.query.bind(client),
        normalizedUserId,
        {
          forUpdate: true,
        },
      );

      if (!targetUser) {
        throw createNotFoundError();
      }

      ensureActorCanManageTargetLifecycle(actor, targetUser);
      const input = normalizeDeleteUserPayload(payload);

      if (targetUser.is_system_protected) {
        throw createForbiddenError(
          'System protected users cannot be deleted',
        );
      }

      if (targetUser.status === USER_STATUS.DELETED && targetUser.deleted_at != null) {
        return {
          ...mapAdminUser(targetUser),
          deleted: true,
          request_status: 'already_deleted',
          sessions_revoked: true,
        };
      }

      const deletedAt = now();

      await client.query(
        `
          UPDATE users
          SET
            status = $2,
            deleted_at = $3,
            updated_at = $3
          WHERE id = $1
        `,
        [
          normalizedUserId,
          USER_STATUS.DELETED,
          deletedAt,
        ],
      );

      await insertUserLog(client, {
        action: ADMIN_USER_SOFT_DELETE_ACTION,
        createdAt: deletedAt,
        entityId: normalizedUserId,
        ipAddress,
        metadata: buildLifecycleAuditMetadata({
          actorUserId,
          fromStatus: targetUser.status,
          reason: input.reason,
          sessionsRevoked: true,
          targetUserId: normalizedUserId,
          toStatus: USER_STATUS.DELETED,
        }),
        targetUserId: normalizedUserId,
        userAgent,
      });

      const deletedUser = await loadUserById(
        client.query.bind(client),
        normalizedUserId,
      );

      return {
        ...mapAdminUser(deletedUser),
        deleted: true,
        request_status: 'deleted',
        sessions_revoked: true,
      };
    });

  const resendVerificationEmail = async ({
    actorUserId,
    ipAddress,
    userAgent,
    userId,
  }) => {
    try {
      return await withTransactionImpl(async (client) => {
        const normalizedUserId = normalizeUserId(userId);
        const actor = await loadActorById(
          client.query.bind(client),
          actorUserId,
        );
        const permissions = await loadPermissionsByRoleId(
          client.query.bind(client),
          actor.role_id,
        );

        ensureActorCanResendVerificationEmail(actor, permissions);
        const targetUser = await loadUserById(
          client.query.bind(client),
          normalizedUserId,
          {
            forUpdate: true,
          },
        );

        if (!targetUser) {
          throw createNotFoundError();
        }

        const normalizedEmail = normalizeRecipientEmail(targetUser.email);

        if (
          targetUser.status !== USER_STATUS.PENDING_VERIFICATION ||
          targetUser.email_verified_at != null
        ) {
          throw createInvalidStateTransitionError(
            'Verification email can only be resent for pending_verification users',
          );
        }

        const createdAt = now();
        const token = createEmailVerificationTokenImpl({
          email: normalizedEmail,
          userId: targetUser.id,
        });
        const tokenHash = hashEmailVerificationTokenImpl(token);
        const { apiVerifyUrl, verificationUrl } = buildVerificationLinks(token);
        const emailContent = buildVerificationEmail({
          apiVerifyUrl,
          expiresInMinutes: emailVerification.expiresInMinutes,
          fullName: targetUser.full_name,
          token,
          verificationUrl,
        });
        const emailLogResult = await queueEmailLog(client, {
          createdAt,
          subject: emailContent.subject,
          templateCode: ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
          toEmail: normalizedEmail,
          userId: targetUser.id,
        });
        const sendResult = await sendEmailImpl({
          html: emailContent.html,
          subject: emailContent.subject,
          text: emailContent.text,
          to: {
            email: normalizedEmail,
            name: targetUser.full_name,
          },
        });
        const sentAt = now();

        await markEmailLogSent(client, {
          emailLogId: emailLogResult.rows[0].id,
          messageId: sendResult.messageId,
          sentAt,
        });

        await insertUserLog(client, {
          action: ADMIN_USER_RESEND_VERIFICATION_ACTION,
          createdAt: sentAt,
          entityId: normalizedUserId,
          ipAddress,
          metadata: buildLifecycleAuditMetadata({
            actorUserId,
            fromStatus: targetUser.status,
            sessionsRevoked: false,
            targetUserId: normalizedUserId,
            toStatus: targetUser.status,
            verificationTokenHash: tokenHash,
          }),
          targetUserId: normalizedUserId,
          userAgent,
        });

        return {
          email: normalizedEmail,
          request_status: 'resent',
          status: targetUser.status,
        };
      });
    } catch (error) {
      if (error.code === API_ERROR_CODES.SENDGRID_NOT_CONFIGURED) {
        throw createInternalError('Email verification service is not configured');
      }

      if (error.code === API_ERROR_CODES.SENDGRID_SEND_FAILED) {
        throw createInternalError('Failed to send verification email');
      }

      throw error;
    }
  };

  const changeUserRole = async ({
    actorUserId,
    ipAddress,
    payload,
    userAgent,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const normalizedUserId = normalizeUserId(userId);
      const actor = await loadActorById(client.query.bind(client), actorUserId);
      const input = normalizeRoleAssignPayload(payload);
      const targetUser = await loadUserById(
        client.query.bind(client),
        normalizedUserId,
        {
          forUpdate: true,
        },
      );

      if (!targetUser) {
        throw createNotFoundError();
      }

      const targetRole = await loadRoleByCode(
        client.query.bind(client),
        input.roleCode,
      );

      if (!targetRole) {
        throw new AppError('Role not found', {
          code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
          statusCode: 404,
        });
      }

      ensureActorCanChangeRole(actor, targetUser, targetRole);

      if (targetUser.role_code === targetRole.code) {
        throw createValidationError([
          {
            field: 'role_code',
            message: 'role_code must be different from the current role',
          },
        ]);
      }

      const updatedAt = now();

      await client.query(
        `
          UPDATE users
          SET
            role_id = $2,
            updated_at = $3
          WHERE id = $1
        `,
        [
          normalizedUserId,
          targetRole.id,
          updatedAt,
        ],
      );

      await insertUserLog(client, {
        action: ADMIN_USER_CHANGE_ROLE_ACTION,
        createdAt: updatedAt,
        entityId: normalizedUserId,
        ipAddress,
        metadata: {
          actor_user_id: actorUserId,
          from_role: targetUser.role_code,
          sessions_revoked: true,
          target_user_id: normalizedUserId,
          to_role: targetRole.code,
        },
        targetUserId: normalizedUserId,
        userAgent,
      });

      const updatedUser = await loadUserById(
        client.query.bind(client),
        normalizedUserId,
      );
      const permissions = await loadPermissionsByRoleId(
        client.query.bind(client),
        updatedUser.role_id,
      );

      return {
        ...mapAdminUser(updatedUser),
        permissions,
        sessions_revoked: true,
      };
    });

  return {
    changeUserStatus,
    changeUserRole,
    createUser,
    deleteUser,
    getUserById,
    getUserLogs,
    getUsers,
    resendVerificationEmail,
    updateUser,
  };
};

module.exports = createAdminUserService();
module.exports.ADMIN_ALLOWED_ROLE_CODES = ADMIN_ALLOWED_ROLE_CODES;
module.exports.ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE =
  ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE;
module.exports.ADMIN_USER_CHANGE_STATUS_ACTION =
  ADMIN_USER_CHANGE_STATUS_ACTION;
module.exports.ADMIN_USER_CHANGE_ROLE_ACTION =
  ADMIN_USER_CHANGE_ROLE_ACTION;
module.exports.ADMIN_USER_CREATE_ACTION = ADMIN_USER_CREATE_ACTION;
module.exports.ADMIN_USER_RESEND_VERIFICATION_ACTION =
  ADMIN_USER_RESEND_VERIFICATION_ACTION;
module.exports.ADMIN_USER_SOFT_DELETE_ACTION =
  ADMIN_USER_SOFT_DELETE_ACTION;
module.exports.ADMIN_USER_UPDATE_PROFILE_ACTION =
  ADMIN_USER_UPDATE_PROFILE_ACTION;
module.exports.ADMIN_USER_VERIFY_EMAIL_TEMPLATE_CODE =
  ADMIN_USER_VERIFY_EMAIL_TEMPLATE_CODE;
module.exports.createAdminUserService = createAdminUserService;
module.exports.mapAdminUser = mapAdminUser;
module.exports.normalizeCreateUserPayload = normalizeCreateUserPayload;
module.exports.normalizeDeleteUserPayload = normalizeDeleteUserPayload;
module.exports.normalizeListUsersQuery = normalizeListUsersQuery;
module.exports.normalizePagination = normalizePagination;
module.exports.normalizeRoleAssignPayload = normalizeRoleAssignPayload;
module.exports.normalizeStatusChangePayload = normalizeStatusChangePayload;
module.exports.normalizeUpdateUserPayload = normalizeUpdateUserPayload;
module.exports.normalizeUserId = normalizeUserId;
