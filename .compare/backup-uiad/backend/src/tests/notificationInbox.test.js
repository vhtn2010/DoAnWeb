const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-notification-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPE,
} = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const notificationService = require('../services/notificationService');
const { createAccessToken } = require('../utils/sessionToken');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const NOTIFICATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BROADCAST_NOTIFICATION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const RECIPIENT_USER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const DISABLED_USER_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const RELATED_ENTITY_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';

const originalBroadcastAdminNotification = notificationService.broadcastAdminNotification;
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalDeleteMyNotification = notificationService.deleteMyNotification;
const originalGetUnreadNotificationCount = notificationService.getUnreadNotificationCount;
const originalGetMyNotificationDetail = notificationService.getMyNotificationDetail;
const originalListAdminNotifications = notificationService.listAdminNotifications;
const originalListMyNotifications = notificationService.listMyNotifications;
const originalMarkAllMyNotificationsRead = notificationService.markAllMyNotificationsRead;
const originalMarkMyNotificationRead = notificationService.markMyNotificationRead;
const originalMarkMyNotificationsBulkRead = notificationService.markMyNotificationsBulkRead;
const originalSendAdminNotificationToUser = notificationService.sendAdminNotificationToUser;
const originalUpdateAdminNotificationStatus = notificationService.updateAdminNotificationStatus;

const createAuthContext = ({
  permissions = ['notification.read_self'],
  roleCode = 'customer',
  userId = USER_ID,
} = {}) => ({
  permissions: roleCode === 'guest' ? [] : permissions,
  roleCode,
  tokenId: 'access-jti-1',
  user: {
    email: `${userId}@example.com`,
    id: userId,
    role_code: roleCode,
  },
  userId,
});

const createAdminAuthResolver = () => async (tokenPayload) =>
  createAuthContext({
    permissions:
      tokenPayload.permissions ||
      tokenPayload.permission_codes ||
      [],
    roleCode:
      tokenPayload.roleCode ||
      tokenPayload.role_code ||
      tokenPayload.role ||
      'admin',
    userId:
      tokenPayload.userId ||
      tokenPayload.user_id ||
      tokenPayload.sub ||
      USER_ID,
  });

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const payload = options.body == null
      ? null
      : JSON.stringify(options.body);
    const headers = {
      ...(options.headers || {}),
    };

    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
      headers['Content-Type'] = 'application/json';
    }

    const req = http.request(`http://127.0.0.1:${port}${path}`, {
      ...options,
      headers,
    }, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          body: JSON.parse(body),
          statusCode: res.statusCode,
        });
      });
    });

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }

    req.end();
  });

test.beforeEach(() => {
  clearRateLimitStore('admin-notification-catalog');
  clearRateLimitStore('admin-notification-dispatch');
  clearRateLimitStore('admin-notification-status');
  clearRateLimitStore('notification-read');
  notificationService.broadcastAdminNotification = originalBroadcastAdminNotification;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  notificationService.deleteMyNotification = originalDeleteMyNotification;
  notificationService.getUnreadNotificationCount = originalGetUnreadNotificationCount;
  notificationService.getMyNotificationDetail = originalGetMyNotificationDetail;
  notificationService.listAdminNotifications = originalListAdminNotifications;
  notificationService.listMyNotifications = originalListMyNotifications;
  notificationService.markAllMyNotificationsRead = originalMarkAllMyNotificationsRead;
  notificationService.markMyNotificationRead = originalMarkMyNotificationRead;
  notificationService.markMyNotificationsBulkRead = originalMarkMyNotificationsBulkRead;
  notificationService.sendAdminNotificationToUser = originalSendAdminNotificationToUser;
  notificationService.updateAdminNotificationStatus = originalUpdateAdminNotificationStatus;
});

test.afterEach(() => {
  clearRateLimitStore('admin-notification-catalog');
  clearRateLimitStore('admin-notification-dispatch');
  clearRateLimitStore('admin-notification-status');
  clearRateLimitStore('notification-read');
  notificationService.broadcastAdminNotification = originalBroadcastAdminNotification;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  notificationService.deleteMyNotification = originalDeleteMyNotification;
  notificationService.getUnreadNotificationCount = originalGetUnreadNotificationCount;
  notificationService.getMyNotificationDetail = originalGetMyNotificationDetail;
  notificationService.listAdminNotifications = originalListAdminNotifications;
  notificationService.listMyNotifications = originalListMyNotifications;
  notificationService.markAllMyNotificationsRead = originalMarkAllMyNotificationsRead;
  notificationService.markMyNotificationRead = originalMarkMyNotificationRead;
  notificationService.markMyNotificationsBulkRead = originalMarkMyNotificationsBulkRead;
  notificationService.sendAdminNotificationToUser = originalSendAdminNotificationToUser;
  notificationService.updateAdminNotificationStatus = originalUpdateAdminNotificationStatus;
});

test('notificationService.getUnreadNotificationCount counts only unread user-specific notifications', async () => {
  const service = notificationService.createNotificationService({
    repository: {
      countUnreadNotificationsForUser: async (userId) => {
        assert.equal(userId, USER_ID);
        return 5;
      },
    },
  });

  const result = await service.getUnreadNotificationCount({
    auth: {
      role: 'customer',
      userId: USER_ID,
    },
  });

  assert.deepEqual(result, {
    unread_count: 5,
  });

  await assert.rejects(
    () => service.getUnreadNotificationCount({
      auth: {
        role: 'guest',
        userId: USER_ID,
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('notificationService.listAdminNotifications validates permission, filters, and pagination', async () => {
  const service = notificationService.createNotificationService({
    repository: {
      listAdminNotifications: async ({
        limit,
        offset,
        status,
        type,
      }) => {
        assert.equal(type, NOTIFICATION_TYPE.SYSTEM);
        assert.equal(status, NOTIFICATION_STATUS.FAILED);
        assert.equal(limit, 20);
        assert.equal(offset, 0);

        return {
          rows: [
            {
              body: 'System maintenance tonight.',
              created_at: '2026-07-01T10:00:00.000Z',
              id: BROADCAST_NOTIFICATION_ID,
              read_at: null,
              recipient_email: null,
              recipient_name: null,
              related_entity_id: null,
              related_entity_name: null,
              sent_at: '2026-07-01T09:50:00.000Z',
              status: NOTIFICATION_STATUS.FAILED,
              title: 'Maintenance failed',
              type: NOTIFICATION_TYPE.SYSTEM,
              user_id: null,
            },
            {
              body: 'Booking confirmed.',
              created_at: '2026-07-01T09:00:00.000Z',
              id: NOTIFICATION_ID,
              read_at: '2026-07-01T09:05:00.000Z',
              recipient_email: 'recipient@example.com',
              recipient_name: 'Recipient User',
              related_entity_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              related_entity_name: 'booking',
              sent_at: '2026-07-01T08:59:00.000Z',
              status: NOTIFICATION_STATUS.FAILED,
              title: 'Booking update failed',
              type: NOTIFICATION_TYPE.SYSTEM,
              user_id: USER_ID,
            },
          ],
          total: 2,
        };
      },
    },
  });

  const result = await service.listAdminNotifications({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['notification.manage'],
      },
      userId: USER_ID,
    },
    query: {
      status: NOTIFICATION_STATUS.FAILED,
      type: NOTIFICATION_TYPE.SYSTEM,
    },
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].is_broadcast, true);
  assert.equal(result.items[1].recipient.email, 'recipient@example.com');
  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 20,
    page: 1,
    total: 2,
    total_pages: 1,
  });

  await assert.rejects(
    () => service.listAdminNotifications({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.read_all'],
        },
        userId: USER_ID,
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.listAdminNotifications({
      auth: {
        role: 'system_admin',
        tokenPayload: {
          permissions: ['notification.manage'],
        },
        userId: USER_ID,
      },
      query: {
        limit: '101',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('notificationService admin dispatch validates permission, payload, and recipient state', async () => {
  const service = notificationService.createNotificationService({
    repository: {
      createBroadcastNotification: async (payload) => {
        assert.equal(payload.actorUserId, USER_ID);
        assert.equal(payload.body, 'Maintenance tonight');
        assert.equal(payload.readAt, null);
        assert.equal(payload.relatedEntityId, null);
        assert.equal(payload.relatedEntityName, null);
        assert.equal(payload.sentAt, null);
        assert.equal(payload.status, NOTIFICATION_STATUS.QUEUED);
        assert.equal(payload.target, 'all');
        assert.equal(payload.title, 'System notice');
        assert.equal(payload.type, NOTIFICATION_TYPE.SYSTEM);

        return {
          body: payload.body,
          created_at: '2026-07-02T09:00:00.000Z',
          id: BROADCAST_NOTIFICATION_ID,
          read_at: null,
          related_entity_id: null,
          related_entity_name: null,
          sent_at: null,
          status: payload.status,
          title: payload.title,
          type: payload.type,
          user_id: null,
        };
      },
      createUserNotification: async (payload) => {
        assert.equal(payload.actorUserId, USER_ID);
        assert.equal(payload.body, 'Your booking was updated');
        assert.equal(payload.readAt, null);
        assert.equal(payload.recipientUserId, RECIPIENT_USER_ID);
        assert.equal(payload.relatedEntityId, RELATED_ENTITY_ID);
        assert.equal(payload.relatedEntityName, 'booking');
        assert.equal(payload.sentAt, null);
        assert.equal(payload.status, NOTIFICATION_STATUS.QUEUED);
        assert.equal(payload.title, 'Booking update');
        assert.equal(payload.type, NOTIFICATION_TYPE.BOOKING_STATUS);

        return {
          body: payload.body,
          created_at: '2026-07-02T09:05:00.000Z',
          id: NOTIFICATION_ID,
          read_at: null,
          related_entity_id: payload.relatedEntityId,
          related_entity_name: payload.relatedEntityName,
          sent_at: null,
          status: payload.status,
          title: payload.title,
          type: payload.type,
          user_id: payload.recipientUserId,
        };
      },
      getDispatchUserById: async (userId) => {
        if (userId === RECIPIENT_USER_ID) {
          return {
            deleted_at: null,
            email: 'recipient@example.com',
            full_name: 'Recipient User',
            id: RECIPIENT_USER_ID,
            role_code: 'customer',
            status: 'active',
          };
        }

        if (userId === DISABLED_USER_ID) {
          return {
            deleted_at: null,
            email: 'disabled@example.com',
            full_name: 'Disabled User',
            id: DISABLED_USER_ID,
            role_code: 'customer',
            status: 'disabled',
          };
        }

        return null;
      },
    },
  });

  const broadcastResult = await service.broadcastAdminNotification({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['notification.broadcast'],
      },
      userId: USER_ID,
    },
    body: {
      body: 'Maintenance tonight',
      target: 'all',
      title: 'System notice',
      type: NOTIFICATION_TYPE.SYSTEM,
    },
  });

  assert.equal(broadcastResult.id, BROADCAST_NOTIFICATION_ID);
  assert.equal(broadcastResult.created_count, 1);
  assert.equal(broadcastResult.target, 'all');
  assert.equal(broadcastResult.status, NOTIFICATION_STATUS.QUEUED);
  assert.equal(broadcastResult.read_at, null);

  const userResult = await service.sendAdminNotificationToUser({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['notification.manage'],
      },
      userId: USER_ID,
    },
    body: {
      body: 'Your booking was updated',
      related_entity_id: RELATED_ENTITY_ID,
      related_entity_name: 'booking',
      title: 'Booking update',
      type: NOTIFICATION_TYPE.BOOKING_STATUS,
    },
    userId: RECIPIENT_USER_ID,
  });

  assert.equal(userResult.id, NOTIFICATION_ID);
  assert.equal(userResult.user_id, RECIPIENT_USER_ID);
  assert.equal(userResult.recipient.email, 'recipient@example.com');
  assert.equal(userResult.status, NOTIFICATION_STATUS.QUEUED);
  assert.equal(userResult.read_at, null);

  await assert.rejects(
    () => service.broadcastAdminNotification({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.read_self'],
        },
        userId: USER_ID,
      },
      body: {
        body: 'Maintenance tonight',
        target: 'all',
        title: 'System notice',
        type: NOTIFICATION_TYPE.SYSTEM,
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.broadcastAdminNotification({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.broadcast'],
        },
        userId: USER_ID,
      },
      body: {
        body: 'Maintenance tonight',
        status: NOTIFICATION_STATUS.READ,
        target: 'all',
        title: 'System notice',
        type: NOTIFICATION_TYPE.SYSTEM,
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.broadcastAdminNotification({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.broadcast'],
        },
        userId: USER_ID,
      },
      body: {
        body: 'Maintenance tonight',
        target: 'guests',
        title: 'System notice',
        type: NOTIFICATION_TYPE.SYSTEM,
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.sendAdminNotificationToUser({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.broadcast'],
        },
        userId: USER_ID,
      },
      body: {
        body: 'Your booking was updated',
        title: 'Booking update',
        type: NOTIFICATION_TYPE.BOOKING_STATUS,
      },
      userId: 'not-a-uuid',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.sendAdminNotificationToUser({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.broadcast'],
        },
        userId: USER_ID,
      },
      body: {
        body: 'Your booking was updated',
        title: 'Booking update',
        type: NOTIFICATION_TYPE.BOOKING_STATUS,
      },
      userId: '99999999-9999-4999-8999-999999999999',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );

  await assert.rejects(
    () => service.sendAdminNotificationToUser({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.broadcast'],
        },
        userId: USER_ID,
      },
      body: {
        body: 'Your booking was updated',
        title: 'Booking update',
        type: NOTIFICATION_TYPE.BOOKING_STATUS,
      },
      userId: DISABLED_USER_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('notificationService.updateAdminNotificationStatus validates permission and lifecycle transitions', async () => {
  const notifications = new Map([
    [
      NOTIFICATION_ID,
      {
        body: 'Queued notice',
        created_at: '2026-07-01T09:00:00.000Z',
        id: NOTIFICATION_ID,
        read_at: null,
        related_entity_id: null,
        related_entity_name: null,
        sent_at: null,
        status: NOTIFICATION_STATUS.QUEUED,
        title: 'Queued',
        type: NOTIFICATION_TYPE.SYSTEM,
        user_id: USER_ID,
      },
    ],
    [
      BROADCAST_NOTIFICATION_ID,
      {
        body: 'Read broadcast',
        created_at: '2026-07-01T10:00:00.000Z',
        id: BROADCAST_NOTIFICATION_ID,
        read_at: '2026-07-01T10:30:00.000Z',
        related_entity_id: null,
        related_entity_name: null,
        sent_at: '2026-07-01T10:05:00.000Z',
        status: NOTIFICATION_STATUS.READ,
        title: 'Read',
        type: NOTIFICATION_TYPE.SYSTEM,
        user_id: null,
      },
    ],
  ]);

  const service = notificationService.createNotificationService({
    repository: {
      getNotificationById: async (notificationId) => notifications.get(notificationId) || null,
      updateNotificationStatus: async ({
        actorUserId,
        fromStatus,
        notificationId,
        readAt,
        sentAt,
        toStatus,
      }) => {
        assert.equal(actorUserId, USER_ID);

        if (notificationId === NOTIFICATION_ID) {
          assert.equal(fromStatus, NOTIFICATION_STATUS.QUEUED);
          assert.equal(toStatus, NOTIFICATION_STATUS.SENT);
          assert.equal(readAt, null);
          assert.match(sentAt, /\d{4}-\d{2}-\d{2}T/);

          return {
            ...notifications.get(notificationId),
            sent_at: sentAt,
            status: toStatus,
          };
        }

        if (notificationId === BROADCAST_NOTIFICATION_ID) {
          assert.equal(fromStatus, NOTIFICATION_STATUS.READ);
          assert.equal(toStatus, NOTIFICATION_STATUS.SENT);
          assert.equal(readAt, null);
          assert.equal(sentAt, null);

          return {
            ...notifications.get(notificationId),
            status: toStatus,
          };
        }

        return null;
      },
    },
  });

  const queuedToSent = await service.updateAdminNotificationStatus({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['notification.manage'],
      },
      userId: USER_ID,
    },
    notificationId: NOTIFICATION_ID,
    status: NOTIFICATION_STATUS.SENT,
  });

  assert.equal(queuedToSent.status, NOTIFICATION_STATUS.SENT);
  assert.ok(queuedToSent.sent_at);

  const sameStatus = await service.updateAdminNotificationStatus({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['notification.manage'],
      },
      userId: USER_ID,
    },
    notificationId: NOTIFICATION_ID,
    status: NOTIFICATION_STATUS.QUEUED,
  });

  assert.equal(sameStatus.status, NOTIFICATION_STATUS.QUEUED);
  assert.equal(sameStatus.id, NOTIFICATION_ID);

  const readOverride = await service.updateAdminNotificationStatus({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['notification.manage'],
      },
      userId: USER_ID,
    },
    notificationId: BROADCAST_NOTIFICATION_ID,
    status: NOTIFICATION_STATUS.SENT,
  });

  assert.equal(readOverride.status, NOTIFICATION_STATUS.SENT);
  assert.equal(readOverride.is_broadcast, true);

  await assert.rejects(
    () => service.updateAdminNotificationStatus({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.manage'],
        },
        userId: USER_ID,
      },
      notificationId: BROADCAST_NOTIFICATION_ID,
      status: NOTIFICATION_STATUS.SENT,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateAdminNotificationStatus({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.broadcast'],
        },
        userId: USER_ID,
      },
      notificationId: NOTIFICATION_ID,
      status: NOTIFICATION_STATUS.SENT,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateAdminNotificationStatus({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['notification.manage'],
        },
        userId: USER_ID,
      },
      notificationId: 'not-a-uuid',
      status: NOTIFICATION_STATUS.SENT,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('notificationService.listMyNotifications validates filters and includes broadcast notifications', async () => {
  const service = notificationService.createNotificationService({
    repository: {
      listNotificationsForUser: async ({
        limit,
        offset,
        status,
        type,
        userId,
      }) => {
        assert.equal(userId, USER_ID);
        assert.equal(status, NOTIFICATION_STATUS.READ);
        assert.equal(type, NOTIFICATION_TYPE.SYSTEM);
        assert.equal(limit, 20);
        assert.equal(offset, 0);

        return {
          rows: [
            {
              body: 'System maintenance tonight.',
              created_at: '2026-07-01T10:00:00.000Z',
              id: BROADCAST_NOTIFICATION_ID,
              read_at: null,
              related_entity_id: null,
              related_entity_name: null,
              sent_at: '2026-07-01T09:50:00.000Z',
              status: NOTIFICATION_STATUS.DELIVERED,
              title: 'Maintenance',
              type: NOTIFICATION_TYPE.SYSTEM,
              user_id: null,
            },
            {
              body: 'Booking confirmed.',
              created_at: '2026-07-01T09:00:00.000Z',
              id: NOTIFICATION_ID,
              read_at: '2026-07-01T09:05:00.000Z',
              related_entity_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              related_entity_name: 'booking',
              sent_at: '2026-07-01T08:59:00.000Z',
              status: NOTIFICATION_STATUS.READ,
              title: 'Booking update',
              type: NOTIFICATION_TYPE.BOOKING_STATUS,
              user_id: USER_ID,
            },
          ],
          total: 2,
        };
      },
    },
  });

  const result = await service.listMyNotifications({
    auth: {
      role: 'admin',
      userId: USER_ID,
    },
    query: {
      status: NOTIFICATION_STATUS.READ,
      type: NOTIFICATION_TYPE.SYSTEM,
    },
  });

  assert.equal(result.items.length, 2);
  assert.equal(result.items[0].is_broadcast, true);
  assert.equal(result.items[1].is_broadcast, false);
  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 20,
    page: 1,
    total: 2,
    total_pages: 1,
  });
});

test('notificationService.listMyNotifications rejects invalid filters and unauthorized access', async () => {
  const service = notificationService.createNotificationService({
    repository: {},
  });

  await assert.rejects(
    () => service.listMyNotifications({
      auth: {
        role: 'guest',
        userId: USER_ID,
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.listMyNotifications({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      query: {
        status: 'unknown',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.listMyNotifications({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      query: {
        limit: '99',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('notificationService.getMyNotificationDetail returns owned or broadcast notifications and validates UUID', async () => {
  const service = notificationService.createNotificationService({
    repository: {
      getNotificationInboxDetail: async ({
        notificationId,
        userId,
      }) => {
        assert.equal(userId, USER_ID);

        if (notificationId === NOTIFICATION_ID) {
          return {
            body: 'Your support ticket has a reply.',
            created_at: '2026-07-01T11:00:00.000Z',
            id: NOTIFICATION_ID,
            read_at: null,
            related_entity_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
            related_entity_name: 'support_ticket',
            sent_at: '2026-07-01T10:58:00.000Z',
            status: NOTIFICATION_STATUS.SENT,
            title: 'Support reply',
            type: NOTIFICATION_TYPE.SUPPORT_REPLY,
            user_id: USER_ID,
          };
        }

        if (notificationId === BROADCAST_NOTIFICATION_ID) {
          return {
            body: 'System broadcast message.',
            created_at: '2026-07-01T12:00:00.000Z',
            id: BROADCAST_NOTIFICATION_ID,
            read_at: null,
            related_entity_id: null,
            related_entity_name: null,
            sent_at: '2026-07-01T11:58:00.000Z',
            status: NOTIFICATION_STATUS.DELIVERED,
            title: 'Broadcast',
            type: NOTIFICATION_TYPE.SYSTEM,
            user_id: null,
          };
        }

        return null;
      },
    },
  });

  const owned = await service.getMyNotificationDetail({
    auth: {
      role: 'staff',
      userId: USER_ID,
    },
    notificationId: NOTIFICATION_ID,
  });

  assert.equal(owned.id, NOTIFICATION_ID);
  assert.equal(owned.is_broadcast, false);

  const broadcast = await service.getMyNotificationDetail({
    auth: {
      role: 'system_admin',
      userId: USER_ID,
    },
    notificationId: BROADCAST_NOTIFICATION_ID,
  });

  assert.equal(broadcast.id, BROADCAST_NOTIFICATION_ID);
  assert.equal(broadcast.is_broadcast, true);

  await assert.rejects(
    () => service.getMyNotificationDetail({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationId: 'not-a-uuid',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.getMyNotificationDetail({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );
});

test('notificationService mark read endpoints validate ownership, UUIDs, and bulk limits', async () => {
  const service = notificationService.createNotificationService({
    repository: {
      markAllNotificationsReadForUser: async (userId) => {
        assert.equal(userId, USER_ID);
        return 4;
      },
      markNotificationReadForUser: async ({
        notificationId,
        userId,
      }) => {
        assert.equal(userId, USER_ID);

        if (notificationId === NOTIFICATION_ID) {
          return {
            id: NOTIFICATION_ID,
            read_at: '2026-07-01T12:00:00.000Z',
            status: NOTIFICATION_STATUS.READ,
          };
        }

        return null;
      },
      markNotificationsReadForUser: async ({
        notificationIds,
        userId,
      }) => {
        assert.equal(userId, USER_ID);
        assert.deepEqual(notificationIds, [
          NOTIFICATION_ID,
          BROADCAST_NOTIFICATION_ID,
        ]);

        return {
          notificationIds,
          updatedCount: 2,
        };
      },
    },
  });

  const singleResult = await service.markMyNotificationRead({
    auth: {
      role: 'customer',
      userId: USER_ID,
    },
    notificationId: NOTIFICATION_ID,
  });

  assert.deepEqual(singleResult, {
    id: NOTIFICATION_ID,
    read_at: '2026-07-01T12:00:00.000Z',
    status: NOTIFICATION_STATUS.READ,
  });

  const bulkResult = await service.markMyNotificationsBulkRead({
    auth: {
      role: 'staff',
      userId: USER_ID,
    },
    notificationIds: [
      NOTIFICATION_ID,
      BROADCAST_NOTIFICATION_ID,
      NOTIFICATION_ID,
    ],
  });

  assert.deepEqual(bulkResult, {
    notification_ids: [
      NOTIFICATION_ID,
      BROADCAST_NOTIFICATION_ID,
    ],
    updated_count: 2,
  });

  const readAllResult = await service.markAllMyNotificationsRead({
    auth: {
      role: 'admin',
      userId: USER_ID,
    },
  });

  assert.deepEqual(readAllResult, {
    updated_count: 4,
  });

  await assert.rejects(
    () => service.markMyNotificationRead({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationId: 'invalid-uuid',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.markMyNotificationRead({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );

  await assert.rejects(
    () => service.markMyNotificationsBulkRead({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationIds: [],
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.markMyNotificationsBulkRead({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationIds: new Array(101).fill(NOTIFICATION_ID),
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('notificationService.deleteMyNotification deletes only owned user-specific notifications', async () => {
  const service = notificationService.createNotificationService({
    repository: {
      deleteNotificationForUser: async ({
        notificationId,
        userId,
      }) => {
        assert.equal(notificationId, NOTIFICATION_ID);
        assert.equal(userId, USER_ID);

        return {
          id: NOTIFICATION_ID,
        };
      },
      getNotificationById: async (notificationId) => {
        if (notificationId === NOTIFICATION_ID) {
          return {
            id: NOTIFICATION_ID,
            read_at: null,
            status: NOTIFICATION_STATUS.SENT,
            user_id: USER_ID,
          };
        }

        if (notificationId === BROADCAST_NOTIFICATION_ID) {
          return {
            id: BROADCAST_NOTIFICATION_ID,
            read_at: null,
            status: NOTIFICATION_STATUS.DELIVERED,
            user_id: null,
          };
        }

        if (notificationId === 'dddddddd-dddd-4ddd-8ddd-dddddddddddd') {
          return {
            id: notificationId,
            read_at: null,
            status: NOTIFICATION_STATUS.SENT,
            user_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          };
        }

        return null;
      },
    },
  });

  const result = await service.deleteMyNotification({
    auth: {
      role: 'customer',
      userId: USER_ID,
    },
    notificationId: NOTIFICATION_ID,
  });

  assert.deepEqual(result, {
    deleted: true,
    id: NOTIFICATION_ID,
  });

  await assert.rejects(
    () => service.deleteMyNotification({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationId: BROADCAST_NOTIFICATION_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.deleteMyNotification({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.deleteMyNotification({
      auth: {
        role: 'customer',
        userId: USER_ID,
      },
      notificationId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );
});

test('GET /api/notifications requires login', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/notifications`, {
      method: 'GET',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/notifications/unread-count returns unread count for authenticated users', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: USER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: USER_ID,
    });

  notificationService.getUnreadNotificationCount = async ({ auth }) => {
    assert.equal(auth.roleCode, 'customer');
    assert.equal(auth.userId, USER_ID);

    return {
      unread_count: 7,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/notifications/unread-count`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(response.body.data, {
      unread_count: 7,
    });
  } finally {
    server.close();
  }
});

test('PATCH /api/notifications/{notification_id}/read returns read state for owned notification', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: USER_ID,
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();

  notificationService.markMyNotificationRead = async ({
    auth,
    notificationId,
  }) => {
    assert.equal(auth.roleCode, 'customer');
    assert.equal(auth.userId, USER_ID);
    assert.equal(notificationId, NOTIFICATION_ID);

    return {
      id: NOTIFICATION_ID,
      read_at: '2026-07-01T12:15:00.000Z',
      status: NOTIFICATION_STATUS.READ,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/notifications/${NOTIFICATION_ID}/read`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, NOTIFICATION_STATUS.READ);
    assert.equal(response.body.data.id, NOTIFICATION_ID);
  } finally {
    server.close();
  }
});

test('PATCH /api/notifications/bulk-read returns updated count for authenticated user', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: USER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: USER_ID,
    });

  notificationService.markMyNotificationsBulkRead = async ({
    auth,
    notificationIds,
  }) => {
    assert.equal(auth.roleCode, 'staff');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(notificationIds, [
      NOTIFICATION_ID,
      BROADCAST_NOTIFICATION_ID,
    ]);

    return {
      notification_ids: notificationIds,
      updated_count: 2,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/notifications/bulk-read`, {
      body: {
        notification_ids: [
          NOTIFICATION_ID,
          BROADCAST_NOTIFICATION_ID,
        ],
      },
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.updated_count, 2);
    assert.deepEqual(response.body.data.notification_ids, [
      NOTIFICATION_ID,
      BROADCAST_NOTIFICATION_ID,
    ]);
  } finally {
    server.close();
  }
});

test('PATCH /api/notifications/read-all returns updated count for authenticated user', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: USER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: USER_ID,
    });

  notificationService.markAllMyNotificationsRead = async ({ auth }) => {
    assert.equal(auth.roleCode, 'admin');
    assert.equal(auth.userId, USER_ID);

    return {
      updated_count: 9,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/notifications/read-all`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(response.body.data, {
      updated_count: 9,
    });
  } finally {
    server.close();
  }
});

test('DELETE /api/notifications/{notification_id} deletes owned user-specific notification', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'system_admin',
    userId: USER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'system_admin',
      userId: USER_ID,
    });

  notificationService.deleteMyNotification = async ({
    auth,
    notificationId,
  }) => {
    assert.equal(auth.roleCode, 'system_admin');
    assert.equal(auth.userId, USER_ID);
    assert.equal(notificationId, NOTIFICATION_ID);

    return {
      deleted: true,
      id: NOTIFICATION_ID,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/notifications/${NOTIFICATION_ID}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'DELETE',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.deepEqual(response.body.data, {
      deleted: true,
      id: NOTIFICATION_ID,
    });
  } finally {
    server.close();
  }
});

test('GET /api/admin/notifications returns admin notification list and blocks disallowed roles', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = createAdminAuthResolver();

  notificationService.listAdminNotifications = async ({ auth, query }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['notification.manage']);
    assert.equal(query.type, NOTIFICATION_TYPE.SYSTEM);
    assert.equal(query.status, NOTIFICATION_STATUS.FAILED);

    return {
      items: [
        {
          body: 'System maintenance tonight.',
          created_at: '2026-07-01T10:00:00.000Z',
          id: BROADCAST_NOTIFICATION_ID,
          is_broadcast: true,
          read_at: null,
          recipient: null,
          related_entity_id: null,
          related_entity_name: null,
          sent_at: '2026-07-01T09:50:00.000Z',
          status: NOTIFICATION_STATUS.FAILED,
          title: 'Maintenance failed',
          type: NOTIFICATION_TYPE.SYSTEM,
        },
      ],
      meta: {
        has_next: false,
        limit: 20,
        page: 1,
        total: 1,
        total_pages: 1,
      },
    };
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/admin/notifications?type=system&status=failed`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['notification.manage'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.length, 1);
    assert.equal(okResponse.body.data[0].is_broadcast, true);
    assert.equal(okResponse.body.meta.total, 1);

    const forbiddenResponse = await request(server, `${apiPrefix}/admin/notifications`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['notification.manage'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('POST /api/admin/notifications/broadcast and /users/{user_id} create notifications and block staff', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = createAdminAuthResolver();

  notificationService.broadcastAdminNotification = async ({ auth, body }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['notification.broadcast']);
    assert.equal(body.target, 'all');
    assert.equal(body.type, NOTIFICATION_TYPE.SYSTEM);

    return {
      body: 'Maintenance tonight',
      created_at: '2026-07-02T09:00:00.000Z',
      created_count: 1,
      id: BROADCAST_NOTIFICATION_ID,
      is_broadcast: true,
      read_at: null,
      related_entity_id: null,
      related_entity_name: null,
      sent_at: null,
      status: NOTIFICATION_STATUS.QUEUED,
      target: 'all',
      title: 'System notice',
      type: NOTIFICATION_TYPE.SYSTEM,
      user_id: null,
    };
  };

  notificationService.sendAdminNotificationToUser = async ({
    auth,
    body,
    userId,
  }) => {
    assert.equal(auth.role, 'system_admin');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['notification.manage']);
    assert.equal(userId, RECIPIENT_USER_ID);
    assert.equal(body.related_entity_id, RELATED_ENTITY_ID);
    assert.equal(body.related_entity_name, 'booking');

    return {
      body: 'Your booking was updated',
      created_at: '2026-07-02T09:05:00.000Z',
      id: NOTIFICATION_ID,
      is_broadcast: false,
      read_at: null,
      recipient: {
        email: 'recipient@example.com',
        id: RECIPIENT_USER_ID,
        name: 'Recipient User',
      },
      related_entity_id: RELATED_ENTITY_ID,
      related_entity_name: 'booking',
      sent_at: null,
      status: NOTIFICATION_STATUS.QUEUED,
      title: 'Booking update',
      type: NOTIFICATION_TYPE.BOOKING_STATUS,
      user_id: RECIPIENT_USER_ID,
    };
  };

  try {
    const broadcastResponse = await request(server, `${apiPrefix}/admin/notifications/broadcast`, {
      body: {
        body: 'Maintenance tonight',
        target: 'all',
        title: 'System notice',
        type: NOTIFICATION_TYPE.SYSTEM,
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['notification.broadcast'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'POST',
    });

    assert.equal(broadcastResponse.statusCode, 201);
    assert.equal(broadcastResponse.body.success, true);
    assert.equal(broadcastResponse.body.data.id, BROADCAST_NOTIFICATION_ID);
    assert.equal(broadcastResponse.body.data.created_count, 1);
    assert.equal(broadcastResponse.body.data.target, 'all');

    const userResponse = await request(server, `${apiPrefix}/admin/notifications/users/${RECIPIENT_USER_ID}`, {
      body: {
        body: 'Your booking was updated',
        related_entity_id: RELATED_ENTITY_ID,
        related_entity_name: 'booking',
        title: 'Booking update',
        type: NOTIFICATION_TYPE.BOOKING_STATUS,
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['notification.manage'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'POST',
    });

    assert.equal(userResponse.statusCode, 201);
    assert.equal(userResponse.body.success, true);
    assert.equal(userResponse.body.data.id, NOTIFICATION_ID);
    assert.equal(userResponse.body.data.recipient.email, 'recipient@example.com');
    assert.equal(userResponse.body.data.user_id, RECIPIENT_USER_ID);

    const forbiddenResponse = await request(server, `${apiPrefix}/admin/notifications/broadcast`, {
      body: {
        body: 'Maintenance tonight',
        target: 'all',
        title: 'System notice',
        type: NOTIFICATION_TYPE.SYSTEM,
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['notification.broadcast'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'POST',
    });

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/notifications/{notification_id}/status updates notification status and blocks disallowed roles', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = createAdminAuthResolver();

  notificationService.updateAdminNotificationStatus = async ({
    auth,
    notificationId,
    status,
  }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['notification.manage']);
    assert.equal(notificationId, NOTIFICATION_ID);
    assert.equal(status, NOTIFICATION_STATUS.SENT);

    return {
      body: 'Queued notice',
      created_at: '2026-07-01T09:00:00.000Z',
      id: NOTIFICATION_ID,
      is_broadcast: false,
      read_at: null,
      related_entity_id: null,
      related_entity_name: null,
      sent_at: '2026-07-01T09:05:00.000Z',
      status: NOTIFICATION_STATUS.SENT,
      title: 'Queued',
      type: NOTIFICATION_TYPE.SYSTEM,
      user_id: USER_ID,
    };
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/admin/notifications/${NOTIFICATION_ID}/status`, {
      body: {
        status: NOTIFICATION_STATUS.SENT,
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['notification.manage'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'PATCH',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.status, NOTIFICATION_STATUS.SENT);
    assert.equal(okResponse.body.data.id, NOTIFICATION_ID);

    const forbiddenResponse = await request(server, `${apiPrefix}/admin/notifications/${NOTIFICATION_ID}/status`, {
      body: {
        status: NOTIFICATION_STATUS.SENT,
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['notification.manage'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'PATCH',
    });

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/notifications returns paginated notifications for authenticated user roles', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: USER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: USER_ID,
    });

  notificationService.listMyNotifications = async ({ auth, query }) => {
    assert.equal(auth.roleCode, 'staff');
    assert.equal(auth.userId, USER_ID);
    assert.equal(query.type, NOTIFICATION_TYPE.SYSTEM);

    return {
      items: [
        {
          body: 'Maintenance tonight.',
          created_at: '2026-07-01T10:00:00.000Z',
          id: BROADCAST_NOTIFICATION_ID,
          is_broadcast: true,
          read_at: null,
          related_entity_id: null,
          related_entity_name: null,
          sent_at: '2026-07-01T09:50:00.000Z',
          status: NOTIFICATION_STATUS.DELIVERED,
          title: 'Maintenance',
          type: NOTIFICATION_TYPE.SYSTEM,
        },
      ],
      meta: {
        has_next: false,
        limit: 20,
        page: 1,
        total: 1,
        total_pages: 1,
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/notifications?type=system`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].is_broadcast, true);
    assert.equal(response.body.meta.total, 1);
  } finally {
    server.close();
  }
});

test('GET /api/notifications/{notification_id} returns detail and blocks disallowed role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: USER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: USER_ID,
    });

  notificationService.getMyNotificationDetail = async ({ auth, notificationId }) => {
    assert.equal(auth.roleCode, 'admin');
    assert.equal(notificationId, NOTIFICATION_ID);

    return {
      body: 'Payment received successfully.',
      created_at: '2026-07-01T10:30:00.000Z',
      id: NOTIFICATION_ID,
      is_broadcast: false,
      read_at: null,
      related_entity_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
      related_entity_name: 'payment',
      sent_at: '2026-07-01T10:29:00.000Z',
      status: NOTIFICATION_STATUS.SENT,
      title: 'Payment update',
      type: NOTIFICATION_TYPE.PAYMENT,
    };
  };

  try {
    const okResponse = await request(server, `${apiPrefix}/notifications/${NOTIFICATION_ID}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.id, NOTIFICATION_ID);
    assert.equal(okResponse.body.data.related_entity_name, 'payment');

    authService.resolveAuthenticatedUser = async () =>
      createAuthContext({
        roleCode: 'guest',
        userId: USER_ID,
      });

    const forbiddenResponse = await request(server, `${apiPrefix}/notifications/${NOTIFICATION_ID}`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          roleCode: 'guest',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});
