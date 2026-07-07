const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-refund-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminRefundService = require('../services/adminRefundService');

const REFUND_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOOKING_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PAYMENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const PAYMENT_ID_2 = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetRefundDetail = adminRefundService.getRefundDetail;
const originalListRefunds = adminRefundService.listRefunds;
const originalApproveRefund = adminRefundService.approveRefund;
const originalMarkRefundFailed = adminRefundService.markRefundFailed;
const originalMarkRefundProcessing = adminRefundService.markRefundProcessing;
const originalMarkRefundSuccess = adminRefundService.markRefundSuccess;
const originalRejectRefund = adminRefundService.rejectRefund;
const originalUpdateRefundInternalNote = adminRefundService.updateRefundInternalNote;

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
  adminRefundService.approveRefund = originalApproveRefund;
  adminRefundService.getRefundDetail = originalGetRefundDetail;
  adminRefundService.listRefunds = originalListRefunds;
  adminRefundService.markRefundFailed = originalMarkRefundFailed;
  adminRefundService.markRefundProcessing = originalMarkRefundProcessing;
  adminRefundService.markRefundSuccess = originalMarkRefundSuccess;
  adminRefundService.rejectRefund = originalRejectRefund;
  adminRefundService.updateRefundInternalNote = originalUpdateRefundInternalNote;
});

test('adminRefundService.listRefunds validates filters and permission refund.read_all', async () => {
  const service = adminRefundService.createAdminRefundService({
    repository: {
      listRefunds: async (filters) => {
        assert.deepEqual(filters, {
          allowedServiceIds: ['service-1'],
          from: '2026-07-01T00:00:00.000Z',
          limit: 2,
          offset: 2,
          status: 'requested',
          to: '2026-07-31T00:00:00.000Z',
        });

        return {
          rows: [
            {
              amount: '200000',
              booking_code: 'BK202607020001',
              booking_id: BOOKING_ID,
              booking_status: 'refund_pending',
              created_at: '2026-07-02T01:00:00.000Z',
              id: REFUND_ID,
              payment_amount: '500000',
              payment_code: 'PAY202607020001',
              payment_currency: 'VND',
              payment_id: PAYMENT_ID,
              payment_method: 'manual_bank_transfer',
              payment_paid_at: '2026-07-02T00:30:00.000Z',
              payment_provider: 'direct',
              payment_status: 'success',
              processed_at: null,
              reason: 'Can hoan mot phan',
              refund_code: 'RF202607020001',
              requested_by_email: 'customer@example.com',
              requested_by_full_name: 'Nguyen Van A',
              requested_by_phone: '0909000000',
              requested_by_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
              status: 'requested',
            },
          ],
          total: 3,
        };
      },
    },
  });

  const result = await service.listRefunds({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1'],
      tokenPayload: {
        permissions: ['refund.read_all'],
      },
    },
    query: {
      from: '2026-07-01',
      limit: '2',
      page: '2',
      status: 'requested',
      to: '2026-07-31',
    },
  });

  assert.deepEqual(result, {
    items: [
      {
        amount: 200000,
        booking: {
          booking_code: 'BK202607020001',
          id: BOOKING_ID,
          status: 'refund_pending',
        },
        created_at: '2026-07-02T01:00:00.000Z',
        currency: 'VND',
        id: REFUND_ID,
        payment: {
          amount: 500000,
          currency: 'VND',
          id: PAYMENT_ID,
          paid_at: '2026-07-02T00:30:00.000Z',
          payment_code: 'PAY202607020001',
          payment_method: 'manual_bank_transfer',
          provider: 'direct',
          status: 'success',
        },
        processed_at: null,
        reason: 'Can hoan mot phan',
        refund_code: 'RF202607020001',
        requested_by: {
          email: 'customer@example.com',
          full_name: 'Nguyen Van A',
          id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          phone: '0909000000',
        },
        status: 'requested',
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

test('adminRefundService.listRefunds rejects invalid filters and missing permission', async () => {
  const service = adminRefundService.createAdminRefundService({
    repository: {
      listRefunds: async () => ({
        rows: [],
        total: 0,
      }),
    },
  });

  await assert.rejects(
    () => service.listRefunds({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['refund.approve'],
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
    () => service.listRefunds({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.read_all'],
        },
      },
      query: {
        status: 'invalid',
      },
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'status',
          message:
            'status must be one of: requested, approved, rejected, processing, success, failed, cancelled',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.listRefunds({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.read_all'],
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

test('adminRefundService.getRefundDetail returns admin-safe refund detail', async () => {
  const service = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async ({ allowedServiceIds, refundId }) => {
        assert.deepEqual(allowedServiceIds, null);
        assert.equal(refundId, REFUND_ID);

        return {
          amount: '200000',
          approved_by_email: 'staff@example.com',
          approved_by_full_name: 'Tran Thi B',
          approved_by_phone: '0911000000',
          approved_by_user_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
          booking_code: 'BK202607020001',
          booking_created_at: '2026-07-01T10:00:00.000Z',
          booking_currency: 'VND',
          booking_expires_at: '2026-07-03T00:00:00.000Z',
          booking_id: BOOKING_ID,
          booking_status: 'refund_pending',
          booking_total_amount: '500000',
          contact_email: 'booker@example.com',
          contact_name: 'Nguyen Van A',
          contact_phone: '0909000000',
          created_at: '2026-07-02T01:00:00.000Z',
          customer_email: 'customer@example.com',
          customer_full_name: 'Nguyen Van A',
          customer_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          customer_phone: '0909000000',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_code: 'PAY202607020001',
          payment_currency: 'VND',
          payment_id: PAYMENT_ID,
          payment_method: 'manual_bank_transfer',
          payment_paid_at: '2026-07-02T00:30:00.000Z',
          payment_provider: 'direct',
          payment_status: 'success',
          processed_at: null,
          provider_refund_id: null,
          raw_response: {
            cancellation: {
              cancelled_at: '2026-07-03T02:00:00.000Z',
              cancelled_by: 'customer',
              reason: 'Da doi y',
            },
            internal_note: {
              note: 'Can doi soat them',
              updated_at: '2026-07-03T03:00:00.000Z',
              updated_by_user_id: 'staff-user-1',
            },
          },
          reason: 'Can hoan mot phan',
          refund_code: 'RF202607020001',
          requested_by_email: 'customer@example.com',
          requested_by_full_name: 'Nguyen Van A',
          requested_by_phone: '0909000000',
          requested_by_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          status: 'requested',
        };
      },
    },
  });

  const result = await service.getRefundDetail({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['refund.read_all'],
      },
    },
    refund_id: REFUND_ID,
  });

  assert.deepEqual(result, {
    amount: 200000,
    approved_by: {
      email: 'staff@example.com',
      full_name: 'Tran Thi B',
      id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
      phone: '0911000000',
    },
    booking: {
      booking_code: 'BK202607020001',
      contact_email: 'booker@example.com',
      contact_name: 'Nguyen Van A',
      contact_phone: '0909000000',
      created_at: '2026-07-01T10:00:00.000Z',
      currency: 'VND',
      customer: {
        email: 'customer@example.com',
        full_name: 'Nguyen Van A',
        id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
        phone: '0909000000',
      },
      expires_at: '2026-07-03T00:00:00.000Z',
      id: BOOKING_ID,
      status: 'refund_pending',
      total_amount: 500000,
    },
    cancellation: {
      cancelled_at: '2026-07-03T02:00:00.000Z',
      cancelled_by: 'customer',
      reason: 'Da doi y',
    },
    created_at: '2026-07-02T01:00:00.000Z',
    id: REFUND_ID,
    internal_note: {
      note: 'Can doi soat them',
      updated_at: '2026-07-03T03:00:00.000Z',
      updated_by_user_id: 'staff-user-1',
    },
    payment: {
      amount: 500000,
      currency: 'VND',
      id: PAYMENT_ID,
      paid_at: '2026-07-02T00:30:00.000Z',
      payment_code: 'PAY202607020001',
      payment_method: 'manual_bank_transfer',
      provider: 'direct',
      status: 'success',
    },
    processed_at: null,
    provider_refund_id: null,
    reason: 'Can hoan mot phan',
    refund_code: 'RF202607020001',
    requested_by: {
      email: 'customer@example.com',
      full_name: 'Nguyen Van A',
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      phone: '0909000000',
    },
    status: 'requested',
  });
});

test('adminRefundService.getRefundDetail rejects invalid UUID and missing refund', async () => {
  const service = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async () => null,
    },
  });

  await assert.rejects(
    () => service.getRefundDetail({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['refund.read_all'],
        },
      },
      refund_id: 'invalid',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  await assert.rejects(
    () => service.getRefundDetail({
      auth: {
        role: 'staff',
        serviceScopeIds: ['service-1'],
        tokenPayload: {
          permissions: ['refund.read_all'],
        },
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
      return true;
    },
  );
});

test('adminRefundService.approveRefund validates permission, idempotency, state, and approved amount rules', async () => {
  const service = adminRefundService.createAdminRefundService({
    repository: {
      approveRefund: async ({ idempotencyKey, refund }) => {
        assert.equal(idempotencyKey, 'approve-key-1');
        assert.equal(refund.id, REFUND_ID);

        return {
          refund: {
            amount: '200000',
            booking_id: BOOKING_ID,
            booking_status: 'paid',
            id: REFUND_ID,
            payment_amount: '500000',
            payment_id: PAYMENT_ID,
            payment_status: 'success',
            raw_response: {},
            refund_code: 'RF202607020001',
            status: 'approved',
          },
          reused: 'idempotency',
          transitionApplied: true,
        };
      },
      getBookingItemsByBookingId: async () => [],
      getRefundById: async ({ refundId }) => {
        assert.equal(refundId, REFUND_ID);

        return {
          amount: '200000',
          booking_id: BOOKING_ID,
          booking_status: 'paid',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_id: PAYMENT_ID,
          payment_status: 'success',
          raw_response: {},
          refund_code: 'RF202607020001',
          status: 'approved',
        };
      },
      sumOtherActiveRefundAmountsByPaymentId: async () => 0,
    },
  });

  const replayResult = await service.approveRefund({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['refund.approve'],
      },
      userId: 'admin-user-1',
    },
    body: {
      approved_amount: 200000,
    },
    headers: {
      'idempotency-key': 'approve-key-1',
    },
    refund_id: REFUND_ID,
  });

  assert.equal(replayResult.status, 'approved');

  await assert.rejects(
    () => service.approveRefund({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.approve'],
        },
        userId: 'admin-user-1',
      },
      body: {
        approved_amount: 200000,
      },
      headers: {},
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  const noPermissionService = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async () => null,
    },
  });

  await assert.rejects(
    () => noPermissionService.approveRefund({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.read_all'],
        },
        userId: 'admin-user-1',
      },
      body: {
        approved_amount: 200000,
      },
      headers: {
        'idempotency-key': 'approve-key-2',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => noPermissionService.approveRefund({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['refund.approve'],
        },
        userId: 'staff-user-1',
      },
      body: {
        approved_amount: 200000,
      },
      headers: {
        'idempotency-key': 'approve-key-staff',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  const invalidAmountService = adminRefundService.createAdminRefundService({
    repository: {
      getBookingItemsByBookingId: async () => [],
      getRefundById: async () => ({
        amount: '200000',
        booking_id: BOOKING_ID,
        booking_status: 'paid',
        id: REFUND_ID,
        payment_amount: '500000',
        payment_id: PAYMENT_ID,
        payment_status: 'success',
        refund_code: 'RF202607020001',
        status: 'requested',
      }),
      sumOtherActiveRefundAmountsByPaymentId: async () => 100000,
    },
  });

  await assert.rejects(
    () => invalidAmountService.approveRefund({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.approve'],
        },
        userId: 'admin-user-1',
      },
      body: {
        approved_amount: 450000,
      },
      headers: {
        'idempotency-key': 'approve-key-3',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.REFUND_NOT_ALLOWED);
      return true;
    },
  );
});

test('adminRefundService.approveRefund approves a requested refund and maps admin-safe result', async () => {
  let capturedApprovePayload;
  const service = adminRefundService.createAdminRefundService({
    repository: {
      approveRefund: async (payload) => {
        capturedApprovePayload = payload;

        return {
          refund: {
            amount: '180000',
            approved_by_email: null,
            approved_by_full_name: null,
            approved_by_phone: null,
            approved_by_user_id: 'admin-user-1',
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T10:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T00:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_status: 'refund_pending',
            booking_total_amount: '500000',
            contact_email: 'booker@example.com',
            contact_name: 'Nguyen Van A',
            contact_phone: '0909000000',
            created_at: '2026-07-02T01:00:00.000Z',
            customer_email: 'customer@example.com',
            customer_full_name: 'Nguyen Van A',
            customer_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            customer_phone: '0909000000',
            id: REFUND_ID,
            payment_amount: '500000',
            payment_code: 'PAY202607020001',
            payment_currency: 'VND',
            payment_id: PAYMENT_ID,
            payment_method: 'manual_bank_transfer',
            payment_paid_at: '2026-07-02T00:30:00.000Z',
            payment_provider: 'direct',
            payment_status: 'success',
            processed_at: null,
            provider_refund_id: null,
            raw_response: {
              approval: {
                approved_amount: 180000,
              },
              internal_notes: {
                note: 'Duyet mot phan',
                updated_at: '2026-07-03T03:00:00.000Z',
                updated_by_user_id: 'admin-user-1',
              },
            },
            reason: 'Can hoan mot phan',
            refund_code: 'RF202607020001',
            requested_by_email: 'customer@example.com',
            requested_by_full_name: 'Nguyen Van A',
            requested_by_phone: '0909000000',
            requested_by_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            status: 'approved',
          },
          transitionApplied: true,
        };
      },
      getBookingItemsByBookingId: async () => [],
      getRefundById: async ({ refundId }) => {
        assert.equal(refundId, REFUND_ID);

        return {
          amount: '200000',
          booking_id: BOOKING_ID,
          booking_status: 'paid',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_id: PAYMENT_ID,
          payment_status: 'success',
          reason: 'Can hoan mot phan',
          refund_code: 'RF202607020001',
          status: 'requested',
        };
      },
      sumOtherActiveRefundAmountsByPaymentId: async ({ excludedRefundId, paymentId }) => {
        assert.equal(excludedRefundId, REFUND_ID);
        assert.equal(paymentId, PAYMENT_ID);
        return 100000;
      },
    },
  });

  const result = await service.approveRefund({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['refund.approve'],
      },
      userId: 'admin-user-1',
    },
    body: {
      approved_amount: 180000,
      note: 'Duyet mot phan',
    },
    headers: {
      'idempotency-key': 'approve-key-9',
    },
    refund_id: REFUND_ID,
  });

  assert.deepEqual(capturedApprovePayload, {
    actorUserId: 'admin-user-1',
    approvedAmount: 180000,
    idempotencyKey: 'approve-key-9',
    nextBookingStatus: 'refund_pending',
    note: 'Duyet mot phan',
    refund: {
      amount: '200000',
      booking_id: BOOKING_ID,
      booking_status: 'paid',
      id: REFUND_ID,
      payment_amount: '500000',
      payment_id: PAYMENT_ID,
      payment_status: 'success',
      reason: 'Can hoan mot phan',
      refund_code: 'RF202607020001',
      status: 'requested',
    },
  });
  assert.equal(result.status, 'approved');
  assert.equal(result.amount, 180000);
  assert.deepEqual(result.internal_note, {
    note: 'Duyet mot phan',
    updated_at: '2026-07-03T03:00:00.000Z',
    updated_by_user_id: 'admin-user-1',
  });
});

test('adminRefundService.rejectRefund rejects only requested refunds', async () => {
  let capturedRejectPayload;
  const service = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async ({ refundId }) => {
        if (refundId === REFUND_ID) {
          return {
            amount: '200000',
            booking_code: 'BK202607020001',
            booking_id: BOOKING_ID,
            booking_status: 'refund_pending',
            id: REFUND_ID,
            payment_amount: '500000',
            payment_id: PAYMENT_ID,
            payment_status: 'success',
            refund_code: 'RF202607020001',
            status: 'requested',
          };
        }

        return {
          amount: '200000',
          booking_id: BOOKING_ID,
          booking_status: 'refund_pending',
          id: refundId,
          payment_amount: '500000',
          payment_id: PAYMENT_ID,
          payment_status: 'success',
          refund_code: 'RF202607020002',
          status: 'approved',
        };
      },
      rejectRefund: async (payload) => {
        capturedRejectPayload = payload;

        return {
          refund: {
            amount: '200000',
            approved_by_email: null,
            approved_by_full_name: null,
            approved_by_phone: null,
            approved_by_user_id: null,
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T10:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T00:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_status: 'paid',
            booking_total_amount: '500000',
            contact_email: 'booker@example.com',
            contact_name: 'Nguyen Van A',
            contact_phone: '0909000000',
            created_at: '2026-07-02T01:00:00.000Z',
            customer_email: 'customer@example.com',
            customer_full_name: 'Nguyen Van A',
            customer_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            customer_phone: '0909000000',
            id: REFUND_ID,
            payment_amount: '500000',
            payment_code: 'PAY202607020001',
            payment_currency: 'VND',
            payment_id: PAYMENT_ID,
            payment_method: 'manual_bank_transfer',
            payment_paid_at: '2026-07-02T00:30:00.000Z',
            payment_provider: 'direct',
            payment_status: 'success',
            processed_at: null,
            provider_refund_id: null,
            raw_response: {
              rejection_reason: 'Khong du dieu kien hoan tien',
            },
            reason: 'Can hoan mot phan',
            refund_code: 'RF202607020001',
            requested_by_email: 'customer@example.com',
            requested_by_full_name: 'Nguyen Van A',
            requested_by_phone: '0909000000',
            requested_by_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            status: 'rejected',
          },
          transitionApplied: true,
        };
      },
    },
  });

  const result = await service.rejectRefund({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['refund.reject'],
      },
      userId: 'admin-user-2',
    },
    body: {
      reason: 'Khong du dieu kien hoan tien',
    },
    refund_id: REFUND_ID,
  });

  assert.deepEqual(capturedRejectPayload, {
    actorUserId: 'admin-user-2',
    reason: 'Khong du dieu kien hoan tien',
    refund: {
      amount: '200000',
      booking_code: 'BK202607020001',
      booking_id: BOOKING_ID,
      booking_status: 'refund_pending',
      id: REFUND_ID,
      payment_amount: '500000',
      payment_id: PAYMENT_ID,
      payment_status: 'success',
      refund_code: 'RF202607020001',
      status: 'requested',
    },
  });
  assert.equal(result.status, 'rejected');

  await assert.rejects(
    () => service.rejectRefund({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.reject'],
        },
        userId: 'admin-user-2',
      },
      body: {
        reason: 'Khong du dieu kien hoan tien',
      },
      refund_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  await assert.rejects(
    () => service.rejectRefund({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['refund.reject'],
        },
        userId: 'staff-user-2',
      },
      body: {
        reason: 'Khong du dieu kien hoan tien',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('adminRefundService.markRefundProcessing requires refund.process and only moves approved refunds to processing', async () => {
  let capturedProcessingPayload;
  const service = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async ({ allowedServiceIds, refundId }) => {
        assert.deepEqual(allowedServiceIds, ['service-1']);
        assert.equal(refundId, REFUND_ID);

        return {
          amount: '200000',
          booking_code: 'BK202607020001',
          booking_id: BOOKING_ID,
          booking_status: 'refund_pending',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_id: PAYMENT_ID,
          payment_status: 'success',
          raw_response: {},
          refund_code: 'RF202607020001',
          status: 'approved',
        };
      },
      markRefundProcessing: async (payload) => {
        capturedProcessingPayload = payload;

        return {
          refund: {
            amount: '200000',
            approved_by_email: null,
            approved_by_full_name: null,
            approved_by_phone: null,
            approved_by_user_id: 'admin-user-3',
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T10:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T00:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_status: 'refund_pending',
            booking_total_amount: '500000',
            contact_email: 'booker@example.com',
            contact_name: 'Nguyen Van A',
            contact_phone: '0909000000',
            created_at: '2026-07-02T01:00:00.000Z',
            customer_email: 'customer@example.com',
            customer_full_name: 'Nguyen Van A',
            customer_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            customer_phone: '0909000000',
            id: REFUND_ID,
            payment_amount: '500000',
            payment_code: 'PAY202607020001',
            payment_currency: 'VND',
            payment_id: PAYMENT_ID,
            payment_method: 'manual_bank_transfer',
            payment_paid_at: '2026-07-02T00:30:00.000Z',
            payment_provider: 'direct',
            payment_status: 'success',
            processed_at: null,
            provider_refund_id: null,
            raw_response: {
              internal_notes: {
                note: 'Dang chuyen khoan hoan',
                updated_at: '2026-07-04T01:00:00.000Z',
                updated_by_user_id: 'staff-user-3',
              },
            },
            reason: 'Can hoan mot phan',
            refund_code: 'RF202607020001',
            requested_by_email: 'customer@example.com',
            requested_by_full_name: 'Nguyen Van A',
            requested_by_phone: '0909000000',
            requested_by_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            status: 'processing',
          },
          transitionApplied: true,
        };
      },
    },
  });

  const result = await service.markRefundProcessing({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1'],
      tokenPayload: {
        permissions: ['refund.process'],
      },
      userId: 'staff-user-3',
    },
    body: {
      note: 'Dang chuyen khoan hoan',
    },
    refund_id: REFUND_ID,
  });

  assert.deepEqual(capturedProcessingPayload, {
    actorUserId: 'staff-user-3',
    note: 'Dang chuyen khoan hoan',
    refundId: REFUND_ID,
  });
  assert.equal(result.status, 'processing');
  assert.deepEqual(result.internal_note, {
    note: 'Dang chuyen khoan hoan',
    updated_at: '2026-07-04T01:00:00.000Z',
    updated_by_user_id: 'staff-user-3',
  });

  await assert.rejects(
    () => service.markRefundProcessing({
      auth: {
        role: 'staff',
        serviceScopeIds: ['service-1'],
        tokenPayload: {
          permissions: ['refund.read_all'],
        },
        userId: 'staff-user-3',
      },
      body: {},
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  const invalidStateService = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async () => ({
        booking_id: BOOKING_ID,
        booking_status: 'refund_pending',
        id: REFUND_ID,
        payment_id: PAYMENT_ID,
        payment_status: 'success',
        status: 'requested',
      }),
      markRefundProcessing: async () => null,
    },
  });

  await assert.rejects(
    () => invalidStateService.markRefundProcessing({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.process'],
        },
        userId: 'admin-user-3',
      },
      body: {},
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminRefundService.markRefundSuccess validates idempotency, state, over-refund, and maps statuses', async () => {
  let capturedMarkSuccessPayload;
  const service = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async ({ allowedServiceIds, refundId }) => {
        assert.deepEqual(allowedServiceIds, ['service-1']);
        assert.equal(refundId, REFUND_ID);

        return {
          amount: '200000',
          booking_code: 'BK202607020001',
          booking_id: BOOKING_ID,
          booking_status: 'refund_pending',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_id: PAYMENT_ID,
          payment_status: 'partially_refunded',
          raw_response: {},
          refund_code: 'RF202607020001',
          status: 'processing',
        };
      },
      markRefundSuccess: async (payload) => {
        capturedMarkSuccessPayload = payload;

        return {
          overRefund: false,
          refund: {
            amount: '200000',
            approved_by_email: null,
            approved_by_full_name: null,
            approved_by_phone: null,
            approved_by_user_id: 'admin-user-4',
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T10:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T00:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_status: 'refunded',
            booking_total_amount: '500000',
            contact_email: 'booker@example.com',
            contact_name: 'Nguyen Van A',
            contact_phone: '0909000000',
            created_at: '2026-07-02T01:00:00.000Z',
            customer_email: 'customer@example.com',
            customer_full_name: 'Nguyen Van A',
            customer_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            customer_phone: '0909000000',
            id: REFUND_ID,
            payment_amount: '500000',
            payment_code: 'PAY202607020001',
            payment_currency: 'VND',
            payment_id: PAYMENT_ID,
            payment_method: 'manual_bank_transfer',
            payment_paid_at: '2026-07-02T00:30:00.000Z',
            payment_provider: 'direct',
            payment_status: 'refunded',
            processed_at: '2026-07-04T02:00:00.000Z',
            provider_refund_id: 'BANK-REF-001',
            raw_response: {
              internal_notes: {
                note: 'Da hoan tien thanh cong',
                updated_at: '2026-07-04T02:00:00.000Z',
                updated_by_user_id: 'staff-user-4',
              },
            },
            reason: 'Can hoan mot phan',
            refund_code: 'RF202607020001',
            requested_by_email: 'customer@example.com',
            requested_by_full_name: 'Nguyen Van A',
            requested_by_phone: '0909000000',
            requested_by_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            status: 'success',
          },
          transitionApplied: true,
        };
      },
    },
  });

  const result = await service.markRefundSuccess({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-1'],
      tokenPayload: {
        permissions: ['refund.process'],
      },
      userId: 'staff-user-4',
    },
    body: {
      note: 'Da hoan tien thanh cong',
      processed_at: '2026-07-04T02:00:00.000Z',
      provider_refund_id: 'BANK-REF-001',
    },
    headers: {
      'idempotency-key': 'refund-success-key',
    },
    refund_id: REFUND_ID,
  });

  assert.deepEqual(capturedMarkSuccessPayload, {
    actorUserId: 'staff-user-4',
    idempotencyKey: 'refund-success-key',
    note: 'Da hoan tien thanh cong',
    processedAt: '2026-07-04T02:00:00.000Z',
    providerRefundId: 'BANK-REF-001',
    refundId: REFUND_ID,
  });
  assert.equal(result.status, 'success');
  assert.equal(result.payment.status, 'refunded');
  assert.equal(result.booking.status, 'refunded');

  await assert.rejects(
    () => service.markRefundSuccess({
      auth: {
        role: 'staff',
        serviceScopeIds: ['service-1'],
        tokenPayload: {
          permissions: ['refund.process'],
        },
        userId: 'staff-user-4',
      },
      body: {
        processed_at: '2026-07-04T02:00:00.000Z',
      },
      headers: {},
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );

  const replayService = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async () => ({
        amount: '200000',
        booking_id: BOOKING_ID,
        booking_status: 'refunded',
        id: REFUND_ID,
        payment_amount: '500000',
        payment_id: PAYMENT_ID,
        payment_status: 'refunded',
        processed_at: '2026-07-04T02:00:00.000Z',
        provider_refund_id: 'BANK-REF-001',
        raw_response: {},
        refund_code: 'RF202607020001',
        status: 'success',
      }),
      markRefundSuccess: async () => ({
        refund: {
          amount: '200000',
          booking_id: BOOKING_ID,
          booking_status: 'refunded',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_id: PAYMENT_ID,
          payment_status: 'refunded',
          processed_at: '2026-07-04T02:00:00.000Z',
          provider_refund_id: 'BANK-REF-001',
          raw_response: {},
          refund_code: 'RF202607020001',
          status: 'success',
        },
        reused: 'idempotency',
        transitionApplied: true,
      }),
    },
  });

  const replayResult = await replayService.markRefundSuccess({
    auth: {
      role: 'admin',
      serviceScopeIds: ['service-1'],
      tokenPayload: {
        permissions: ['refund.process'],
      },
      userId: 'admin-user-4',
    },
    body: {
      processed_at: '2026-07-04T02:00:00.000Z',
    },
    headers: {
      'idempotency-key': 'refund-success-replay',
    },
    refund_id: REFUND_ID,
  });

  assert.equal(replayResult.status, 'success');

  const overRefundService = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async () => ({
        amount: '200000',
        booking_id: BOOKING_ID,
        booking_status: 'refund_pending',
        id: REFUND_ID,
        payment_amount: '500000',
        payment_id: PAYMENT_ID,
        payment_status: 'success',
        refund_code: 'RF202607020001',
        status: 'processing',
      }),
      markRefundSuccess: async () => ({
        overRefund: true,
        refund: {
          id: REFUND_ID,
        },
        transitionApplied: true,
      }),
    },
  });

  await assert.rejects(
    () => overRefundService.markRefundSuccess({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.process'],
        },
        userId: 'admin-user-4',
      },
      body: {
        processed_at: '2026-07-04T02:00:00.000Z',
      },
      headers: {
        'idempotency-key': 'refund-success-over',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.REFUND_NOT_ALLOWED);
      return true;
    },
  );

  const invalidStateService = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async () => ({
        booking_id: BOOKING_ID,
        booking_status: 'refund_pending',
        id: REFUND_ID,
        payment_amount: '500000',
        payment_id: PAYMENT_ID,
        payment_status: 'success',
        status: 'approved',
      }),
      markRefundSuccess: async () => ({
        refund: {
          id: REFUND_ID,
        },
        transitionApplied: false,
      }),
    },
  });

  await assert.rejects(
    () => invalidStateService.markRefundSuccess({
      auth: {
        role: 'staff',
        tokenPayload: {
          permissions: ['refund.process'],
        },
        userId: 'staff-user-4',
      },
      body: {
        processed_at: '2026-07-04T02:00:00.000Z',
      },
      headers: {
        'idempotency-key': 'refund-success-invalid',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminRefundService.markRefundFailed only marks processing refunds as failed', async () => {
  let capturedMarkFailedPayload;
  const service = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async ({ allowedServiceIds, refundId }) => {
        assert.equal(refundId, REFUND_ID);
        assert.deepEqual(allowedServiceIds, null);

        return {
          amount: '200000',
          booking_code: 'BK202607020001',
          booking_id: BOOKING_ID,
          booking_status: 'refund_pending',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_id: PAYMENT_ID,
          payment_status: 'success',
          refund_code: 'RF202607020001',
          status: 'processing',
        };
      },
      markRefundFailed: async (payload) => {
        capturedMarkFailedPayload = payload;

        return {
          refund: {
            amount: '200000',
            approved_by_email: null,
            approved_by_full_name: null,
            approved_by_phone: null,
            approved_by_user_id: 'admin-user-5',
            booking_code: 'BK202607020001',
            booking_created_at: '2026-07-01T10:00:00.000Z',
            booking_currency: 'VND',
            booking_expires_at: '2026-07-03T00:00:00.000Z',
            booking_id: BOOKING_ID,
            booking_status: 'refund_pending',
            booking_total_amount: '500000',
            contact_email: 'booker@example.com',
            contact_name: 'Nguyen Van A',
            contact_phone: '0909000000',
            created_at: '2026-07-02T01:00:00.000Z',
            customer_email: 'customer@example.com',
            customer_full_name: 'Nguyen Van A',
            customer_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
            customer_phone: '0909000000',
            id: REFUND_ID,
            payment_amount: '500000',
            payment_code: 'PAY202607020001',
            payment_currency: 'VND',
            payment_id: PAYMENT_ID,
            payment_method: 'manual_bank_transfer',
            payment_paid_at: '2026-07-02T00:30:00.000Z',
            payment_provider: 'direct',
            payment_status: 'success',
            processed_at: null,
            provider_refund_id: null,
            raw_response: {
              failure_reason: 'Ngan hang tra loi that bai',
            },
            reason: 'Can hoan mot phan',
            refund_code: 'RF202607020001',
            requested_by_email: 'customer@example.com',
            requested_by_full_name: 'Nguyen Van A',
            requested_by_phone: '0909000000',
            requested_by_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            status: 'failed',
          },
          transitionApplied: true,
        };
      },
    },
  });

  const result = await service.markRefundFailed({
    auth: {
      role: 'admin',
      tokenPayload: {
        permissions: ['refund.process'],
      },
      userId: 'admin-user-5',
    },
    body: {
      reason: 'Ngan hang tra loi that bai',
    },
    refund_id: REFUND_ID,
  });

  assert.deepEqual(capturedMarkFailedPayload, {
    actorUserId: 'admin-user-5',
    reason: 'Ngan hang tra loi that bai',
    refundId: REFUND_ID,
  });
  assert.equal(result.status, 'failed');

  await assert.rejects(
    () => service.markRefundFailed({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.process'],
        },
        userId: 'admin-user-5',
      },
      body: {
        reason: '',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('adminRefundService.updateRefundInternalNote validates permission and appends admin-only notes', async () => {
  let capturedUpdateNotePayload;
  const service = adminRefundService.createAdminRefundService({
    repository: {
      getRefundById: async ({ allowedServiceIds, refundId }) => {
        assert.equal(refundId, REFUND_ID);
        assert.deepEqual(allowedServiceIds, ['service-2']);

        return {
          amount: '200000',
          booking_code: 'BK202607020001',
          booking_id: BOOKING_ID,
          booking_status: 'refund_pending',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_id: PAYMENT_ID,
          payment_status: 'success',
          raw_response: {},
          refund_code: 'RF202607020001',
          status: 'processing',
        };
      },
      updateRefundInternalNote: async (payload) => {
        capturedUpdateNotePayload = payload;

        return {
          amount: '200000',
          approved_by_email: null,
          approved_by_full_name: null,
          approved_by_phone: null,
          approved_by_user_id: 'admin-user-6',
          booking_code: 'BK202607020001',
          booking_created_at: '2026-07-01T10:00:00.000Z',
          booking_currency: 'VND',
          booking_expires_at: '2026-07-03T00:00:00.000Z',
          booking_id: BOOKING_ID,
          booking_status: 'refund_pending',
          booking_total_amount: '500000',
          contact_email: 'booker@example.com',
          contact_name: 'Nguyen Van A',
          contact_phone: '0909000000',
          created_at: '2026-07-02T01:00:00.000Z',
          customer_email: 'customer@example.com',
          customer_full_name: 'Nguyen Van A',
          customer_id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
          customer_phone: '0909000000',
          id: REFUND_ID,
          payment_amount: '500000',
          payment_code: 'PAY202607020001',
          payment_currency: 'VND',
          payment_id: PAYMENT_ID,
          payment_method: 'manual_bank_transfer',
          payment_paid_at: '2026-07-02T00:30:00.000Z',
          payment_provider: 'direct',
          payment_status: 'success',
          processed_at: null,
          provider_refund_id: null,
          raw_response: {
            internal_notes: [
              {
                created_at: '2026-07-04T05:00:00.000Z',
                created_by_user_id: 'staff-user-6',
                note: 'Can doi soat them voi ngan hang',
              },
            ],
          },
          reason: 'Can hoan mot phan',
          refund_code: 'RF202607020001',
          requested_by_email: 'customer@example.com',
          requested_by_full_name: 'Nguyen Van A',
          requested_by_phone: '0909000000',
          requested_by_user_id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
          status: 'processing',
        };
      },
    },
  });

  const result = await service.updateRefundInternalNote({
    auth: {
      role: 'staff',
      serviceScopeIds: ['service-2'],
      tokenPayload: {
        permissions: ['refund.process'],
      },
      userId: 'staff-user-6',
    },
    body: {
      note: 'Can doi soat them voi ngan hang',
    },
    refund_id: REFUND_ID,
  });

  assert.deepEqual(capturedUpdateNotePayload, {
    actorUserId: 'staff-user-6',
    note: 'Can doi soat them voi ngan hang',
    refundId: REFUND_ID,
  });
  assert.deepEqual(result.internal_note, [
    {
      created_at: '2026-07-04T05:00:00.000Z',
      created_by_user_id: 'staff-user-6',
      note: 'Can doi soat them voi ngan hang',
    },
  ]);
  assert.equal(result.status, 'processing');
  assert.equal(result.payment.status, 'success');
  assert.equal(result.booking.status, 'refund_pending');

  await assert.rejects(
    () => service.updateRefundInternalNote({
      auth: {
        role: 'staff',
        serviceScopeIds: ['service-2'],
        tokenPayload: {
          permissions: ['refund.read_all'],
        },
        userId: 'staff-user-6',
      },
      body: {
        note: 'Can doi soat them',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );

  await assert.rejects(
    () => service.updateRefundInternalNote({
      auth: {
        role: 'admin',
        tokenPayload: {
          permissions: ['refund.process'],
        },
        userId: 'admin-user-6',
      },
      body: {
        note: '',
      },
      refund_id: REFUND_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('GET /api/admin/refunds requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/refunds`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/refunds returns 403 for customer role', async () => {
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
    const response = await request(server, `${apiPrefix}/admin/refunds`, {
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

test('GET /api/admin/refunds returns list payload with meta for authorized staff', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    permissions: ['refund.read_all'],
    roleCode: 'staff',
    serviceScopeIds: ['service-1'],
    userId: 'staff-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions: tokenPayload.permissions || [],
      roleCode: tokenPayload.roleCode,
      userId: tokenPayload.userId,
    });

  adminRefundService.listRefunds = async (context) => {
    capturedContext = context;

    return {
      items: [
        {
          amount: 200000,
          booking: {
            booking_code: 'BK202607020001',
            id: BOOKING_ID,
            status: 'refund_pending',
          },
          created_at: '2026-07-02T01:00:00.000Z',
          currency: 'VND',
          id: REFUND_ID,
          payment: {
            amount: 500000,
            currency: 'VND',
            id: PAYMENT_ID,
            paid_at: '2026-07-02T00:30:00.000Z',
            payment_code: 'PAY202607020001',
            payment_method: 'manual_bank_transfer',
            provider: 'direct',
            status: 'success',
          },
          processed_at: null,
          reason: 'Can hoan mot phan',
          refund_code: 'RF202607020001',
          requested_by: {
            email: 'customer@example.com',
            full_name: 'Nguyen Van A',
            id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
            phone: '0909000000',
          },
          status: 'requested',
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
      `${apiPrefix}/admin/refunds?status=requested`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin refunds retrieved successfully');
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 20,
      page: 1,
      total: 1,
      total_pages: 1,
    });
    assert.equal(capturedContext.auth.role, 'staff');
    assert.equal(capturedContext.auth.userId, 'staff-user-1');
    assert.deepEqual(capturedContext.auth.serviceScopeIds, ['service-1']);
    assert.equal(capturedContext.query.status, 'requested');
  } finally {
    server.close();
  }
});

test('GET /api/admin/refunds/{refund_id} returns detail payload for authorized admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    permissions: ['refund.read_all'],
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions: tokenPayload.permissions || [],
      roleCode: tokenPayload.roleCode,
      userId: tokenPayload.userId,
    });

  adminRefundService.getRefundDetail = async (context) => {
    assert.equal(context.auth.role, 'admin');
    assert.equal(context.refund_id, REFUND_ID);

    return {
      amount: 200000,
      approved_by: null,
      booking: {
        booking_code: 'BK202607020001',
        id: BOOKING_ID,
        status: 'refund_pending',
        total_amount: 500000,
      },
      cancellation: null,
      created_at: '2026-07-02T01:00:00.000Z',
      id: REFUND_ID,
      internal_note: null,
      payment: {
        amount: 500000,
        currency: 'VND',
        id: PAYMENT_ID,
        paid_at: '2026-07-02T00:30:00.000Z',
        payment_code: 'PAY202607020001',
        payment_method: 'manual_bank_transfer',
        provider: 'direct',
        status: 'success',
      },
      processed_at: null,
      provider_refund_id: null,
      reason: 'Can hoan mot phan',
      refund_code: 'RF202607020001',
      requested_by: {
        email: 'customer@example.com',
        full_name: 'Nguyen Van A',
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        phone: '0909000000',
      },
      status: 'requested',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.message, 'Admin refund detail retrieved successfully');
    assert.equal(response.body.data.id, REFUND_ID);
    assert.equal(response.body.data.payment.payment_code, 'PAY202607020001');
  } finally {
    server.close();
  }
});

test('admin refund process routes forward auth, body, and headers to service methods', async () => {
  const server = app.listen(0);
  const adminApproveToken = createAccessToken({
    permissions: ['refund.approve'],
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  const adminRejectToken = createAccessToken({
    permissions: ['refund.reject'],
    roleCode: 'system_admin',
    userId: 'system-user-1',
  });
  const processToken = createAccessToken({
    permissions: ['refund.process'],
    roleCode: 'staff',
    serviceScopeIds: ['service-1'],
    userId: 'staff-user-9',
  });
  const staffApproveToken = createAccessToken({
    permissions: ['refund.approve'],
    roleCode: 'staff',
    userId: 'staff-user-10',
  });
  const staffRejectToken = createAccessToken({
    permissions: ['refund.reject'],
    roleCode: 'staff',
    userId: 'staff-user-11',
  });
  let capturedApproveContext;
  let capturedMarkFailedContext;
  let capturedMarkProcessingContext;
  let capturedMarkSuccessContext;
  let capturedRejectContext;
  let capturedUpdateNoteContext;

  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions: tokenPayload.permissions || [],
      roleCode: tokenPayload.roleCode,
      userId: tokenPayload.userId,
    });

  adminRefundService.approveRefund = async (context) => {
    capturedApproveContext = context;

    return {
      amount: 180000,
      id: REFUND_ID,
      refund_code: 'RF202607020001',
      status: 'approved',
    };
  };

  adminRefundService.rejectRefund = async (context) => {
    capturedRejectContext = context;

    return {
      amount: 200000,
      id: REFUND_ID,
      refund_code: 'RF202607020001',
      status: 'rejected',
    };
  };

  adminRefundService.markRefundProcessing = async (context) => {
    capturedMarkProcessingContext = context;

    return {
      amount: 200000,
      id: REFUND_ID,
      refund_code: 'RF202607020001',
      status: 'processing',
    };
  };

  adminRefundService.markRefundSuccess = async (context) => {
    capturedMarkSuccessContext = context;

    return {
      amount: 200000,
      id: REFUND_ID,
      refund_code: 'RF202607020001',
      status: 'success',
    };
  };

  adminRefundService.markRefundFailed = async (context) => {
    capturedMarkFailedContext = context;

    return {
      amount: 200000,
      id: REFUND_ID,
      refund_code: 'RF202607020001',
      status: 'failed',
    };
  };

  adminRefundService.updateRefundInternalNote = async (context) => {
    capturedUpdateNoteContext = context;

    return {
      amount: 200000,
      id: REFUND_ID,
      internal_note: [
        {
          created_at: '2026-07-04T05:00:00.000Z',
          created_by_user_id: 'staff-user-9',
          note: 'Ghi chu noi bo moi',
        },
      ],
      refund_code: 'RF202607020001',
      status: 'processing',
    };
  };

  try {
    const forbiddenApproveResponse = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}/approve`,
      {
        body: {
          approved_amount: 180000,
          note: 'Staff should not approve',
        },
        headers: {
          Authorization: `Bearer ${staffApproveToken}`,
        },
        method: 'POST',
      },
    );
    const forbiddenRejectResponse = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}/reject`,
      {
        body: {
          reason: 'Staff should not reject',
        },
        headers: {
          Authorization: `Bearer ${staffRejectToken}`,
        },
        method: 'POST',
      },
    );
    const approveResponse = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}/approve`,
      {
        body: {
          approved_amount: 180000,
          note: 'Duyet mot phan',
        },
        headers: {
          Authorization: `Bearer ${adminApproveToken}`,
          'Idempotency-Key': 'approve-route-key',
        },
        method: 'POST',
      },
    );
    const rejectResponse = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}/reject`,
      {
        body: {
          reason: 'Khong du dieu kien',
        },
        headers: {
          Authorization: `Bearer ${adminRejectToken}`,
        },
        method: 'POST',
      },
    );
    const processingResponse = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}/mark-processing`,
      {
        body: {
          note: 'Dang xu ly',
        },
        headers: {
          Authorization: `Bearer ${processToken}`,
        },
        method: 'POST',
      },
    );
    const successResponse = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}/mark-success`,
      {
        body: {
          note: 'Da hoan tien',
          processed_at: '2026-07-04T02:00:00.000Z',
          provider_refund_id: 'BANK-REF-ROUTE',
        },
        headers: {
          Authorization: `Bearer ${processToken}`,
          'Idempotency-Key': 'mark-success-route-key',
        },
        method: 'POST',
      },
    );
    const failedResponse = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}/mark-failed`,
      {
        body: {
          reason: 'Hoan tien that bai',
        },
        headers: {
          Authorization: `Bearer ${processToken}`,
        },
        method: 'POST',
      },
    );
    const noteResponse = await request(
      server,
      `${apiPrefix}/admin/refunds/${REFUND_ID}/note`,
      {
        body: {
          note: 'Ghi chu noi bo moi',
        },
        headers: {
          Authorization: `Bearer ${processToken}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(forbiddenApproveResponse.statusCode, 403);
    assert.equal(forbiddenApproveResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
    assert.equal(forbiddenRejectResponse.statusCode, 403);
    assert.equal(forbiddenRejectResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    assert.equal(approveResponse.statusCode, 200);
    assert.equal(approveResponse.body.message, 'Admin refund approved successfully');
    assert.equal(approveResponse.body.data.status, 'approved');
    assert.equal(capturedApproveContext.auth.role, 'admin');
    assert.equal(capturedApproveContext.refund_id, REFUND_ID);
    assert.equal(capturedApproveContext.headers['idempotency-key'], 'approve-route-key');
    assert.equal(capturedApproveContext.body.approved_amount, 180000);

    assert.equal(rejectResponse.statusCode, 200);
    assert.equal(rejectResponse.body.message, 'Admin refund rejected successfully');
    assert.equal(rejectResponse.body.data.status, 'rejected');
    assert.equal(capturedRejectContext.auth.role, 'system_admin');
    assert.equal(capturedRejectContext.body.reason, 'Khong du dieu kien');

    assert.equal(processingResponse.statusCode, 200);
    assert.equal(
      processingResponse.body.message,
      'Admin refund marked as processing successfully',
    );
    assert.equal(processingResponse.body.data.status, 'processing');
    assert.equal(capturedMarkProcessingContext.auth.role, 'staff');
    assert.equal(capturedMarkProcessingContext.body.note, 'Dang xu ly');

    assert.equal(successResponse.statusCode, 200);
    assert.equal(
      successResponse.body.message,
      'Admin refund marked as success successfully',
    );
    assert.equal(successResponse.body.data.status, 'success');
    assert.equal(
      capturedMarkSuccessContext.headers['idempotency-key'],
      'mark-success-route-key',
    );
    assert.equal(
      capturedMarkSuccessContext.body.provider_refund_id,
      'BANK-REF-ROUTE',
    );

    assert.equal(failedResponse.statusCode, 200);
    assert.equal(
      failedResponse.body.message,
      'Admin refund marked as failed successfully',
    );
    assert.equal(failedResponse.body.data.status, 'failed');
    assert.equal(capturedMarkFailedContext.body.reason, 'Hoan tien that bai');

    assert.equal(noteResponse.statusCode, 200);
    assert.equal(
      noteResponse.body.message,
      'Admin refund note updated successfully',
    );
    assert.equal(noteResponse.body.data.status, 'processing');
    assert.equal(capturedUpdateNoteContext.auth.role, 'staff');
    assert.equal(capturedUpdateNoteContext.body.note, 'Ghi chu noi bo moi');
  } finally {
    server.close();
  }
});
