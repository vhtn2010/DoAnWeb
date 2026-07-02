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
const adminRefundService = require('../services/adminRefundService');

const REFUND_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const BOOKING_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const PAYMENT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const originalGetRefundDetail = adminRefundService.getRefundDetail;
const originalListRefunds = adminRefundService.listRefunds;

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
  adminRefundService.getRefundDetail = originalGetRefundDetail;
  adminRefundService.listRefunds = originalListRefunds;
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
