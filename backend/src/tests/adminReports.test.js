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
  createAdminReportRepository,
} = require('../database/adminReportRepository');
const adminReportService = require('../services/adminReportService');

const USER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TEST_ACCESS_SECRET = 'test-admin-report-secret';
const originalGetRevenueReport = adminReportService.getRevenueReport;
const originalGetBookingReport = adminReportService.getBookingReport;
const originalGetServiceReport = adminReportService.getServiceReport;
const originalGetPaymentReport = adminReportService.getPaymentReport;

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
  adminReportService.getBookingReport = originalGetBookingReport;
  adminReportService.getPaymentReport = originalGetPaymentReport;
  adminReportService.getRevenueReport = originalGetRevenueReport;
  adminReportService.getServiceReport = originalGetServiceReport;
});

test('adminReportService.getRevenueReport validates required range, uses paid_at buckets, and warns on missing paid_at payments', async () => {
  const service = adminReportService.createAdminReportService({
    repository: {
      countRevenuePaymentsMissingPaidAt: async () => 2,
      getRevenuePeriods: async ({
        from,
        groupBy,
        timezone,
        to,
      }) => {
        assert.equal(groupBy, 'week');
        assert.equal(timezone, 'Asia/Ho_Chi_Minh');
        assert.equal(from, '2026-06-30T17:00:00.000Z');
        assert.equal(to, '2026-07-14T16:59:59.999Z');

        return [
          {
            gross_revenue: '3000000',
            payment_count: '3',
            period_key: '2026-06-29',
            refund_amount: '500000',
          },
          {
            gross_revenue: '2500000',
            payment_count: '2',
            period_key: '2026-07-06',
            refund_amount: '0',
          },
        ];
      },
      getRevenueSummary: async ({
        from,
        to,
      }) => {
        assert.equal(from, '2026-06-30T17:00:00.000Z');
        assert.equal(to, '2026-07-14T16:59:59.999Z');

        return {
          gross_revenue: '5500000',
          payment_count: '5',
          refund_amount: '500000',
          refund_count: '1',
        };
      },
    },
  });

  const result = await service.getRevenueReport({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['report.read'],
      },
      userId: USER_ID,
    },
    query: {
      from: '2026-07-01',
      group_by: 'week',
      to: '2026-07-14',
    },
  });

  assert.deepEqual(result, {
    group_by: 'week',
    periods: [
      {
        gross_revenue: 3000000,
        net_revenue: 2500000,
        payment_count: 3,
        period: '2026-06-29',
        refund_amount: 500000,
      },
      {
        gross_revenue: 2500000,
        net_revenue: 2500000,
        payment_count: 2,
        period: '2026-07-06',
        refund_amount: 0,
      },
      {
        gross_revenue: 0,
        net_revenue: 0,
        payment_count: 0,
        period: '2026-07-13',
        refund_amount: 0,
      },
    ],
    range: {
      from: '2026-07-01T00:00:00.000+07:00',
      timezone: 'Asia/Ho_Chi_Minh',
      to: '2026-07-14T23:59:59.999+07:00',
    },
    summary: {
      gross_revenue: 5500000,
      net_revenue: 5000000,
      payment_count: 5,
      refund_amount: 500000,
      refund_count: 1,
    },
    warnings: [
      {
        code: 'PAYMENTS_MISSING_PAID_AT',
        count: 2,
        message: 'Successful or reconciled payments without paid_at are excluded from revenue buckets',
      },
    ],
  });

  await assert.rejects(
    () => service.getRevenueReport({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['report.read'],
        },
        userId: USER_ID,
      },
      query: {
        to: '2026-07-14',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'from',
          message: 'from is required',
        },
      ]);
      return true;
    },
  );
});

test('adminReportService.getBookingReport requires report.read and returns minimal booking summaries', async () => {
  const service = adminReportService.createAdminReportService({
    repository: {
      getBookingStatusBreakdown: async () => [
        {
          status: 'confirmed',
          total_count: '4',
        },
        {
          status: 'cancelled',
          total_count: '1',
        },
      ],
      getBookingSummary: async () => ({
        total_booking_value: '8800000',
        total_bookings: '5',
      }),
      listRecentBookings: async ({
        limit,
      }) => {
        assert.equal(limit, 20);

        return [
          {
            booking_code: 'BK202607010001',
            created_at: '2026-07-01T08:00:00.000Z',
            currency: 'VND',
            status: 'confirmed',
            total_amount: '2200000',
          },
        ];
      },
    },
  });

  await assert.rejects(
    () => service.getBookingReport({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['dashboard.read'],
        },
        userId: USER_ID,
      },
      query: {
        from: '2026-07-01',
        to: '2026-07-31',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  const result = await service.getBookingReport({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['report.read'],
      },
      userId: USER_ID,
    },
    query: {
      from: '2026-07-01',
      status: 'confirmed',
      to: '2026-07-31',
    },
  });

  assert.equal(result.summary.total_bookings, 5);
  assert.equal(result.summary.total_booking_value, 8800000);
  assert.equal(result.status_breakdown.confirmed, 4);
  assert.equal(result.status_breakdown.cancelled, 1);
  assert.deepEqual(result.recent_bookings, [
    {
      booking_code: 'BK202607010001',
      created_at: '2026-07-01T08:00:00.000Z',
      currency: 'VND',
      status: 'confirmed',
      total_amount: 2200000,
    },
  ]);
});

test('adminReportService.getServiceReport validates enums and returns inventory plus top service metrics', async () => {
  const service = adminReportService.createAdminReportService({
    repository: {
      getServiceInventorySummary: async () => ({
        flight_available_seats: '22',
        hotel_available_rooms: '14',
        train_available_seats: '11',
      }),
      getServiceStatusBreakdown: async () => [
        {
          status: 'active',
          total_count: '3',
        },
      ],
      getServiceSummary: async () => ({
        active_services: '3',
        total_services: '5',
      }),
      getServiceTypeBreakdown: async () => [
        {
          service_type: 'hotel',
          total_count: '2',
        },
        {
          service_type: 'flight',
          total_count: '1',
        },
      ],
      getTopBookedServices: async ({
        limit,
        serviceStatus,
        serviceType,
      }) => {
        assert.equal(limit, 5);
        assert.equal(serviceStatus, 'active');
        assert.equal(serviceType, 'hotel');

        return [
          {
            booked_quantity: '12',
            booked_value: '12800000',
            booking_item_count: '4',
            deleted_at: null,
            id: 'service-1',
            service_code: 'SVC001',
            service_type: 'hotel',
            status: 'active',
            title: 'Hotel Da Nang',
          },
        ];
      },
    },
  });

  const result = await service.getServiceReport({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['report.read'],
      },
      userId: USER_ID,
    },
    query: {
      status: 'active',
      type: 'hotel',
    },
  });

  assert.deepEqual(result, {
    filters: {
      status: 'active',
      type: 'hotel',
    },
    inventory: {
      flight_available_seats: 22,
      hotel_available_rooms: 14,
      train_available_seats: 11,
    },
    status_breakdown: {
      active: 3,
      archived: 0,
      deleted: 0,
      draft: 0,
      expired: 0,
      hidden: 0,
      pending_review: 0,
      sold_out: 0,
    },
    summary: {
      active_services: 3,
      total_services: 5,
    },
    top_services: [
      {
        booked_quantity: 12,
        booked_value: 12800000,
        booking_item_count: 4,
        is_deleted: false,
        service_code: 'SVC001',
        service_id: 'service-1',
        service_type: 'hotel',
        status: 'active',
        title: 'Hotel Da Nang',
      },
    ],
    type_breakdown: {
      combo: 0,
      flight: 1,
      hotel: 2,
      room: 0,
      tour: 0,
      train: 0,
    },
  });

  await assert.rejects(
    () => service.getServiceReport({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['report.read'],
        },
        userId: USER_ID,
      },
      query: {
        type: 'spa',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'type',
          message: 'type must be one of: tour, hotel, room, flight, train, combo',
        },
      ]);
      return true;
    },
  );
});

test('adminReportService.getPaymentReport uses created_at filters and hides raw payment response details', async () => {
  const service = adminReportService.createAdminReportService({
    repository: {
      getPaymentMethodBreakdown: async () => [
        {
          payment_method: 'manual_bank_transfer',
          total_count: '2',
        },
      ],
      getPaymentStatusBreakdown: async () => [
        {
          status: 'pending',
          total_count: '1',
        },
        {
          status: 'reconciled',
          total_count: '1',
        },
        {
          status: 'success',
          total_count: '1',
        },
      ],
      getPaymentSummary: async ({
        from,
        status,
        to,
      }) => {
        assert.equal(from, '2026-06-30T17:00:00.000Z');
        assert.equal(status, null);
        assert.equal(to, '2026-07-31T16:59:59.999Z');

        return {
          reconciled_amount: '2000000',
          reconciled_count: '1',
          success_amount: '1500000',
          success_count: '1',
          total_amount: '4500000',
          total_payments: '3',
        };
      },
      listRecentPayments: async () => [
        {
          amount: '1500000',
          booking_code: 'BK202607010001',
          created_at: '2026-07-01T09:00:00.000Z',
          currency: 'VND',
          has_proof: true,
          paid_at: '2026-07-01T10:00:00.000Z',
          payment_code: 'PAY202607010001',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          raw_response: {
            proof: {
              proof_image_url: 'https://example.com/proof.jpg',
            },
          },
          status: 'success',
        },
      ],
    },
  });

  const result = await service.getPaymentReport({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['report.read'],
      },
      userId: USER_ID,
    },
    query: {
      from: '2026-07-01',
      to: '2026-07-31',
    },
  });

  assert.equal(result.summary.total_payments, 3);
  assert.equal(result.summary.collected_amount, 3500000);
  assert.equal(result.status_breakdown.success, 1);
  assert.equal(result.status_breakdown.reconciled, 1);
  assert.equal(result.method_breakdown.manual_bank_transfer, 2);
  assert.deepEqual(result.recent_payments, [
    {
      amount: 1500000,
      booking_code: 'BK202607010001',
      created_at: '2026-07-01T09:00:00.000Z',
      currency: 'VND',
      has_proof: true,
      paid_at: '2026-07-01T10:00:00.000Z',
      payment_code: 'PAY202607010001',
      payment_method: 'manual_bank_transfer',
      provider: 'direct',
      status: 'success',
    },
  ]);
  assert.equal(
    Object.prototype.hasOwnProperty.call(result.recent_payments[0], 'raw_response'),
    false,
  );
});

test('adminReportRepository SQL uses safe report sources and does not expose raw_response directly in payment list', async () => {
  const captured = [];
  const repository = createAdminReportRepository({
    queryImpl: async (sql, params = []) => {
      captured.push({
        params,
        sql,
      });
      return {
        rows: [],
      };
    },
  });

  await repository.getRevenueSummary({
    from: '2026-07-01T00:00:00.000Z',
    to: '2026-07-31T23:59:59.999Z',
  });
  await repository.getBookingSummary({
    from: '2026-07-01T00:00:00.000Z',
    status: 'confirmed',
    to: '2026-07-31T23:59:59.999Z',
  });
  await repository.getServiceInventorySummary({
    serviceStatus: 'active',
    serviceType: 'hotel',
  });
  await repository.listRecentPayments({
    from: '2026-07-01T00:00:00.000Z',
    limit: 20,
    status: null,
    to: '2026-07-31T23:59:59.999Z',
  });

  assert.match(captured[0].sql, /p\.status IN \('success', 'reconciled'\)/);
  assert.match(captured[0].sql, /r\.status = 'success'/);
  assert.match(captured[1].sql, /FROM bookings b/);
  assert.match(captured[1].sql, /b\.created_at >= \$1/);
  assert.match(captured[2].sql, /FROM room_types rt/);
  assert.match(captured[2].sql, /FROM flight_details fd/);
  assert.match(captured[2].sql, /FROM train_details td/);
  assert.match(captured[3].sql, /jsonb_typeof\(p\.raw_response -> 'proof'\)/);
  assert.doesNotMatch(captured[3].sql, /SELECT[\s\S]*p\.raw_response,/);
});

test('GET /api/admin/reports routes enforce auth, permissions, validation, and admin success cases', async () => {
  const previousSecret = process.env.JWT_ACCESS_SECRET;
  process.env.JWT_ACCESS_SECRET = TEST_ACCESS_SECRET;
  const server = app.listen(0);

  adminReportService.getRevenueReport = async ({
    auth,
    query,
  }) => {
    assert.equal(auth.role, 'admin');
    assert.equal(auth.userId, USER_ID);
    assert.equal(query.group_by, 'month');

    return {
      group_by: 'month',
      periods: [],
      range: {
        from: '2026-07-01T00:00:00.000+07:00',
        timezone: 'Asia/Ho_Chi_Minh',
        to: '2026-07-31T23:59:59.999+07:00',
      },
      summary: {
        gross_revenue: 5000000,
        net_revenue: 4800000,
        payment_count: 2,
        refund_amount: 200000,
        refund_count: 1,
      },
    };
  };

  adminReportService.getServiceReport = async ({
    auth,
    query,
  }) => {
    assert.equal(auth.role, 'system_admin');
    assert.equal(query.type, 'hotel');

    return {
      filters: {
        status: 'active',
        type: 'hotel',
      },
      inventory: {
        flight_available_seats: 0,
        hotel_available_rooms: 5,
        train_available_seats: 0,
      },
      status_breakdown: {
        active: 2,
      },
      summary: {
        active_services: 2,
        total_services: 2,
      },
      top_services: [],
      type_breakdown: {
        hotel: 2,
      },
    };
  };

  try {
    const unauthorizedResponse = await request(server, `${apiPrefix}/admin/reports/revenue?from=2026-07-01&to=2026-07-31`, {
      method: 'GET',
    });

    assert.equal(unauthorizedResponse.statusCode, 401);
    assert.equal(unauthorizedResponse.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);

    const customerResponse = await request(server, `${apiPrefix}/admin/reports/revenue?from=2026-07-01&to=2026-07-31`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'customer',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(customerResponse.statusCode, 403);
    assert.equal(customerResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const staffResponse = await request(server, `${apiPrefix}/admin/reports/revenue?from=2026-07-01&to=2026-07-31`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'staff',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(staffResponse.statusCode, 403);
    assert.equal(staffResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    adminReportService.getRevenueReport = originalGetRevenueReport;

    const missingPermissionResponse = await request(server, `${apiPrefix}/admin/reports/revenue?from=2026-07-01&to=2026-07-31`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['dashboard.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(missingPermissionResponse.statusCode, 403);
    assert.equal(missingPermissionResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    adminReportService.getRevenueReport = async ({
      auth,
      query,
    }) => {
      assert.equal(auth.role, 'admin');
      assert.equal(auth.userId, USER_ID);
      assert.equal(query.group_by, 'month');

      return {
        group_by: 'month',
        periods: [],
        range: {
          from: '2026-07-01T00:00:00.000+07:00',
          timezone: 'Asia/Ho_Chi_Minh',
          to: '2026-07-31T23:59:59.999+07:00',
        },
        summary: {
          gross_revenue: 5000000,
          net_revenue: 4800000,
          payment_count: 2,
          refund_amount: 200000,
          refund_count: 1,
        },
      };
    };

    const revenueResponse = await request(server, `${apiPrefix}/admin/reports/revenue?from=2026-07-01&to=2026-07-31&group_by=month`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(revenueResponse.statusCode, 200);
    assert.equal(revenueResponse.body.success, true);
    assert.equal(revenueResponse.body.data.summary.net_revenue, 4800000);

    const validationResponse = await request(server, `${apiPrefix}/admin/reports/bookings?to=2026-07-31`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationResponse.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);

    const serviceResponse = await request(server, `${apiPrefix}/admin/reports/services?type=hotel&status=active`, {
      headers: {
        Authorization: `Bearer ${createAccessToken({
          permissions: ['report.read'],
          roleCode: 'system_admin',
          userId: USER_ID,
        })}`,
      },
      method: 'GET',
    });

    assert.equal(serviceResponse.statusCode, 200);
    assert.equal(serviceResponse.body.success, true);
    assert.equal(serviceResponse.body.data.summary.active_services, 2);
  } finally {
    server.close();
    process.env.JWT_ACCESS_SECRET = previousSecret;
  }
});
