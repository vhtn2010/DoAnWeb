const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const cartService = require('../services/cartService');
const { createAccessToken } = require('../utils/sessionToken');

const originalGetActiveCart = cartService.getActiveCart;
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;

const createAuthContext = ({
  roleCode = 'customer',
  userId = 'user-1',
} = {}) => ({
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
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  cartService.getActiveCart = originalGetActiveCart;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  cartService.getActiveCart = originalGetActiveCart;
});

test('GET /api/cart requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/cart`, {
      method: 'GET',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/cart returns 403 for non-customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'user-2',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'user-2',
    });

  try {
    const response = await request(server, `${apiPrefix}/cart`, {
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

test('GET /api/cart returns active cart for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-3',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-3',
    });
  cartService.getActiveCart = async (context) => {
    capturedContext = context;

    return {
      created_at: '2026-07-01T08:00:00.000Z',
      id: 'cart-1',
      items: [
        {
          id: 'item-1',
        },
      ],
      status: 'active',
      summary: {
        currency: 'VND',
        item_count: 1,
        quantity_total: 2,
        subtotal_amount: 2990000,
        total_amount: 2990000,
      },
      updated_at: '2026-07-01T08:10:00.000Z',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/cart`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Active cart retrieved successfully');
    assert.equal(response.body.data.id, 'cart-1');
    assert.deepEqual(response.body.data.summary, {
      currency: 'VND',
      item_count: 1,
      quantity_total: 2,
      subtotal_amount: 2990000,
      total_amount: 2990000,
    });
    assert.deepEqual(capturedContext, {
      userId: 'user-3',
    });
  } finally {
    server.close();
  }
});
