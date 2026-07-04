const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-admin-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminServiceInventoryService = require('../services/adminServiceInventoryService');
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;

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
            headers: res.headers,
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

test.beforeEach(() => {
  authService.resolveAuthenticatedUser = async (tokenPayload) =>
    createAuthContext({
      permissions:
        tokenPayload.permissions ||
        tokenPayload.permission_codes ||
        [],
      roleCode: tokenPayload.roleCode || tokenPayload.role || 'admin',
      userId: tokenPayload.userId || tokenPayload.sub || 'admin-user-1',
    });
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
});

test('adminServiceInventoryService updates hotel inventory and logs old/new values', async () => {
  let updateCall = null;
  const service = adminServiceInventoryService.createAdminServiceInventoryService({
    repository: {
      getRoomTypeById: async () => ({
        available_rooms: 4,
        hotel_service_id: '11111111-1111-4111-8111-111111111111',
        id: '22222222-2222-4222-8222-222222222222',
        total_rooms: 8,
      }),
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'hotel',
        status: 'active',
      }),
      updateRoomInventory: async (payload) => {
        updateCall = payload;
      },
    },
  });

  const result = await service.updateInventory({
    auth: {
      role: 'staff',
      userId: 'staff-1',
    },
    body: {
      available_quantity: 6,
      reference_id: '22222222-2222-4222-8222-222222222222',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(result, {
    available_quantity: 6,
    inventory_field: 'available_rooms',
    old_quantity: 4,
    reference_id: '22222222-2222-4222-8222-222222222222',
    service_id: '11111111-1111-4111-8111-111111111111',
    service_type: 'hotel',
  });
  assert.equal(updateCall.inventoryMetadata.old_value, 4);
  assert.equal(updateCall.inventoryMetadata.new_value, 6);
});

test('adminServiceInventoryService rejects quantities above flight total seats', async () => {
  const service = adminServiceInventoryService.createAdminServiceInventoryService({
    repository: {
      getFlightDetailById: async () => ({
        id: '22222222-2222-4222-8222-222222222222',
        seats_available: 5,
        seats_total: 10,
        service_id: '11111111-1111-4111-8111-111111111111',
      }),
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'flight',
        status: 'active',
      }),
    },
  });

  await assert.rejects(
    () => service.updateInventory({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        available_quantity: 12,
        reference_id: '22222222-2222-4222-8222-222222222222',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      assert.deepEqual(error.details, [
        {
          field: 'available_quantity',
          message: 'available_quantity must be less than or equal to seats_total',
        },
      ]);
      return true;
    },
  );
});

test('adminServiceInventoryService updates tour schedule inventory by reference identifier', async () => {
  let updateCall = null;
  const service = adminServiceInventoryService.createAdminServiceInventoryService({
    repository: {
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'tour',
        status: 'active',
      }),
      getTourDetail: async () => ({
        departure_schedule: [
          {
            available_slots: 10,
            date: '2026-07-20',
          },
        ],
        max_group_size: 20,
        service_id: '11111111-1111-4111-8111-111111111111',
      }),
      updateTourInventory: async (payload) => {
        updateCall = payload;
      },
    },
  });

  const result = await service.updateInventory({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      available_quantity: 12,
      reference_id: '2026-07-20',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.old_quantity, 10);
  assert.equal(result.available_quantity, 12);
  assert.deepEqual(updateCall.updatedSchedule, [
    {
      available_slots: 12,
      date: '2026-07-20',
    },
  ]);
});

test('adminServiceInventoryService rejects combo inventory updates', async () => {
  const service = adminServiceInventoryService.createAdminServiceInventoryService({
    repository: {
      getServiceById: async () => ({
        deleted_at: null,
        id: '11111111-1111-4111-8111-111111111111',
        service_type: 'combo',
        status: 'active',
      }),
    },
  });

  await assert.rejects(
    () => service.updateInventory({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        available_quantity: 2,
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('PATCH /api/admin/services/{service_id}/inventory requires login', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/inventory`,
      {
        body: {
          available_quantity: 5,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/services/{service_id}/inventory returns updated inventory payload', async () => {
  const originalUpdateInventory = adminServiceInventoryService.updateInventory;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  adminServiceInventoryService.updateInventory = async (payload) => {
    assert.deepEqual(payload, {
      auth: {
        role: 'staff',
        serviceScopeIds: null,
        tokenPayload: {
          exp: payload.auth.tokenPayload.exp,
          role: 'staff',
          sub: 'staff-1',
        },
        userId: 'staff-1',
      },
      body: {
        available_quantity: 6,
        reference_id: '22222222-2222-4222-8222-222222222222',
      },
      service_id: '11111111-1111-4111-8111-111111111111',
    });

    return {
      available_quantity: 6,
      inventory_field: 'available_rooms',
      old_quantity: 4,
      reference_id: '22222222-2222-4222-8222-222222222222',
      service_id: '11111111-1111-4111-8111-111111111111',
      service_type: 'hotel',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/inventory`,
      {
        body: {
          available_quantity: 6,
          reference_id: '22222222-2222-4222-8222-222222222222',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Admin service inventory updated successfully');
    assert.equal(response.body.data.available_quantity, 6);
  } finally {
    adminServiceInventoryService.updateInventory = originalUpdateInventory;
    server.close();
  }
});
