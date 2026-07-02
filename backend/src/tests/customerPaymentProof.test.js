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
const PAYMENT_ID = '22222222-2222-4222-8222-222222222222';

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalUploadCustomerPaymentProof =
  paymentService.uploadCustomerPaymentProof;
const originalGetCustomerPaymentProof =
  paymentService.getCustomerPaymentProof;

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
  paymentService.uploadCustomerPaymentProof = originalUploadCustomerPaymentProof;
  paymentService.getCustomerPaymentProof = originalGetCustomerPaymentProof;
});

test.afterEach(() => {
  clearRateLimitStore();
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  paymentService.uploadCustomerPaymentProof = originalUploadCustomerPaymentProof;
  paymentService.getCustomerPaymentProof = originalGetCustomerPaymentProof;
});

test('paymentService.uploadCustomerPaymentProof updates proof for owner pending direct payment only', async () => {
  const service = paymentService.createPaymentService({
    repository: {
      getPaymentById: async (paymentId) => {
        assert.equal(paymentId, PAYMENT_ID);

        return {
          id: PAYMENT_ID,
          provider: 'direct',
          status: 'pending',
          user_id: CUSTOMER_ID,
        };
      },
      uploadPaymentProof: async ({
        actorUserId,
        bankTransactionCode,
        paymentId,
        proofImageUrl,
        transferNote,
      }) => {
        assert.equal(actorUserId, CUSTOMER_ID);
        assert.equal(paymentId, PAYMENT_ID);
        assert.equal(
          proofImageUrl,
          'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
        );
        assert.equal(transferNote, 'Da chuyen khoan luc 15:30');
        assert.equal(bankTransactionCode, 'FT123456789');

        return {
          id: PAYMENT_ID,
          raw_response: {
            admin_note: 'must-stay-hidden',
            proof: {
              bank_transaction_code: 'FT123456789',
              proof_image_url:
                'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
              submitted_at: '2026-07-02T03:00:00.000Z',
              transfer_note: 'Da chuyen khoan luc 15:30',
            },
          },
          status: 'pending',
        };
      },
    },
  });

  const result = await service.uploadCustomerPaymentProof({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    body: {
      bank_transaction_code: 'FT123456789',
      proof_image_url:
        'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
      transfer_note: 'Da chuyen khoan luc 15:30',
    },
    paymentId: PAYMENT_ID,
  });

  assert.deepEqual(result, {
    payment_id: PAYMENT_ID,
    proof: {
      bank_transaction_code: 'FT123456789',
      proof_image_url:
        'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
      submitted_at: '2026-07-02T03:00:00.000Z',
      transfer_note: 'Da chuyen khoan luc 15:30',
    },
    status: 'pending',
  });
});

test('paymentService.uploadCustomerPaymentProof validates proof_image_url and payment state', async () => {
  const service = paymentService.createPaymentService({
    repository: {
      getPaymentById: async (paymentId) => {
        if (paymentId === PAYMENT_ID) {
          return {
            id: PAYMENT_ID,
            provider: 'vnpay',
            status: 'pending',
            user_id: CUSTOMER_ID,
          };
        }

        if (paymentId === '33333333-3333-4333-8333-333333333333') {
          return {
            id: paymentId,
            provider: 'direct',
            status: 'success',
            user_id: CUSTOMER_ID,
          };
        }

        return {
          id: paymentId,
          provider: 'direct',
          status: 'pending',
          user_id: OTHER_USER_ID,
        };
      },
      uploadPaymentProof: async () => {
        throw new Error('uploadPaymentProof should not be called');
      },
    },
  });

  await assert.rejects(
    () => service.uploadCustomerPaymentProof({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        proof_image_url: 'not-a-url',
      },
      paymentId: PAYMENT_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'proof_image_url',
          message: 'proof_image_url must be a valid http or https URL',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.uploadCustomerPaymentProof({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        proof_image_url: 'https://example.com/proof.jpg',
      },
      paymentId: PAYMENT_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'proof_image_url',
          message: 'proof_image_url must be a valid Cloudinary delivery URL',
        },
      ]);
      return true;
    },
  );

  await assert.rejects(
    () => service.uploadCustomerPaymentProof({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        proof_image_url:
          'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
      },
      paymentId: PAYMENT_ID,
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  await assert.rejects(
    () => service.uploadCustomerPaymentProof({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        proof_image_url:
          'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
      },
      paymentId: '33333333-3333-4333-8333-333333333333',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  await assert.rejects(
    () => service.uploadCustomerPaymentProof({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      body: {
        proof_image_url:
          'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
      },
      paymentId: '44444444-4444-4444-8444-444444444444',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('paymentService.getCustomerPaymentProof returns only proof or null for the owner', async () => {
  const service = paymentService.createPaymentService({
    repository: {
      getPaymentById: async (paymentId) => {
        if (paymentId === PAYMENT_ID) {
          return {
            id: PAYMENT_ID,
            raw_response: {
              admin_note: 'hidden',
              proof: {
                bank_transaction_code: 'FT123456789',
                internal_staff_note: 'hidden',
                proof_image_url:
                  'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
                submitted_at: '2026-07-02T03:00:00.000Z',
                transfer_note: 'Da chuyen khoan',
              },
            },
            status: 'pending',
            user_id: CUSTOMER_ID,
          };
        }

        if (paymentId === '33333333-3333-4333-8333-333333333333') {
          return {
            id: paymentId,
            raw_response: {},
            status: 'pending',
            user_id: CUSTOMER_ID,
          };
        }

        return {
          id: paymentId,
          raw_response: {},
          status: 'pending',
          user_id: OTHER_USER_ID,
        };
      },
    },
  });

  const proofResult = await service.getCustomerPaymentProof({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    paymentId: PAYMENT_ID,
  });
  const nullResult = await service.getCustomerPaymentProof({
    auth: {
      role: 'customer',
      userId: CUSTOMER_ID,
    },
    paymentId: '33333333-3333-4333-8333-333333333333',
  });

  assert.deepEqual(proofResult, {
    payment_id: PAYMENT_ID,
    proof: {
      bank_transaction_code: 'FT123456789',
      proof_image_url:
        'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
      submitted_at: '2026-07-02T03:00:00.000Z',
      transfer_note: 'Da chuyen khoan',
    },
    status: 'pending',
  });
  assert.deepEqual(nullResult, {
    payment_id: '33333333-3333-4333-8333-333333333333',
    proof: null,
    status: 'pending',
  });

  await assert.rejects(
    () => service.getCustomerPaymentProof({
      auth: {
        role: 'customer',
        userId: CUSTOMER_ID,
      },
      paymentId: '44444444-4444-4444-8444-444444444444',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.FORBIDDEN);
      return true;
    },
  );
});

test('POST /api/payments/{payment_id}/proof and GET /api/payments/{payment_id}/proof require customer auth', async () => {
  const server = app.listen(0);

  try {
    const uploadResponse = await request(
      server,
      `${apiPrefix}/payments/${PAYMENT_ID}/proof`,
      {
        body: JSON.stringify({
          proof_image_url:
            'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );
    const getResponse = await request(
      server,
      `${apiPrefix}/payments/${PAYMENT_ID}/proof`,
    );

    assert.equal(uploadResponse.statusCode, 401);
    assert.equal(uploadResponse.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
    assert.equal(getResponse.statusCode, 401);
    assert.equal(getResponse.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('POST /api/payments/{payment_id}/proof returns uploaded proof and GET returns proof or null', async () => {
  const server = app.listen(0);
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'customer',
    tokenId: 'token-customer',
    user: { id: CUSTOMER_ID, role_code: 'customer' },
    userId: CUSTOMER_ID,
  });

  paymentService.uploadCustomerPaymentProof = async ({
    auth,
    body,
    paymentId,
  }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(paymentId, PAYMENT_ID);
    assert.equal(
      body.proof_image_url,
      'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
    );

    return {
      payment_id: PAYMENT_ID,
      proof: {
        bank_transaction_code: 'FT123456789',
        proof_image_url:
          'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
        submitted_at: '2026-07-02T03:00:00.000Z',
        transfer_note: 'Da chuyen khoan luc 15:30',
      },
      status: 'pending',
    };
  };

  let getCallCount = 0;
  paymentService.getCustomerPaymentProof = async ({ auth, paymentId }) => {
    assert.equal(auth.userId, CUSTOMER_ID);
    assert.equal(paymentId, PAYMENT_ID);
    getCallCount += 1;

    return {
      payment_id: PAYMENT_ID,
      proof:
        getCallCount === 1
          ? {
              bank_transaction_code: 'FT123456789',
              proof_image_url:
                'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
              submitted_at: '2026-07-02T03:00:00.000Z',
              transfer_note: 'Da chuyen khoan luc 15:30',
            }
          : null,
      status: 'pending',
    };
  };

  try {
    const authHeader = {
      Authorization: `Bearer ${createAccessToken({
        roleCode: 'customer',
        userId: CUSTOMER_ID,
      })}`,
    };

    const uploadResponse = await request(
      server,
      `${apiPrefix}/payments/${PAYMENT_ID}/proof`,
      {
        body: JSON.stringify({
          bank_transaction_code: 'FT123456789',
          proof_image_url:
            'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg',
          transfer_note: 'Da chuyen khoan luc 15:30',
        }),
        headers: {
          ...authHeader,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );
    const getResponse = await request(
      server,
      `${apiPrefix}/payments/${PAYMENT_ID}/proof`,
      {
        headers: authHeader,
      },
    );
    const nullResponse = await request(
      server,
      `${apiPrefix}/payments/${PAYMENT_ID}/proof`,
      {
        headers: authHeader,
      },
    );

    assert.equal(uploadResponse.statusCode, 200);
    assert.equal(uploadResponse.body.message, 'Payment proof uploaded successfully');
    assert.equal(uploadResponse.body.data.proof.proof_image_url, 'https://res.cloudinary.com/demo/image/upload/v1/payment-proof.jpg');
    assert.equal(getResponse.statusCode, 200);
    assert.equal(getResponse.body.message, 'Payment proof retrieved successfully');
    assert.equal(nullResponse.statusCode, 200);
    assert.equal(nullResponse.body.message, 'Payment proof is not available');
    assert.equal(nullResponse.body.data.proof, null);
  } finally {
    authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
    paymentService.uploadCustomerPaymentProof = originalUploadCustomerPaymentProof;
    paymentService.getCustomerPaymentProof = originalGetCustomerPaymentProof;
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
