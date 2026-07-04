const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-payment-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
  BOOKING_STATUS,
  PAYMENT_STATUS,
} = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminPaymentService = require('../services/adminPaymentService');

const PAYMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const PAYMENT_ID_2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const BOOKING_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetPaymentDetail = adminPaymentService.getPaymentDetail;
const originalGetPaymentProof = adminPaymentService.getPaymentProof;
const originalListPayments = adminPaymentService.listPayments;
const originalConfirmPayment = adminPaymentService.confirmPayment;
const originalRejectPayment = adminPaymentService.rejectPayment;
const originalExpirePayment = adminPaymentService.expirePayment;
const originalMarkPaymentReconciled = adminPaymentService.markPaymentReconciled;
const originalUpdatePaymentNote = adminPaymentService.updatePaymentNote;

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
  userId = 'admin-user-1',
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

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminPaymentService.confirmPayment = originalConfirmPayment;
  adminPaymentService.expirePayment = originalExpirePayment;
  adminPaymentService.getPaymentDetail = originalGetPaymentDetail;
  adminPaymentService.getPaymentProof = originalGetPaymentProof;
  adminPaymentService.listPayments = originalListPayments;
  adminPaymentService.markPaymentReconciled = originalMarkPaymentReconciled;
  adminPaymentService.rejectPayment = originalRejectPayment;
  adminPaymentService.updatePaymentNote = originalUpdatePaymentNote;
});

test('adminPaymentService.listPayments validates filters and permission payment.read_all', async () => {
  const service = adminPaymentService.createAdminPaymentService({
    repository: {
      listPayments: async (filters) => {
        assert.deepEqual(filters, {
          from: '2026-07-01T00:00:00.000Z',
          limit: 2,
          method: 'manual_bank_transfer',
          offset: 2,
          provider: 'direct',
          status: PAYMENT_STATUS.PENDING,
          to: '2026-07-31T00:00:00.000Z',
        });

        return {
          rows: [
            {
              amount: '4880000',
              booking_code: 'BK202607020001',
              booking_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              booking_status: 'pending_payment',
              created_at: '2026-07-02T01:00:00.000Z',
              currency: 'VND',
              customer_email: 'customer@example.com',
              customer_full_name: 'Nguyen Van A',
              customer_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
              customer_phone: '0909000000',
              expired_at: '2026-07-03T01:00:00.000Z',
              id: PAYMENT_ID,
              paid_at: null,
              payment_code: 'PAY202607020001',
              payment_method: 'manual_bank_transfer',
              provider: 'direct',
              raw_response: {
                proof: {
                  proof_image_url: 'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
                },
              },
              status: PAYMENT_STATUS.PENDING,
              updated_at: '2026-07-02T01:10:00.000Z',
            },
          ],
          total: 3,
        };
      },
    },
  });

  const result = await service.listPayments({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['payment.read_all'],
      },
    },
    query: {
      from: '2026-07-01',
      limit: '2',
      method: 'manual_bank_transfer',
      page: '2',
      provider: 'direct',
      status: 'pending',
      to: '2026-07-31',
    },
  });

  assert.deepEqual(result, {
    items: [
      {
        amount: 4880000,
        booking: {
          booking_code: 'BK202607020001',
          id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          status: 'pending_payment',
        },
        created_at: '2026-07-02T01:00:00.000Z',
        currency: 'VND',
        customer: {
          email: 'customer@example.com',
          full_name: 'Nguyen Van A',
          id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          phone: '0909000000',
        },
        expired_at: '2026-07-03T01:00:00.000Z',
        has_proof: true,
        id: PAYMENT_ID,
        paid_at: null,
        payment_code: 'PAY202607020001',
        payment_method: 'manual_bank_transfer',
        provider: 'direct',
        status: 'pending',
        updated_at: '2026-07-02T01:10:00.000Z',
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

test('adminPaymentService.listPayments rejects invalid filters and missing permission', async () => {
  const service = adminPaymentService.createAdminPaymentService({
    repository: {
      listPayments: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.listPayments({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['payment.reconcile'],
        },
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.listPayments({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['payment.read_all'],
        },
      },
      query: {
        provider: 'invalid',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'provider',
          message:
            'provider must be one of: direct, vnpay, momo, visa, mastercard, bank_transfer',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.listPayments({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['payment.read_all'],
        },
      },
      query: {
        from: '2026-08-01',
        to: '2026-07-01',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'date_range',
          message: 'from must be less than or equal to to',
        },
      ]);
      return true;
    },
  );
});

test('adminPaymentService.getPaymentDetail and getPaymentProof return admin-safe data', async () => {
  const service = adminPaymentService.createAdminPaymentService({
    repository: {
      getPaymentById: async (paymentId) => {
        assert.equal(paymentId, PAYMENT_ID);

        return {
          amount: '4880000',
          booking_code: 'BK202607020001',
          booking_created_at: '2026-07-01T12:00:00.000Z',
          booking_currency: 'VND',
          booking_expires_at: '2026-07-03T01:00:00.000Z',
          booking_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          booking_status: 'pending_payment',
          booking_total_amount: '4880000',
          checksum_verified: false,
          contact_email: 'booker@example.com',
          contact_name: 'Nguyen Van A',
          contact_phone: '0909000000',
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          customer_email: 'customer@example.com',
          customer_full_name: 'Nguyen Van A',
          customer_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          customer_phone: '0909000000',
          expired_at: '2026-07-03T01:00:00.000Z',
          id: PAYMENT_ID,
          paid_at: null,
          payment_code: 'PAY202607020001',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          provider_order_id: 'hidden',
          provider_transaction_id: 'hidden',
          raw_response: {
            admin_note: 'hidden',
            proof: {
              bank_transaction_code: 'FT123456789',
              proof_image_url: 'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
              submitted_at: '2026-07-02T03:00:00.000Z',
              transfer_note: 'Da chuyen khoan',
            },
          },
          status: 'pending',
          updated_at: '2026-07-02T01:10:00.000Z',
        };
      },
    },
  });

  const detailResult = await service.getPaymentDetail({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['payment.read_all'],
      },
      userId: 'admin-user-1',
    },
    payment_id: PAYMENT_ID,
  });
  const proofResult = await service.getPaymentProof({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['payment.confirm'],
      },
      userId: 'staff-user-1',
    },
    payment_id: PAYMENT_ID,
  });

  assert.equal(detailResult.provider_transaction_id, undefined);
  assert.equal(detailResult.raw_response, undefined);
  assert.deepEqual(detailResult.proof_summary, {
    bank_transaction_code: 'FT123456789',
    proof_image_url: 'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
    submitted_at: '2026-07-02T03:00:00.000Z',
    transfer_note: 'Da chuyen khoan',
  });
  assert.deepEqual(proofResult, {
    amount: 4880000,
    booking_code: 'BK202607020001',
    currency: 'VND',
    payment_code: 'PAY202607020001',
    payment_id: PAYMENT_ID,
    proof: {
      bank_transaction_code: 'FT123456789',
      proof_image_url: 'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
      submitted_at: '2026-07-02T03:00:00.000Z',
      transfer_note: 'Da chuyen khoan',
    },
    status: 'pending',
  });
});

test('adminPaymentService.getPaymentDetail and getPaymentProof handle missing payment and null proof', async () => {
  const service = adminPaymentService.createAdminPaymentService({
    repository: {
      getPaymentById: async (paymentId) => {
        if (paymentId === PAYMENT_ID) {
          return {
            amount: '4880000',
            booking_code: 'BK202607020001',
            booking_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            booking_status: 'pending_payment',
            booking_total_amount: '4880000',
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            id: PAYMENT_ID,
            payment_code: 'PAY202607020001',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            raw_response: {},
            status: 'pending',
          };
        }

        return null;
      },
    },
  });

  const proofResult = await service.getPaymentProof({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['payment.read_all'],
      },
    },
    payment_id: PAYMENT_ID,
  });

  assert.equal(proofResult.proof, null);

  await assert.rejects(
    () => service.getPaymentDetail({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['payment.read_all'],
        },
      },
      payment_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );
});

test('adminPaymentService.confirmPayment validates idempotency, permission, state, and amount rules', async () => {
  const service = adminPaymentService.createAdminPaymentService({
    repository: {
      getPaymentById: async (paymentId) => {
        assert.equal(paymentId, PAYMENT_ID);

        return {
          amount: '4880000',
          booking_code: 'BK202607020001',
          booking_created_at: '2026-07-01T12:00:00.000Z',
          booking_currency: 'VND',
          booking_expires_at: '2026-07-03T01:00:00.000Z',
          booking_id: BOOKING_ID,
          booking_status: BOOKING_STATUS.PENDING_PAYMENT,
          booking_total_amount: '4880000',
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          customer_email: 'customer@example.com',
          customer_full_name: 'Nguyen Van A',
          customer_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          customer_phone: '0909000000',
          expired_at: '2026-07-03T01:00:00.000Z',
          id: PAYMENT_ID,
          paid_at: '2026-07-02T08:00:00.000Z',
          payment_code: 'PAY202607020001',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          raw_response: {
            confirmation: {
              received_amount: 4880000,
              received_at: '2026-07-02T08:00:00.000Z',
            },
          },
          status: PAYMENT_STATUS.SUCCESS,
          updated_at: '2026-07-02T08:00:00.000Z',
        };
      },
      confirmPayment: async ({ idempotencyKey, paymentId }) => {
        assert.equal(idempotencyKey, 'confirm-key-1');
        assert.equal(paymentId, PAYMENT_ID);
        return {
          payment: {
            amount: '4880000',
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T12:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T01:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_status: BOOKING_STATUS.PENDING_PAYMENT,
            booking_total_amount: '4880000',
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            customer_email: 'customer@example.com',
            customer_full_name: 'Nguyen Van A',
            customer_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            customer_phone: '0909000000',
            expired_at: '2026-07-03T01:00:00.000Z',
            id: PAYMENT_ID,
            paid_at: '2026-07-02T08:00:00.000Z',
            payment_code: 'PAY202607020001',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            raw_response: {
              confirmation: {
                received_amount: 4880000,
                received_at: '2026-07-02T08:00:00.000Z',
              },
            },
            status: PAYMENT_STATUS.SUCCESS,
            updated_at: '2026-07-02T08:00:00.000Z',
          },
          reused: 'idempotency',
          transitionApplied: true,
        };
      },
    },
  });

  const replayResult = await service.confirmPayment({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['payment.confirm'],
      },
      userId: 'staff-user-1',
    },
    body: {
      next_booking_status: 'paid',
      received_amount: 4880000,
      received_at: '2026-07-02T08:00:00.000Z',
    },
    headers: {
      'idempotency-key': 'confirm-key-1',
    },
    payment_id: PAYMENT_ID,
  });

  assert.equal(replayResult.status, PAYMENT_STATUS.SUCCESS);
  assert.deepEqual(replayResult.confirmation, {
    collector_note: null,
    confirmed_at: null,
    confirmed_by_user_id: null,
    received_amount: 4880000,
    received_at: '2026-07-02T08:00:00.000Z',
  });

  await assert.rejects(
    () => service.confirmPayment({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['payment.confirm'],
        },
        userId: 'staff-user-1',
      },
      body: {
        next_booking_status: 'paid',
        received_amount: 4880000,
        received_at: '2026-07-02T08:00:00.000Z',
      },
      headers: {},
      payment_id: PAYMENT_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  const noPermissionService = adminPaymentService.createAdminPaymentService({
    repository: {
      getPaymentById: async () => null,
    },
  });

  await assert.rejects(
    () => noPermissionService.confirmPayment({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['payment.read_all'],
        },
        userId: 'staff-user-1',
      },
      body: {
        next_booking_status: 'paid',
        received_amount: 4880000,
        received_at: '2026-07-02T08:00:00.000Z',
      },
      headers: {
        'idempotency-key': 'confirm-key-2',
      },
      payment_id: PAYMENT_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  const mismatchService = adminPaymentService.createAdminPaymentService({
    repository: {
      getPaymentById: async () => ({
        amount: '4880000',
        booking_status: BOOKING_STATUS.PENDING_PAYMENT,
        id: PAYMENT_ID,
        provider: 'direct',
        status: PAYMENT_STATUS.PENDING,
      }),
    },
  });

  await assert.rejects(
    () => mismatchService.confirmPayment({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['payment.confirm'],
        },
        userId: 'admin-user-1',
      },
      body: {
        next_booking_status: 'paid',
        received_amount: 1000,
        received_at: '2026-07-02T08:00:00.000Z',
      },
      headers: {
        'idempotency-key': 'confirm-key-3',
      },
      payment_id: PAYMENT_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.PAYMENT_AMOUNT_MISMATCH);
      return true;
    },
  );

  const alreadyConfirmedService = adminPaymentService.createAdminPaymentService({
    repository: {
      getPaymentById: async () => ({
        amount: '4880000',
        booking_status: BOOKING_STATUS.PAID,
        id: PAYMENT_ID,
        provider: 'direct',
        status: PAYMENT_STATUS.RECONCILED,
      }),
      confirmPayment: async () => ({
        alreadyConfirmed: true,
        payment: {
          id: PAYMENT_ID,
        },
      }),
    },
  });

  await assert.rejects(
    () => alreadyConfirmedService.confirmPayment({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['payment.confirm'],
        },
        userId: 'admin-user-1',
      },
      body: {
        next_booking_status: 'paid',
        received_amount: 4880000,
        received_at: '2026-07-02T08:00:00.000Z',
      },
      headers: {
        'idempotency-key': 'confirm-key-4',
      },
      payment_id: PAYMENT_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.PAYMENT_ALREADY_CONFIRMED);
      return true;
    },
  );
});

test('adminPaymentService.confirmPayment confirms a pending direct payment and maps admin-safe result', async () => {
  let capturedConfirmPayload;
  const service = adminPaymentService.createAdminPaymentService({
    repository: {
      confirmPayment: async (payload) => {
        capturedConfirmPayload = payload;

        return {
          bookingTransitionApplied: true,
          payment: {
            amount: '4880000',
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T12:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T01:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_status: BOOKING_STATUS.CONFIRMED,
            booking_total_amount: '4880000',
            contact_email: 'booker@example.com',
            contact_name: 'Nguyen Van A',
            contact_phone: '0909000000',
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            customer_email: 'customer@example.com',
            customer_full_name: 'Nguyen Van A',
            customer_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            customer_phone: '0909000000',
            expired_at: '2026-07-03T01:00:00.000Z',
            id: PAYMENT_ID,
            paid_at: '2026-07-02T09:00:00.000Z',
            payment_code: 'PAY202607020001',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            raw_response: {
              confirmation: {
                collector_note: 'Da doi soat tai quay',
                confirmed_at: '2026-07-02T09:00:01.000Z',
                confirmed_by_user_id: 'staff-user-1',
                received_amount: 4880000,
                received_at: '2026-07-02T09:00:00.000Z',
              },
              proof: {
                proof_image_url: 'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
              },
            },
            status: PAYMENT_STATUS.SUCCESS,
            transitionApplied: true,
            updated_at: '2026-07-02T09:00:01.000Z',
          },
          transitionApplied: true,
        };
      },
      getPaymentById: async () => ({
        amount: '4880000',
        booking_code: 'BK202607020001',
        booking_created_at: '2026-07-01T12:00:00.000Z',
        booking_currency: 'VND',
        booking_expires_at: '2026-07-03T01:00:00.000Z',
        booking_id: BOOKING_ID,
        booking_status: BOOKING_STATUS.PENDING_PAYMENT,
        booking_total_amount: '4880000',
        created_at: '2026-07-02T01:00:00.000Z',
        currency: 'VND',
        id: PAYMENT_ID,
        payment_code: 'PAY202607020001',
        payment_method: 'manual_bank_transfer',
        provider: 'direct',
        raw_response: {},
        status: PAYMENT_STATUS.PENDING,
      }),
    },
  });

  const result = await service.confirmPayment({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['payment.confirm'],
      },
      userId: 'staff-user-1',
    },
    body: {
      collector_note: 'Da doi soat tai quay',
      next_booking_status: 'confirmed',
      received_amount: '4880000',
      received_at: '2026-07-02T09:00:00.000Z',
    },
    headers: {
      'idempotency-key': 'confirm-key-ok',
    },
    payment_id: PAYMENT_ID,
  });

  assert.deepEqual(capturedConfirmPayload, {
    actorUserId: 'staff-user-1',
    collectorNote: 'Da doi soat tai quay',
    idempotencyKey: 'confirm-key-ok',
    nextBookingStatus: 'confirmed',
    paymentId: PAYMENT_ID,
    receivedAmount: 4880000,
    receivedAt: '2026-07-02T09:00:00.000Z',
  });
  assert.equal(result.status, PAYMENT_STATUS.SUCCESS);
  assert.equal(result.booking.status, BOOKING_STATUS.CONFIRMED);
  assert.equal(result.proof_summary.proof_image_url, 'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg');
  assert.deepEqual(result.confirmation, {
    collector_note: 'Da doi soat tai quay',
    confirmed_at: '2026-07-02T09:00:01.000Z',
    confirmed_by_user_id: 'staff-user-1',
    received_amount: 4880000,
    received_at: '2026-07-02T09:00:00.000Z',
  });
});

test('adminPaymentService reject, expire, reconcile, and note flows enforce permissions and sanitize responses', async () => {
  let capturedExpirePayload;
  let capturedNotePayload;
  let capturedReconcilePayload;
  let capturedRejectPayload;
  const now = new Date('2026-07-04T00:00:00.000Z');
  const service = adminPaymentService.createAdminPaymentService({
    now: () => now,
    repository: {
      expirePayment: async (payload) => {
        capturedExpirePayload = payload;

        return {
          bookingExpired: true,
          payment: {
            amount: '4880000',
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T12:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T01:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_status: BOOKING_STATUS.EXPIRED,
            booking_total_amount: '4880000',
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            id: PAYMENT_ID,
            payment_code: 'PAY202607020001',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            raw_response: {},
            status: PAYMENT_STATUS.EXPIRED,
            updated_at: '2026-07-04T00:00:00.000Z',
          },
          transitionApplied: true,
        };
      },
      getPaymentById: async (paymentId) => {
        if (paymentId === PAYMENT_ID) {
          return {
            amount: '4880000',
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T12:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T01:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_total_amount: '4880000',
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            id: PAYMENT_ID,
            payment_code: 'PAY202607020001',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            raw_response: {
              internal_note: {
                note: 'Da duyet',
                updated_at: '2026-07-02T10:00:00.000Z',
                updated_by_user_id: 'admin-user-1',
              },
              reconciliation: {
                note: 'Hop le',
                reconciled_at: '2026-07-02T11:00:00.000Z',
                reconciled_by_user_id: 'admin-user-1',
              },
            },
            status: PAYMENT_STATUS.SUCCESS,
            booking_status: BOOKING_STATUS.PENDING_PAYMENT,
          };
        }

        if (paymentId === PAYMENT_ID_2) {
          return {
            amount: '4880000',
            booking_code: 'BK202607020002',
            booking_created_at: '2026-07-01T12:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T01:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_total_amount: '4880000',
            created_at: '2026-07-02T01:00:00.000Z',
            currency: 'VND',
            id: PAYMENT_ID_2,
            payment_code: 'PAY202607020002',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            raw_response: {},
            status: PAYMENT_STATUS.PENDING,
            booking_status: BOOKING_STATUS.PENDING_PAYMENT,
          };
        }

        return null;
      },
      markPaymentReconciled: async (payload) => {
        capturedReconcilePayload = payload;

        return {
          amount: '4880000',
          booking_code: 'BK202607020001',
          booking_created_at: '2026-07-01T12:00:00.000Z',
          booking_currency: 'VND',
          booking_expires_at: '2026-07-03T01:00:00.000Z',
          booking_id: BOOKING_ID,
          booking_status: BOOKING_STATUS.PAID,
          booking_total_amount: '4880000',
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          id: PAYMENT_ID,
          paid_at: '2026-07-02T08:00:00.000Z',
          payment_code: 'PAY202607020001',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          raw_response: {
            reconciliation: {
              note: payload.note,
              reconciled_at: '2026-07-04T01:00:00.000Z',
              reconciled_by_user_id: payload.actorUserId,
            },
          },
          status: PAYMENT_STATUS.RECONCILED,
          updated_at: '2026-07-04T01:00:00.000Z',
        };
      },
      rejectPayment: async (payload) => {
        capturedRejectPayload = payload;

        return {
          amount: '4880000',
          booking_code: 'BK202607020002',
          booking_created_at: '2026-07-01T12:00:00.000Z',
          booking_currency: 'VND',
          booking_expires_at: '2026-07-06T01:00:00.000Z',
          booking_id: BOOKING_ID,
          booking_status: BOOKING_STATUS.PENDING_PAYMENT,
          booking_total_amount: '4880000',
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          id: PAYMENT_ID_2,
          payment_code: 'PAY202607020002',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          raw_response: {},
          status: PAYMENT_STATUS.FAILED,
          updated_at: '2026-07-02T10:00:00.000Z',
        };
      },
      updatePaymentInternalNote: async (payload) => {
        capturedNotePayload = payload;

        return {
          amount: '4880000',
          booking_code: 'BK202607020001',
          booking_created_at: '2026-07-01T12:00:00.000Z',
          booking_currency: 'VND',
          booking_expires_at: '2026-07-03T01:00:00.000Z',
          booking_id: BOOKING_ID,
          booking_status: BOOKING_STATUS.PAID,
          booking_total_amount: '4880000',
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          id: PAYMENT_ID,
          payment_code: 'PAY202607020001',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          raw_response: {
            internal_note: {
              note: payload.note,
              updated_at: '2026-07-04T02:00:00.000Z',
              updated_by_user_id: payload.actorUserId,
            },
          },
          status: PAYMENT_STATUS.SUCCESS,
          updated_at: '2026-07-04T02:00:00.000Z',
        };
      },
    },
  });

  const rejectResult = await service.rejectPayment({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['payment.reject'],
      },
      userId: 'staff-user-2',
    },
    body: {
      reason: 'Khong tim thay giao dich ngan hang',
    },
    payment_id: PAYMENT_ID_2,
  });

  const expireResult = await service.expirePayment({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['payment.confirm'],
      },
      userId: 'staff-user-3',
    },
    body: {
      reason: 'Qua han thanh toan',
    },
    payment_id: PAYMENT_ID_2,
  });

  const reconcileResult = await service.markPaymentReconciled({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['payment.reconcile'],
      },
      userId: 'admin-user-1',
    },
    body: {
      note: 'Da doi soat voi sao ke',
    },
    payment_id: PAYMENT_ID,
  });

  const noteResult = await service.updatePaymentNote({
    auth: {
      role: 'staff',
      tokenPayload: {
        permissions: ['payment.read_all'],
      },
      userId: 'staff-user-4',
    },
    body: {
      note: 'Khach da goi bao se den van phong chieu nay',
    },
    payment_id: PAYMENT_ID,
  });

  assert.deepEqual(capturedRejectPayload, {
    actorUserId: 'staff-user-2',
    paymentId: PAYMENT_ID_2,
    reason: 'Khong tim thay giao dich ngan hang',
  });
  assert.equal(rejectResult.status, PAYMENT_STATUS.FAILED);
  assert.equal(rejectResult.booking.status, BOOKING_STATUS.PENDING_PAYMENT);

  assert.deepEqual(capturedExpirePayload, {
    actorUserId: 'staff-user-3',
    expireBooking: true,
    paymentId: PAYMENT_ID_2,
    reason: 'Qua han thanh toan',
  });
  assert.equal(expireResult.status, PAYMENT_STATUS.EXPIRED);
  assert.equal(expireResult.booking.status, BOOKING_STATUS.EXPIRED);

  assert.deepEqual(capturedReconcilePayload, {
    actorUserId: 'admin-user-1',
    note: 'Da doi soat voi sao ke',
    paymentId: PAYMENT_ID,
  });
  assert.equal(reconcileResult.status, PAYMENT_STATUS.RECONCILED);
  assert.deepEqual(reconcileResult.reconciliation, {
    note: 'Da doi soat voi sao ke',
    reconciled_at: '2026-07-04T01:00:00.000Z',
    reconciled_by_user_id: 'admin-user-1',
  });

  assert.deepEqual(capturedNotePayload, {
    actorUserId: 'staff-user-4',
    note: 'Khach da goi bao se den van phong chieu nay',
    paymentId: PAYMENT_ID,
  });
  assert.deepEqual(noteResult.internal_note, {
    note: 'Khach da goi bao se den van phong chieu nay',
    updated_at: '2026-07-04T02:00:00.000Z',
    updated_by_user_id: 'staff-user-4',
  });

  await assert.rejects(
    () => service.markPaymentReconciled({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['payment.reconcile'],
        },
        userId: 'staff-user-5',
      },
      body: {},
      payment_id: PAYMENT_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('GET /api/admin/payments requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/payments`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/payments returns 403 for customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'customer-user-1',
  });
  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      permissions: [],
      roleCode: 'customer',
      userId: 'customer-user-1',
    });

  try {
    const response = await request(server, `${apiPrefix}/admin/payments`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/admin/payments returns list payload with meta for authorized staff', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    permissions: ['payment.read_all'],
    roleCode: 'staff',
    userId: 'staff-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions: tokenPayload.permissions || [],
      roleCode: tokenPayload.roleCode,
      userId: tokenPayload.userId,
    });

  adminPaymentService.listPayments = async (context) => {
    capturedContext = context;

    return {
      items: [
        {
          amount: 4880000,
          booking: {
            booking_code: 'BK202607020001',
            id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            status: 'pending_payment',
          },
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          customer: {
            email: 'customer@example.com',
            full_name: 'Nguyen Van A',
            id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            phone: '0909000000',
          },
          expired_at: '2026-07-03T01:00:00.000Z',
          has_proof: true,
          id: PAYMENT_ID,
          paid_at: null,
          payment_code: 'PAY202607020001',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          status: 'pending',
          updated_at: '2026-07-02T01:10:00.000Z',
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
      `${apiPrefix}/admin/payments?provider=direct&status=pending`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin payments retrieved successfully');
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 20,
      page: 1,
      total: 1,
      total_pages: 1,
    });
    assert.equal(capturedContext.auth.role, 'staff');
    assert.equal(capturedContext.auth.userId, 'staff-user-1');
    assert.deepEqual(capturedContext.auth.tokenPayload.permissions, ['payment.read_all']);
    assert.equal(capturedContext.query.provider, 'direct');
    assert.equal(capturedContext.query.status, 'pending');
  } finally {
    server.close();
  }
});

test('GET /api/admin/payments/{payment_id} and /proof return detail payloads and permission errors', async () => {
  const server = app.listen(0);
  const readToken = createAccessToken({
    permissions: ['payment.read_all'],
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  const confirmToken = createAccessToken({
    permissions: ['payment.confirm'],
    roleCode: 'staff',
    userId: 'staff-user-1',
  });
  const deniedToken = createAccessToken({
    permissions: ['payment.reconcile'],
    roleCode: 'staff',
    userId: 'staff-user-2',
  });

  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions: tokenPayload.permissions || [],
      roleCode: tokenPayload.roleCode,
      userId: tokenPayload.userId,
    });

  adminPaymentService.getPaymentDetail = async (context) => {
    assert.equal(context.auth.role, 'admin');
    assert.equal(context.payment_id, PAYMENT_ID);

    return {
      amount: 4880000,
      booking: {
        booking_code: 'BK202607020001',
        id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        status: 'pending_payment',
        total_amount: 4880000,
      },
      created_at: '2026-07-02T01:00:00.000Z',
      currency: 'VND',
      customer: {
        email: 'customer@example.com',
        full_name: 'Nguyen Van A',
        id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        phone: '0909000000',
      },
      expired_at: '2026-07-03T01:00:00.000Z',
      id: PAYMENT_ID,
      paid_at: null,
      payment_code: 'PAY202607020001',
      payment_method: 'manual_bank_transfer',
      proof_summary: null,
      provider: 'direct',
      status: 'pending',
      updated_at: '2026-07-02T01:10:00.000Z',
    };
  };

  adminPaymentService.getPaymentProof = async (context) => {
    if (!context.auth.tokenPayload.permissions.includes('payment.confirm')) {
      const error = new Error('Forbidden');
      error.code = API_ERROR_CODES.FORBIDDEN;
      error.statusCode = 403;
      throw error;
    }

    return {
      amount: 4880000,
      booking_code: 'BK202607020001',
      currency: 'VND',
      payment_code: 'PAY202607020001',
      payment_id: PAYMENT_ID,
      proof: null,
      status: 'pending',
    };
  };

  try {
    const detailResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}`,
      {
        headers: {
          Authorization: `Bearer ${readToken}`,
        },
      },
    );
    const proofResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}/proof`,
      {
        headers: {
          Authorization: `Bearer ${confirmToken}`,
        },
      },
    );
    const deniedProofResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}/proof`,
      {
        headers: {
          Authorization: `Bearer ${deniedToken}`,
        },
      },
    );

    assert.equal(detailResponse.statusCode, 200);
    assert.equal(detailResponse.body.message, 'Admin payment detail retrieved successfully');
    assert.equal(detailResponse.body.data.id, PAYMENT_ID);
    assert.equal(proofResponse.statusCode, 200);
    assert.equal(proofResponse.body.message, 'Admin payment proof is not available');
    assert.equal(proofResponse.body.data.proof, null);
    assert.equal(deniedProofResponse.statusCode, 403);
    assert.equal(deniedProofResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('admin payment process routes forward auth, body, and headers to service methods', async () => {
  const server = app.listen(0);
  const staffToken = createAccessToken({
    permissions: ['payment.confirm', 'payment.reject', 'payment.read_all'],
    roleCode: 'staff',
    userId: 'staff-user-9',
  });
  const staffReconcileToken = createAccessToken({
    permissions: ['payment.reconcile'],
    roleCode: 'staff',
    userId: 'staff-user-10',
  });
  const adminToken = createAccessToken({
    permissions: ['payment.reconcile'],
    roleCode: 'admin',
    userId: 'admin-user-9',
  });
  const captured = {
    confirm: null,
    expire: null,
    note: null,
    reconcile: null,
    reject: null,
  };

  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions: tokenPayload.permissions || [],
      roleCode: tokenPayload.roleCode,
      userId: tokenPayload.userId,
    });

  adminPaymentService.confirmPayment = async (context) => {
    captured.confirm = context;
    return {
      booking: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.CONFIRMED,
      },
      id: PAYMENT_ID,
      status: PAYMENT_STATUS.SUCCESS,
    };
  };
  adminPaymentService.rejectPayment = async (context) => {
    captured.reject = context;
    return {
      booking: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.PENDING_PAYMENT,
      },
      id: PAYMENT_ID,
      status: PAYMENT_STATUS.FAILED,
    };
  };
  adminPaymentService.expirePayment = async (context) => {
    captured.expire = context;
    return {
      booking: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.EXPIRED,
      },
      id: PAYMENT_ID,
      status: PAYMENT_STATUS.EXPIRED,
    };
  };
  adminPaymentService.markPaymentReconciled = async (context) => {
    captured.reconcile = context;
    return {
      booking: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.PAID,
      },
      id: PAYMENT_ID,
      status: PAYMENT_STATUS.RECONCILED,
    };
  };
  adminPaymentService.updatePaymentNote = async (context) => {
    captured.note = context;
    return {
      booking: {
        id: BOOKING_ID,
        status: BOOKING_STATUS.PAID,
      },
      id: PAYMENT_ID,
      internal_note: {
        note: context.body.note,
      },
      status: PAYMENT_STATUS.SUCCESS,
    };
  };

  try {
    const confirmResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}/confirm`,
      {
        body: {
          next_booking_status: 'confirmed',
          received_amount: 4880000,
          received_at: '2026-07-02T09:00:00.000Z',
        },
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Idempotency-Key': 'route-confirm-key',
        },
        method: 'POST',
      },
    );
    const rejectResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}/reject`,
      {
        body: {
          reason: 'Thong tin chung tu khong hop le',
        },
        headers: {
          Authorization: `Bearer ${staffToken}`,
        },
        method: 'POST',
      },
    );
    const expireResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}/expire`,
      {
        body: {
          reason: 'Qua han doi soat',
        },
        headers: {
          Authorization: `Bearer ${staffToken}`,
        },
        method: 'POST',
      },
    );
    const forbiddenReconcileResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}/mark-reconciled`,
      {
        body: {
          note: 'Staff should not reconcile',
        },
        headers: {
          Authorization: `Bearer ${staffReconcileToken}`,
        },
        method: 'POST',
      },
    );
    const reconcileResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}/mark-reconciled`,
      {
        body: {
          note: 'Da doi chieu xong',
        },
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        method: 'POST',
      },
    );
    const noteResponse = await request(
      server,
      `${apiPrefix}/admin/payments/${PAYMENT_ID}/note`,
      {
        body: {
          note: 'Can goi lai cho khach',
        },
        headers: {
          Authorization: `Bearer ${staffToken}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(confirmResponse.statusCode, 200);
    assert.equal(confirmResponse.body.message, 'Admin payment confirmed successfully');
    assert.equal(confirmResponse.body.data.status, PAYMENT_STATUS.SUCCESS);
    assert.equal(captured.confirm.auth.role, 'staff');
    assert.equal(captured.confirm.payment_id, PAYMENT_ID);
    assert.equal(captured.confirm.headers['idempotency-key'], 'route-confirm-key');

    assert.equal(rejectResponse.statusCode, 200);
    assert.equal(rejectResponse.body.message, 'Admin payment rejected successfully');
    assert.equal(captured.reject.body.reason, 'Thong tin chung tu khong hop le');

    assert.equal(expireResponse.statusCode, 200);
    assert.equal(expireResponse.body.message, 'Admin payment expired successfully');
    assert.equal(captured.expire.body.reason, 'Qua han doi soat');

    assert.equal(forbiddenReconcileResponse.statusCode, 403);
    assert.equal(forbiddenReconcileResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    assert.equal(reconcileResponse.statusCode, 200);
    assert.equal(reconcileResponse.body.message, 'Admin payment reconciled successfully');
    assert.equal(captured.reconcile.auth.role, 'admin');
    assert.equal(captured.reconcile.body.note, 'Da doi chieu xong');

    assert.equal(noteResponse.statusCode, 200);
    assert.equal(noteResponse.body.message, 'Admin payment note updated successfully');
    assert.equal(captured.note.body.note, 'Can goi lai cho khach');
  } finally {
    server.close();
  }
});
