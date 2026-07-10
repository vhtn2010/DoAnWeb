const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const {
  createAdminAuditLogRepository,
} = require('../database/adminAuditLogRepository');
const AppError = require('../utils/AppError');

const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_LIST_PAGE = 1;
const MAX_ACTION_LENGTH = 100;
const MAX_ENTITY_NAME_LENGTH = 100;
const MAX_LIST_LIMIT = 100;
const MAX_METADATA_ARRAY_ITEMS = 50;
const MAX_METADATA_DEPTH = 6;
const MAX_METADATA_KEYS = 50;
const MAX_METADATA_STRING_LENGTH = 500;
const MAX_METADATA_TOTAL_NODES = 200;
const REDACTED_VALUE = '[REDACTED]';
const TRUNCATED_VALUE = '[TRUNCATED]';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const AUDIT_ALLOWED_ROLES = Object.freeze([
  'admin',
  'system_admin',
]);
const AUDIT_REQUIRED_PERMISSION = 'audit.read';
const SENSITIVE_METADATA_KEY_PATTERN =
  /(password|token|secret|authorization|cookie|session|api[_-]?key|private[_-]?key)/i;

const buildValidationError = (field, message) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details: [
      {
        field,
        message,
      },
    ],
    statusCode: 400,
  });

const buildForbiddenError = (
  message = 'You do not have permission to access this resource',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildResourceNotFoundError = (message = 'Audit log not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const normalizePermissionCodes = (auth) => {
  const rawPermissions =
    auth?.tokenPayload?.permission_codes ||
    auth?.tokenPayload?.permissionCodes ||
    auth?.tokenPayload?.permissions ||
    [];

  if (!Array.isArray(rawPermissions)) {
    return [];
  }

  return rawPermissions
    .map((entry) => {
      if (typeof entry === 'string') {
        return entry.trim();
      }

      if (entry && typeof entry === 'object' && typeof entry.code === 'string') {
        return entry.code.trim();
      }

      return null;
    })
    .filter(Boolean);
};

const ensureAuditReadAccess = (auth) => {
  if (!AUDIT_ALLOWED_ROLES.includes(auth?.role) || !auth?.userId) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(auth);

  if (!permissionCodes.includes(AUDIT_REQUIRED_PERMISSION)) {
    throw buildForbiddenError();
  }
};

const parseUuid = (field, value) => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value.trim())) {
    throw buildValidationError(field, `${field} must be a valid UUID`);
  }

  return value.trim();
};

const parsePositiveInteger = ({
  defaultValue,
  field,
  max,
  value,
}) => {
  if (value == null || value === '') {
    return defaultValue;
  }

  if (Array.isArray(value) || !/^\d+$/.test(String(value))) {
    throw buildValidationError(field, `${field} must be a positive integer`);
  }

  const parsed = Number.parseInt(String(value), 10);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw buildValidationError(
      field,
      `${field} must be greater than or equal to 1`,
    );
  }

  if (parsed > max) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${max}`,
    );
  }

  return parsed;
};

const parseOptionalTextFilter = ({
  field,
  maxLength,
  value,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string') {
    throw buildValidationError(field, `${field} must be a string`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > maxLength) {
    throw buildValidationError(
      field,
      `${field} must be less than or equal to ${maxLength} characters`,
    );
  }

  return normalized;
};

const buildPaginationMeta = ({
  limit,
  page,
  total,
}) => {
  const normalizedTotal = Number(total || 0);
  const totalPages = normalizedTotal === 0
    ? 0
    : Math.ceil(normalizedTotal / limit);

  return {
    has_next: normalizedTotal > 0 && page < totalPages,
    limit,
    page,
    total: normalizedTotal,
    total_pages: totalPages,
  };
};

const sanitizeActor = (row) => ({
  full_name: row.actor_full_name || null,
  role: row.actor_role_code || null,
  user_id: row.user_id || null,
  user_deleted: Boolean(row.actor_deleted_at),
});

const sanitizeAuditLogSummary = (row) => ({
  action: row.action,
  actor: sanitizeActor(row),
  created_at: row.created_at,
  entity_id: row.entity_id || null,
  entity_name: row.entity_name || null,
  has_metadata: Boolean(row.has_metadata),
  id: row.id,
});

const truncateMetadataString = (value) => (
  value.length > MAX_METADATA_STRING_LENGTH
    ? `${value.slice(0, MAX_METADATA_STRING_LENGTH)}...`
    : value
);

const sanitizeMetadataValue = (value, state, depth = 0, keyName = null) => {
  if (state.nodeCount >= MAX_METADATA_TOTAL_NODES || depth > MAX_METADATA_DEPTH) {
    state.truncated = true;
    return TRUNCATED_VALUE;
  }

  state.nodeCount += 1;

  if (keyName && SENSITIVE_METADATA_KEY_PATTERN.test(keyName)) {
    return REDACTED_VALUE;
  }

  if (value == null) {
    return value;
  }

  if (typeof value === 'string') {
    return truncateMetadataString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_METADATA_ARRAY_ITEMS) {
      state.truncated = true;
    }

    return value
      .slice(0, MAX_METADATA_ARRAY_ITEMS)
      .map((entry) => sanitizeMetadataValue(entry, state, depth + 1));
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value);
    const limitedEntries = entries.slice(0, MAX_METADATA_KEYS);

    if (entries.length > MAX_METADATA_KEYS) {
      state.truncated = true;
    }

    return limitedEntries.reduce((accumulator, [entryKey, entryValue]) => {
      accumulator[entryKey] = sanitizeMetadataValue(
        entryValue,
        state,
        depth + 1,
        entryKey,
      );
      return accumulator;
    }, {});
  }

  return String(value);
};

const sanitizeMetadata = (metadata) => {
  if (metadata == null) {
    return null;
  }

  const state = {
    nodeCount: 0,
    truncated: false,
  };
  const sanitized = sanitizeMetadataValue(metadata, state);

  if (state.truncated && sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)) {
    return {
      ...sanitized,
      _sanitized: TRUNCATED_VALUE,
    };
  }

  return sanitized;
};

const sanitizeAuditLogDetail = (row) => ({
  action: row.action,
  actor: sanitizeActor(row),
  created_at: row.created_at,
  entity_id: row.entity_id || null,
  entity_name: row.entity_name || null,
  id: row.id,
  ip_address: row.ip_address || null,
  metadata: sanitizeMetadata(row.metadata),
  user_agent: row.user_agent || null,
});

const parseListQuery = (query = {}) => ({
  action: parseOptionalTextFilter({
    field: 'action',
    maxLength: MAX_ACTION_LENGTH,
    value: query.action,
  }),
  entityName: parseOptionalTextFilter({
    field: 'entity_name',
    maxLength: MAX_ENTITY_NAME_LENGTH,
    value: query.entity_name,
  }),
  limit: parsePositiveInteger({
    defaultValue: DEFAULT_LIST_LIMIT,
    field: 'limit',
    max: MAX_LIST_LIMIT,
    value: query.limit,
  }),
  page: parsePositiveInteger({
    defaultValue: DEFAULT_LIST_PAGE,
    field: 'page',
    max: Number.MAX_SAFE_INTEGER,
    value: query.page,
  }),
  userId:
    query.user_id == null || query.user_id === ''
      ? null
      : parseUuid('user_id', query.user_id),
});

const createAdminAuditLogService = ({
  repository = createAdminAuditLogRepository(),
} = {}) => {
  const listAuditLogs = async ({
    auth,
    query,
  } = {}) => {
    ensureAuditReadAccess(auth);

    const parsedQuery = parseListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listAuditLogs({
      action: parsedQuery.action,
      entityName: parsedQuery.entityName,
      limit: parsedQuery.limit,
      offset,
      userId: parsedQuery.userId,
    });

    return {
      items: result.rows.map(sanitizeAuditLogSummary),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getAuditLogDetail = async ({
    auth,
    log_id: logId,
  } = {}) => {
    ensureAuditReadAccess(auth);

    const parsedLogId = parseUuid('log_id', logId);
    const auditLog = await repository.getAuditLogById(parsedLogId);

    if (!auditLog) {
      throw buildResourceNotFoundError();
    }

    return sanitizeAuditLogDetail(auditLog);
  };

  return {
    getAuditLogDetail,
    listAuditLogs,
  };
};

module.exports = Object.assign(createAdminAuditLogService(), {
  AUDIT_ALLOWED_ROLES,
  AUDIT_REQUIRED_PERMISSION,
  DEFAULT_LIST_LIMIT,
  DEFAULT_LIST_PAGE,
  MAX_LIST_LIMIT,
  createAdminAuditLogService,
});
