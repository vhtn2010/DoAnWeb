const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminUserService = require('../services/adminUserService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetUsers = adminUserService.getUsers;
const originalGetUserById = adminUserService.getUserById;
const originalGetUserLogs = adminUserService.getUserLogs;

const createAuthContext = ({
  roleCode = 'admin',
  userId = 'admin-user-1',
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
  adminUserService.getUsers = originalGetUsers;
  adminUserService.getUserById = originalGetUserById;
  adminUserService.getUserLogs = originalGetUserLogs;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminUserService.getUsers = originalGetUsers;
  adminUserService.getUserById = originalGetUserById;
  adminUserService.getUserLogs = originalGetUserLogs;
});

test('GET /api/admin/users requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/users`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/users returns 403 for staff role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-user-1',
    });

  try {
    const response = await request(server, `${apiPrefix}/admin/users`, {
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

test('GET /api/admin/users returns user list with meta for admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminUserService.getUsers = async (context) => {
    capturedContext = context;

    return {
      data: [
        {
          email: 'staff@example.com',
          full_name: 'Staff User',
          id: '11111111-1111-4111-8111-111111111111',
          role: {
            code: 'staff',
            id: '22222222-2222-4222-8222-222222222222',
            level: 10,
            name: 'Staff',
          },
          status: 'active',
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
      `${apiPrefix}/admin/users?q=staff&role=staff&page=1&limit=20`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Users retrieved successfully');
    assert.equal(response.body.data[0].email, 'staff@example.com');
    assert.equal(
      Object.hasOwn(response.body.data[0], 'password_hash'),
      false,
    );
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 20,
      page: 1,
      total: 1,
      total_pages: 1,
    });
    assert.equal(capturedContext.query.q, 'staff');
    assert.equal(capturedContext.query.role, 'staff');
  } finally {
    server.close();
  }
});

test('GET /api/admin/users surfaces validation errors', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'system_admin',
    userId: 'sys-admin-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'system_admin',
      userId: 'sys-admin-1',
    });
  adminUserService.getUsers = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'status',
          message: 'status must be one of: pending_verification, active, locked, suspended, disabled, deleted',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users?status=invalid`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.equal(response.body.error.details[0].field, 'status');
  } finally {
    server.close();
  }
});

test('GET /api/admin/users/:userId returns user detail for system admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'system_admin',
    userId: 'sys-admin-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'system_admin',
      userId: 'sys-admin-1',
    });
  adminUserService.getUserById = async (context) => {
    capturedContext = context;

    return {
      email: 'admin@example.com',
      full_name: 'Admin User',
      id: '11111111-1111-4111-8111-111111111111',
      role: {
        code: 'admin',
        id: '22222222-2222-4222-8222-222222222222',
        level: 90,
        name: 'Admin',
      },
      status: 'active',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'User retrieved successfully');
    assert.equal(response.body.data.id, '11111111-1111-4111-8111-111111111111');
    assert.equal(capturedContext.userId, '11111111-1111-4111-8111-111111111111');
  } finally {
    server.close();
  }
});

test('GET /api/admin/users/:userId returns 404 when user is missing', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminUserService.getUserById = async () => {
    throw new AppError('User not found', {
      code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: 404,
    });
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
  } finally {
    server.close();
  }
});

test('GET /api/admin/users/:userId/logs returns scoped user logs with meta', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminUserService.getUserLogs = async (context) => {
    capturedContext = context;

    return {
      data: [
        {
          action: 'profile.update',
          id: 'log-1',
          metadata: {
            changed_fields: ['phone'],
          },
        },
      ],
      meta: {
        has_next: false,
        limit: 10,
        page: 2,
        total: 1,
        total_pages: 1,
      },
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111/logs?page=2&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'User logs retrieved successfully');
    assert.equal(response.body.data[0].id, 'log-1');
    assert.deepEqual(response.body.meta, {
      has_next: false,
      limit: 10,
      page: 2,
      total: 1,
      total_pages: 1,
    });
    assert.equal(capturedContext.userId, '11111111-1111-4111-8111-111111111111');
    assert.equal(capturedContext.query.page, '2');
  } finally {
    server.close();
  }
});
