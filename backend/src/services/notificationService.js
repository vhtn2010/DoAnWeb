const {
  API_ERROR_CODES,
  NOTIFICATION_STATUS_VALUES,
  NOTIFICATION_TYPE_VALUES,
} = require('../constants/domainConstraints');
const { createNotificationRepository } = require('../database/notificationRepository');
const AppError = require('../utils/AppError');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = Object.freeze([
  'customer',
  'staff',
  'admin',
  'system_admin',
]);

const buildAppError = ({
  code,
  field,
  message,
  statusCode,
}) =>
  new AppError(message, {
    code,
    details: field
      ? [
          {
            field,
            message,
          },
        ]
      : undefined,
    statusCode,
  });

const buildValidationError = (field, message) =>
  buildAppError({
    code: API_ERROR_CODES.VALIDATION_ERROR,
    field,
    message,
    statusCode: 400,
  });

const buildForbiddenError = (message = 'You do not have permission to access this resource') =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const buildResourceNotFoundError = (message = 'Resource not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

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
    throw buildValidationError(field, `${field} must be greater than or equal to 1`);
  }

  if (parsed > max) {
    throw buildValidationError(field, `${field} must be less than or equal to ${max}`);
  }

  return parsed;
};

const parseOptionalEnum = ({
  field,
  label,
  value,
  values,
}) => {
  if (value == null || value === '') {
    return null;
  }

  if (Array.isArray(value) || typeof value !== 'string' || !values.includes(value)) {
    throw buildValidationError(field, `${field} must be one of: ${label.join(', ')}`);
  }

  return value;
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
    has_next: page < totalPages,
    limit,
    page,
    total: normalizedTotal,
    total_pages: totalPages,
  };
};

const normalizeAuth = (auth) => ({
  role: auth?.role || auth?.roleCode || null,
  userId: auth?.userId || null,
});

const ensureInboxAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  return actor;
};

const parseInboxListQuery = (query = {}) => ({
  limit: parsePositiveInteger({
    defaultValue: DEFAULT_LIMIT,
    field: 'limit',
    max: MAX_LIMIT,
    value: query.limit,
  }),
  page: parsePositiveInteger({
    defaultValue: DEFAULT_PAGE,
    field: 'page',
    max: Number.MAX_SAFE_INTEGER,
    value: query.page,
  }),
  status: parseOptionalEnum({
    field: 'status',
    label: NOTIFICATION_STATUS_VALUES,
    value: query.status,
    values: NOTIFICATION_STATUS_VALUES,
  }),
  type: parseOptionalEnum({
    field: 'type',
    label: NOTIFICATION_TYPE_VALUES,
    value: query.type,
    values: NOTIFICATION_TYPE_VALUES,
  }),
});

const sanitizeNotificationSummary = (row) => ({
  body: row.body,
  created_at: row.created_at,
  id: row.id,
  is_broadcast: row.user_id == null,
  read_at: row.read_at,
  related_entity_id: row.related_entity_id,
  related_entity_name: row.related_entity_name,
  sent_at: row.sent_at,
  status: row.status,
  title: row.title,
  type: row.type,
});

const sanitizeNotificationDetail = (row) => ({
  body: row.body,
  created_at: row.created_at,
  id: row.id,
  is_broadcast: row.user_id == null,
  read_at: row.read_at,
  related_entity_id: row.related_entity_id,
  related_entity_name: row.related_entity_name,
  sent_at: row.sent_at,
  status: row.status,
  title: row.title,
  type: row.type,
});

const createNotificationService = ({
  repository = createNotificationRepository(),
} = {}) => {
  const getUnreadNotificationCount = async ({
    auth,
  } = {}) => {
    const actor = ensureInboxAccess(auth);
    const unreadCount = await repository.countUnreadNotificationsForUser(actor.userId);

    return {
      unread_count: Number(unreadCount || 0),
    };
  };

  const listMyNotifications = async ({
    auth,
    query,
  } = {}) => {
    const actor = ensureInboxAccess(auth);
    const parsedQuery = parseInboxListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listNotificationsForUser({
      limit: parsedQuery.limit,
      offset,
      status: parsedQuery.status,
      type: parsedQuery.type,
      userId: actor.userId,
    });

    return {
      items: result.rows.map(sanitizeNotificationSummary),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const getMyNotificationDetail = async ({
    auth,
    notificationId,
  } = {}) => {
    const actor = ensureInboxAccess(auth);
    const parsedNotificationId = parseUuid('notification_id', notificationId);
    const notification = await repository.getNotificationInboxDetail({
      notificationId: parsedNotificationId,
      userId: actor.userId,
    });

    if (!notification) {
      throw buildResourceNotFoundError('Notification not found');
    }

    return sanitizeNotificationDetail(notification);
  };

  return {
    getUnreadNotificationCount,
    getMyNotificationDetail,
    listMyNotifications,
  };
};

module.exports = Object.assign(createNotificationService(), {
  createNotificationService,
});
