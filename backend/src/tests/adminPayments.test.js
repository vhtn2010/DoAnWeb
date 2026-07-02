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
  PAYMENT_STATUS,
} = require('../constants/domainConstraints');
const adminPaymentService = require('../services/adminPaymentService');

const PAYMENT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const originalGetPaymentDetail = adminPaymentService.getPaymentDetail;
const originalGetPaymentProof = adminPaymentService.getPaymentProof;
const originalListPayments = adminPaymentService.listPayments;

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
  adminPaymentService.getPaymentDetail = originalGetPaymentDetail;
  adminPaymentService.getPaymentProof = originalGetPaymentProof;
  adminPaymentService.listPayments = originalListPayments;
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
