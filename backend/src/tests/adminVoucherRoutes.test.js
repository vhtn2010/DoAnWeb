const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminVoucherService = require('../services/adminVoucherService');
const { createAccessToken } = require('../utils/sessionToken');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetVoucherById = adminVoucherService.getVoucherById;
const originalGetVouchers = adminVoucherService.getVouchers;

const createAuthContext = ({
  roleCode = 'admin',
  userId = 'admin-user-1',
} = {}) => ({
  roleCode,
  tokenId: 'access-jti-admin-voucher-1',
  user: {
    email: `${userId}@example.com`,
    id: userId,
    role_code: roleCode,
    role_id: '11111111-1111-4111-8111-111111111111',
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
  adminVoucherService.getVoucherById = originalGetVoucherById;
  adminVoucherService.getVouchers = originalGetVouchers;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminVoucherService.getVoucherById = originalGetVoucherById;
  adminVoucherService.getVouchers = originalGetVouchers;
});

test('GET /api/admin/vouchers requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/vouchers`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/vouchers returns 403 for customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'customer-user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'customer-user-1',
    });

  try {
    const response = await request(server, `${apiPrefix}/admin/vouchers`, {
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

test('GET /api/admin/vouchers returns voucher list with pagination meta', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-user-1',
    });
  adminVoucherService.getVouchers = async (context) => {
    capturedContext = context;

    return {
      data: [
        {
          code: 'SAVE10',
          created_at: '2026-07-01T09:00:00.000Z',
          discount_type: 'percent',
          discount_value: 10,
          id: '22222222-2222-4222-8222-222222222222',
          is_expired: false,
          max_discount_amount: 500000,
          min_order_amount: 1000000,
          promotion: {
            id: '33333333-3333-4333-8333-333333333333',
            name: 'Summer Sale',
            status: 'active',
          },
          status: 'active',
          usage_limit_per_user: 1,
          usage_limit_total: 100,
          used_count: 12,
          valid_from: '2026-06-01T00:00:00.000Z',
          valid_to: '2026-08-01T00:00:00.000Z',
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
      `${apiPrefix}/admin/vouchers?status=active&q=save&page=1&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Vouchers retrieved successfully');
    assert.equal(response.body.data[0].code, 'SAVE10');
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 20,
      page: 1,
      total: 1,
      total_pages: 1,
    });
    assert.deepEqual(capturedContext.actor, {
      email: 'staff-user-1@example.com',
      id: 'staff-user-1',
      role_code: 'staff',
      role_id: '11111111-1111-4111-8111-111111111111',
    });
    assert.equal(capturedContext.query.status, 'active');
    assert.equal(capturedContext.query.q, 'save');
    assert.equal(capturedContext.query.page, '1');
    assert.equal(capturedContext.query.limit, '20');
  } finally {
    server.close();
  }
});

test('GET /api/admin/vouchers/:voucherId returns voucher detail', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-2',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-user-2',
    });
  adminVoucherService.getVoucherById = async (context) => {
    capturedContext = context;

    return {
      booking_usage_count: 4,
      code: 'SAVE10',
      created_at: '2026-07-01T09:00:00.000Z',
      discount_type: 'percent',
      discount_value: 10,
      id: '44444444-4444-4444-8444-444444444444',
      is_expired: false,
      is_used_up: false,
      max_discount_amount: 500000,
      min_order_amount: 1000000,
      promotion: {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Summer Sale',
        status: 'active',
        target_service_type: 'tour',
        valid_from: '2026-06-01T00:00:00.000Z',
        valid_to: '2026-08-01T00:00:00.000Z',
      },
      promotion_id: '55555555-5555-4555-8555-555555555555',
      status: 'active',
      usage_limit_per_user: 1,
      usage_limit_total: 100,
      used_count: 12,
      valid_from: '2026-06-01T00:00:00.000Z',
      valid_to: '2026-08-01T00:00:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/vouchers/44444444-4444-4444-8444-444444444444`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher retrieved successfully');
    assert.equal(response.body.data.code, 'SAVE10');
    assert.deepEqual(capturedContext, {
      actor: {
        email: 'admin-user-2@example.com',
        id: 'admin-user-2',
        role_code: 'admin',
        role_id: '11111111-1111-4111-8111-111111111111',
      },
      voucherId: '44444444-4444-4444-8444-444444444444',
    });
  } finally {
    server.close();
  }
});
