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
const adminServiceWorkflowService = require('../services/adminServiceWorkflowService');
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

test('adminServiceWorkflowService.submitReview only allows draft services with complete detail', async () => {
  let updateCall = null;
  const service = adminServiceWorkflowService.createAdminServiceWorkflowService({
    catalogRepository: {
      getTourDetail: async () => ({
        departure_location: 'Ho Chi Minh',
        destination_location: 'Da Nang',
        duration_days: 3,
        duration_nights: 2,
        transport_type: 'flight',
      }),
    },
    catalogService: {
      getServiceDetail: async ({ service_id: serviceId }) => ({
        id: serviceId,
        status: 'pending_review',
      }),
    },
    repository: {
      getServiceById: async () => ({
        base_price: '3200000',
        currency: 'VND',
        deleted_at: null,
        description: 'Mo ta chi tiet',
        id: '11111111-1111-4111-8111-111111111111',
        location_text: 'Da Nang',
        service_type: 'tour',
        short_description: 'Mo ta ngan',
        slug: 'tour-da-nang',
        status: 'draft',
        title: 'Tour Da Nang',
      }),
      updateWorkflowStatus: async (payload) => {
        updateCall = payload;
        return {
          id: payload.serviceId,
          status: payload.updates.status,
        };
      },
    },
  });

  const result = await service.submitReview({
    auth: {
      role: 'staff',
      userId: 'staff-1',
    },
    service_id: '11111111-1111-4111-8111-111111111111',
  });

  assert.deepEqual(result, {
    id: '11111111-1111-4111-8111-111111111111',
    status: 'pending_review',
  });
  assert.equal(updateCall.action, 'admin.service.submit_review');
  assert.equal(updateCall.updates.status, 'pending_review');
});

test('adminServiceWorkflowService.approveService sets approval audit and rejects invalid source status', async () => {
  let updateCall = null;
  const service = adminServiceWorkflowService.createAdminServiceWorkflowService({
    catalogRepository: {
      getHotelDetail: async () => ({
        address: '123 Beach Road',
        checkin_time: '14:00:00',
        checkout_time: '12:00:00',
      }),
    },
    catalogService: {
      getServiceDetail: async ({ service_id: serviceId }) => ({
        id: serviceId,
        status: 'active',
      }),
    },
    repository: {
      getServiceById: async () => ({
        approved_at: null,
        approved_by: null,
        base_price: '4500000',
        currency: 'VND',
        deleted_at: null,
        description: 'Chi tiet khach san',
        id: '22222222-2222-4222-8222-222222222222',
        location_text: 'Da Nang',
        service_type: 'hotel',
        short_description: 'Mo ta ngan',
        slug: 'hotel-da-nang',
        status: 'pending_review',
        title: 'Hotel Da Nang',
      }),
      updateWorkflowStatus: async (payload) => {
        updateCall = payload;
        return {
          id: payload.serviceId,
          status: payload.updates.status,
        };
      },
    },
  });

  await service.approveService({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      note: 'Looks good',
    },
    service_id: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(updateCall.action, 'admin.service.approve');
  assert.equal(updateCall.updates.status, 'active');
  assert.equal(updateCall.updates.approved_by, 'admin-1');
  assert.deepEqual(updateCall.updates.approved_at, { __raw: 'NOW()' });

  const invalidService = adminServiceWorkflowService.createAdminServiceWorkflowService({
    repository: {
      getServiceById: async () => ({
        id: '33333333-3333-4333-8333-333333333333',
        status: 'draft',
      }),
    },
  });

  await assert.rejects(
    () => invalidService.approveService({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      service_id: '33333333-3333-4333-8333-333333333333',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );
});

test('adminServiceWorkflowService.restoreService validates target status and source status', async () => {
  let updateCall = null;
  const service = adminServiceWorkflowService.createAdminServiceWorkflowService({
    catalogRepository: {
      getHotelDetail: async () => ({
        address: '123 Beach Road',
        checkin_time: '14:00:00',
        checkout_time: '12:00:00',
      }),
    },
    catalogService: {
      getServiceDetail: async ({ service_id: serviceId }) => ({
        id: serviceId,
        status: 'active',
      }),
    },
    repository: {
      getServiceById: async () => ({
        base_price: '4500000',
        currency: 'VND',
        deleted_at: null,
        description: 'Chi tiet khach san',
        id: '44444444-4444-4444-8444-444444444444',
        location_text: 'Da Nang',
        service_type: 'hotel',
        short_description: 'Mo ta ngan',
        slug: 'hotel-da-nang',
        status: 'hidden',
        title: 'Hotel Da Nang',
      }),
      updateWorkflowStatus: async (payload) => {
        updateCall = payload;
        return {
          id: payload.serviceId,
          status: payload.updates.status,
        };
      },
    },
  });

  await service.restoreService({
    auth: {
      role: 'admin',
      userId: 'admin-1',
    },
    body: {
      target_status: 'active',
    },
    service_id: '44444444-4444-4444-8444-444444444444',
  });

  assert.equal(updateCall.updates.status, 'active');

  await assert.rejects(
    () => service.restoreService({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        target_status: 'archived',
      },
      service_id: '44444444-4444-4444-8444-444444444444',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.VALIDATION_ERROR);
      return true;
    },
  );
});

test('adminServiceWorkflowService.updateStatus only allows SYSTEM_ADMIN to override draft to active', async () => {
  let updateCall = null;
  const baseRepository = {
    getServiceById: async () => ({
      approved_at: null,
      approved_by: null,
      base_price: '3200000',
      currency: 'VND',
      deleted_at: null,
      description: 'Chi tiet tour',
      id: '55555555-5555-4555-8555-555555555555',
      location_text: 'Da Nang',
      service_type: 'tour',
      short_description: 'Mo ta ngan',
      slug: 'tour-da-nang',
      status: 'draft',
      title: 'Tour Da Nang',
    }),
    updateWorkflowStatus: async (payload) => {
      updateCall = payload;
      return {
        id: payload.serviceId,
        status: payload.updates.status,
      };
    },
  };

  const catalogRepository = {
    getTourDetail: async () => ({
      departure_location: 'Ho Chi Minh',
      destination_location: 'Da Nang',
      duration_days: 3,
      duration_nights: 2,
      transport_type: 'flight',
    }),
  };

  const adminService = adminServiceWorkflowService.createAdminServiceWorkflowService({
    catalogRepository,
    repository: baseRepository,
  });

  await assert.rejects(
    () => adminService.updateStatus({
      auth: {
        role: 'admin',
        userId: 'admin-1',
      },
      body: {
        status: 'active',
      },
      service_id: '55555555-5555-4555-8555-555555555555',
    }),
    (error) => {
      assert.equal(error.code, API_ERROR_CODES.INVALID_STATE_TRANSITION);
      return true;
    },
  );

  const systemAdminService = adminServiceWorkflowService.createAdminServiceWorkflowService({
    catalogRepository,
    catalogService: {
      getServiceDetail: async ({ service_id: serviceId }) => ({
        id: serviceId,
        status: 'active',
      }),
    },
    repository: baseRepository,
  });

  await systemAdminService.updateStatus({
    auth: {
      role: 'system_admin',
      userId: 'sys-1',
    },
    body: {
      reason: 'Emergency publish',
      status: 'active',
    },
    service_id: '55555555-5555-4555-8555-555555555555',
  });

  assert.equal(updateCall.updates.status, 'active');
  assert.equal(updateCall.updates.approved_by, 'sys-1');
});

test('POST /api/admin/services/{service_id}/submit-review allows staff', async () => {
  const originalSubmitReview = adminServiceWorkflowService.submitReview;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  adminServiceWorkflowService.submitReview = async (payload) => {
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
      service_id: '11111111-1111-4111-8111-111111111111',
    });

    return {
      id: '11111111-1111-4111-8111-111111111111',
      status: 'pending_review',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/submit-review`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'pending_review');
  } finally {
    adminServiceWorkflowService.submitReview = originalSubmitReview;
    server.close();
  }
});

test('POST /api/admin/services/{service_id}/approve blocks staff and allows admin', async () => {
  const server = app.listen(0);
  const staffToken = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'staff',
    sub: 'staff-1',
  });

  try {
    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/approve`,
      {
        headers: {
          Authorization: `Bearer ${staffToken}`,
        },
        method: 'POST',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }

  const originalApproveService = adminServiceWorkflowService.approveService;
  const successServer = app.listen(0);
  const adminToken = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role_code: 'admin',
    sub: 'admin-1',
  });

  adminServiceWorkflowService.approveService = async (payload) => {
    assert.equal(payload.body.note, 'Ready to publish');
    return {
      id: '11111111-1111-4111-8111-111111111111',
      status: 'active',
    };
  };

  try {
    const response = await request(
      successServer,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/approve`,
      {
        body: {
          note: 'Ready to publish',
        },
        headers: {
          Authorization: `Bearer ${adminToken}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'active');
  } finally {
    adminServiceWorkflowService.approveService = originalApproveService;
    successServer.close();
  }
});

test('POST /api/admin/services/{service_id}/reject validates required reason', async () => {
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'admin',
    sub: 'admin-1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/reject`,
      {
        body: {},
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'reason',
        message: 'reason is required',
      },
    ]);
  } finally {
    server.close();
  }
});

test('POST /api/admin/services/{service_id}/restore returns restored detail', async () => {
  const originalRestoreService = adminServiceWorkflowService.restoreService;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'system_admin',
    sub: 'sys-1',
  });

  adminServiceWorkflowService.restoreService = async (payload) => {
    assert.deepEqual(payload.body, {
      target_status: 'draft',
    });
    return {
      id: '11111111-1111-4111-8111-111111111111',
      status: 'draft',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/restore`,
      {
        body: {
          target_status: 'draft',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'draft');
  } finally {
    adminServiceWorkflowService.restoreService = originalRestoreService;
    server.close();
  }
});

test('PATCH /api/admin/services/{service_id}/status forwards payload and returns updated status', async () => {
  const originalUpdateStatus = adminServiceWorkflowService.updateStatus;
  const server = app.listen(0);
  const token = createAccessToken({
    exp: Math.floor(Date.now() / 1000) + 3600,
    role: 'system_admin',
    sub: 'sys-1',
  });

  adminServiceWorkflowService.updateStatus = async (payload) => {
    assert.deepEqual(payload.body, {
      reason: 'Emergency publish',
      status: 'active',
    });
    return {
      id: '11111111-1111-4111-8111-111111111111',
      status: 'active',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/services/11111111-1111-4111-8111-111111111111/status`,
      {
        body: {
          reason: 'Emergency publish',
          status: 'active',
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.status, 'active');
  } finally {
    adminServiceWorkflowService.updateStatus = originalUpdateStatus;
    server.close();
  }
});
