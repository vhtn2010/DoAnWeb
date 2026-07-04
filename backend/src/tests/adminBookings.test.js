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
  BOOKING_ITEM_STATUS,
  BOOKING_STATUS,
} = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminBookingService = require('../services/adminBookingService');

const BOOKING_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOOKING_ITEM_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalCancelBooking = adminBookingService.cancelBooking;
const originalGetBookingDetail = adminBookingService.getBookingDetail;
const originalGetBookingStatusHistory =
  adminBookingService.getBookingStatusHistory;
const originalListBookings = adminBookingService.listBookings;
const originalCompleteBooking = adminBookingService.completeBooking;
const originalConfirmBooking = adminBookingService.confirmBooking;
const originalExpireBooking = adminBookingService.expireBooking;
const originalResendBookingConfirmationEmail =
  adminBookingService.resendBookingConfirmationEmail;
const originalUpdateBookingItemStatus =
  adminBookingService.updateBookingItemStatus;
const originalUpdateBookingItemTravellerInfo =
  adminBookingService.updateBookingItemTravellerInfo;
const originalUpdateBookingStatus = adminBookingService.updateBookingStatus;

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

const createAuthContext = ({
  permissions = [],
  roleCode = 'admin',
  serviceScopeIds = [],
  userId = 'admin-user-1',
} = {}) => ({
  permissions,
  roleCode,
  serviceScopeIds,
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
  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions:
        tokenPayload.permissions ||
        tokenPayload.permission_codes ||
        [],
      roleCode: tokenPayload.roleCode || tokenPayload.role || 'admin',
      serviceScopeIds:
        tokenPayload.serviceScopeIds ||
        tokenPayload.service_scope_ids ||
        [],
      userId: tokenPayload.userId || tokenPayload.sub || 'admin-user-1',
    });
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminBookingService.cancelBooking = originalCancelBooking;
  adminBookingService.completeBooking = originalCompleteBooking;
  adminBookingService.confirmBooking = originalConfirmBooking;
  adminBookingService.expireBooking = originalExpireBooking;
  adminBookingService.getBookingDetail = originalGetBookingDetail;
  adminBookingService.getBookingStatusHistory = originalGetBookingStatusHistory;
  adminBookingService.listBookings = originalListBookings;
  adminBookingService.resendBookingConfirmationEmail =
    originalResendBookingConfirmationEmail;
  adminBookingService.updateBookingItemStatus = originalUpdateBookingItemStatus;
  adminBookingService.updateBookingItemTravellerInfo =
    originalUpdateBookingItemTravellerInfo;
  adminBookingService.updateBookingStatus = originalUpdateBookingStatus;
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

test('adminBookingService.getBookingStatusHistory returns ascending admin-safe timeline and limits staff identity fields', async () => {
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async ({ bookingId }) => {
        assert.equal(bookingId, BOOKING_ID);

        return {
          id: BOOKING_ID,
        };
      },
      listBookingStatusHistoriesByBookingId: async (bookingId) => {
        assert.equal(bookingId, BOOKING_ID);

        return [
          {
            changed_by: null,
            changed_by_full_name: null,
            changed_by_role_code: null,
            created_at: '2026-07-01T01:00:00.000Z',
            from_status: null,
            id: '11111111-1111-4111-8111-111111111111',
            reason: null,
            to_status: 'pending_payment',
          },
          {
            changed_by: '22222222-2222-4222-8222-222222222222',
            changed_by_full_name: 'Tran Admin',
            changed_by_role_code: 'admin',
            created_at: '2026-07-01T02:00:00.000Z',
            from_status: 'pending_payment',
            id: '33333333-3333-4333-8333-333333333333',
            reason: 'Payment verified',
            to_status: 'paid',
          },
        ];
      },
    },
  });

  const adminResult = await service.getBookingStatusHistory({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['booking.read_all'],
      },
    },
    booking_id: BOOKING_ID,
  });

  assert.deepEqual(adminResult, [
    {
      changed_by: 'system',
      created_at: '2026-07-01T01:00:00.000Z',
      from_status: null,
      id: '11111111-1111-4111-8111-111111111111',
      reason: null,
      to_status: 'pending_payment',
    },
    {
      changed_by: {
        full_name: 'Tran Admin',
        id: '22222222-2222-4222-8222-222222222222',
        role_code: 'admin',
        type: 'admin',
      },
      created_at: '2026-07-01T02:00:00.000Z',
      from_status: 'pending_payment',
      id: '33333333-3333-4333-8333-333333333333',
      reason: 'Payment verified',
      to_status: 'paid',
    },
  ]);

  const staffResult = await service.getBookingStatusHistory({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1'],
      tokenPayload: {
        permissions: ['booking.read_all'],
      },
    },
    booking_id: BOOKING_ID,
  });

  assert.deepEqual(staffResult, [
    {
      changed_by: 'system',
      created_at: '2026-07-01T01:00:00.000Z',
      from_status: null,
      id: '11111111-1111-4111-8111-111111111111',
      reason: null,
      to_status: 'pending_payment',
    },
    {
      changed_by: {
        id: '22222222-2222-4222-8222-222222222222',
        type: 'admin',
      },
      created_at: '2026-07-01T02:00:00.000Z',
      from_status: 'pending_payment',
      id: '33333333-3333-4333-8333-333333333333',
      reason: 'Payment verified',
      to_status: 'paid',
    },
  ]);
});

test('adminBookingService.updateBookingStatus validates permission, transitions, and payment or refund guards', async () => {
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        id: BOOKING_ID,
        status: BOOKING_STATUS.PENDING_PAYMENT,
      }),
      listBookingPaymentsByBookingId: async () => [],
      listBookingRefundsByBookingId: async () => [],
      updateBookingStatus: async () => {
        throw new Error('updateBookingStatus should not be called');
      },
    },
  });

  await assert.rejects(
    () => service.updateBookingStatus({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.read_all'],
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Manual confirm',
        status: BOOKING_STATUS.PAID,
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateBookingStatus({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.update_status'],
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Manual mark as paid',
        status: BOOKING_STATUS.PAID,
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminBookingService.updateBookingStatus updates booking status when transition and financial guards are satisfied', async () => {
  let updatePayload = null;
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        booking_code: 'BK202607010001',
        id: BOOKING_ID,
        status: BOOKING_STATUS.PENDING_PAYMENT,
      }),
      listBookingPaymentsByBookingId: async (bookingId) => {
        assert.equal(bookingId, BOOKING_ID);

        return [
          {
            status: 'success',
          },
        ];
      },
      updateBookingStatus: async (payload) => {
        updatePayload = payload;

        return {
          booking_code: 'BK202607010001',
          id: BOOKING_ID,
          status: BOOKING_STATUS.PAID,
          updated_at: '2026-07-01T08:00:00.000Z',
        };
      },
    },
  });

  const result = await service.updateBookingStatus({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['booking.update_status'],
      },
      userId: 'admin-1',
    },
    body: {
      reason: 'Payment manually reconciled',
      status: BOOKING_STATUS.PAID,
    },
    booking_id: BOOKING_ID,
  });

  assert.deepEqual(updatePayload, {
    actorUserId: 'admin-1',
    bookingId: BOOKING_ID,
    fromStatus: BOOKING_STATUS.PENDING_PAYMENT,
    reason: 'Payment manually reconciled',
    toStatus: BOOKING_STATUS.PAID,
  });
  assert.deepEqual(result, {
    booking_code: 'BK202607010001',
    id: BOOKING_ID,
    status: BOOKING_STATUS.PAID,
    updated_at: '2026-07-01T08:00:00.000Z',
  });
});

test('adminBookingService.updateBookingStatus allows system admin override for refunded without refund record', async () => {
  let updated = false;
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        id: BOOKING_ID,
        status: BOOKING_STATUS.REFUND_PENDING,
      }),
      updateBookingStatus: async () => {
        updated = true;

        return {
          booking_code: 'BK202607010002',
          id: BOOKING_ID,
          status: BOOKING_STATUS.REFUNDED,
          updated_at: '2026-07-01T09:00:00.000Z',
        };
      },
    },
  });

  const result = await service.updateBookingStatus({
    auth: {
      role: 'system_admin',
      tokenPayload: {
        permissions: ['booking.update_status'],
      },
      userId: 'sysadmin-1',
    },
    body: {
      reason: 'Override after off-platform settlement confirmation',
      status: BOOKING_STATUS.REFUNDED,
    },
    booking_id: BOOKING_ID,
  });

  assert.equal(updated, true);
  assert.equal(result.status, BOOKING_STATUS.REFUNDED);
});

test('adminBookingService.confirmBooking only confirms paid bookings with sufficient successful payments', async () => {
  let confirmPayload = null;
  const service = adminBookingService.createAdminBookingService({
    repository: {
      confirmBooking: async (payload) => {
        confirmPayload = payload;

        return {
          booking_code: 'BK202607010003',
          id: BOOKING_ID,
          status: BOOKING_STATUS.CONFIRMED,
          updated_at: '2026-07-01T11:00:00.000Z',
        };
      },
      getBookingById: async () => ({
        booking_code: 'BK202607010003',
        id: BOOKING_ID,
        status: BOOKING_STATUS.PAID,
        total_amount: '1500000',
        updated_at: '2026-07-01T10:30:00.000Z',
      }),
      listBookingPaymentsByBookingId: async () => [
        {
          amount: '500000',
          status: 'success',
        },
        {
          amount: '1000000',
          status: 'reconciled',
        },
      ],
    },
  });

  const result = await service.confirmBooking({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1'],
      tokenPayload: {
        permissions: ['booking.confirm'],
      },
      userId: 'staff-1',
    },
    body: {
      reason: 'Ops confirmed fulfillment readiness',
    },
    booking_id: BOOKING_ID,
  });

  assert.deepEqual(confirmPayload, {
    actorUserId: 'staff-1',
    bookingId: BOOKING_ID,
    reason: 'Ops confirmed fulfillment readiness',
  });
  assert.deepEqual(result, {
    booking_code: 'BK202607010003',
    id: BOOKING_ID,
    status: BOOKING_STATUS.CONFIRMED,
    updated_at: '2026-07-01T11:00:00.000Z',
  });
});

test('adminBookingService.confirmBooking returns idempotent success for confirmed bookings and rejects invalid states', async () => {
  const confirmedService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        booking_code: 'BK202607010004',
        id: BOOKING_ID,
        status: BOOKING_STATUS.CONFIRMED,
        updated_at: '2026-07-01T11:30:00.000Z',
      }),
    },
  });

  const confirmedResult = await confirmedService.confirmBooking({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['booking.update_status'],
      },
      userId: 'admin-1',
    },
    body: {},
    booking_id: BOOKING_ID,
  });

  assert.equal(confirmedResult.status, BOOKING_STATUS.CONFIRMED);

  const unpaidService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        id: BOOKING_ID,
        status: BOOKING_STATUS.PENDING_PAYMENT,
        total_amount: '1500000',
      }),
      listBookingPaymentsByBookingId: async () => [],
    },
  });

  await assert.rejects(
    () => unpaidService.confirmBooking({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.confirm'],
        },
        userId: 'admin-1',
      },
      body: {},
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminBookingService.completeBooking only completes in_progress bookings and supports idempotent completed state', async () => {
  let completePayload = null;
  const service = adminBookingService.createAdminBookingService({
    repository: {
      completeBooking: async (payload) => {
        completePayload = payload;

        return {
          booking_code: 'BK202607010005',
          id: BOOKING_ID,
          status: BOOKING_STATUS.COMPLETED,
          updated_at: '2026-07-01T12:00:00.000Z',
        };
      },
      getBookingById: async () => ({
        booking_code: 'BK202607010005',
        id: BOOKING_ID,
        status: BOOKING_STATUS.IN_PROGRESS,
        updated_at: '2026-07-01T11:45:00.000Z',
      }),
    },
  });

  const result = await service.completeBooking({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['booking.complete'],
      },
      userId: 'staff-1',
    },
    body: {
      reason: 'Service finished successfully',
    },
    booking_id: BOOKING_ID,
  });

  assert.deepEqual(completePayload, {
    actorUserId: 'staff-1',
    bookingId: BOOKING_ID,
    reason: 'Service finished successfully',
  });
  assert.equal(result.status, BOOKING_STATUS.COMPLETED);

  const completedService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        booking_code: 'BK202607010006',
        id: BOOKING_ID,
        status: BOOKING_STATUS.COMPLETED,
        updated_at: '2026-07-01T12:15:00.000Z',
      }),
    },
  });

  const completedResult = await completedService.completeBooking({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['booking.update_status'],
      },
      userId: 'admin-1',
    },
    body: {},
    booking_id: BOOKING_ID,
  });

  assert.equal(completedResult.status, BOOKING_STATUS.COMPLETED);

  const invalidStateService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        id: BOOKING_ID,
        status: BOOKING_STATUS.CONFIRMED,
      }),
    },
  });

  await assert.rejects(
    () => invalidStateService.completeBooking({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.complete'],
        },
        userId: 'admin-1',
      },
      body: {},
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminBookingService.cancelBooking cancels allowed states and returns idempotent success for cancelled bookings', async () => {
  let cancelPayload = null;
  const service = adminBookingService.createAdminBookingService({
    repository: {
      cancelBooking: async (payload) => {
        cancelPayload = payload;

        return {
          booking_code: 'BK202607010009',
          id: BOOKING_ID,
          status: BOOKING_STATUS.CANCELLED,
          updated_at: '2026-07-01T14:00:00.000Z',
        };
      },
      getBookingById: async () => ({
        booking_code: 'BK202607010009',
        id: BOOKING_ID,
        status: BOOKING_STATUS.CANCEL_REQUESTED,
        updated_at: '2026-07-01T13:45:00.000Z',
      }),
    },
  });

  const result = await service.cancelBooking({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['booking.cancel'],
      },
      userId: 'staff-1',
    },
    body: {
      reason: 'Supplier outage prevented fulfillment',
    },
    booking_id: BOOKING_ID,
  });

  assert.deepEqual(cancelPayload, {
    actorUserId: 'staff-1',
    bookingId: BOOKING_ID,
    fromStatus: BOOKING_STATUS.CANCEL_REQUESTED,
    reason: 'Supplier outage prevented fulfillment',
  });
  assert.equal(result.status, BOOKING_STATUS.CANCELLED);

  const cancelledService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        booking_code: 'BK202607010010',
        id: BOOKING_ID,
        status: BOOKING_STATUS.CANCELLED,
        updated_at: '2026-07-01T14:05:00.000Z',
      }),
    },
  });

  const cancelledResult = await cancelledService.cancelBooking({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['booking.cancel'],
      },
      userId: 'admin-1',
    },
    body: {
      reason: 'Retry should be idempotent',
    },
    booking_id: BOOKING_ID,
  });

  assert.equal(cancelledResult.status, BOOKING_STATUS.CANCELLED);
});

test('adminBookingService.cancelBooking rejects missing permission and invalid states', async () => {
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        id: BOOKING_ID,
        status: BOOKING_STATUS.COMPLETED,
      }),
    },
  });

  await assert.rejects(
    () => service.cancelBooking({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.read_all'],
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Manual cancel',
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.cancelBooking({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.cancel'],
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Manual cancel',
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminBookingService.expireBooking only expires overdue pending_payment bookings and returns idempotent success for expired state', async () => {
  let expirePayload = null;
  const expiredAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const service = adminBookingService.createAdminBookingService({
    repository: {
      expireBooking: async (payload) => {
        expirePayload = payload;

        return {
          booking_code: 'BK202607010011',
          id: BOOKING_ID,
          status: BOOKING_STATUS.EXPIRED,
          updated_at: '2026-07-01T14:30:00.000Z',
        };
      },
      getBookingById: async () => ({
        booking_code: 'BK202607010011',
        expires_at: expiredAt,
        id: BOOKING_ID,
        status: BOOKING_STATUS.PENDING_PAYMENT,
        updated_at: '2026-07-01T14:00:00.000Z',
      }),
    },
  });

  const result = await service.expireBooking({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['booking.update_status'],
      },
      userId: 'staff-1',
    },
    body: {
      reason: 'Payment hold window elapsed',
    },
    booking_id: BOOKING_ID,
  });

  assert.deepEqual(expirePayload, {
    actorUserId: 'staff-1',
    bookingId: BOOKING_ID,
    reason: 'Payment hold window elapsed',
  });
  assert.equal(result.status, BOOKING_STATUS.EXPIRED);

  const alreadyExpiredService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        booking_code: 'BK202607010012',
        expires_at: expiredAt,
        id: BOOKING_ID,
        status: BOOKING_STATUS.EXPIRED,
        updated_at: '2026-07-01T14:35:00.000Z',
      }),
    },
  });

  const expiredResult = await alreadyExpiredService.expireBooking({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['booking.update_status'],
      },
      userId: 'admin-1',
    },
    body: {
      reason: 'Retry should be idempotent',
    },
    booking_id: BOOKING_ID,
  });

  assert.equal(expiredResult.status, BOOKING_STATUS.EXPIRED);
});

test('adminBookingService.expireBooking rejects non-overdue or non-pending bookings', async () => {
  const futureExpiryService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        id: BOOKING_ID,
        status: BOOKING_STATUS.PENDING_PAYMENT,
      }),
    },
  });

  await assert.rejects(
    () => futureExpiryService.expireBooking({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.update_status'],
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Expire too early',
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  const paidService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        expires_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        id: BOOKING_ID,
        status: BOOKING_STATUS.PAID,
      }),
    },
  });

  await assert.rejects(
    () => paidService.expireBooking({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.update_status'],
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Wrong state',
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
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

test('GET /api/admin/bookings/{booking_id}/status-history returns admin booking timeline and validates bad UUID', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.read_all'],
    role: 'admin',
    sub: 'admin-1',
  });

  adminBookingService.getBookingStatusHistory = async (payload) => {
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

    return [
      {
        changed_by: 'system',
        created_at: '2026-07-01T01:00:00.000Z',
        from_status: null,
        id: '11111111-1111-4111-8111-111111111111',
        reason: null,
        to_status: 'pending_payment',
      },
    ];
  };

  try {
    const successResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/status-history`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    assert.equal(successResponse.statusCode, 200);
    assert.equal(
      successResponse.body.message,
      'Admin booking status history retrieved successfully',
    );
    assert.equal(successResponse.body.data.length, 1);
    assert.equal(successResponse.body.data[0].changed_by, 'system');

    adminBookingService.getBookingStatusHistory = originalGetBookingStatusHistory;

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/not-a-uuid/status-history`,
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
    adminBookingService.getBookingStatusHistory = originalGetBookingStatusHistory;
    server.close();
  }
});

test('PATCH /api/admin/bookings/{booking_id}/status updates booking status for authorized admin users', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.update_status'],
    role: 'admin',
    sub: 'admin-1',
  });

  adminBookingService.updateBookingStatus = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'admin',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['booking.update_status'],
          role: 'admin',
          sub: 'admin-1',
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Manual override after payment reconciliation',
        status: 'paid',
      },
      booking_id: BOOKING_ID,
    });

    return {
      booking_code: 'BK202607010001',
      id: BOOKING_ID,
      status: 'paid',
      updated_at: '2026-07-01T10:00:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/status`,
      {
        body: {
          reason: 'Manual override after payment reconciliation',
          status: 'paid',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Admin booking status updated successfully',
    );
    assert.equal(response.body.data.id, BOOKING_ID);
    assert.equal(response.body.data.status, 'paid');
  } finally {
    adminBookingService.updateBookingStatus = originalUpdateBookingStatus;
    server.close();
  }
});

test('PATCH /api/admin/bookings/{booking_id}/status validates booking UUID and required permission', async () => {
  const server = app.listen(0);
  const tokenWithoutPermission = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.read_all'],
    role: 'admin',
    sub: 'admin-1',
  });
  const tokenWithPermission = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.update_status'],
    role: 'admin',
    sub: 'admin-1',
  });

  try {
    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/status`,
      {
        body: {
          reason: 'Manual override',
          status: 'paid',
        },
        headers: {
          Authorization: `Bearer ${tokenWithoutPermission}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(
      forbiddenResponse.body.error.code,
      API_ERROR_CODES.FORBIDDEN,
    );

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/not-a-uuid/status`,
      {
        body: {
          reason: 'Manual override',
          status: 'paid',
        },
        headers: {
          Authorization: `Bearer ${tokenWithPermission}`,
        },
        method: 'PATCH',
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
    server.close();
  }
});

test('POST /api/admin/bookings/{booking_id}/confirm returns confirmed booking for authorized admin users', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.confirm'],
    role: 'staff',
    sub: 'staff-1',
  });

  adminBookingService.confirmBooking = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'staff',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['booking.confirm'],
          role: 'staff',
          sub: 'staff-1',
        },
        userId: 'staff-1',
      },
      body: {
        reason: 'Ready for fulfillment',
      },
      booking_id: BOOKING_ID,
    });

    return {
      booking_code: 'BK202607010007',
      id: BOOKING_ID,
      status: 'confirmed',
      updated_at: '2026-07-01T13:00:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/confirm`,
      {
        body: {
          reason: 'Ready for fulfillment',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin booking confirmed successfully');
    assert.equal(response.body.data.status, 'confirmed');
  } finally {
    adminBookingService.confirmBooking = originalConfirmBooking;
    server.close();
  }
});

test('POST /api/admin/bookings/{booking_id}/complete returns completed booking and validates UUID', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.complete'],
    role: 'admin',
    sub: 'admin-1',
  });

  adminBookingService.completeBooking = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'admin',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['booking.complete'],
          role: 'admin',
          sub: 'admin-1',
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Service delivered fully',
      },
      booking_id: BOOKING_ID,
    });

    return {
      booking_code: 'BK202607010008',
      id: BOOKING_ID,
      status: 'completed',
      updated_at: '2026-07-01T13:30:00.000Z',
    };
  };

  try {
    const successResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/complete`,
      {
        body: {
          reason: 'Service delivered fully',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(successResponse.statusCode, 200);
    assert.equal(successResponse.body.success, true);
    assert.equal(
      successResponse.body.message,
      'Admin booking completed successfully',
    );
    assert.equal(successResponse.body.data.status, 'completed');

    adminBookingService.completeBooking = originalCompleteBooking;

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/not-a-uuid/complete`,
      {
        body: {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(badUuidResponse.statusCode, 400);
    assert.equal(
      badUuidResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
  } finally {
    adminBookingService.completeBooking = originalCompleteBooking;
    server.close();
  }
});

test('POST /api/admin/bookings/{booking_id}/cancel returns cancelled booking for authorized users', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.cancel'],
    role: 'staff',
    sub: 'staff-1',
  });

  adminBookingService.cancelBooking = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'staff',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['booking.cancel'],
          role: 'staff',
          sub: 'staff-1',
        },
        userId: 'staff-1',
      },
      body: {
        reason: 'Vendor cannot deliver service',
      },
      booking_id: BOOKING_ID,
    });

    return {
      booking_code: 'BK202607010013',
      id: BOOKING_ID,
      status: 'cancelled',
      updated_at: '2026-07-01T15:00:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/cancel`,
      {
        body: {
          reason: 'Vendor cannot deliver service',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin booking cancelled successfully');
    assert.equal(response.body.data.status, 'cancelled');
  } finally {
    adminBookingService.cancelBooking = originalCancelBooking;
    server.close();
  }
});

test('POST /api/admin/bookings/{booking_id}/expire returns expired booking and validates required reason', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.update_status'],
    role: 'admin',
    sub: 'admin-1',
  });

  adminBookingService.expireBooking = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'admin',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['booking.update_status'],
          role: 'admin',
          sub: 'admin-1',
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Payment deadline elapsed',
      },
      booking_id: BOOKING_ID,
    });

    return {
      booking_code: 'BK202607010014',
      id: BOOKING_ID,
      status: 'expired',
      updated_at: '2026-07-01T15:30:00.000Z',
    };
  };

  try {
    const successResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/expire`,
      {
        body: {
          reason: 'Payment deadline elapsed',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(successResponse.statusCode, 200);
    assert.equal(successResponse.body.success, true);
    assert.equal(successResponse.body.message, 'Admin booking expired successfully');
    assert.equal(successResponse.body.data.status, 'expired');

    adminBookingService.expireBooking = originalExpireBooking;

    const missingReasonResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/expire`,
      {
        body: {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(missingReasonResponse.statusCode, 400);
    assert.equal(
      missingReasonResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
  } finally {
    adminBookingService.expireBooking = originalExpireBooking;
    server.close();
  }
});

test('adminBookingService.resendBookingConfirmationEmail sends a confirmation email from booking snapshot data', async () => {
  const fixedNow = new Date('2026-07-01T16:00:00.000Z');
  let queuedPayload = null;
  let sentPayload = null;
  let emailPayload = null;
  const service = adminBookingService.createAdminBookingService({
    now: () => fixedNow,
    repository: {
      createBookingConfirmationResendEmailLog: async (payload) => {
        queuedPayload = payload;

        return {
          booking_id: BOOKING_ID,
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          provider: 'sendgrid',
          sent_at: null,
          status: 'queued',
          template_code: 'BOOKING_CONFIRMATION_RESEND',
          to_email: 'customer@example.com',
        };
      },
      getBookingById: async ({
        allowedServiceIds,
        bookingId,
      }) => {
        assert.deepEqual(allowedServiceIds, ['service-1']);
        assert.equal(bookingId, BOOKING_ID);

        return {
          booking_code: 'BK202607010015',
          contact_email: 'Customer@Example.com ',
          contact_name: 'Nguyen Van A',
          currency: 'VND',
          discount_amount: '100000',
          id: BOOKING_ID,
          status: BOOKING_STATUS.CONFIRMED,
          subtotal_amount: '1500000',
          total_amount: '1400000',
          user_id: 'user-1',
        };
      },
      listBookingItemsByBookingId: async (bookingId) => {
        assert.equal(bookingId, BOOKING_ID);

        return [
          {
            end_at: '2026-07-11T00:00:00.000Z',
            quantity: 2,
            service_type: 'tour',
            start_at: '2026-07-10T00:00:00.000Z',
            title_snapshot: 'Tour Da Nang',
          },
        ];
      },
      markBookingEmailLogFailed: async () => {
        throw new Error('markBookingEmailLogFailed should not be called');
      },
      markBookingEmailLogSent: async (payload) => {
        sentPayload = payload;

        return {
          booking_id: BOOKING_ID,
          id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          provider: 'sendgrid',
          sent_at: fixedNow.toISOString(),
          status: 'sent',
          template_code: 'BOOKING_CONFIRMATION_RESEND',
          to_email: 'customer@example.com',
        };
      },
    },
    sendEmailImpl: async (payload) => {
      emailPayload = payload;

      return {
        messageId: 'sendgrid-message-1',
      };
    },
  });

  const result = await service.resendBookingConfirmationEmail({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1'],
      tokenPayload: {
        permissions: ['email.resend'],
      },
      userId: 'staff-1',
    },
    booking_id: BOOKING_ID,
  });

  assert.deepEqual(queuedPayload, {
    actorUserId: 'staff-1',
    bookingId: BOOKING_ID,
    bookingStatus: BOOKING_STATUS.CONFIRMED,
    createdAt: fixedNow,
    subject: 'Booking BK202607010015 - Gui lai email xac nhan',
    templateCode: 'BOOKING_CONFIRMATION_RESEND',
    toEmail: 'customer@example.com',
    userId: 'user-1',
  });
  assert.equal(emailPayload.to.email, 'customer@example.com');
  assert.equal(emailPayload.to.name, 'Nguyen Van A');
  assert.match(emailPayload.subject, /BK202607010015/);
  assert.match(emailPayload.text, /Tour Da Nang/);
  assert.match(emailPayload.html, /Tong thanh toan/);
  assert.deepEqual(sentPayload, {
    emailLogId: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    messageId: 'sendgrid-message-1',
    sentAt: fixedNow,
  });
  assert.deepEqual(result, {
    booking_id: BOOKING_ID,
    email_log_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    provider: 'sendgrid',
    sent_at: fixedNow.toISOString(),
    status: 'sent',
    template_code: 'BOOKING_CONFIRMATION_RESEND',
    to_email: 'customer@example.com',
  });
});

test('adminBookingService.resendBookingConfirmationEmail validates permission, contact email, and booking status', async () => {
  const invalidEmailService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        booking_code: 'BK202607010016',
        contact_email: 'not-an-email',
        id: BOOKING_ID,
        status: BOOKING_STATUS.CONFIRMED,
      }),
    },
  });

  await assert.rejects(
    () => invalidEmailService.resendBookingConfirmationEmail({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['email.resend'],
        },
        userId: 'admin-1',
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'contact_email',
          message: 'booking contact_email must be a valid email address',
        },
      ]);
      return true;
    },
  );

  const invalidStateService = adminBookingService.createAdminBookingService({
    repository: {
      getBookingById: async () => ({
        booking_code: 'BK202607010017',
        contact_email: 'customer@example.com',
        id: BOOKING_ID,
        status: BOOKING_STATUS.CANCELLED,
      }),
    },
  });

  await assert.rejects(
    () => invalidStateService.resendBookingConfirmationEmail({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.export'],
        },
        userId: 'admin-1',
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminBookingService.resendBookingConfirmationEmail marks failed email logs when provider send fails', async () => {
  let failedPayload = null;
  const service = adminBookingService.createAdminBookingService({
    repository: {
      createBookingConfirmationResendEmailLog: async () => ({
        booking_id: BOOKING_ID,
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        provider: 'sendgrid',
        sent_at: null,
        status: 'queued',
        template_code: 'BOOKING_CONFIRMATION_RESEND',
        to_email: 'customer@example.com',
      }),
      getBookingById: async () => ({
        booking_code: 'BK202607010018',
        contact_email: 'customer@example.com',
        contact_name: 'Nguyen Van B',
        currency: 'VND',
        discount_amount: '0',
        id: BOOKING_ID,
        status: BOOKING_STATUS.PAID,
        subtotal_amount: '500000',
        total_amount: '500000',
        user_id: 'user-2',
      }),
      listBookingItemsByBookingId: async () => [],
      markBookingEmailLogFailed: async (payload) => {
        failedPayload = payload;

        return {
          id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        };
      },
      markBookingEmailLogSent: async () => {
        throw new Error('markBookingEmailLogSent should not be called');
      },
    },
    sendEmailImpl: async () => {
      throw new Error('sendgrid unavailable');
    },
  });

  await assert.rejects(
    () => service.resendBookingConfirmationEmail({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['email.resend'],
        },
        userId: 'admin-1',
      },
      booking_id: BOOKING_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INTERNAL_ERROR);
      return true;
    },
  );

  assert.deepEqual(failedPayload, {
    emailLogId: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    errorMessage: 'sendgrid unavailable',
  });
});

test('POST /api/admin/bookings/{booking_id}/resend-confirmation-email returns resend email result for authorized users', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['email.resend'],
    role: 'staff',
    sub: 'staff-1',
  });

  adminBookingService.resendBookingConfirmationEmail = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'staff',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['email.resend'],
          role: 'staff',
          sub: 'staff-1',
        },
        userId: 'staff-1',
      },
      booking_id: BOOKING_ID,
    });

    return {
      booking_id: BOOKING_ID,
      email_log_id: '99999999-9999-4999-8999-999999999999',
      provider: 'sendgrid',
      sent_at: '2026-07-01T16:15:00.000Z',
      status: 'sent',
      template_code: 'BOOKING_CONFIRMATION_RESEND',
      to_email: 'customer@example.com',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/resend-confirmation-email`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Admin booking confirmation email resent successfully',
    );
    assert.equal(response.body.data.booking_id, BOOKING_ID);
    assert.equal(response.body.data.status, 'sent');
  } finally {
    adminBookingService.resendBookingConfirmationEmail =
      originalResendBookingConfirmationEmail;
    server.close();
  }
});

test('POST /api/admin/bookings/{booking_id}/resend-confirmation-email validates permission and booking UUID', async () => {
  const server = app.listen(0);
  const tokenWithoutPermission = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.read_all'],
    role: 'admin',
    sub: 'admin-1',
  });
  const tokenWithPermission = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['email.resend'],
    role: 'admin',
    sub: 'admin-1',
  });

  try {
    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/${BOOKING_ID}/resend-confirmation-email`,
      {
        headers: {
          Authorization: `Bearer ${tokenWithoutPermission}`,
        },
        method: 'POST',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/admin/bookings/not-a-uuid/resend-confirmation-email`,
      {
        headers: {
          Authorization: `Bearer ${tokenWithPermission}`,
        },
        method: 'POST',
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
    server.close();
  }
});

test('adminBookingService.updateBookingItemStatus validates reason and transition rules', async () => {
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingItemById: async () => ({
        booking_id: BOOKING_ID,
        id: BOOKING_ITEM_ID,
        status: BOOKING_ITEM_STATUS.PENDING,
      }),
      updateBookingItemStatus: async () => {
        throw new Error('updateBookingItemStatus should not be called');
      },
    },
  });

  await assert.rejects(
    () => service.updateBookingItemStatus({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.update_status'],
        },
        userId: 'admin-1',
      },
      body: {
        status: BOOKING_ITEM_STATUS.CANCELLED,
      },
      booking_item_id: BOOKING_ITEM_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'reason',
          message: 'reason is required when status is cancelled or failed',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateBookingItemStatus({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.update_status'],
        },
        userId: 'admin-1',
      },
      body: {
        reason: 'Rollback',
        status: BOOKING_ITEM_STATUS.COMPLETED,
      },
      booking_item_id: BOOKING_ITEM_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminBookingService.updateBookingItemStatus updates booking item status with staff scope', async () => {
  let capturedPayload = null;
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingItemById: async ({
        allowedServiceIds,
        bookingItemId,
      }) => {
        assert.deepEqual(allowedServiceIds, ['service-1']);
        assert.equal(bookingItemId, BOOKING_ITEM_ID);

        return {
          booking_id: BOOKING_ID,
          id: BOOKING_ITEM_ID,
          quantity: 2,
          reference_id: null,
          service_id: 'service-1',
          service_type: 'tour',
          start_at: '2026-07-10T00:00:00.000Z',
          status: BOOKING_ITEM_STATUS.PENDING,
          title_snapshot: 'Tour Da Nang',
          total_amount: '1400000',
          traveller_info: [{ full_name: 'Traveller 1' }],
          unit_price: '700000',
        };
      },
      updateBookingItemStatus: async (payload) => {
        capturedPayload = payload;

        return {
          booking_id: BOOKING_ID,
          end_at: '2026-07-11T00:00:00.000Z',
          id: BOOKING_ITEM_ID,
          quantity: 2,
          reference_id: null,
          service_id: 'service-1',
          service_type: 'tour',
          start_at: '2026-07-10T00:00:00.000Z',
          status: BOOKING_ITEM_STATUS.CONFIRMED,
          title_snapshot: 'Tour Da Nang',
          total_amount: '1400000',
          traveller_info: [{ full_name: 'Traveller 1' }],
          unit_price: '700000',
        };
      },
    },
  });

  const result = await service.updateBookingItemStatus({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1'],
      tokenPayload: {
        permissions: ['booking.update_status'],
      },
      userId: 'staff-1',
    },
    body: {
      status: BOOKING_ITEM_STATUS.CONFIRMED,
    },
    booking_item_id: BOOKING_ITEM_ID,
  });

  assert.deepEqual(capturedPayload, {
    actorUserId: 'staff-1',
    bookingItemId: BOOKING_ITEM_ID,
    fromStatus: BOOKING_ITEM_STATUS.PENDING,
    reason: null,
    toStatus: BOOKING_ITEM_STATUS.CONFIRMED,
  });
  assert.deepEqual(result, {
    booking_id: BOOKING_ID,
    end_at: '2026-07-11T00:00:00.000Z',
    id: BOOKING_ITEM_ID,
    quantity: 2,
    reference_id: null,
    service_id: 'service-1',
    service_type: 'tour',
    start_at: '2026-07-10T00:00:00.000Z',
    status: BOOKING_ITEM_STATUS.CONFIRMED,
    title: 'Tour Da Nang',
    total_amount: 1400000,
    traveller_info: [{ full_name: 'Traveller 1' }],
    unit_price: 700000,
  });
});

test('adminBookingService.updateBookingItemTravellerInfo validates sensitive fields and booking state restrictions', async () => {
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingItemById: async () => ({
        booking_id: BOOKING_ID,
        booking_status: BOOKING_STATUS.COMPLETED,
        id: BOOKING_ITEM_ID,
        status: BOOKING_ITEM_STATUS.CONFIRMED,
      }),
      updateBookingItemTravellerInfo: async () => {
        throw new Error('updateBookingItemTravellerInfo should not be called');
      },
    },
  });

  await assert.rejects(
    () => service.updateBookingItemTravellerInfo({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['booking.update_item'],
        },
        userId: 'admin-1',
      },
      body: {
        traveller_info: {
          card_number: '4111111111111111',
        },
      },
      booking_item_id: BOOKING_ITEM_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateBookingItemTravellerInfo({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['booking.update_item'],
        },
        userId: 'staff-1',
      },
      body: {
        traveller_info: [
          {
            full_name: 'Traveller Updated',
          },
        ],
      },
      booking_item_id: BOOKING_ITEM_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminBookingService.updateBookingItemTravellerInfo updates traveller info and sanitizes response', async () => {
  let capturedPayload = null;
  const service = adminBookingService.createAdminBookingService({
    repository: {
      getBookingItemById: async () => ({
        booking_id: BOOKING_ID,
        booking_status: BOOKING_STATUS.PAID,
        id: BOOKING_ITEM_ID,
        quantity: 1,
        reference_id: 'detail-1',
        service_id: 'service-2',
        service_type: 'flight',
        start_at: '2026-07-12T08:00:00.000Z',
        status: BOOKING_ITEM_STATUS.CONFIRMED,
        title_snapshot: 'Flight SGN-HAN',
        total_amount: '2500000',
        traveller_info: [{ full_name: 'Old Name' }],
        unit_price: '2500000',
      }),
      updateBookingItemTravellerInfo: async (payload) => {
        capturedPayload = payload;

        return {
          booking_id: BOOKING_ID,
          id: BOOKING_ITEM_ID,
          quantity: 1,
          reference_id: 'detail-1',
          service_id: 'service-2',
          service_type: 'flight',
          start_at: '2026-07-12T08:00:00.000Z',
          status: BOOKING_ITEM_STATUS.CONFIRMED,
          title_snapshot: 'Flight SGN-HAN',
          total_amount: '2500000',
          traveller_info: [
            {
              full_name: 'New Name',
              passport_number: 'B1234567',
            },
          ],
          unit_price: '2500000',
        };
      },
    },
  });

  const travellerInfo = [
    {
      full_name: 'New Name',
      passport_number: 'B1234567',
    },
  ];
  const result = await service.updateBookingItemTravellerInfo({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['booking.update_item'],
      },
      userId: 'admin-1',
    },
    body: {
      traveller_info: travellerInfo,
    },
    booking_item_id: BOOKING_ITEM_ID,
  });

  assert.deepEqual(capturedPayload, {
    actorUserId: 'admin-1',
    bookingItemId: BOOKING_ITEM_ID,
    travellerInfo,
    travellerInfoLogSummary: {
      payload_type: 'array',
      top_level_keys: ['full_name', 'passport_number'],
      traveller_count: 1,
    },
  });
  assert.deepEqual(result, {
    booking_id: BOOKING_ID,
    end_at: undefined,
    id: BOOKING_ITEM_ID,
    quantity: 1,
    reference_id: 'detail-1',
    service_id: 'service-2',
    service_type: 'flight',
    start_at: '2026-07-12T08:00:00.000Z',
    status: BOOKING_ITEM_STATUS.CONFIRMED,
    title: 'Flight SGN-HAN',
    total_amount: 2500000,
    traveller_info: travellerInfo,
    unit_price: 2500000,
  });
});

test('PATCH /api/admin/booking-items/{booking_item_id}/status updates booking item status for authorized users', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.update_status'],
    role: 'staff',
    sub: 'staff-1',
  });

  adminBookingService.updateBookingItemStatus = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'staff',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['booking.update_status'],
          role: 'staff',
          sub: 'staff-1',
        },
        userId: 'staff-1',
      },
      body: {
        reason: 'Supplier confirmed the seat',
        status: 'confirmed',
      },
      booking_item_id: BOOKING_ITEM_ID,
    });

    return {
      booking_id: BOOKING_ID,
      id: BOOKING_ITEM_ID,
      status: 'confirmed',
      title: 'Flight SGN-HAN',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/booking-items/${BOOKING_ITEM_ID}/status`,
      {
        body: {
          reason: 'Supplier confirmed the seat',
          status: 'confirmed',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Admin booking item status updated successfully',
    );
    assert.equal(response.body.data.id, BOOKING_ITEM_ID);
    assert.equal(response.body.data.status, 'confirmed');
  } finally {
    adminBookingService.updateBookingItemStatus = originalUpdateBookingItemStatus;
    server.close();
  }
});

test('PATCH /api/admin/booking-items/{booking_item_id}/traveller-info updates traveller info for authorized users', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.update_item'],
    role: 'admin',
    sub: 'admin-1',
  });

  adminBookingService.updateBookingItemTravellerInfo = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'admin',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          permissions: ['booking.update_item'],
          role: 'admin',
          sub: 'admin-1',
        },
        userId: 'admin-1',
      },
      body: {
        traveller_info: [
          {
            full_name: 'New Traveller',
          },
        ],
      },
      booking_item_id: BOOKING_ITEM_ID,
    });

    return {
      booking_id: BOOKING_ID,
      id: BOOKING_ITEM_ID,
      status: 'confirmed',
      title: 'Flight SGN-HAN',
      traveller_info: [
        {
          full_name: 'New Traveller',
        },
      ],
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/booking-items/${BOOKING_ITEM_ID}/traveller-info`,
      {
        body: {
          traveller_info: [
            {
              full_name: 'New Traveller',
            },
          ],
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Admin booking item traveller info updated successfully',
    );
    assert.equal(response.body.data.id, BOOKING_ITEM_ID);
    assert.equal(response.body.data.traveller_info.length, 1);
  } finally {
    adminBookingService.updateBookingItemTravellerInfo =
      originalUpdateBookingItemTravellerInfo;
    server.close();
  }
});

test('PATCH /api/admin/booking-items/{booking_item_id} routes validate permission and UUID', async () => {
  const server = app.listen(0);
  const tokenWithoutPermission = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.read_all'],
    role: 'admin',
    sub: 'admin-1',
  });
  const tokenWithPermission = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    permissions: ['booking.update_status'],
    role: 'admin',
    sub: 'admin-1',
  });

  try {
    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/booking-items/${BOOKING_ITEM_ID}/status`,
      {
        body: {
          status: 'confirmed',
        },
        headers: {
          Authorization: `Bearer ${tokenWithoutPermission}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    const badUuidResponse = await request(
      server,
      `${apiPrefix}/admin/booking-items/not-a-uuid/traveller-info`,
      {
        body: {
          traveller_info: [],
        },
        headers: {
          Authorization: `Bearer ${tokenWithPermission}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(badUuidResponse.statusCode, 400);
    assert.equal(
      badUuidResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );
    assert.deepEqual(badUuidResponse.body.error.details, [
      {
        field: 'booking_item_id',
        message: 'booking_item_id must be a valid UUID',
      },
    ]);
  } finally {
    server.close();
  }
});
