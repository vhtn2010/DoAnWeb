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

const originalCreateVoucher = adminVoucherService.createVoucher;
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalChangeVoucherStatus = adminVoucherService.changeVoucherStatus;
const originalDeleteVoucher = adminVoucherService.deleteVoucher;
const originalDuplicateVoucher = adminVoucherService.duplicateVoucher;
const originalGetVoucherById = adminVoucherService.getVoucherById;
const originalGetVouchers = adminVoucherService.getVouchers;
const originalUpdateVoucher = adminVoucherService.updateVoucher;

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
    const body = typeof options.body === 'string' ? options.body : null;
    const requestOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
      },
    };

    if (body && !requestOptions.headers['Content-Length']) {
      requestOptions.headers['Content-Length'] = Buffer.byteLength(body);
    }

    delete requestOptions.body;

    const req = http.request(`http://127.0.0.1:${port}${path}`, requestOptions, (res) => {
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

    if (body) {
      req.write(body);
    }

    req.end();
  });

test.beforeEach(() => {
  adminVoucherService.createVoucher = originalCreateVoucher;
  adminVoucherService.changeVoucherStatus = originalChangeVoucherStatus;
  adminVoucherService.deleteVoucher = originalDeleteVoucher;
  adminVoucherService.duplicateVoucher = originalDuplicateVoucher;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminVoucherService.getVoucherById = originalGetVoucherById;
  adminVoucherService.getVouchers = originalGetVouchers;
  adminVoucherService.updateVoucher = originalUpdateVoucher;
});

test.afterEach(() => {
  adminVoucherService.createVoucher = originalCreateVoucher;
  adminVoucherService.changeVoucherStatus = originalChangeVoucherStatus;
  adminVoucherService.deleteVoucher = originalDeleteVoucher;
  adminVoucherService.duplicateVoucher = originalDuplicateVoucher;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminVoucherService.getVoucherById = originalGetVoucherById;
  adminVoucherService.getVouchers = originalGetVouchers;
  adminVoucherService.updateVoucher = originalUpdateVoucher;
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

test('POST /api/admin/vouchers returns created voucher payload', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-user-9',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-user-9',
    });
  adminVoucherService.createVoucher = async (context) => {
    capturedContext = context;

    return {
      code: 'SAVE30',
      id: '99999999-9999-4999-8999-999999999999',
      status: 'disabled',
      used_count: 0,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/vouchers`, {
      body: JSON.stringify({
        code: 'save30',
        discount_type: 'percent',
        discount_value: 30,
        promotion_id: '33333333-3333-4333-8333-333333333333',
        valid_from: '2026-07-01T00:00:00.000Z',
        valid_to: '2026-07-31T23:59:59.000Z',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher created successfully');
    assert.equal(response.body.data.code, 'SAVE30');
    assert.equal(capturedContext.actorUserId, 'staff-user-9');
    assert.equal(capturedContext.payload.code, 'save30');
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

test('PATCH /api/admin/vouchers/:voucherId returns updated voucher payload', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-7',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-user-7',
    });
  adminVoucherService.updateVoucher = async (context) => {
    capturedContext = context;

    return {
      code: 'SAVE15',
      id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
      status: 'active',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/vouchers/aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1`,
      {
        body: JSON.stringify({
          min_order_amount: 1500000,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher updated successfully');
    assert.equal(response.body.data.code, 'SAVE15');
    assert.equal(capturedContext.actorUserId, 'admin-user-7');
    assert.equal(capturedContext.payload.min_order_amount, 1500000);
    assert.equal(
      capturedContext.voucherId,
      'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
    );
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/vouchers/:voucherId/status returns updated voucher payload', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-user-2',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-user-2',
    });
  adminVoucherService.changeVoucherStatus = async (context) => {
    capturedContext = context;

    return {
      code: 'SAVE10',
      id: '66666666-6666-4666-8666-666666666666',
      status: 'disabled',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/vouchers/66666666-6666-4666-8666-666666666666/status`,
      {
        body: JSON.stringify({
          status: 'disabled',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher status updated successfully');
    assert.equal(response.body.data.status, 'disabled');
    assert.equal(capturedContext.actorUserId, 'staff-user-2');
    assert.equal(capturedContext.payload.status, 'disabled');
    assert.equal(capturedContext.voucherId, '66666666-6666-4666-8666-666666666666');
  } finally {
    server.close();
  }
});

test('POST /api/admin/vouchers/:voucherId/duplicate returns duplicated voucher payload', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-8',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-user-8',
    });
  adminVoucherService.duplicateVoucher = async (context) => {
    capturedContext = context;

    return {
      code: 'SAVE10COPY',
      id: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
      status: 'disabled',
      used_count: 0,
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/vouchers/bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1/duplicate`,
      {
        body: JSON.stringify({
          new_code: 'save10copy',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher duplicated successfully');
    assert.equal(response.body.data.status, 'disabled');
    assert.equal(capturedContext.actorUserId, 'admin-user-8');
    assert.equal(capturedContext.payload.new_code, 'save10copy');
    assert.equal(
      capturedContext.voucherId,
      'bbbbbbb1-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
    );
  } finally {
    server.close();
  }
});

test('DELETE /api/admin/vouchers/:voucherId returns 403 for staff role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-user-3',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-user-3',
    });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/vouchers/77777777-7777-4777-8777-777777777777`,
      {
        body: JSON.stringify({
          reason: 'Disable campaign voucher',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('DELETE /api/admin/vouchers/:voucherId returns disabled voucher payload for admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-3',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-user-3',
    });
  adminVoucherService.deleteVoucher = async (context) => {
    capturedContext = context;

    return {
      code: 'SAVE10',
      id: '88888888-8888-4888-8888-888888888888',
      reason: 'Campaign ended early',
      status: 'disabled',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/vouchers/88888888-8888-4888-8888-888888888888`,
      {
        body: JSON.stringify({
          reason: 'Campaign ended early',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Voucher deleted successfully');
    assert.equal(response.body.data.status, 'disabled');
    assert.equal(capturedContext.actorUserId, 'admin-user-3');
    assert.equal(capturedContext.payload.reason, 'Campaign ended early');
    assert.equal(capturedContext.voucherId, '88888888-8888-4888-8888-888888888888');
  } finally {
    server.close();
  }
});
