const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const voucherService = require('../services/voucherService');
const { createAccessToken } = require('../utils/sessionToken');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalValidateVoucher = voucherService.validateVoucher;

const createAuthContext = ({
  roleCode = 'customer',
  userId = 'user-1',
} = {}) => ({
  roleCode,
  tokenId: 'access-jti-voucher-1',
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

    if (options.body) {
      req.write(options.body);
    }

    req.on('error', reject);
    req.end();
  });

test.beforeEach(() => {
  clearRateLimitStore('voucher-validate');
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  voucherService.validateVoucher = originalValidateVoucher;
});

test.afterEach(() => {
  clearRateLimitStore('voucher-validate');
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  voucherService.validateVoucher = originalValidateVoucher;
});

test('POST /api/vouchers/validate requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/vouchers/validate`, {
      method: 'POST',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('POST /api/vouchers/validate returns 403 for non-customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'user-staff-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'user-staff-1',
    });

  try {
    const response = await request(server, `${apiPrefix}/vouchers/validate`, {
      body: JSON.stringify({
        code: 'SAVE10',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('POST /api/vouchers/validate returns voucher validation payload for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-voucher-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-voucher-1',
    });
  voucherService.validateVoucher = async (context) => {
    capturedContext = context;

    return {
      cart_id: 'cart-voucher-1',
      code: 'TOUR10',
      currency: 'VND',
      discount_amount: 200000,
      discount_type: 'percent',
      discount_value: 10,
      eligible_subtotal_amount: 2000000,
      final_total_amount: 1800000,
      max_discount_amount: 500000,
      min_order_amount: 1000000,
      promotion_id: 'promotion-voucher-1',
      subtotal_amount: 2000000,
      target_service_type: 'tour',
      valid: true,
      voucher_id: 'voucher-voucher-1',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/vouchers/validate`, {
      body: JSON.stringify({
        cart_id: '11111111-1111-4111-8111-111111111111',
        code: 'tour10',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher validated successfully');
    assert.equal(response.body.data.final_total_amount, 1800000);
    assert.deepEqual(capturedContext, {
      payload: {
        cart_id: '11111111-1111-4111-8111-111111111111',
        code: 'tour10',
      },
      userId: 'user-voucher-1',
    });
  } finally {
    server.close();
  }
});

test('POST /api/vouchers/validate returns 429 when rate limit is exceeded', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-voucher-limit',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-voucher-limit',
    });
  voucherService.validateVoucher = async () => ({
    cart_id: 'cart-voucher-limit',
    code: 'SAVE10',
    currency: 'VND',
    discount_amount: 100000,
    discount_type: 'percent',
    discount_value: 10,
    eligible_subtotal_amount: 1000000,
    final_total_amount: 900000,
    max_discount_amount: null,
    min_order_amount: 500000,
    promotion_id: 'promotion-limit',
    subtotal_amount: 1000000,
    target_service_type: null,
    valid: true,
    voucher_id: 'voucher-limit',
  });

  try {
    let lastResponse;

    for (let index = 0; index < 21; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/vouchers/validate`, {
        body: JSON.stringify({
          code: 'save10',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(
      lastResponse.body.message,
      'Too many voucher validation attempts. Please try again later.',
    );
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});
