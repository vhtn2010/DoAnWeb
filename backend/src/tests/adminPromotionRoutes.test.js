const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminPromotionService = require('../services/adminPromotionService');
const { createAccessToken } = require('../utils/sessionToken');

const originalChangePromotionStatus = adminPromotionService.changePromotionStatus;
const originalCreatePromotion = adminPromotionService.createPromotion;
const originalDeletePromotion = adminPromotionService.deletePromotion;
const originalGetPromotionById = adminPromotionService.getPromotionById;
const originalGetPromotions = adminPromotionService.getPromotions;
const originalGetPromotionVouchers = adminPromotionService.getPromotionVouchers;
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalUpdatePromotion = adminPromotionService.updatePromotion;

const createAuthContext = ({
  roleCode = 'admin',
  userId = 'admin-user-1',
} = {}) => ({
  roleCode,
  tokenId: 'access-jti-admin-promotion-1',
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
    });

    req.on('error', reject);

    if (body) {
      req.write(body);
    }

    req.end();
  });

test.beforeEach(() => {
  adminPromotionService.changePromotionStatus = originalChangePromotionStatus;
  adminPromotionService.createPromotion = originalCreatePromotion;
  adminPromotionService.deletePromotion = originalDeletePromotion;
  adminPromotionService.getPromotionById = originalGetPromotionById;
  adminPromotionService.getPromotions = originalGetPromotions;
  adminPromotionService.getPromotionVouchers = originalGetPromotionVouchers;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminPromotionService.updatePromotion = originalUpdatePromotion;
});

test.afterEach(() => {
  adminPromotionService.changePromotionStatus = originalChangePromotionStatus;
  adminPromotionService.createPromotion = originalCreatePromotion;
  adminPromotionService.deletePromotion = originalDeletePromotion;
  adminPromotionService.getPromotionById = originalGetPromotionById;
  adminPromotionService.getPromotions = originalGetPromotions;
  adminPromotionService.getPromotionVouchers = originalGetPromotionVouchers;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminPromotionService.updatePromotion = originalUpdatePromotion;
});

test('GET /api/admin/promotions requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/promotions`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/promotions returns 403 for customer role', async () => {
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
    const response = await request(server, `${apiPrefix}/admin/promotions`, {
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

test('GET /api/admin/promotions returns list payload with meta', async () => {
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
  adminPromotionService.getPromotions = async (context) => {
    capturedContext = context;

    return {
      data: [
        {
          created_at: '2026-07-01T09:00:00.000Z',
          created_by: 'staff-user-1',
          description: 'Summer promotion',
          id: '22222222-2222-4222-8222-222222222222',
          name: 'Summer Sale',
          status: 'active',
          target_service_type: 'tour',
          updated_at: '2026-07-01T09:00:00.000Z',
          valid_from: '2026-07-05T00:00:00.000Z',
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
      `${apiPrefix}/admin/promotions?status=active&page=1&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Promotions retrieved successfully');
    assert.equal(response.body.data[0].name, 'Summer Sale');
    assert.equal(capturedContext.query.status, 'active');
    assert.equal(capturedContext.query.page, '1');
    assert.equal(capturedContext.query.limit, '20');
  } finally {
    server.close();
  }
});

test('POST /api/admin/promotions returns created promotion payload', async () => {
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
  adminPromotionService.createPromotion = async (context) => {
    capturedContext = context;

    return {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Summer Sale',
      status: 'draft',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/promotions`, {
      body: JSON.stringify({
        name: 'Summer Sale',
        status: 'draft',
        valid_from: '2026-07-05T00:00:00.000Z',
        valid_to: '2026-08-01T00:00:00.000Z',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Promotion created successfully');
    assert.equal(capturedContext.actorUserId, 'staff-user-9');
    assert.equal(capturedContext.payload.name, 'Summer Sale');
  } finally {
    server.close();
  }
});

test('GET /api/admin/promotions/:promotionId returns promotion detail', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-2',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-user-2',
    });
  adminPromotionService.getPromotionById = async () => ({
    id: '44444444-4444-4444-8444-444444444444',
    name: 'Summer Sale',
    status: 'active',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/promotions/44444444-4444-4444-8444-444444444444`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Promotion retrieved successfully');
    assert.equal(response.body.data.id, '44444444-4444-4444-8444-444444444444');
  } finally {
    server.close();
  }
});

test('GET /api/admin/promotions/:promotionId/vouchers requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/promotions/88888888-8888-4888-8888-888888888888/vouchers`,
      {
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/promotions/:promotionId/vouchers returns 403 for customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'customer-user-12',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'customer-user-12',
    });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/promotions/88888888-8888-4888-8888-888888888888/vouchers`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('GET /api/admin/promotions/:promotionId/vouchers returns related vouchers with parent promotion info', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-user-12',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-user-12',
    });
  adminPromotionService.getPromotionVouchers = async (context) => {
    capturedContext = context;

    return {
      meta: {
        has_next: false,
        limit: 20,
        page: 1,
        total: 1,
        total_pages: 1,
      },
      promotion: {
        id: '88888888-8888-4888-8888-888888888888',
        name: 'Summer Sale',
        status: 'paused',
        target_service_type: 'tour',
        valid_from: '2026-07-05T00:00:00.000Z',
        valid_to: '2026-08-01T00:00:00.000Z',
      },
      vouchers: [
        {
          code: 'SAVE10',
          id: '99999999-9999-4999-8999-999999999999',
          is_currently_usable: false,
          promotion_id: '88888888-8888-4888-8888-888888888888',
          status: 'active',
        },
      ],
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/promotions/88888888-8888-4888-8888-888888888888/vouchers?page=1&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Promotion vouchers retrieved successfully');
    assert.equal(response.body.data.promotion.status, 'paused');
    assert.equal(response.body.data.vouchers[0].code, 'SAVE10');
    assert.equal(capturedContext.promotionId, '88888888-8888-4888-8888-888888888888');
    assert.equal(capturedContext.query.page, '1');
    assert.equal(capturedContext.query.limit, '20');
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/promotions/:promotionId returns updated promotion payload', async () => {
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
  adminPromotionService.updatePromotion = async (context) => {
    capturedContext = context;

    return {
      id: '55555555-5555-4555-8555-555555555555',
      name: 'Summer Sale Updated',
      status: 'draft',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/promotions/55555555-5555-4555-8555-555555555555`,
      {
        body: JSON.stringify({
          name: 'Summer Sale Updated',
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
    assert.equal(response.body.message, 'Promotion updated successfully');
    assert.equal(capturedContext.payload.name, 'Summer Sale Updated');
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/promotions/:promotionId/status returns updated status payload', async () => {
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
  adminPromotionService.changePromotionStatus = async () => ({
    id: '66666666-6666-4666-8666-666666666666',
    status: 'active',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/promotions/66666666-6666-4666-8666-666666666666/status`,
      {
        body: JSON.stringify({
          status: 'active',
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
    assert.equal(response.body.message, 'Promotion status updated successfully');
    assert.equal(response.body.data.status, 'active');
  } finally {
    server.close();
  }
});

test('DELETE /api/admin/promotions/:promotionId blocks staff and allows admin', async () => {
  const staffServer = app.listen(0);
  const staffToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-user-4',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-user-4',
    });

  try {
    const forbiddenResponse = await request(
      staffServer,
      `${apiPrefix}/admin/promotions/77777777-7777-4777-8777-777777777777`,
      {
        body: JSON.stringify({
          reason: 'Cancelled by admin',
        }),
        headers: {
          Authorization: `Bearer ${staffToken}`,
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.success, false);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    staffServer.close();
  }

  const adminServer = app.listen(0);
  const adminToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-4',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-user-4',
    });
  adminPromotionService.deletePromotion = async () => ({
    id: '77777777-7777-4777-8777-777777777777',
    reason: 'Cancelled by admin',
    status: 'cancelled',
  });

  try {
    const successResponse = await request(
      adminServer,
      `${apiPrefix}/admin/promotions/77777777-7777-4777-8777-777777777777`,
      {
        body: JSON.stringify({
          reason: 'Cancelled by admin',
        }),
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
      },
    );

    assert.equal(successResponse.statusCode, 200);
    assert.equal(successResponse.body.success, true);
    assert.equal(successResponse.body.message, 'Promotion cancelled successfully');
    assert.equal(successResponse.body.data.status, 'cancelled');
  } finally {
    adminServer.close();
  }
});
