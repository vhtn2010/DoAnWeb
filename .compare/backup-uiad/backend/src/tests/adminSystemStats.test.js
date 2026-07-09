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
  createAdminSystemStatsRepository,
} = require('../database/adminSystemStatsRepository');
const adminSystemStatsService = require('../services/adminSystemStatsService');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEST_ACCESS_SECRET = 'test-admin-system-stats-secret';
const originalGetSystemStats = adminSystemStatsService.getSystemStats;

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const headers = {
      ...(options.headers || {}),
    };

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
    req.end();
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
  adminSystemStatsService.getSystemStats = originalGetSystemStats;
});

test('adminSystemStatsService.getSystemStats returns enum-based stats and degraded health when auxiliary providers fail', async () => {
  const service = adminSystemStatsService.createAdminSystemStatsService({
    cloudinaryCheck: async () => ({
      message: 'Cloudinary probe failed with status 500',
      ready: false,
      service: 'cloudinary',
      status: 'connection_failed',
    }),
    now: () => new Date('2026-07-03T06:00:00.000Z'),
    repository: {
      getSystemStatsSnapshot: async () => ({
        bookings: [
          {
            status: 'confirmed',
            total_count: '3',
          },
          {
            status: 'cancelled',
            total_count: '1',
          },
        ],
        mail: [
          {
            status: 'queued',
            total_count: '2',
          },
          {
            status: 'failed',
            total_count: '1',
          },
        ],
        notifications: [
          {
            status: 'queued',
            total_count: '4',
          },
          {
            status: 'read',
            total_count: '6',
          },
        ],
        payments: [
          {
            status: 'pending',
            total_count: '2',
          },
          {
            status: 'success',
            total_count: '5',
          },
        ],
        refunds: [
          {
            status: 'requested',
            total_count: '2',
          },
          {
            status: 'success',
            total_count: '1',
          },
        ],
        services_by_status: [
          {
            status: 'active',
            total_count: '7',
          },
          {
            status: 'draft',
            total_count: '2',
          },
        ],
        services_by_type: [
          {
            service_type: 'hotel',
            total_count: '5',
          },
          {
            service_type: 'flight',
            total_count: '4',
          },
        ],
        users: [
          {
            status: 'active',
            total_count: '10',
          },
          {
            status: 'locked',
            total_count: '1',
          },
        ],
      }),
    },
    sendgridCheck: async () => ({
      message: 'SendGrid connection is working',
      ready: true,
      service: 'sendgrid',
      status: 'connected',
    }),
  });

  const result = await service.getSystemStats({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['anything'],
      },
      userId: USER_ID,
    },
    query: {},
  });

  assert.equal(result.generated_at, '2026-07-03T06:00:00.000Z');
  assert.equal(result.system_health.status, 'degraded');
  assert.equal(result.system_health.checks.database.status, 'connected');
  assert.equal(result.users.total, 11);
  assert.equal(result.users.by_status.active, 10);
  assert.equal(result.users.by_status.deleted, 0);
  assert.equal(result.services.total, 9);
  assert.equal(result.services.by_type.hotel, 5);
  assert.equal(result.services.by_status.active, 7);
  assert.equal(result.bookings.total, 4);
  assert.equal(result.bookings.by_status.confirmed, 3);
  assert.equal(result.payments.by_status.success, 5);
  assert.equal(result.refunds.by_status.requested, 2);
  assert.equal(result.mail.by_status.failed, 1);
  assert.equal(result.notifications.by_status.read, 6);
});

test('adminSystemStatsService.getSystemStats rejects non-system-admin access and query parameters, and wraps DB failures', async () => {
  const service = adminSystemStatsService.createAdminSystemStatsService({
    repository: {
      getSystemStatsSnapshot: async () => {
        throw new Error('db connection string should stay hidden');
      },
    },
  });

  await assert.rejects(
    () => service.getSystemStats({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: [],
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
    () => service.getSystemStats({
      auth: {
        role: 'system_admin',
        tokenPayload: {
          permissions: [],
        },
        userId: USER_ID,
      },
      query: {
        page: '1',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'query',
          message: 'This endpoint does not accept query parameters',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.getSystemStats({
      auth: {
        role: 'system_admin',
        tokenPayload: {
          permissions: [],
        },
        userId: USER_ID,
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INTERNAL_ERROR);
      assert.equal(error.message, 'System stats are unavailable');
      return true;
    },
  );
});

test('adminSystemStatsRepository SQL reads aggregate counts only from operational tables', async () => {
  const captured = [];
  const repository = createAdminSystemStatsRepository({
    queryImpl: async (sql) => {
      captured.push(sql);
      return {
        rows: [],
      };
    },
  });

  await repository.getSystemStatsSnapshot();

  assert.equal(captured.length, 8);
  assert.match(captured[0], /FROM users u/);
  assert.match(captured[1], /FROM services s/);
  assert.match(captured[3], /FROM bookings b/);
  assert.match(captured[4], /FROM payments p/);
  assert.match(captured[5], /FROM refunds r/);
  assert.match(captured[6], /FROM email_logs el/);
  assert.match(captured[7], /FROM notifications n/);
  assert.doesNotMatch(
    captured.join('\n'),
    /\bto_email\b|\bcontact_email\b|\bcustomer_email\b|\bphone\b|\bfull_name\b/i,
  );
});

test('GET /api/admin/system/stats enforces auth and returns system-admin stats payload', async () => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = TEST_ACCESS_SECRET;
  const server = app.listen(0);

  adminSystemStatsService.getSystemStats = async ({
    auth,
    query,
  }) => {
    assert.equal(auth.role, 'system_admin');
    assert.equal(auth.userId, USER_ID);
    assert.equal(Object.keys(query || {}).length, 0);

    return {
      bookings: {
        by_status: {
          confirmed: 2,
        },
        total: 2,
      },
      generated_at: '2026-07-03T06:00:00.000Z',
      mail: {
        by_status: {
          queued: 1,
        },
        total: 1,
      },
      notifications: {
        by_status: {
          read: 3,
        },
        total: 3,
      },
      payments: {
        by_status: {
          success: 4,
        },
        total: 4,
      },
      refunds: {
        by_status: {
          requested: 1,
        },
        total: 1,
      },
      services: {
        by_status: {
          active: 5,
        },
        by_type: {
          hotel: 3,
        },
        total: 5,
      },
      system_health: {
        checks: {
          cloudinary: {
            message: 'Cloudinary connection is working',
            ready: true,
            service: 'cloudinary',
            status: 'connected',
          },
          database: {
            message: 'Database aggregation is working',
            ready: true,
            service: 'database',
            status: 'connected',
          },
          sendgrid: {
            message: 'SendGrid connection is working',
            ready: true,
            service: 'sendgrid',
            status: 'connected',
          },
        },
        status: 'ok',
      },
      users: {
        by_status: {
          active: 8,
        },
        total: 8,
      },
    };
  };

  try {
    const unauthorizedResponse = await request(server, `${apiPrefix}/admin/system/stats`, {
      method: 'GET',
    });

    assert.equal(unauthorizedResponse.statusCode, 401);
    assert.equal(unauthorizedResponse.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);

    const adminResponse = await request(server, `${apiPrefix}/admin/system/stats`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: [],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(adminResponse.statusCode, 403);
    assert.equal(adminResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const staffResponse = await request(server, `${apiPrefix}/admin/system/stats`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: [],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(staffResponse.statusCode, 403);
    assert.equal(staffResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    adminSystemStatsService.getSystemStats = originalGetSystemStats;

    const invalidQueryResponse = await request(server, `${apiPrefix}/admin/system/stats?page=1`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: [],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(invalidQueryResponse.statusCode, 400);
    assert.equal(invalidQueryResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);

    adminSystemStatsService.getSystemStats = async ({
      auth,
      query,
    }) => {
      assert.equal(auth.role, 'system_admin');
      assert.equal(auth.userId, USER_ID);
      assert.equal(Object.keys(query || {}).length, 0);

      return {
        bookings: {
          by_status: {
            confirmed: 2,
          },
          total: 2,
        },
        generated_at: '2026-07-03T06:00:00.000Z',
        mail: {
          by_status: {
            queued: 1,
          },
          total: 1,
        },
        notifications: {
          by_status: {
            read: 3,
          },
          total: 3,
        },
        payments: {
          by_status: {
            success: 4,
          },
          total: 4,
        },
        refunds: {
          by_status: {
            requested: 1,
          },
          total: 1,
        },
        services: {
          by_status: {
            active: 5,
          },
          by_type: {
            hotel: 3,
          },
          total: 5,
        },
        system_health: {
          checks: {
            cloudinary: {
              message: 'Cloudinary connection is working',
              ready: true,
              service: 'cloudinary',
              status: 'connected',
            },
            database: {
              message: 'Database aggregation is working',
              ready: true,
              service: 'database',
              status: 'connected',
            },
            sendgrid: {
              message: 'SendGrid connection is working',
              ready: true,
              service: 'sendgrid',
              status: 'connected',
            },
          },
          status: 'ok',
        },
        users: {
          by_status: {
            active: 8,
          },
          total: 8,
        },
      };
    };

    const successResponse = await request(server, `${apiPrefix}/admin/system/stats`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: [],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(successResponse.statusCode, 200);
    assert.equal(successResponse.body.success, true);
    assert.equal(successResponse.body.message, 'System stats retrieved successfully');
    assert.equal(successResponse.body.data.system_health.status, 'ok');
    assert.equal(successResponse.body.data.generated_at, '2026-07-03T06:00:00.000Z');
  } finally {
    server.close();
    process.env.JWT_ACCESS_SECRET = previousSecret;
  }
});
