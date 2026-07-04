const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const adminReportExportService = require('../services/adminReportExportService');
const {
  ADMIN_REPORT_EXPORT_RATE_LIMIT_STORE_KEY,
} = require('../routes/adminReportRoutes');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEST_ACCESS_SECRET = 'test-admin-report-export-secret';
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalExportReport = adminReportExportService.exportReport;

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const body = options.body == null
      ? null
      : (typeof options.body === 'string'
          ? options.body
          : JSON.stringify(options.body));
    const headers = {
      Connection: 'close',
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
        agent: false,
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

    if (body) {
      req.write(body);
    }

    req.end();
  });

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
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

const createAuthContext = ({
  permissions = [],
  roleCode = 'admin',
  userId = USER_ID,
} = {}) => ({
  permissions,
  roleCode,
  tokenId: 'access-jti-1',
  user: {
    email: `${userId}@example.com`,
    id: userId,
    password_hash: '$2b$10$hash',
    role_code: roleCode,
    role_id: 'role-1',
    status: 'active',
  },
  userId,
});

test.beforeEach(() => {
  clearRateLimitStore(ADMIN_REPORT_EXPORT_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminReportExportService.exportReport = originalExportReport;
});

test.afterEach(() => {
  clearRateLimitStore(ADMIN_REPORT_EXPORT_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminReportExportService.exportReport = originalExportReport;
});

test('adminReportExportService.exportReport reuses report service, stores file, and logs safe metadata', async () => {
  const capturedLogs = [];
  const capturedStorage = [];
  const service = adminReportExportService.createAdminReportExportService({
    fileStorage: {
      saveFile: async (payload) => {
        capturedStorage.push(payload);

        return {
          file_url: 'https://files.example.com/revenue-2026.xlsx',
          storage: 'local',
        };
      },
    },
    now: () => new Date('2026-07-03T04:00:00.000Z'),
    renderXlsx: ({
      sheets,
      title,
    }) => {
      assert.equal(title, 'Revenue Report');
      assert.equal(Array.isArray(sheets), true);
      return Buffer.from('xlsx-binary');
    },
    reportService: {
      getRevenueReport: async ({
        auth,
        query,
      }) => {
        assert.equal(auth.userId, USER_ID);
        assert.deepEqual(query, {
          from: '2026-07-01',
          group_by: 'day',
          to: '2026-07-07',
        });

        return {
          group_by: 'day',
          periods: [
            {
              gross_revenue: 1000000,
              net_revenue: 900000,
              payment_count: 1,
              period: '2026-07-01',
              refund_amount: 100000,
            },
          ],
          range: {
            from: '2026-07-01T00:00:00.000+07:00',
            timezone: 'Asia/Ho_Chi_Minh',
            to: '2026-07-07T23:59:59.999+07:00',
          },
          summary: {
            gross_revenue: 1000000,
            net_revenue: 900000,
            payment_count: 1,
            refund_amount: 100000,
            refund_count: 1,
          },
          warnings: [],
        };
      },
    },
    repository: {
      insertUserLog: async (payload) => {
        capturedLogs.push(payload);
      },
    },
  });

  const result = await service.exportReport({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['report.export'],
      },
      userId: USER_ID,
    },
    body: {
      filters: {
        group_by: 'day',
      },
      format: 'xlsx',
      from: '2026-07-01',
      report_type: 'revenue',
      to: '2026-07-07',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'admin-report-export-test',
  });

  assert.deepEqual(result, {
    file_url: 'https://files.example.com/revenue-2026.xlsx',
    format: 'xlsx',
    generated_at: '2026-07-03T04:00:00.000Z',
    report_type: 'revenue',
  });
  assert.equal(capturedStorage.length, 1);
  assert.match(capturedStorage[0].fileName, /^revenue-2026-07-01-2026-07-07-20260703040000\.xlsx$/);
  assert.equal(Buffer.isBuffer(capturedStorage[0].buffer), true);
  assert.deepEqual(capturedLogs, [
    {
      action: 'report.export',
      entityName: 'reports',
      ipAddress: '127.0.0.1',
      metadata: {
        file_url: 'https://files.example.com/revenue-2026.xlsx',
        filters: {
          group_by: 'day',
        },
        format: 'xlsx',
        from: '2026-07-01',
        report_type: 'revenue',
        storage: 'local',
        to: '2026-07-07',
      },
      userAgent: 'admin-report-export-test',
      userId: USER_ID,
    },
  ]);
});

test('adminReportExportService.exportReport validates input and rejects oversize PDF datasets', async () => {
  const service = adminReportExportService.createAdminReportExportService({
    reportService: {
      getBookingReport: async () => ({
        filters: {
          status: null,
        },
        range: {
          from: '2026-07-01T00:00:00.000+07:00',
          timezone: 'Asia/Ho_Chi_Minh',
          to: '2026-07-31T23:59:59.999+07:00',
        },
        recent_bookings: [],
        status_breakdown: {
          confirmed: 201,
        },
        summary: {
          total_booking_value: 1000,
          total_bookings: 201,
        },
      }),
    },
    repository: {
      insertUserLog: async () => {},
      listExportBookings: async () => Array.from({
        length: 201,
      }, (_, index) => ({
        booking_code: `BK${index + 1}`,
        created_at: '2026-07-01T00:00:00.000Z',
        currency: 'VND',
        status: 'confirmed',
        total_amount: '1000',
      })),
    },
  });

  await assert.rejects(
    () => service.exportReport({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['report.export'],
        },
        userId: USER_ID,
      },
      body: {
        filters: {},
        format: 'pdf',
        from: '2026-07-01',
        report_type: 'bookings',
        to: '2026-07-31',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'range',
          message: 'Export dataset for bookings is too large. Please narrow the range or use a lighter format.',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.exportReport({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['report.export'],
        },
        userId: USER_ID,
      },
      body: {
        format: 'xlsx',
        report_type: 'unknown',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'report_type',
          message: 'report_type must be one of: revenue, bookings, services, payments',
        },
      ]);
      return true;
    },
  );
});

test('POST /api/admin/reports/export enforces auth, permission, validation, and rate limit', async () => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = TEST_ACCESS_SECRET;
  const server = app.listen(0);

  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions: tokenPayload.permissions || [],
      roleCode: tokenPayload.roleCode,
      userId: tokenPayload.userId,
    });

  adminReportExportService.exportReport = async ({
    auth,
    body,
    ipAddress,
    userAgent,
  }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.equal(ipAddress != null, true);
    assert.equal(userAgent, 'report-export-route-test');
    assert.equal(body.report_type, 'payments');

    return {
      file_url: 'https://files.example.com/payments-2026.pdf',
      format: 'pdf',
      generated_at: '2026-07-03T04:00:00.000Z',
      report_type: 'payments',
    };
  };

  try {
    const unauthorizedResponse = await request(server, `${apiPrefix}/admin/reports/export`, {
      body: {
        format: 'xlsx',
        report_type: 'revenue',
      },
      method: 'POST',
    });

    assert.equal(unauthorizedResponse.statusCode, 401);
    assert.equal(unauthorizedResponse.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);

    const customerResponse = await request(server, `${apiPrefix}/admin/reports/export`, {
      body: {
        format: 'xlsx',
        report_type: 'revenue',
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.export'],
          roleCode: 'customer',
          userId: USER_ID,
        })}`,
      },
      method: 'POST',
    });

    assert.equal(customerResponse.statusCode, 403);
    assert.equal(customerResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const staffResponse = await request(server, `${apiPrefix}/admin/reports/export`, {
      body: {
        format: 'xlsx',
        report_type: 'revenue',
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.export'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'POST',
    });

    assert.equal(staffResponse.statusCode, 403);
    assert.equal(staffResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    adminReportExportService.exportReport = originalExportReport;

    const missingPermissionResponse = await request(server, `${apiPrefix}/admin/reports/export`, {
      body: {
        filters: {},
        format: 'xlsx',
        from: '2026-07-01',
        report_type: 'revenue',
        to: '2026-07-02',
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'POST',
    });

    assert.equal(missingPermissionResponse.statusCode, 403);
    assert.equal(missingPermissionResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    adminReportExportService.exportReport = async () => ({
      file_url: 'https://files.example.com/payments-2026.pdf',
      format: 'pdf',
      generated_at: '2026-07-03T04:00:00.000Z',
      report_type: 'payments',
    });

    const okResponse = await request(server, `${apiPrefix}/admin/reports/export`, {
      body: {
        filters: {
          status: 'success',
        },
        format: 'pdf',
        from: '2026-07-01',
        report_type: 'payments',
        to: '2026-07-31',
      },
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.export'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
        'User-Agent': 'report-export-route-test',
      },
      method: 'POST',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.file_url, 'https://files.example.com/payments-2026.pdf');

    let lastResponse = null;

    for (let attempt = 0; attempt < 11; attempt += 1) {
      lastResponse = await request(server, `${apiPrefix}/admin/reports/export`, {
        body: {
          filters: {
            status: 'success',
          },
          format: 'pdf',
          from: '2026-07-01',
          report_type: 'payments',
          to: '2026-07-31',
        },
        headers: {
          Authorization: `Bearer ${createAccessToken({
            permissions: ['report.export'],
            roleCode: 'admin',
            userId: 'admin-rate-limit',
          })}`,
          'User-Agent': 'report-export-route-test',
        },
        method: 'POST',
      });
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    await closeServer(server);
    process.env.JWT_ACCESS_SECRET = previousSecret;
  }
});
