const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-customer-bookings-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
  BOOKING_STATUS,
} = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const bookingService = require('../services/bookingService');
const { createAccessToken } = require('../utils/sessionToken');

const BOOKING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const CUSTOMER_ID = '99999999-9999-4999-8999-999999999999';
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetMyBookingDetail = bookingService.getMyBookingDetail;
const originalGetMyBookingItems = bookingService.getMyBookingItems;
const originalGetMyBookingStatusHistory = bookingService.getMyBookingStatusHistory;
const originalListMyBookings = bookingService.listMyBookings;

const createAuthContext = ({
  permissions = ['booking.read_self'],
  roleCode = 'customer',
  userId = CUSTOMER_ID,
} = {}) => ({
  permissions: roleCode === 'customer' ? permissions : [],
  roleCode,
  tokenId: 'access-jti-1',
  user: {
    email: `${userId}@example.com`,
    id: userId,
    role_code: roleCode,
  },
  userId,
});

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(`http://127.0.0.1:${port}${path}`, options, (res) => {
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
    req.end();
  });

test.beforeEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  bookingService.getMyBookingDetail = originalGetMyBookingDetail;
  bookingService.getMyBookingItems = originalGetMyBookingItems;
  bookingService.getMyBookingStatusHistory = originalGetMyBookingStatusHistory;
  bookingService.listMyBookings = originalListMyBookings;
});

test.afterEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  bookingService.getMyBookingDetail = originalGetMyBookingDetail;
  bookingService.getMyBookingItems = originalGetMyBookingItems;
  bookingService.getMyBookingStatusHistory = originalGetMyBookingStatusHistory;
  bookingService.listMyBookings = originalListMyBookings;
});

test('bookingService.listMyBookings returns paginated summaries for the current customer', async () => {
  const service = bookingService.createBookingService({
    repository: {
      listBookingsByUser: async ({
        limit,
        offset,
        status,
        userId,
      }) => {
        assert.equal(userId, CUSTOMER_ID);
        assert.equal(status, BOOKING_STATUS.PENDING_PAYMENT);
        assert.equal(limit, 20);
        assert.equal(offset, 0);

        return {
          rows: [
            {
              booking_code: 'BK202607010001',
              contact_name: 'Nguyen Van A',
              created_at: '2026-07-01T01:00:00.000Z',
              currency: 'VND',
              discount_amount: '100000',
              expires_at: '2026-07-02T01:00:00.000Z',
              id: BOOKING_ID,
              item_count: 2,
              status: BOOKING_STATUS.PENDING_PAYMENT,
              subtotal_amount: '1500000',
              total_amount: '1400000',
            },
          ],
          total: 1,
        };
      },
    },
  });

  const result = await service.listMyBookings({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    query: {
      status: BOOKING_STATUS.PENDING_PAYMENT,
    },
  });

  assert.equal(result.items.length, 1);
  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 20,
    page: 1,
    total: 1,
    total_pages: 1,
  });
  assert.deepEqual(result.items[0], {
    booking_code: 'BK202607010001',
    contact_name: 'Nguyen Van A',
    created_at: '2026-07-01T01:00:00.000Z',
    currency: 'VND',
    discount_amount: 100000,
    expires_at: '2026-07-02T01:00:00.000Z',
    id: BOOKING_ID,
    item_count: 2,
    status: BOOKING_STATUS.PENDING_PAYMENT,
    subtotal_amount: 1500000,
    total_amount: 1400000,
  });
});

test('bookingService.listMyBookings rejects invalid status and pagination', async () => {
  const service = bookingService.createBookingService({
    repository: {},
  });

  await assert.rejects(
    () => service.listMyBookings({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
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
    () => service.listMyBookings({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
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

test('bookingService.getMyBookingDetail returns sanitized detail for current customer', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async ({
        bookingId,
        userId,
      }) => {
        assert.equal(bookingId, BOOKING_ID);
        assert.equal(userId, CUSTOMER_ID);

        return {
          booking_code: 'BK202607010001',
          contact_email: 'customer@example.com',
          contact_name: 'Nguyen Van A',
          contact_phone: '+84901234567',
          created_at: '2026-07-01T01:00:00.000Z',
          currency: 'VND',
          discount_amount: '100000',
          expires_at: '2026-07-02T01:00:00.000Z',
          id: BOOKING_ID,
          note: 'Window seat please',
          status: BOOKING_STATUS.PENDING_PAYMENT,
          subtotal_amount: '1500000',
          total_amount: '1400000',
          updated_at: '2026-07-01T01:30:00.000Z',
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
          reason: 'Customer request',
          refund_code: 'REF001',
          raw_response: { secret: true },
          status: 'requested',
        },
      ],
    },
  });

  const result = await service.getMyBookingDetail({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    bookingId: BOOKING_ID,
  });

  assert.equal(result.id, BOOKING_ID);
  assert.equal(result.items.length, 1);
  assert.equal(result.payments.length, 1);
  assert.equal(result.refunds.length, 1);
  assert.equal(result.payments[0].payment_code, 'PAY001');
  assert.equal(result.refunds[0].refund_code, 'REF001');
  assert.equal(result.items[0].title, 'Tour Da Nang');
  assert.equal(result.total_amount, 1400000);
  assert.equal(result.payments[0].raw_response, undefined);
});

test('bookingService.getMyBookingItems returns snapshot-based items without internal fields', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async ({
        bookingId,
        userId,
      }) => {
        assert.equal(bookingId, BOOKING_ID);
        assert.equal(userId, CUSTOMER_ID);

        return {
          id: BOOKING_ID,
        };
      },
      listBookingItemsByBookingId: async () => [
        {
          end_at: '2026-07-11T00:00:00.000Z',
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          quantity: 2,
          reference_id: null,
          service_snapshot: {
            admin_note: 'internal',
            base_price: '2000000',
            cancellation_policy: 'Free cancellation',
            currency: 'VND',
            description: 'Tour description',
            id: '11111111-1111-4111-8111-111111111111',
            internal_cost: 123,
            location_text: 'Da Nang',
            provider_name: 'Hidden Provider',
            public_price: '1800000',
            reference_id: null,
            sale_price: '1800000',
            service_code: 'TOUR001',
            service_type: 'tour',
            short_description: 'Tour short',
            slug: 'tour-da-nang',
            title: 'Tour Da Nang',
          },
          service_type: 'tour',
          start_at: '2026-07-10T00:00:00.000Z',
          status: 'pending',
          title_snapshot: 'Tour Da Nang',
          total_amount: '3600000',
          traveller_info: [{ full_name: 'Traveller 1' }],
          unit_price: '1800000',
        },
      ],
    },
  });

  const result = await service.getMyBookingItems({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    bookingId: BOOKING_ID,
  });

  assert.equal(result.length, 1);
  assert.equal(result[0].title_snapshot, 'Tour Da Nang');
  assert.equal(result[0].service_snapshot.title, 'Tour Da Nang');
  assert.equal(result[0].service_snapshot.provider_name, undefined);
  assert.equal(result[0].service_snapshot.service_code, undefined);
  assert.equal(result[0].service_snapshot.admin_note, undefined);
  assert.equal(result[0].service_snapshot.internal_cost, undefined);
  assert.deepEqual(result[0].traveller_info, [{ full_name: 'Traveller 1' }]);
});

test('bookingService.getMyBookingDetail returns 404 for missing booking and validates UUID', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async () => null,
      listBookingItemsByBookingId: async () => [],
      listBookingPaymentsByBookingId: async () => [],
      listBookingRefundsByBookingId: async () => [],
    },
  });

  await assert.rejects(
    () => service.getMyBookingDetail({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      bookingId: 'bad-id',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.getMyBookingDetail({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('bookingService.getMyBookingStatusHistory returns ascending timeline with safe changed_by_type', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async ({
        bookingId,
        userId,
      }) => {
        assert.equal(bookingId, BOOKING_ID);
        assert.equal(userId, CUSTOMER_ID);

        return { id: BOOKING_ID };
      },
      listBookingStatusHistoriesByBookingId: async () => [
        {
          changed_by: null,
          changed_by_role_code: null,
          created_at: '2026-07-01T01:00:00.000Z',
          from_status: null,
          id: '11111111-1111-4111-8111-111111111111',
          reason: null,
          to_status: 'pending_payment',
        },
        {
          changed_by: '22222222-2222-4222-8222-222222222222',
          changed_by_role_code: 'system_admin',
          created_at: '2026-07-01T02:00:00.000Z',
          from_status: 'pending_payment',
          id: '33333333-3333-4333-8333-333333333333',
          reason: 'Payment verified',
          to_status: 'paid',
        },
      ],
    },
  });

  const result = await service.getMyBookingStatusHistory({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    bookingId: BOOKING_ID,
  });

  assert.equal(result.length, 2);
  assert.deepEqual(result[0], {
    changed_by_type: 'system',
    created_at: '2026-07-01T01:00:00.000Z',
    from_status: null,
    id: '11111111-1111-4111-8111-111111111111',
    reason: null,
    to_status: 'pending_payment',
  });
  assert.deepEqual(result[1], {
    changed_by_type: 'admin',
    created_at: '2026-07-01T02:00:00.000Z',
    from_status: 'pending_payment',
    id: '33333333-3333-4333-8333-333333333333',
    reason: 'Payment verified',
    to_status: 'paid',
  });
});

test('bookingService.getMyBookingStatusHistory returns an empty array when booking has no history rows', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async ({
        bookingId,
        userId,
      }) => {
        assert.equal(bookingId, BOOKING_ID);
        assert.equal(userId, CUSTOMER_ID);

        return { id: BOOKING_ID };
      },
      listBookingStatusHistoriesByBookingId: async () => [],
    },
  });

  const result = await service.getMyBookingStatusHistory({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    bookingId: BOOKING_ID,
  });

  assert.deepEqual(result, []);
});

test('bookingService.getMyBookingStatusHistory validates UUID and returns 404 for missing booking', async () => {
  const service = bookingService.createBookingService({
    repository: {
      getBookingByIdAndUser: async () => null,
      listBookingStatusHistoriesByBookingId: async () => [],
    },
  });

  await assert.rejects(
    () => service.getMyBookingStatusHistory({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      bookingId: 'bad-id',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.getMyBookingStatusHistory({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      bookingId: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      assert.equal(error.statusCode, 404);
      return true;
    },
  );
});

test('GET /api/bookings requires customer authentication', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/bookings`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/bookings returns booking summaries with pagination meta', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: CUSTOMER_ID,
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();
  bookingService.listMyBookings = async (context) => {
    capturedContext = context;

    return {
      items: [
        {
          booking_code: 'BK202607010001',
          contact_name: 'Nguyen Van A',
          created_at: '2026-07-01T01:00:00.000Z',
          currency: 'VND',
          discount_amount: 0,
          expires_at: '2026-07-02T01:00:00.000Z',
          id: BOOKING_ID,
          item_count: 1,
          status: BOOKING_STATUS.PENDING_PAYMENT,
          subtotal_amount: 1000000,
          total_amount: 1000000,
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
    const response = await request(
      server,
      `${apiPrefix}/bookings?status=${BOOKING_STATUS.PENDING_PAYMENT}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.meta.total, 1);
    assert.equal(capturedContext.auth.userId, CUSTOMER_ID);
    assert.equal(capturedContext.query.status, BOOKING_STATUS.PENDING_PAYMENT);
  } finally {
    server.close();
  }
});

test('GET /api/bookings/{booking_id} returns customer booking detail', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: CUSTOMER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();
  bookingService.getMyBookingDetail = async ({ auth, bookingId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);

    return {
      booking_code: 'BK202607010001',
      contact_email: 'customer@example.com',
      contact_name: 'Nguyen Van A',
      contact_phone: '+84901234567',
      created_at: '2026-07-01T01:00:00.000Z',
      currency: 'VND',
      discount_amount: 0,
      expires_at: '2026-07-02T01:00:00.000Z',
      id: BOOKING_ID,
      items: [],
      note: null,
      payments: [],
      refunds: [],
      status: BOOKING_STATUS.PENDING_PAYMENT,
      subtotal_amount: 1000000,
      total_amount: 1000000,
      updated_at: '2026-07-01T01:30:00.000Z',
      voucher_id: null,
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.id, BOOKING_ID);
    assert.equal(response.body.data.status, BOOKING_STATUS.PENDING_PAYMENT);
  } finally {
    server.close();
  }
});

test('GET /api/bookings/{booking_id}/items returns snapshot item list for customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: CUSTOMER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();
  bookingService.getMyBookingItems = async ({ auth, bookingId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);

    return [
      {
        end_at: '2026-07-11T00:00:00.000Z',
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        quantity: 2,
        reference_id: null,
        service_snapshot: {
          currency: 'VND',
          service_type: 'tour',
          slug: 'tour-da-nang',
          title: 'Tour Da Nang',
        },
        service_type: 'tour',
        start_at: '2026-07-10T00:00:00.000Z',
        status: 'pending',
        title_snapshot: 'Tour Da Nang',
        total_amount: 3600000,
        traveller_info: [{ full_name: 'Traveller 1' }],
        unit_price: 1800000,
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/items`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 1);
    assert.equal(response.body.data[0].title_snapshot, 'Tour Da Nang');
    assert.equal(response.body.data[0].service_snapshot.title, 'Tour Da Nang');
  } finally {
    server.close();
  }
});

test('GET /api/bookings/{booking_id}/items validates UUID and requires customer role', async () => {
  const server = app.listen(0);

  try {
    authService.resolveAuthenticatedUser = async () =>
      createAuthContext();

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/bookings/not-a-uuid/items`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
      },
    );

    assert.equal(badUuidResponse.statusCode, 400);
    assert.equal(
      badUuidResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );

    authService.resolveAuthenticatedUser = async () =>
      createAuthContext({
        roleCode: 'admin',
        userId: 'admin-1',
      });

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/items`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'admin',
            userId: 'admin-1',
          })}`,
        },
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(
      forbiddenResponse.body.error.code,
      API_ERROR_CODES.FORBIDDEN,
    );
  } finally {
    server.close();
  }
});

test('GET /api/bookings/{booking_id}/status-history returns booking timeline for customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: CUSTOMER_ID,
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext();
  bookingService.getMyBookingStatusHistory = async ({ auth, bookingId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);

    return [
      {
        changed_by_type: 'system',
        created_at: '2026-07-01T01:00:00.000Z',
        from_status: null,
        id: '11111111-1111-4111-8111-111111111111',
        reason: null,
        to_status: 'pending_payment',
      },
      {
        changed_by_type: 'admin',
        created_at: '2026-07-01T02:00:00.000Z',
        from_status: 'pending_payment',
        id: '33333333-3333-4333-8333-333333333333',
        reason: 'Payment verified',
        to_status: 'paid',
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/status-history`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.length, 2);
    assert.equal(response.body.data[0].changed_by_type, 'system');
    assert.equal(response.body.data[1].changed_by_type, 'admin');
  } finally {
    server.close();
  }
});

test('GET /api/bookings/{booking_id}/status-history validates UUID and requires customer role', async () => {
  const server = app.listen(0);

  try {
    authService.resolveAuthenticatedUser = async () =>
      createAuthContext();

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/bookings/not-a-uuid/status-history`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
      },
    );

    assert.equal(badUuidResponse.statusCode, 400);
    assert.equal(
      badUuidResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );

    authService.resolveAuthenticatedUser = async () =>
      createAuthContext({
        roleCode: 'admin',
        userId: 'admin-1',
      });

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/status-history`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'admin',
            userId: 'admin-1',
          })}`,
        },
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(
      forbiddenResponse.body.error.code,
      API_ERROR_CODES.FORBIDDEN,
    );
  } finally {
    server.close();
  }
});

test('GET /api/bookings/{booking_id} validates UUID and blocks non-customer roles', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-1',
  });

  try {
    authService.resolveAuthenticatedUser = async () =>
      createAuthContext();

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/bookings/not-a-uuid`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
        },
      },
    );

    assert.equal(badUuidResponse.statusCode, 400);
    assert.equal(
      badUuidResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );

    authService.resolveAuthenticatedUser = async () =>
      createAuthContext({
        roleCode: 'admin',
        userId: 'admin-1',
      });

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(
      forbiddenResponse.body.error.code,
      API_ERROR_CODES.FORBIDDEN,
    );
  } finally {
    server.close();
  }
});
