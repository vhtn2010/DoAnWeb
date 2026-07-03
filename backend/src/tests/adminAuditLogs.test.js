const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const {
  createAdminAuditLogRepository,
} = require('../database/adminAuditLogRepository');
const AppError = require('../utils/AppError');
const adminAuditLogService = require('../services/adminAuditLogService');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const LOG_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TEST_ACCESS_SECRET = 'test-admin-audit-log-secret';
const originalGetAuditLogDetail = adminAuditLogService.getAuditLogDetail;
const originalListAuditLogs = adminAuditLogService.listAuditLogs;

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const body = options.body == null
      ? null
      : (typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body));
    const headers = {
      ...(options.headers || {}),
    };

    if (body && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    if (body && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      {
        ...options,
        headers,
      },
      (res) => {
        let responseBody = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          resolve({
            body: JSON.parse(responseBody),
            statusCode: res.statusCode,
          });
        });
      },
    );

    req.on('error', reject);
    req.end(body);
  });

const createAccessToken = (payload, secret = TEST_ACCESS_SECRET) => {
  const encodedHeader = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url');
  const encodedPayload = Buffer.from(
    JSON.stringify(payload),
  ).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
};

test.afterEach(() => {
  adminAuditLogService.getAuditLogDetail = originalGetAuditLogDetail;
  adminAuditLogService.listAuditLogs = originalListAuditLogs;
});

test('adminAuditLogService.listAuditLogs validates permission, filters, and pagination', async () => {
  const service = adminAuditLogService.createAdminAuditLogService({
    repository: {
      listAuditLogs: async ({
        action,
        entityName,
        limit,
        offset,
        userId,
      }) => {
        assert.equal(action, 'service.update');
        assert.equal(entityName, 'services');
        assert.equal(limit, 10);
        assert.equal(offset, 10);
        assert.equal(userId, USER_ID);

        return {
          rows: [
            {
              action: 'service.update',
              actor_deleted_at: '2026-07-03T03:00:00.000Z',
              actor_full_name: 'Deleted Admin',
              actor_role_code: 'admin',
              created_at: '2026-07-03T02:00:00.000Z',
              entity_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              entity_name: 'services',
              has_metadata: true,
              id: LOG_ID,
              user_id: USER_ID,
            },
          ],
          total: 12,
        };
      },
    },
  });

  const result = await service.listAuditLogs({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['audit.read'],
      },
      userId: USER_ID,
    },
    query: {
      action: 'service.update',
      entity_name: 'services',
      limit: '10',
      page: '2',
      user_id: USER_ID,
    },
  });

  assert.deepEqual(result, {
    items: [
      {
        action: 'service.update',
        actor: {
          full_name: 'Deleted Admin',
          role: 'admin',
          user_deleted: true,
          user_id: USER_ID,
        },
        created_at: '2026-07-03T02:00:00.000Z',
        entity_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        entity_name: 'services',
        has_metadata: true,
        id: LOG_ID,
      },
    ],
    meta: {
      has_next: false,
      limit: 10,
      page: 2,
      total: 12,
      total_pages: 2,
    },
  });

  await assert.rejects(
    () => service.listAuditLogs({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['report.read'],
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
    () => service.listAuditLogs({
      auth: {
        role: 'system_admin',
        tokenPayload: {
          permissions: ['audit.read'],
        },
        userId: USER_ID,
      },
      query: {
        user_id: 'not-a-uuid',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'user_id',
          message: 'user_id must be a valid UUID',
        },
      ]);
      return true;
    },
  );
});

test('adminAuditLogService.getAuditLogDetail sanitizes metadata and returns RESOURCE_NOT_FOUND when missing', async () => {
  const service = adminAuditLogService.createAdminAuditLogService({
    repository: {
      getAuditLogById: async (logId) => {
        if (logId !== LOG_ID) {
          return null;
        }

        return {
          action: 'auth.login',
          actor_deleted_at: null,
          actor_full_name: 'System Admin',
          actor_role_code: 'system_admin',
          created_at: '2026-07-03T05:00:00.000Z',
          entity_id: null,
          entity_name: 'users',
          id: LOG_ID,
          ip_address: '127.0.0.1',
          metadata: {
            access_token: 'secret-access-token',
            nested: {
              password: 'hashed-password',
              refresh_token: 'refresh-token',
            },
            notes: 'x'.repeat(520),
            safe_field: 'kept',
          },
          user_agent: 'Mozilla/5.0',
          user_id: USER_ID,
        };
      },
    },
  });

  const result = await service.getAuditLogDetail({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['audit.read'],
      },
      userId: USER_ID,
    },
    log_id: LOG_ID,
  });

  assert.equal(result.id, LOG_ID);
  assert.equal(result.action, 'auth.login');
  assert.equal(result.ip_address, '127.0.0.1');
  assert.equal(result.user_agent, 'Mozilla/5.0');
  assert.equal(result.metadata.access_token, '[REDACTED]');
  assert.equal(result.metadata.nested.password, '[REDACTED]');
  assert.equal(result.metadata.nested.refresh_token, '[REDACTED]');
  assert.equal(result.metadata.safe_field, 'kept');
  assert.match(result.metadata.notes, /^x{500}\.\.\.$/);

  await assert.rejects(
    () => service.getAuditLogDetail({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['audit.read'],
        },
        userId: USER_ID,
      },
      log_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );
});

test('adminAuditLogRepository SQL stays on user_logs with safe filters and ordering', async () => {
  const captured = [];
  const repository = createAdminAuditLogRepository({
    queryImpl: async (sql, params = []) => {
      captured.push({
        params,
        sql,
      });

      return {
        rows: sql.includes('COUNT(*)::int')
          ? [{ total: 0 }]
          : [],
      };
    },
  });

  await repository.listAuditLogs({
    action: 'service.update',
    entityName: 'services',
    limit: 20,
    offset: 0,
    userId: USER_ID,
  });
  await repository.getAuditLogById(LOG_ID);

  assert.match(captured[0].sql, /FROM user_logs ul/);
  assert.match(captured[0].sql, /LEFT JOIN users u/);
  assert.match(captured[0].sql, /ORDER BY ul\.created_at DESC, ul\.id DESC/);
  assert.match(captured[1].sql, /COUNT\(\*\)::int AS total/);
  assert.match(captured[2].sql, /WHERE ul\.id = \$1::uuid/);
  assert.doesNotMatch(captured[0].sql, /INSERT INTO user_logs/);
});

test('GET /api/admin/audit-logs routes enforce auth, permission, validation, pagination, and detail responses', async () => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = TEST_ACCESS_SECRET;
  const server = app.listen(0);

  adminAuditLogService.listAuditLogs = async ({
    auth,
    query,
  }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.equal(query.action, 'service.update');

    return {
      items: [
        {
          action: 'service.update',
          actor: {
            full_name: 'Admin User',
            role: 'admin',
            user_deleted: false,
            user_id: USER_ID,
          },
          created_at: '2026-07-03T02:00:00.000Z',
          entity_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          entity_name: 'services',
          has_metadata: true,
          id: LOG_ID,
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

  adminAuditLogService.getAuditLogDetail = async ({
    auth,
    log_id: logId,
  }) => {
    assert.equal(auth.role, 'system_admin');
    assert.equal(logId, LOG_ID);

    return {
      action: 'service.update',
      actor: {
        full_name: 'System Admin',
        role: 'system_admin',
        user_deleted: false,
        user_id: USER_ID,
      },
      created_at: '2026-07-03T05:00:00.000Z',
      entity_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      entity_name: 'services',
      id: LOG_ID,
      ip_address: '127.0.0.1',
      metadata: {
        safe: 'value',
      },
      user_agent: 'Mozilla/5.0',
    };
  };

  try {
    const unauthorizedResponse = await request(server, `${apiPrefix}/admin/audit-logs`, {
      method: 'GET',
    });

    assert.equal(unauthorizedResponse.statusCode, 401);
    assert.equal(unauthorizedResponse.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);

    const customerResponse = await request(server, `${apiPrefix}/admin/audit-logs`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['audit.read'],
          roleCode: 'customer',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(customerResponse.statusCode, 403);
    assert.equal(customerResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const staffResponse = await request(server, `${apiPrefix}/admin/audit-logs`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['audit.read'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(staffResponse.statusCode, 403);
    assert.equal(staffResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    adminAuditLogService.listAuditLogs = originalListAuditLogs;

    const missingPermissionResponse = await request(server, `${apiPrefix}/admin/audit-logs`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(missingPermissionResponse.statusCode, 403);
    assert.equal(missingPermissionResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const invalidUserIdResponse = await request(server, `${apiPrefix}/admin/audit-logs?user_id=not-a-uuid`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['audit.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(invalidUserIdResponse.statusCode, 400);
    assert.equal(invalidUserIdResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);

    adminAuditLogService.listAuditLogs = async ({
      auth,
      query,
    }) => {
      assert.equal(auth.role, 'admin');
      assert.equal(query.action, 'service.update');

      return {
        items: [
          {
            action: 'service.update',
            actor: {
              full_name: 'Admin User',
              role: 'admin',
              user_deleted: false,
              user_id: USER_ID,
            },
            created_at: '2026-07-03T02:00:00.000Z',
            entity_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            entity_name: 'services',
            has_metadata: true,
            id: LOG_ID,
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

    const listResponse = await request(server, `${apiPrefix}/admin/audit-logs?action=service.update`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['audit.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.body.success, true);
    assert.deepEqual(listResponse.body.meta, {
      has_next: false,
      limit: 20,
      page: 1,
      total: 1,
      total_pages: 1,
    });
    assert.equal(listResponse.body.data[0].id, LOG_ID);

    adminAuditLogService.getAuditLogDetail = originalGetAuditLogDetail;

    const invalidLogIdResponse = await request(server, `${apiPrefix}/admin/audit-logs/not-a-uuid`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['audit.read'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(invalidLogIdResponse.statusCode, 400);
    assert.equal(invalidLogIdResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);

    adminAuditLogService.getAuditLogDetail = async ({
      auth,
      log_id: logId,
    }) => {
      assert.equal(auth.role, 'system_admin');
      assert.equal(logId, LOG_ID);

      return {
        action: 'service.update',
        actor: {
          full_name: 'System Admin',
          role: 'system_admin',
          user_deleted: false,
          user_id: USER_ID,
        },
        created_at: '2026-07-03T05:00:00.000Z',
        entity_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        entity_name: 'services',
        id: LOG_ID,
        ip_address: '127.0.0.1',
        metadata: {
          safe: 'value',
        },
        user_agent: 'Mozilla/5.0',
      };
    };

    const detailResponse = await request(server, `${apiPrefix}/admin/audit-logs/${LOG_ID}`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['audit.read'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailResponse.body.success, true);
    assert.equal(detailResponse.body.data.id, LOG_ID);

    adminAuditLogService.getAuditLogDetail = async () => {
      throw new AppError('Audit log not found', {
        code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
        statusCode: 404,
      });
    };

    const notFoundResponse = await request(server, `${apiPrefix}/admin/audit-logs/${LOG_ID}`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['audit.read'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(notFoundResponse.statusCode, 404);
    assert.equal(notFoundResponse.body.error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
  } finally {
    server.close();
    process.env.JWT_ACCESS_SECRET = previousSecret;
  }
});
