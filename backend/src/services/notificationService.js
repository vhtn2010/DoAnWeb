const {
  API_ERROR_CODES,
  NOTIFICATION_STATUS,
  NOTIFICATION_STATUS_VALUES,
  NOTIFICATION_TYPE_VALUES,
} = require('../constants/domainConstraints');
const { createNotificationRepository } = require('../database/notificationRepository');
const AppError = require('../utils/AppError');

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const ADMIN_MAX_LIMIT = 100;
const MAX_BULK_READ_IDS = 100;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = Object.freeze([
  'customer',
  'staff',
  'admin',
  'system_admin',
]);
const ADMIN_ALLOWED_ROLES = Object.freeze([
  'admin',
  'system_admin',
]);
const NOTIFICATION_STATUS_TRANSITIONS = Object.freeze({
  [NOTIFICATION_STATUS.QUEUED]: Object.freeze([
    NOTIFICATION_STATUS.SENT,
    NOTIFICATION_STATUS.FAILED,
  ]),
  [NOTIFICATION_STATUS.SENT]: Object.freeze([
    NOTIFICATION_STATUS.DELIVERED,
    NOTIFICATION_STATUS.FAILED,
    NOTIFICATION_STATUS.READ,
  ]),
  [NOTIFICATION_STATUS.DELIVERED]: Object.freeze([
    NOTIFICATION_STATUS.READ,
  ]),
  [NOTIFICATION_STATUS.READ]: Object.freeze([]),
  [NOTIFICATION_STATUS.FAILED]: Object.freeze([]),
});

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
  roleCode: auth?.roleCode || null,
  role: auth?.role || auth?.roleCode || null,
  tokenPayload: auth?.tokenPayload || null,
  userId: auth?.userId || null,
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

const ensureInboxAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  return actor;
};

const ensureAdminNotificationCatalogAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !ADMIN_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(actor);

  if (!permissionCodes.includes('notification.manage')) {
    throw buildForbiddenError();
  }

  return actor;
};

const ensureAdminNotificationStatusAccess = (auth) => {
  const actor = normalizeAuth(auth);

  if (!actor.userId || !ADMIN_ALLOWED_ROLES.includes(actor.role)) {
    throw buildForbiddenError();
  }

  const permissionCodes = normalizePermissionCodes(actor);

  if (!permissionCodes.includes('notification.manage')) {
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

const parseNotificationIds = (notificationIds) => {
  if (!Array.isArray(notificationIds)) {
    throw buildValidationError('notification_ids', 'notification_ids must be an array of UUIDs');
  }

  if (notificationIds.length === 0) {
    throw buildValidationError('notification_ids', 'notification_ids must not be empty');
  }

  if (notificationIds.length > MAX_BULK_READ_IDS) {
    throw buildValidationError(
      'notification_ids',
      `notification_ids must contain at most ${MAX_BULK_READ_IDS} items`,
    );
  }

  const parsedIds = notificationIds.map((value) => parseUuid('notification_ids', value));

  return [...new Set(parsedIds)];
};

const parseAdminNotificationListQuery = (query = {}) => ({
  limit: parsePositiveInteger({
    defaultValue: DEFAULT_LIMIT,
    field: 'limit',
    max: ADMIN_MAX_LIMIT,
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

const sanitizeAdminNotificationSummary = (row) => ({
  body: row.body,
  created_at: row.created_at,
  id: row.id,
  is_broadcast: row.user_id == null,
  read_at: row.read_at,
  recipient: row.user_id == null
    ? null
    : {
        email: row.recipient_email,
        id: row.user_id,
        name: row.recipient_name,
      },
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

const sanitizeNotificationReadState = (row) => ({
  id: row.id,
  read_at: row.read_at,
  status: row.status,
});

const sanitizeNotificationDeleteResult = (notificationId) => ({
  deleted: true,
  id: notificationId,
});

const sanitizeAdminNotificationStatusResult = (row) => ({
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
  user_id: row.user_id,
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

  const deleteMyNotification = async ({
    auth,
    notificationId,
  } = {}) => {
    const actor = ensureInboxAccess(auth);
    const parsedNotificationId = parseUuid('notification_id', notificationId);
    const notification = await repository.getNotificationById(parsedNotificationId);

    if (!notification) {
      throw buildResourceNotFoundError('Notification not found');
    }

    if (notification.user_id == null) {
      throw buildForbiddenError('Broadcast notifications cannot be deleted');
    }

    if (notification.user_id !== actor.userId) {
      throw buildForbiddenError();
    }

    const deletedNotification = await repository.deleteNotificationForUser({
      notificationId: parsedNotificationId,
      userId: actor.userId,
    });

    if (!deletedNotification) {
      throw buildResourceNotFoundError('Notification not found');
    }

    return sanitizeNotificationDeleteResult(parsedNotificationId);
  };

  const updateAdminNotificationStatus = async ({
    auth,
    notificationId,
    status,
  } = {}) => {
    const actor = ensureAdminNotificationStatusAccess(auth);
    const parsedNotificationId = parseUuid('notification_id', notificationId);
    const nextStatus = parseOptionalEnum({
      field: 'status',
      label: NOTIFICATION_STATUS_VALUES,
      value: status,
      values: NOTIFICATION_STATUS_VALUES,
    });

    if (!nextStatus) {
      throw buildValidationError('status', 'status is required');
    }

    const notification = await repository.getNotificationById(parsedNotificationId);

    if (!notification) {
      throw buildResourceNotFoundError('Notification not found');
    }

    if (notification.status === nextStatus) {
      return sanitizeAdminNotificationStatusResult({
        ...notification,
        body: notification.body || null,
        created_at: notification.created_at || null,
        related_entity_id: notification.related_entity_id || null,
        related_entity_name: notification.related_entity_name || null,
        title: notification.title || null,
        type: notification.type || null,
      });
    }

    const allowedTransitions = NOTIFICATION_STATUS_TRANSITIONS[notification.status] || [];
    const isSystemAdminOverride =
      actor.role === 'system_admin' &&
      notification.status === NOTIFICATION_STATUS.READ &&
      [
        NOTIFICATION_STATUS.QUEUED,
        NOTIFICATION_STATUS.SENT,
      ].includes(nextStatus);

    if (!allowedTransitions.includes(nextStatus) && !isSystemAdminOverride) {
      throw new AppError('Notification state no longer allows this transition', {
        code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
        statusCode: 400,
      });
    }

    const now = new Date().toISOString();
    const updatedNotification = await repository.updateNotificationStatus({
      actorUserId: actor.userId,
      fromStatus: notification.status,
      notificationId: parsedNotificationId,
      readAt:
        nextStatus === NOTIFICATION_STATUS.READ && notification.read_at == null
          ? now
          : null,
      sentAt:
        nextStatus === NOTIFICATION_STATUS.SENT && notification.sent_at == null
          ? now
          : null,
      toStatus: nextStatus,
    });

    if (!updatedNotification) {
      throw new AppError('Notification state no longer allows this transition', {
        code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
        statusCode: 400,
      });
    }

    return sanitizeAdminNotificationStatusResult(updatedNotification);
  };

  const listAdminNotifications = async ({
    auth,
    query,
  } = {}) => {
    ensureAdminNotificationCatalogAccess(auth);
    const parsedQuery = parseAdminNotificationListQuery(query || {});
    const offset = (parsedQuery.page - 1) * parsedQuery.limit;
    const result = await repository.listAdminNotifications({
      limit: parsedQuery.limit,
      offset,
      status: parsedQuery.status,
      type: parsedQuery.type,
    });

    return {
      items: result.rows.map(sanitizeAdminNotificationSummary),
      meta: buildPaginationMeta({
        limit: parsedQuery.limit,
        page: parsedQuery.page,
        total: result.total,
      }),
    };
  };

  const markAllMyNotificationsRead = async ({
    auth,
  } = {}) => {
    const actor = ensureInboxAccess(auth);
    const updatedCount = await repository.markAllNotificationsReadForUser(actor.userId);

    return {
      updated_count: Number(updatedCount || 0),
    };
  };

  const markMyNotificationRead = async ({
    auth,
    notificationId,
  } = {}) => {
    const actor = ensureInboxAccess(auth);
    const parsedNotificationId = parseUuid('notification_id', notificationId);
    const notification = await repository.markNotificationReadForUser({
      notificationId: parsedNotificationId,
      userId: actor.userId,
    });

    if (!notification) {
      throw buildResourceNotFoundError('Notification not found');
    }

    return sanitizeNotificationReadState(notification);
  };

  const markMyNotificationsBulkRead = async ({
    auth,
    notificationIds,
  } = {}) => {
    const actor = ensureInboxAccess(auth);
    const parsedNotificationIds = parseNotificationIds(notificationIds);
    const result = await repository.markNotificationsReadForUser({
      notificationIds: parsedNotificationIds,
      userId: actor.userId,
    });

    return {
      notification_ids: result.notificationIds,
      updated_count: Number(result.updatedCount || 0),
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
    deleteMyNotification,
    getUnreadNotificationCount,
    getMyNotificationDetail,
    listAdminNotifications,
    listMyNotifications,
    markAllMyNotificationsRead,
    markMyNotificationRead,
    markMyNotificationsBulkRead,
    updateAdminNotificationStatus,
  };
};

module.exports = Object.assign(createNotificationService(), {
  createNotificationService,
});
