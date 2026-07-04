const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const refundService = require('../services/refundService');
const { createAccessToken } = require('../utils/sessionToken');

const CUSTOMER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const PAYMENT_ID = '22222222-2222-4222-8222-222222222222';
const REFUND_ID = '33333333-3333-4333-8333-333333333333';

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalCreateCustomerRefundRequest =
  refundService.createCustomerRefundRequest;
const originalListCustomerBookingRefunds =
  refundService.listCustomerBookingRefunds;
const originalGetCustomerRefundDetail =
  refundService.getCustomerRefundDetail;
const originalCancelCustomerRefundRequest =
  refundService.cancelCustomerRefundRequest;

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      options,
      (res) => {
        let body = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            body: JSON.parse(body),
            headers: res.headers,
            statusCode: res.statusCode,
          });
        });
      },
    );

    if (options.body) {
      req.write(options.body);
    }

    req.on('error', reject);
    req.end();
  });

test.beforeEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  refundService.createCustomerRefundRequest = originalCreateCustomerRefundRequest;
  refundService.listCustomerBookingRefunds = originalListCustomerBookingRefunds;
  refundService.getCustomerRefundDetail = originalGetCustomerRefundDetail;
  refundService.cancelCustomerRefundRequest =
    originalCancelCustomerRefundRequest;
});

test.afterEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  refundService.createCustomerRefundRequest = originalCreateCustomerRefundRequest;
  refundService.listCustomerBookingRefunds = originalListCustomerBookingRefunds;
  refundService.getCustomerRefundDetail = originalGetCustomerRefundDetail;
  refundService.cancelCustomerRefundRequest =
    originalCancelCustomerRefundRequest;
});

test('refundService.createCustomerRefundRequest creates a requested refund for the booking owner', async () => {
  const service = refundService.createRefundService({
    repository: {
      createRefundRequest: async (payload) => {
        assert.equal(payload.actorUserId, CUSTOMER_ID);
        assert.equal(payload.amount, 200000);
        assert.equal(payload.booking.id, BOOKING_ID);
        assert.equal(payload.idempotencyKey, 'rf-001');
        assert.equal(payload.nextBookingStatus, 'refund_pending');
        assert.equal(payload.payment.id, PAYMENT_ID);
        assert.equal(payload.reason, 'Can hoan mot phan');

        return {
          booking: {
            booking_code: 'BK202607020001',
            id: BOOKING_ID,
            status: 'refund_pending',
          },
          reused: null,
          refund: {
            amount: '200000',
            booking_id: BOOKING_ID,
            created_at: '2026-07-02T01:00:00.000Z',
            id: REFUND_ID,
            payment_id: PAYMENT_ID,
            processed_at: null,
            reason: 'Can hoan mot phan',
            refund_code: 'RF20260702AAAA1111',
            status: 'requested',
          },
        };
      },
      getBookingById: async (bookingId) => {
        assert.equal(bookingId, BOOKING_ID);

        return {
          booking_code: 'BK202607020001',
          id: BOOKING_ID,
          status: 'paid',
          user_id: CUSTOMER_ID,
        };
      },
      getPaymentById: async (paymentId) => {
        assert.equal(paymentId, PAYMENT_ID);

        return {
          amount: '500000',
          booking_id: BOOKING_ID,
          id: PAYMENT_ID,
          status: 'success',
        };
      },
      listBookingItemsByBookingId: async () => [],
      listRefundsByBookingId: async () => [],
      sumActiveRefundAmountByPaymentId: async () => 150000,
    },
  });

  const result = await service.createCustomerRefundRequest({
    auth: {
      role: 'customer',
      user: {
        permission_codes: ['refund.request'],
      },
      userId: CUSTOMER_ID,
    },
    body: {
      amount: 200000,
      payment_id: PAYMENT_ID,
      reason: 'Can hoan mot phan',
    },
    bookingId: BOOKING_ID,
    headers: {
      'idempotency-key': 'rf-001',
    },
  });

  assert.equal(result.created, true);
  assert.equal(result.reused, null);
  assert.equal(result.booking.status, 'refund_pending');
  assert.deepEqual(result.refund, {
    amount: 200000,
    booking_id: BOOKING_ID,
    created_at: '2026-07-02T01:00:00.000Z',
    id: REFUND_ID,
    payment_id: PAYMENT_ID,
    processed_at: null,
    reason: 'Can hoan mot phan',
    refund_code: 'RF20260702AAAA1111',
    status: 'requested',
  });
});

test('refundService.createCustomerRefundRequest reuses the previous refund for the same Idempotency-Key', async () => {
  const service = refundService.createRefundService({
    repository: {
      createRefundRequest: async ({ booking, idempotencyKey, actorUserId }) => {
        assert.equal(booking.id, BOOKING_ID);
        assert.equal(idempotencyKey, 'rf-001');
        assert.equal(actorUserId, CUSTOMER_ID);

        return {
          booking: {
            booking_code: 'BK202607020001',
            id: BOOKING_ID,
            status: 'refund_pending',
          },
          refund: {
            amount: '200000',
            booking_id: BOOKING_ID,
            created_at: '2026-07-02T01:00:00.000Z',
            id: REFUND_ID,
            payment_id: PAYMENT_ID,
            processed_at: null,
            reason: 'Can hoan mot phan',
            refund_code: 'RF20260702AAAA1111',
            status: 'requested',
          },
          reused: 'idempotency',
        };
      },
      getBookingById: async () => ({
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
        status: 'paid',
        user_id: CUSTOMER_ID,
      }),
      getPaymentById: async () => ({
        amount: '500000',
        booking_id: BOOKING_ID,
        id: PAYMENT_ID,
        status: 'success',
      }),
    },
  });

  const result = await service.createCustomerRefundRequest({
    auth: {
      role: 'customer',
      user: {
        permission_codes: ['refund.request'],
      },
      userId: CUSTOMER_ID,
    },
    body: {
      amount: 200000,
      payment_id: PAYMENT_ID,
      reason: 'Can hoan mot phan',
    },
    bookingId: BOOKING_ID,
    headers: {
      'idempotency-key': 'rf-001',
    },
  });

  assert.equal(result.created, false);
  assert.equal(result.reused, 'idempotency');
  assert.equal(result.refund.refund_code, 'RF20260702AAAA1111');
});

test('refundService.createCustomerRefundRequest requires Idempotency-Key', async () => {
  const service = refundService.createRefundService({
    repository: {
      createRefundRequest: async () => {
        throw new Error('createRefundRequest should not be called');
      },
      getBookingById: async () => ({
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
        status: 'paid',
        user_id: CUSTOMER_ID,
      }),
      getPaymentById: async () => ({
        amount: '500000',
        booking_id: BOOKING_ID,
        id: PAYMENT_ID,
        status: 'success',
      }),
      listBookingItemsByBookingId: async () => [],
      sumActiveRefundAmountByPaymentId: async () => 0,
    },
  });

  await assert.rejects(
    () => service.createCustomerRefundRequest({
      auth: {
        role: 'customer',
        user: {
          permission_codes: ['refund.request'],
        },
        userId: CUSTOMER_ID,
      },
      body: {
        amount: 200000,
        payment_id: PAYMENT_ID,
        reason: 'Can hoan mot phan',
      },
      bookingId: BOOKING_ID,
      headers: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('refundService.createCustomerRefundRequest rejects invalid refund conditions', async () => {
  const service = refundService.createRefundService({
    repository: {
      getBookingById: async (bookingId) => {
        if (bookingId === BOOKING_ID) {
          return {
            booking_code: 'BK202607020001',
            id: BOOKING_ID,
            status: 'partially_refunded',
            user_id: CUSTOMER_ID,
          };
        }

        return {
          booking_code: 'BK202607020001',
          id: bookingId,
          status: 'paid',
          user_id: OTHER_USER_ID,
        };
      },
      getPaymentById: async () => ({
        amount: '500000',
        booking_id: BOOKING_ID,
        id: PAYMENT_ID,
        status: 'partially_refunded',
      }),
      listBookingItemsByBookingId: async () => [],
      sumActiveRefundAmountByPaymentId: async () => 450000,
    },
  });

  await assert.rejects(
    () =>
      service.createCustomerRefundRequest({
        auth: {
          role: 'customer',
          user: {
            permission_codes: ['refund.request'],
          },
          userId: CUSTOMER_ID,
        },
        body: {
          amount: 100000,
          payment_id: PAYMENT_ID,
          reason: 'Vuot qua so tien',
        },
        bookingId: BOOKING_ID,
        headers: {
          'idempotency-key': 'rf-002',
        },
      }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.REFUND_NOT_ALLOWED);
      return true;
    },
  );

  await assert.rejects(
    () =>
      service.createCustomerRefundRequest({
        auth: {
          role: 'customer',
          user: {
            permission_codes: ['refund.request'],
          },
          userId: CUSTOMER_ID,
        },
        body: {
          amount: 100000,
          payment_id: PAYMENT_ID,
          reason: 'Khong thuoc owner',
        },
        bookingId: '44444444-4444-4444-8444-444444444444',
        headers: {
          'idempotency-key': 'rf-003',
        },
      }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('refundService.listCustomerBookingRefunds and getCustomerRefundDetail return customer-safe refund data only', async () => {
  const service = refundService.createRefundService({
    repository: {
      getBookingById: async () => ({
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
        status: 'refund_pending',
        user_id: CUSTOMER_ID,
      }),
      getRefundByIdWithBooking: async () => ({
        amount: '200000',
        booking_code: 'BK202607020001',
        booking_id: BOOKING_ID,
        booking_status: 'refund_pending',
        created_at: '2026-07-02T01:00:00.000Z',
        id: REFUND_ID,
        payment_id: PAYMENT_ID,
        processed_at: null,
        raw_response: {
          internal_note: 'hidden',
        },
        reason: 'Can hoan mot phan',
        refund_code: 'RF20260702AAAA1111',
        status: 'requested',
        user_id: CUSTOMER_ID,
      }),
      listRefundsByBookingId: async () => [
        {
          amount: '200000',
          booking_id: BOOKING_ID,
          created_at: '2026-07-02T01:00:00.000Z',
          id: REFUND_ID,
          payment_id: PAYMENT_ID,
          processed_at: null,
          raw_response: {
            internal_note: 'hidden',
          },
          reason: 'Can hoan mot phan',
          refund_code: 'RF20260702AAAA1111',
          status: 'requested',
        },
      ],
    },
  });

  const listResult = await service.listCustomerBookingRefunds({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    bookingId: BOOKING_ID,
  });
  const detailResult = await service.getCustomerRefundDetail({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    refundId: REFUND_ID,
  });

  assert.equal(listResult.refunds.length, 1);
  assert.equal(listResult.refunds[0].raw_response, undefined);
  assert.equal(detailResult.refund.raw_response, undefined);
  assert.equal(detailResult.refund.refund_code, 'RF20260702AAAA1111');
});

test('refundService.cancelCustomerRefundRequest only allows requested refunds', async () => {
  const service = refundService.createRefundService({
    repository: {
      cancelRefundRequest: async ({ actorUserId, cancelReason, refund }) => {
        assert.equal(actorUserId, CUSTOMER_ID);
        assert.equal(cancelReason, 'Khong can nua');
        assert.equal(refund.id, REFUND_ID);

        return {
          bookingStatus: 'paid',
          refund: {
            amount: '200000',
            booking_id: BOOKING_ID,
            created_at: '2026-07-02T01:00:00.000Z',
            id: REFUND_ID,
            payment_id: PAYMENT_ID,
            processed_at: null,
            reason: 'Can hoan mot phan',
            refund_code: 'RF20260702AAAA1111',
            status: 'cancelled',
          },
        };
      },
      getRefundByIdWithBooking: async (refundId) => {
        if (refundId === REFUND_ID) {
          return {
            amount: '200000',
            booking_code: 'BK202607020001',
            booking_id: BOOKING_ID,
            booking_status: 'refund_pending',
            created_at: '2026-07-02T01:00:00.000Z',
            id: REFUND_ID,
            payment_id: PAYMENT_ID,
            processed_at: null,
            reason: 'Can hoan mot phan',
            refund_code: 'RF20260702AAAA1111',
            status: 'requested',
            user_id: CUSTOMER_ID,
          };
        }

        return {
          amount: '200000',
          booking_code: 'BK202607020001',
          booking_id: BOOKING_ID,
          booking_status: 'refund_pending',
          created_at: '2026-07-02T01:00:00.000Z',
          id: refundId,
          payment_id: PAYMENT_ID,
          processed_at: null,
          reason: 'Can hoan mot phan',
          refund_code: 'RF20260702BBBB2222',
          status: 'approved',
          user_id: CUSTOMER_ID,
        };
      },
    },
  });

  const result = await service.cancelCustomerRefundRequest({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      reason: 'Khong can nua',
    },
    refundId: REFUND_ID,
  });

  assert.equal(result.booking.status, 'paid');
  assert.equal(result.refund.status, 'cancelled');

  await assert.rejects(
    () =>
      service.cancelCustomerRefundRequest({
        auth: {
          role: 'customer',
          userId: CUSTOMER_ID,
        },
        body: {
          reason: 'Khong can nua',
        },
        refundId: '55555555-5555-4555-8555-555555555555',
      }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('POST /api/bookings/{booking_id}/refunds requires a customer token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/refunds`,
      {
        body: JSON.stringify({
          amount: 200000,
          payment_id: PAYMENT_ID,
          reason: 'Can hoan mot phan',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'rf-100',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('customer refund routes return the expected payloads for create, list, detail, and cancel', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: {
      id: CUSTOMER_ID,
      permission_codes: ['refund.request'],
      role_code: 'customer',
    },
    userId: CUSTOMER_ID,
  });

  refundService.createCustomerRefundRequest = async ({
    auth,
    body,
    bookingId,
    headers,
  }) => {
    assert.equal(auth.roleCode, 'customer');
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);
    assert.equal(headers['idempotency-key'], 'rf-101');
    assert.equal(body.payment_id, PAYMENT_ID);

    return {
      booking: {
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
        status: 'refund_pending',
      },
      created: true,
      refund: {
        amount: 200000,
        booking_id: BOOKING_ID,
        created_at: '2026-07-02T01:00:00.000Z',
        id: REFUND_ID,
        payment_id: PAYMENT_ID,
        processed_at: null,
        reason: body.reason,
        refund_code: 'RF20260702AAAA1111',
        status: 'requested',
      },
      reused: null,
    };
  };

  refundService.listCustomerBookingRefunds = async ({ auth, bookingId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);

    return {
      booking: {
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
        status: 'refund_pending',
      },
      refunds: [
        {
          amount: 200000,
          booking_id: BOOKING_ID,
          created_at: '2026-07-02T01:00:00.000Z',
          id: REFUND_ID,
          payment_id: PAYMENT_ID,
          processed_at: null,
          reason: 'Can hoan mot phan',
          refund_code: 'RF20260702AAAA1111',
          status: 'requested',
        },
      ],
    };
  };

  refundService.getCustomerRefundDetail = async ({ auth, refundId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(refundId, REFUND_ID);

    return {
      booking: {
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
        status: 'refund_pending',
      },
      refund: {
        amount: 200000,
        booking_id: BOOKING_ID,
        created_at: '2026-07-02T01:00:00.000Z',
        id: REFUND_ID,
        payment_id: PAYMENT_ID,
        processed_at: null,
        reason: 'Can hoan mot phan',
        refund_code: 'RF20260702AAAA1111',
        status: 'requested',
      },
    };
  };

  refundService.cancelCustomerRefundRequest = async ({
    auth,
    body,
    refundId,
  }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(refundId, REFUND_ID);
    assert.equal(body.reason, 'Khong can nua');

    return {
      booking: {
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
        status: 'paid',
      },
      refund: {
        amount: 200000,
        booking_id: BOOKING_ID,
        created_at: '2026-07-02T01:00:00.000Z',
        id: REFUND_ID,
        payment_id: PAYMENT_ID,
        processed_at: null,
        reason: 'Can hoan mot phan',
        refund_code: 'RF20260702AAAA1111',
        status: 'cancelled',
      },
    };
  };

  try {
    const authHeader = {
      Authorization: `Bearer ${createAccessToken({
        roleCode: 'customer',
        userId: CUSTOMER_ID,
      })}`,
    };

    const createResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/refunds`,
      {
        body: JSON.stringify({
          amount: 200000,
          payment_id: PAYMENT_ID,
          reason: 'Can hoan mot phan',
        }),
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'rf-101',
        },
        method: 'POST',
      },
    );
    const listResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/refunds`,
      {
        headers: authHeader,
      },
    );
    const detailResponse = await request(
      server,
      `${apiPrefix}/refunds/${REFUND_ID}`,
      {
        headers: authHeader,
      },
    );
    const cancelResponse = await request(
      server,
      `${apiPrefix}/refunds/${REFUND_ID}/cancel`,
      {
        body: JSON.stringify({
          reason: 'Khong can nua',
        }),
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(createResponse.statusCode, 201);
    assert.equal(createResponse.body.data.refund.status, 'requested');
    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.body.data.refunds[0].refund_code, 'RF20260702AAAA1111');
    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailResponse.body.data.refund.id, REFUND_ID);
    assert.equal(cancelResponse.statusCode, 200);
    assert.equal(cancelResponse.body.data.refund.status, 'cancelled');
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    refundService.createCustomerRefundRequest =
      originalCreateCustomerRefundRequest;
    refundService.listCustomerBookingRefunds =
      originalListCustomerBookingRefunds;
    refundService.getCustomerRefundDetail = originalGetCustomerRefundDetail;
    refundService.cancelCustomerRefundRequest =
      originalCancelCustomerRefundRequest;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('customer refund routes block non-customer roles with 403', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'admin',
    tokenId: 'token-admin',
    user: { id: OTHER_USER_ID, role_code: 'admin' },
    userId: OTHER_USER_ID,
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/refunds/${REFUND_ID}`,
      {
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'admin',
            userId: OTHER_USER_ID,
          })}`,
        },
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
