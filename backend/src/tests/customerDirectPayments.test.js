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
const paymentService = require('../services/paymentService');
const { createAccessToken } = require('../utils/sessionToken');

const CUSTOMER_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_USER_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const BOOKING_ID = '11111111-1111-4111-8111-111111111111';
const PAYMENT_ID = '22222222-2222-4222-8222-222222222222';

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalCreateCustomerDirectPayment =
  paymentService.createCustomerDirectPayment;
const originalListCustomerBookingPayments =
  paymentService.listCustomerBookingPayments;
const originalGetCustomerPaymentDetail =
  paymentService.getCustomerPaymentDetail;
const originalCancelCustomerPayment =
  paymentService.cancelCustomerPayment;

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
  paymentService.createCustomerDirectPayment = originalCreateCustomerDirectPayment;
  paymentService.listCustomerBookingPayments = originalListCustomerBookingPayments;
  paymentService.getCustomerPaymentDetail = originalGetCustomerPaymentDetail;
  paymentService.cancelCustomerPayment = originalCancelCustomerPayment;
});

test.afterEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  paymentService.createCustomerDirectPayment = originalCreateCustomerDirectPayment;
  paymentService.listCustomerBookingPayments = originalListCustomerBookingPayments;
  paymentService.getCustomerPaymentDetail = originalGetCustomerPaymentDetail;
  paymentService.cancelCustomerPayment = originalCancelCustomerPayment;
});

test('paymentService.createCustomerDirectPayment creates a pending direct payment for the booking owner', async () => {
  const service = paymentService.createPaymentService({
    directPaymentConfig: {
      methods: {
        manual_bank_transfer: {
          enabled: true,
        },
      },
    },
    repository: {
      createDirectPayment: async (payload) => {
        assert.equal(payload.actorUserId, CUSTOMER_ID);
        assert.equal(payload.amount, 4880000);
        assert.equal(payload.bookingCode, 'BK202607020001');
        assert.equal(payload.bookingId, BOOKING_ID);
        assert.equal(payload.currency, 'VND');
        assert.equal(payload.idempotencyKey, 'dp-001');
        assert.equal(payload.note, 'Toi se thanh toan trong hom nay');
        assert.equal(payload.payerName, 'Nguyen Van A');
        assert.equal(payload.payerPhone, '0909000000');
        assert.equal(payload.paymentMethod, 'manual_bank_transfer');
        assert.match(payload.paymentCode, /^PAY\d{8}[0-9A-F]{8}$/);

        return {
          created: true,
          payment: {
            amount: '4880000',
            booking_id: BOOKING_ID,
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            expired_at: '2099-07-03T01:00:00.000Z',
            id: PAYMENT_ID,
            paid_at: null,
            payment_code: 'PAY20260702AAAA1111',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            raw_response: {
              customer_input: {
                payer_name: 'Nguyen Van A',
              },
            },
            status: 'pending',
            updated_at: '2026-07-02T01:00:00.000Z',
          },
          reused: null,
        };
      },
      getBookingById: async (bookingId) => {
        assert.equal(bookingId, BOOKING_ID);

        return {
          booking_code: 'BK202607020001',
          currency: 'VND',
          expires_at: '2099-07-03T01:00:00.000Z',
          id: BOOKING_ID,
          status: 'pending_payment',
          total_amount: '4880000',
          user_id: CUSTOMER_ID,
        };
      },
    },
  });

  const result = await service.createCustomerDirectPayment({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      note: 'Toi se thanh toan trong hom nay',
      payer_name: 'Nguyen Van A',
      payer_phone: '0909000000',
      payment_method: 'manual_bank_transfer',
    },
    bookingId: BOOKING_ID,
    headers: {
      'idempotency-key': 'dp-001',
    },
  });

  assert.equal(result.created, true);
  assert.equal(result.reused, null);
  assert.deepEqual(result.payment, {
    amount: 4880000,
    booking_id: BOOKING_ID,
    created_at: '2026-07-02T01:00:00.000Z',
    currency: 'VND',
    expired_at: '2099-07-03T01:00:00.000Z',
    id: PAYMENT_ID,
    paid_at: null,
    payment_code: 'PAY20260702AAAA1111',
    payment_method: 'manual_bank_transfer',
    provider: 'direct',
    status: 'pending',
    updated_at: '2026-07-02T01:00:00.000Z',
  });
});

test('paymentService.createCustomerDirectPayment reuses the previous payment for the same Idempotency-Key', async () => {
  const service = paymentService.createPaymentService({
    directPaymentConfig: {
      methods: {
        cash_at_office: {
          enabled: true,
        },
      },
    },
    repository: {
      createDirectPayment: async ({ bookingId, idempotencyKey, actorUserId }) => {
        assert.equal(bookingId, BOOKING_ID);
        assert.equal(idempotencyKey, 'dp-001');
        assert.equal(actorUserId, CUSTOMER_ID);

        return {
          created: false,
          payment: {
            amount: '4880000',
            booking_id: BOOKING_ID,
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            expired_at: '2026-07-03T01:00:00.000Z',
            id: PAYMENT_ID,
            paid_at: null,
            payment_code: 'PAY20260702AAAA1111',
            payment_method: 'cash_at_office',
            provider: 'direct',
            raw_response: {},
            status: 'pending',
            updated_at: '2026-07-02T01:00:00.000Z',
          },
          reused: 'idempotency',
        };
      },
      getBookingById: async () => ({
        id: BOOKING_ID,
        status: 'pending_payment',
        total_amount: '4880000',
        user_id: CUSTOMER_ID,
      }),
    },
  });

  const result = await service.createCustomerDirectPayment({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      payer_name: 'Nguyen Van A',
      payment_method: 'cash_at_office',
    },
    bookingId: BOOKING_ID,
    headers: {
      'idempotency-key': 'dp-001',
    },
  });

  assert.equal(result.created, false);
  assert.equal(result.reused, 'idempotency');
  assert.equal(result.payment.payment_code, 'PAY20260702AAAA1111');
});

test('paymentService.createCustomerDirectPayment returns the current pending payment instead of creating a duplicate', async () => {
  const service = paymentService.createPaymentService({
    directPaymentConfig: {
      methods: {
        staff_collect: {
          enabled: true,
        },
      },
    },
    repository: {
      createDirectPayment: async ({ bookingId }) => {
        assert.equal(bookingId, BOOKING_ID);

        return {
          created: false,
          payment: {
            amount: '4880000',
            booking_id: BOOKING_ID,
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            expired_at: '2026-07-03T01:00:00.000Z',
            id: PAYMENT_ID,
            paid_at: null,
            payment_code: 'PAY20260702BBBB2222',
            payment_method: 'staff_collect',
            provider: 'direct',
            raw_response: {},
            status: 'pending',
            updated_at: '2026-07-02T01:00:00.000Z',
          },
          reused: 'pending',
        };
      },
      getBookingById: async () => ({
        id: BOOKING_ID,
        status: 'pending_payment',
        total_amount: '4880000',
        user_id: CUSTOMER_ID,
      }),
    },
  });

  const result = await service.createCustomerDirectPayment({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      payer_name: 'Nguyen Van A',
      payment_method: 'staff_collect',
    },
    bookingId: BOOKING_ID,
    headers: {
      'idempotency-key': 'dp-002',
    },
  });

  assert.equal(result.created, false);
  assert.equal(result.reused, 'pending');
  assert.equal(result.payment.payment_code, 'PAY20260702BBBB2222');
});

test('paymentService.createCustomerDirectPayment requires Idempotency-Key', async () => {
  const service = paymentService.createPaymentService({
    directPaymentConfig: {
      methods: {
        manual_bank_transfer: {
          enabled: true,
        },
      },
    },
    repository: {
      createDirectPayment: async () => {
        throw new Error('createDirectPayment should not be called');
      },
      getBookingById: async () => ({
        booking_code: 'BK202607020001',
        currency: 'VND',
        expires_at: '2099-07-03T01:00:00.000Z',
        id: BOOKING_ID,
        status: 'pending_payment',
        total_amount: '4880000',
        user_id: CUSTOMER_ID,
      }),
    },
  });

  await assert.rejects(
    () => service.createCustomerDirectPayment({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        payment_method: 'manual_bank_transfer',
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

test('paymentService.createCustomerDirectPayment rejects non-payable bookings, expired bookings, and non-owners', async () => {
  const service = paymentService.createPaymentService({
    directPaymentConfig: {
      methods: {
        cash_at_office: {
          enabled: true,
        },
      },
    },
    repository: {
      getBookingById: async (bookingId) => {
        if (bookingId === BOOKING_ID) {
          return {
            id: BOOKING_ID,
            status: 'paid',
            total_amount: '4880000',
            user_id: CUSTOMER_ID,
          };
        }

        if (bookingId === '33333333-3333-4333-8333-333333333333') {
          return {
            expires_at: '2026-07-01T00:00:00.000Z',
            id: bookingId,
            status: 'pending_payment',
            total_amount: '4880000',
            user_id: CUSTOMER_ID,
          };
        }

        return {
          id: bookingId,
          status: 'pending_payment',
          total_amount: '4880000',
          user_id: OTHER_USER_ID,
        };
      },
    },
  });

  await assert.rejects(
    () => service.createCustomerDirectPayment({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        payer_name: 'Nguyen Van A',
        payment_method: 'cash_at_office',
      },
      bookingId: BOOKING_ID,
      headers: {
        'idempotency-key': 'dp-003',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  await assert.rejects(
    () => service.createCustomerDirectPayment({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        payer_name: 'Nguyen Van A',
        payment_method: 'cash_at_office',
      },
      bookingId: '33333333-3333-4333-8333-333333333333',
      headers: {
        'idempotency-key': 'dp-004',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  await assert.rejects(
    () => service.createCustomerDirectPayment({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        payer_name: 'Nguyen Van A',
        payment_method: 'cash_at_office',
      },
      bookingId: '44444444-4444-4444-8444-444444444444',
      headers: {
        'idempotency-key': 'dp-005',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('paymentService.listCustomerBookingPayments and getCustomerPaymentDetail return customer-safe payment data only', async () => {
  const service = paymentService.createPaymentService({
    repository: {
      getBookingById: async () => ({
        id: BOOKING_ID,
        user_id: CUSTOMER_ID,
      }),
      getPaymentById: async (paymentId) => {
        assert.equal(paymentId, PAYMENT_ID);

        return {
          amount: '4880000',
          booking_id: BOOKING_ID,
          booking_status: 'pending_payment',
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          expired_at: '2026-07-03T01:00:00.000Z',
          id: PAYMENT_ID,
          paid_at: null,
          payment_code: 'PAY20260702AAAA1111',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          provider_order_id: 'internal',
          provider_transaction_id: 'internal',
          raw_response: {
            admin_note: 'hidden',
            proof: {
              bank_transaction_code: 'FT123456',
              proof_image_url: 'https://example.com/proof.jpg',
              transfer_note: 'Da chuyen tien',
              uploaded_at: '2026-07-02T02:00:00.000Z',
            },
          },
          status: 'pending',
          updated_at: '2026-07-02T01:05:00.000Z',
          user_id: CUSTOMER_ID,
        };
      },
      listPaymentsByBookingId: async (bookingId) => {
        assert.equal(bookingId, BOOKING_ID);

        return [
          {
            amount: '4880000',
            booking_id: BOOKING_ID,
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            expired_at: '2026-07-03T01:00:00.000Z',
            id: PAYMENT_ID,
            paid_at: null,
            payment_code: 'PAY20260702AAAA1111',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            raw_response: {
              admin_note: 'hidden',
            },
            status: 'pending',
          },
        ];
      },
    },
  });

  const listResult = await service.listCustomerBookingPayments({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    bookingId: BOOKING_ID,
  });
  const detailResult = await service.getCustomerPaymentDetail({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    paymentId: PAYMENT_ID,
  });

  assert.deepEqual(listResult, [
    {
      amount: 4880000,
      booking_id: BOOKING_ID,
      created_at: '2026-07-02T01:00:00.000Z',
      currency: 'VND',
      expired_at: '2026-07-03T01:00:00.000Z',
      id: PAYMENT_ID,
      paid_at: null,
      payment_code: 'PAY20260702AAAA1111',
      payment_method: 'manual_bank_transfer',
      provider: 'direct',
      status: 'pending',
    },
  ]);
  assert.equal(detailResult.raw_response, undefined);
  assert.equal(detailResult.provider_transaction_id, undefined);
  assert.deepEqual(detailResult.proof_summary, {
    bank_transaction_code: 'FT123456',
    proof_image_url: 'https://example.com/proof.jpg',
    transfer_note: 'Da chuyen tien',
    uploaded_at: '2026-07-02T02:00:00.000Z',
  });
});

test('paymentService.cancelCustomerPayment only allows pending owner payments and returns cancelled payment data', async () => {
  const service = paymentService.createPaymentService({
    repository: {
      cancelDirectPayment: async ({ actorUserId, paymentId, reason }) => {
        assert.equal(actorUserId, CUSTOMER_ID);
        assert.equal(paymentId, PAYMENT_ID);
        assert.equal(reason, 'Khach doi phuong thuc thanh toan');

        return {
          amount: '4880000',
          booking_id: BOOKING_ID,
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          expired_at: '2026-07-03T01:00:00.000Z',
          id: PAYMENT_ID,
          paid_at: null,
          payment_code: 'PAY20260702AAAA1111',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          raw_response: {
            cancel_reason: 'Khach doi phuong thuc thanh toan',
          },
          status: 'cancelled',
          updated_at: '2026-07-02T03:00:00.000Z',
        };
      },
      getPaymentById: async (paymentId) => {
        if (paymentId === PAYMENT_ID) {
          return {
            id: PAYMENT_ID,
            status: 'pending',
            user_id: CUSTOMER_ID,
          };
        }

        if (paymentId === '33333333-3333-4333-8333-333333333333') {
          return {
            id: paymentId,
            status: 'success',
            user_id: CUSTOMER_ID,
          };
        }

        return {
          id: paymentId,
          status: 'pending',
          user_id: OTHER_USER_ID,
        };
      },
    },
  });

  const result = await service.cancelCustomerPayment({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      reason: 'Khach doi phuong thuc thanh toan',
    },
    paymentId: PAYMENT_ID,
  });

  assert.equal(result.status, 'cancelled');

  await assert.rejects(
    () => service.cancelCustomerPayment({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        reason: 'Khong the huy',
      },
      paymentId: '33333333-3333-4333-8333-333333333333',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  await assert.rejects(
    () => service.cancelCustomerPayment({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        reason: 'Khong thuoc owner',
      },
      paymentId: '44444444-4444-4444-8444-444444444444',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('POST /api/bookings/{booking_id}/direct-payments requires a customer token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/direct-payments`,
      {
        body: JSON.stringify({
          payer_name: 'Nguyen Van A',
          payment_method: 'cash_at_office',
        }),
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': 'dp-100',
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

test('POST /api/bookings/{booking_id}/direct-payments returns 201 for a created customer direct payment', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: { id: CUSTOMER_ID, role_code: 'customer' },
    userId: CUSTOMER_ID,
  });

  paymentService.createCustomerDirectPayment = async ({
    auth,
    body,
    bookingId,
    headers,
  }) => {
    assert.equal(auth.roleCode, 'customer');
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);
    assert.equal(headers['idempotency-key'], 'dp-101');
    assert.equal(body.payment_method, 'manual_bank_transfer');

    return {
      created: true,
      payment: {
        amount: 4880000,
        booking_id: BOOKING_ID,
        created_at: '2026-07-02T01:00:00.000Z',
        currency: 'VND',
        expired_at: '2026-07-03T01:00:00.000Z',
        id: PAYMENT_ID,
        paid_at: null,
        payment_code: 'PAY20260702AAAA1111',
        payment_method: 'manual_bank_transfer',
        provider: 'direct',
        status: 'pending',
        updated_at: '2026-07-02T01:00:00.000Z',
      },
      reused: null,
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/direct-payments`,
      {
        body: JSON.stringify({
          note: 'Toi se thanh toan trong hom nay',
          payer_name: 'Nguyen Van A',
          payer_phone: '0909000000',
          payment_method: 'manual_bank_transfer',
        }),
        headers: {
          Authorization: `Bearer ${createAccessToken({
            roleCode: 'customer',
            userId: CUSTOMER_ID,
          })}`,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'dp-101',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Direct payment created successfully');
    assert.equal(response.body.data.payment_code, 'PAY20260702AAAA1111');
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    paymentService.createCustomerDirectPayment = originalCreateCustomerDirectPayment;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('GET /api/bookings/{booking_id}/payments, GET /api/payments/{payment_id}, and POST /api/payments/{payment_id}/cancel return customer payment payloads', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: { id: CUSTOMER_ID, role_code: 'customer' },
    userId: CUSTOMER_ID,
  });

  paymentService.listCustomerBookingPayments = async ({ auth, bookingId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(bookingId, BOOKING_ID);

    return [
      {
        amount: 4880000,
        booking_id: BOOKING_ID,
        created_at: '2026-07-02T01:00:00.000Z',
        currency: 'VND',
        expired_at: '2026-07-03T01:00:00.000Z',
        id: PAYMENT_ID,
        paid_at: null,
        payment_code: 'PAY20260702AAAA1111',
        payment_method: 'manual_bank_transfer',
        provider: 'direct',
        status: 'pending',
      },
    ];
  };

  paymentService.getCustomerPaymentDetail = async ({ auth, paymentId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(paymentId, PAYMENT_ID);

    return {
      amount: 4880000,
      booking_id: BOOKING_ID,
      created_at: '2026-07-02T01:00:00.000Z',
      currency: 'VND',
      expired_at: '2026-07-03T01:00:00.000Z',
      id: PAYMENT_ID,
      paid_at: null,
      payment_code: 'PAY20260702AAAA1111',
      payment_method: 'manual_bank_transfer',
      provider: 'direct',
      status: 'pending',
      updated_at: '2026-07-02T01:00:00.000Z',
    };
  };

  paymentService.cancelCustomerPayment = async ({ auth, body, paymentId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(paymentId, PAYMENT_ID);
    assert.equal(body.reason, 'Khach doi phuong thuc');

    return {
      amount: 4880000,
      booking_id: BOOKING_ID,
      created_at: '2026-07-02T01:00:00.000Z',
      currency: 'VND',
      expired_at: '2026-07-03T01:00:00.000Z',
      id: PAYMENT_ID,
      paid_at: null,
      payment_code: 'PAY20260702AAAA1111',
      payment_method: 'manual_bank_transfer',
      provider: 'direct',
      status: 'cancelled',
      updated_at: '2026-07-02T03:00:00.000Z',
    };
  };

  try {
    const authHeader = {
      Authorization: `Bearer ${createAccessToken({
        roleCode: 'customer',
        userId: CUSTOMER_ID,
      })}`,
    };

    const listResponse = await request(
      server,
      `${apiPrefix}/bookings/${BOOKING_ID}/payments`,
      {
        headers: authHeader,
      },
    );
    const detailResponse = await request(
      server,
      `${apiPrefix}/payments/${PAYMENT_ID}`,
      {
        headers: authHeader,
      },
    );
    const cancelResponse = await request(
      server,
      `${apiPrefix}/payments/${PAYMENT_ID}/cancel`,
      {
        body: JSON.stringify({
          reason: 'Khach doi phuong thuc',
        }),
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(listResponse.statusCode, 200);
    assert.equal(listResponse.body.data[0].payment_code, 'PAY20260702AAAA1111');
    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailResponse.body.data.id, PAYMENT_ID);
    assert.equal(cancelResponse.statusCode, 200);
    assert.equal(cancelResponse.body.data.status, 'cancelled');
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    paymentService.listCustomerBookingPayments = originalListCustomerBookingPayments;
    paymentService.getCustomerPaymentDetail = originalGetCustomerPaymentDetail;
    paymentService.cancelCustomerPayment = originalCancelCustomerPayment;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('customer payment routes block non-customer roles with 403', async () => {
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
      `${apiPrefix}/payments/${PAYMENT_ID}`,
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
