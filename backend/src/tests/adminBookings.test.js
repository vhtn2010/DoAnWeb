const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-booking-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
  BOOKING_STATUS,
} = require('../constants/domainConstraints');
const adminBookingService = require('../services/adminBookingService');

const BOOKING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const originalGetBookingDetail = adminBookingService.getBookingDetail;
const originalListBookings = adminBookingService.listBookings;

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

const createAccessToken = (payload, secret = process.env.JWT_ACCESS_SECRET) => {
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
  adminBookingService.getBookingDetail = originalGetBookingDetail;
  adminBookingService.listBookings = originalListBookings;
});

test('adminBookingService.listBookings validates filters and applies staff service scope', async () => {
  const service = adminBookingService.createAdminBookingService({
    repository: {
      listBookings: async (filters) => {
        assert.deepEqual(filters, {
          allowedServiceIds: ['service-1', 'service-2'],
          bookingStatus: BOOKING_STATUS.PAID,
          from: '2026-07-01T00:00:00.000Z',
          keyword: 'BK2026',
          limit: 2,
          offset: 2,
          to: '2026-07-31T00:00:00.000Z',
        });

        return {
          rows: [
            {
              booking_code: 'BK202607010001',
              contact_email: 'customer@example.com',
              contact_name: 'Nguyen Van A',
              contact_phone: '+84901234567',
              created_at: '2026-07-01T01:00:00.000Z',
              currency: 'VND',
              customer_email: 'customer@example.com',
              customer_full_name: 'Nguyen Van A',
              customer_phone: '+84901234567',
              discount_amount: '100000',
              expires_at: '2026-07-02T01:00:00.000Z',
              id: BOOKING_ID,
              item_count: 2,
              status: BOOKING_STATUS.PAID,
              subtotal_amount: '1500000',
              total_amount: '1400000',
              updated_at: '2026-07-01T01:30:00.000Z',
              user_id: '99999999-9999-4999-8999-999999999999',
            },
          ],
          total: 3,
        };
      },
    },
  });

  const result = await service.listBookings({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1', 'service-2'],
      tokenPayload: {
        permissions: ['booking.read_all'],
      },
    },
    query: {
      from: '2026-07-01',
      limit: '2',
      page: '2',
      q: '  BK2026  ',
      status: BOOKING_STATUS.PAID,
      to: '2026-07-31',
    },
  });

  assert.deepEqual(result, {
    items: [
      {
        booking_code: 'BK202607010001',
        contact_email: 'customer@example.com',
        contact_name: 'Nguyen Van A',
        contact_phone: '+84901234567',
        created_at: '2026-07-01T01:00:00.000Z',
        currency: 'VND',
        customer: {
          email: 'customer@example.com',
          full_name: 'Nguyen Van A',
          id: '99999999-9999-4999-8999-999999999999',
          phone: '+84901234567',
        },
        discount_amount: 100000,
        expires_at: '2026-07-02T01:00:00.000Z',
        id: BOOKING_ID,
        item_count: 2,
        status: BOOKING_STATUS.PAID,
        subtotal_amount: 1500000,
        total_amount: 1400000,
        updated_at: '2026-07-01T01:30:00.000Z',
      },
    ],
    meta: {
      has_next: false,
      limit: 2,
      page: 2,
      total: 3,
      total_pages: 2,
    },
  });
});

test('adminBookingService.listBookings rejects invalid status and date range', async () => {
  const service = adminBookingService.createAdminBookingService({
    repository: {
      listBookings: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.listBookings({
      auth: {
        role: 'admin',
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
    () => service.listBookings({
      auth: {
        role: 'admin',
      },
      query: {
        from: '2026-07-31',
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

test('adminBookingService.getBookingDetail returns sanitized admin-safe booking detail', async () => {
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async ({
        allowedServiceIds,
        bookingId,
      }) => {
        assert.equal(bookingId, BOOKING_ID);
        assert.equal(allowedServiceIds, null);

        return {
          booking_code: 'BK202607010001',
          contact_email: 'customer@example.com',
          contact_name: 'Nguyen Van A',
          contact_phone: '+84901234567',
          created_at: '2026-07-01T01:00:00.000Z',
          currency: 'VND',
          customer_email: 'customer@example.com',
          customer_full_name: 'Nguyen Van A',
          customer_phone: '+84901234567',
          discount_amount: '100000',
          expires_at: '2026-07-02T01:00:00.000Z',
          id: BOOKING_ID,
          note: 'Window seat',
          status: BOOKING_STATUS.PAID,
          subtotal_amount: '1500000',
          total_amount: '1400000',
          updated_at: '2026-07-01T01:30:00.000Z',
          user_id: '99999999-9999-4999-8999-999999999999',
          voucher_id: 'voucher-1',
        };
      },
      listBookingItemsByBookingId: async () => [
        {
          end_at: '2026-07-11T00:00:00.000Z',
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          quantity: 2,
          reference_id: null,
          service_id: '11111111-1111-4111-8111-111111111111',
          service_type: 'tour',
          start_at: '2026-07-10T00:00:00.000Z',
          status: 'pending',
          title_snapshot: 'Tour Da Nang',
          total_amount: '1400000',
          traveller_info: [{ full_name: 'Traveller 1' }],
          unit_price: '700000',
        },
      ],
      listBookingPaymentsByBookingId: async () => [
        {
          amount: '1400000',
          created_at: '2026-07-01T01:05:00.000Z',
          currency: 'VND',
          expired_at: '2026-07-02T01:00:00.000Z',
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          paid_at: null,
          payment_code: 'PAY001',
          payment_method: 'qr',
          provider: 'vnpay',
          raw_response: { secret: true },
          status: 'pending',
        },
      ],
      listBookingRefundsByBookingId: async () => [
        {
          amount: '500000',
          created_at: '2026-07-01T02:00:00.000Z',
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          payment_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          processed_at: null,
          raw_response: { secret: true },
          reason: 'Customer request',
          refund_code: 'REF001',
          status: 'requested',
        },
      ],
    },
  });

  const result = await service.getBookingDetail({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['booking.read_all'],
      },
    },
    booking_id: BOOKING_ID,
  });

  assert.equal(result.id, BOOKING_ID);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].title, 'Tour Da Nang');
  assert.equal(result.payments.length, 1);
  assert.equal(result.refunds.length, 1);
  assert.equal(result.payments[0].payment_code, 'PAY001');
  assert.equal(result.payments[0].raw_response, undefined);
  assert.equal(result.refunds[0].raw_response, undefined);
});

test('GET /api/admin/bookings requires a bearer token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/bookings`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/bookings blocks customer role with 403', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'customer',
    sub: 'user-1',
  });

  try {
    const response = await request(server, `${apiPrefix}/admin/bookings`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/admin/bookings returns admin booking summaries with filters and meta', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.read_all'],
    role: 'staff',
    service_scope_ids: ['service-1'],
    sub: 'staff-1',
  });

  adminBookingService.listBookings = async (payload) => {
    assert.equal(payload.auth.role, 'staff');
    assert.deepEqual(payload.auth.serviceScopeIds, ['service-1']);
    assert.equal(payload.auth.userId, 'staff-1');
    assert.equal(payload.auth.tokenPayload.role, 'staff');
    assert.deepEqual(payload.auth.tokenPayload.permissions, ['booking.read_all']);
    assert.deepEqual(payload.auth.tokenPayload.service_scope_ids, ['service-1']);
    assert.equal(payload.auth.tokenPayload.sub, 'staff-1');
    assert.deepEqual({ ...payload.query }, {
      from: '2026-07-01',
      limit: '2',
      page: '1',
      q: 'BK2026',
      status: 'paid',
      to: '2026-07-31',
    });

    return {
      items: [
        {
          booking_code: 'BK202607010001',
          contact_name: 'Nguyen Van A',
          id: BOOKING_ID,
          status: BOOKING_STATUS.PAID,
          total_amount: 1400000,
        },
      ],
      meta: {
        has_next: false,
        limit: 2,
        page: 1,
        total: 1,
        total_pages: 1,
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/bookings?status=paid&from=2026-07-01&to=2026-07-31&q=BK2026&page=1&limit=2`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin bookings retrieved successfully');
    assert.equal(response.body.data.length, 1);
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 2,
      page: 1,
      total: 1,
      total_pages: 1,
    });
  } finally {
    adminBookingService.listBookings = originalListBookings;
    server.close();
  }
});

test('GET /api/admin/bookings/{booking_id} validates UUID and returns admin booking detail', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.read_all'],
    role: 'admin',
    sub: 'admin-1',
  });

  adminBookingService.getBookingDetail = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'admin',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['booking.read_all'],
          role: 'admin',
          sub: 'admin-1',
        },
        userId: 'admin-1',
      },
      booking_id: BOOKING_ID,
    });

    return {
      booking_code: 'BK202607010001',
      id: BOOKING_ID,
      items: [],
      payments: [],
      refunds: [],
      status: BOOKING_STATUS.PAID,
    };
  };

  try {
    const successResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(successResponse.statusCode, 200);
    assert.equal(
      successResponse.body.message,
      'Admin booking detail retrieved successfully',
    );
    assert.equal(successResponse.body.data.id, BOOKING_ID);

    adminBookingService.getBookingDetail = originalGetBookingDetail;

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/not-a-uuid`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(badUuidResponse.statusCode, 400);
    assert.equal(
      badUuidResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
    assert.deepEqual(badUuidResponse.body.error.details, [
      {
        field: 'booking_id',
        message: 'booking_id must be a valid UUID',
      },
    ]);
  } finally {
    adminBookingService.getBookingDetail = originalGetBookingDetail;
    server.close();
  }
});
