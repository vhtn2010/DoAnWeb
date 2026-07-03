const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  createAdminDashboardRepository,
} = require('../database/adminDashboardRepository');
const adminDashboardService = require('../services/adminDashboardService');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const originalGetOverview = adminDashboardService.getOverview;
const originalGetRevenueChart = adminDashboardService.getRevenueChart;
const originalGetBookingChart = adminDashboardService.getBookingChart;
const TEST_ACCESS_SECRET = 'test-admin-dashboard-secret';

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
  adminDashboardService.getOverview = originalGetOverview;
  adminDashboardService.getRevenueChart = originalGetRevenueChart;
  adminDashboardService.getBookingChart = originalGetBookingChart;
});

test('adminDashboardService.getOverview normalizes KPIs, default range, and booking status breakdown safely', async () => {
  const service = adminDashboardService.createAdminDashboardService({
    now: () => new Date('2026-07-15T05:00:00.000Z'),
    repository: {
      getOverviewBookingStatusBreakdown: async ({
        from,
        to,
      }) => {
        assert.equal(from, '2026-06-15T17:00:00.000Z');
        assert.equal(to, '2026-07-15T05:00:00.000Z');

        return [
          {
            status: 'confirmed',
            total_count: '3',
          },
          {
            status: 'cancelled',
            total_count: '1',
          },
        ];
      },
      getOverviewSnapshot: async ({
        from,
        to,
      }) => {
        assert.equal(from, '2026-06-15T17:00:00.000Z');
        assert.equal(to, '2026-07-15T05:00:00.000Z');

        return {
          active_services: '12',
          new_users: '9',
          pending_payments: '4',
          refund_requests: '2',
          refund_success_amount: '1250000',
          total_bookings: '21',
          total_revenue: '5500000',
        };
      },
    },
  });

  const result = await service.getOverview({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['dashboard.read'],
      },
      userId: USER_ID,
    },
    query: {},
  });

  assert.deepEqual(result, {
    data: {
      booking_status_breakdown: {
        cancel_requested: 0,
        cancelled: 1,
        completed: 0,
        confirmed: 3,
        expired: 0,
        failed: 0,
        in_progress: 0,
        paid: 0,
        partially_refunded: 0,
        payment_processing: 0,
        pending_payment: 0,
        refund_pending: 0,
        refunded: 0,
      },
      kpis: {
        active_services: 12,
        net_revenue: 4250000,
        new_users: 9,
        pending_payments: 4,
        refund_requests: 2,
        refund_success_amount: 1250000,
        total_bookings: 21,
        total_revenue: 5500000,
      },
      range: {
        from: '2026-06-16T00:00:00.000+07:00',
        timezone: 'Asia/Ho_Chi_Minh',
        to: '2026-07-15T12:00:00.000+07:00',
      },
    },
  });

  assert.equal(Object.prototype.hasOwnProperty.call(result.data, 'customer'), false);
});

test('adminDashboardService.getRevenueChart validates group_by and fills empty buckets with zero values', async () => {
  const service = adminDashboardService.createAdminDashboardService({
    repository: {
      getRevenueChartSummary: async ({
        from,
        groupBy,
        timezone,
        to,
      }) => {
        assert.equal(groupBy, 'day');
        assert.equal(timezone, 'Asia/Ho_Chi_Minh');
        assert.equal(from, '2026-06-30T17:00:00.000Z');
        assert.equal(to, '2026-07-03T16:59:59.999Z');

        return [
          {
            gross_revenue: '1500000',
            payment_count: '2',
            period_key: '2026-07-01',
            refund_amount: '200000',
          },
          {
            gross_revenue: '500000',
            payment_count: '1',
            period_key: '2026-07-03',
            refund_amount: '0',
          },
        ];
      },
    },
  });

  const result = await service.getRevenueChart({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['dashboard.read'],
      },
      userId: USER_ID,
    },
    query: {
      from: '2026-07-01',
      to: '2026-07-03',
    },
  });

  assert.deepEqual(result, {
    data: {
      charts: [
        {
          gross_revenue: 1500000,
          net_revenue: 1300000,
          payment_count: 2,
          period: '2026-07-01',
          refund_amount: 200000,
        },
        {
          gross_revenue: 0,
          net_revenue: 0,
          payment_count: 0,
          period: '2026-07-02',
          refund_amount: 0,
        },
        {
          gross_revenue: 500000,
          net_revenue: 500000,
          payment_count: 1,
          period: '2026-07-03',
          refund_amount: 0,
        },
      ],
      group_by: 'day',
      range: {
        from: '2026-07-01T00:00:00.000+07:00',
        timezone: 'Asia/Ho_Chi_Minh',
        to: '2026-07-03T23:59:59.999+07:00',
      },
    },
  });

  await assert.rejects(
    () => service.getRevenueChart({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['dashboard.read'],
        },
        userId: USER_ID,
      },
      query: {
        group_by: 'year',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'group_by',
          message: 'group_by must be one of: day, week, month',
        },
      ]);
      return true;
    },
  );
});

test('adminDashboardService.getBookingChart rejects invalid range and requires dashboard.read permission', async () => {
  const service = adminDashboardService.createAdminDashboardService({
    repository: {
      getBookingChartSummary: async () => [],
    },
  });

  await assert.rejects(
    () => service.getBookingChart({
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
    () => service.getBookingChart({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['dashboard.read'],
        },
        userId: USER_ID,
      },
      query: {
        from: '2026-07-05',
        to: '2026-07-01',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'from',
          message: 'from must be less than or equal to to',
        },
      ]);
      return true;
    },
  );
});

test('adminDashboardRepository overview and revenue SQL keep required status filters', async () => {
  const captured = [];
  const repository = createAdminDashboardRepository({
    queryImpl: async (sql, params) => {
      captured.push({
        params,
        sql,
      });
      return {
        rows: [],
      };
    },
  });

  await repository.getOverviewSnapshot({
    from: '2026-07-01T00:00:00.000Z',
    to: '2026-07-31T23:59:59.999Z',
  });
  await repository.getRevenueChartSummary({
    from: '2026-07-01T00:00:00.000Z',
    groupBy: 'week',
    timezone: 'Asia/Ho_Chi_Minh',
    to: '2026-07-31T23:59:59.999Z',
  });

  assert.match(captured[0].sql, /p\.status IN \('success', 'reconciled'\)/);
  assert.match(captured[0].sql, /r\.status = 'success'/);
  assert.match(captured[0].sql, /p\.status = ANY\(\$3::text\[\]\)/);
  assert.match(captured[0].sql, /r\.status = ANY\(\$4::text\[\]\)/);
  assert.match(captured[1].sql, /DATE_TRUNC\('week', TIMEZONE\(\$1, p\.paid_at\)\)/);
  assert.match(captured[1].sql, /WHERE r\.status = 'success'/);
});

test('GET /api/admin/dashboard routes enforce auth roles, validation, and successful admin access', async () => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = TEST_ACCESS_SECRET;
  const server = app.listen(0);

  adminDashboardService.getOverview = async ({
    auth,
    query,
  }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.deepEqual(auth.tokenPayload.permissions, ['dashboard.read']);
    assert.equal(query.from, '2026-07-01');
    assert.equal(query.to, '2026-07-31');

    return {
      data: {
        booking_status_breakdown: {
          cancelled: 1,
        },
        kpis: {
          active_services: 10,
          net_revenue: 4000000,
          new_users: 7,
          pending_payments: 2,
          refund_requests: 1,
          refund_success_amount: 1000000,
          total_bookings: 12,
          total_revenue: 5000000,
        },
        range: {
          from: '2026-07-01T00:00:00.000+07:00',
          timezone: 'Asia/Ho_Chi_Minh',
          to: '2026-07-31T23:59:59.999+07:00',
        },
      },
    };
  };

  adminDashboardService.getRevenueChart = (payload) =>
    adminDashboardService.createAdminDashboardService({
      repository: {
        getRevenueChartSummary: async () => [],
      },
    }).getRevenueChart(payload);

  adminDashboardService.getBookingChart = async () => ({
    data: {
      charts: [
        {
          cancelled_bookings: 0,
          completed_bookings: 0,
          confirmed_bookings: 0,
          period: '2026-07-01',
          total_bookings: 0,
        },
      ],
      group_by: 'day',
      range: {
        from: '2026-07-01T00:00:00.000+07:00',
        timezone: 'Asia/Ho_Chi_Minh',
        to: '2026-07-01T23:59:59.999+07:00',
      },
    },
  });

  try {
    const unauthorizedResponse = await request(server, `${apiPrefix}/admin/dashboard/overview`, {
      method: 'GET',
    });

    assert.equal(unauthorizedResponse.statusCode, 401);
    assert.equal(
      unauthorizedResponse.body.error.code,
      API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
    );

    const customerResponse = await request(server, `${apiPrefix}/admin/dashboard/overview`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['dashboard.read'],
          roleCode: 'customer',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(customerResponse.statusCode, 403);
    assert.equal(customerResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const staffResponse = await request(server, `${apiPrefix}/admin/dashboard/overview`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['dashboard.read'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(staffResponse.statusCode, 403);
    assert.equal(staffResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const okResponse = await request(server, `${apiPrefix}/admin/dashboard/overview?from=2026-07-01&to=2026-07-31`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['dashboard.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(okResponse.statusCode, 200);
    assert.equal(okResponse.body.success, true);
    assert.equal(okResponse.body.data.kpis.total_revenue, 5000000);

    const validationResponse = await request(server, `${apiPrefix}/admin/dashboard/charts/revenue?group_by=year`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['dashboard.read'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);

    const bookingsResponse = await request(server, `${apiPrefix}/admin/dashboard/charts/bookings`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['dashboard.read'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(bookingsResponse.statusCode, 200);
    assert.equal(bookingsResponse.body.success, true);
    assert.equal(bookingsResponse.body.data.charts[0].period, '2026-07-01');
  } finally {
    server.close();
    process.env.JWT_ACCESS_SECRET = previousSecret;
  }
});
