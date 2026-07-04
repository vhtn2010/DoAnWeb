const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminPermissionService = require('../services/adminPermissionService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetPermissions = adminPermissionService.getPermissions;
const originalReplaceRolePermissions =
  adminPermissionService.replaceRolePermissions;

const createAuthContext = ({
  permissions = ['permission.read', 'role_permission.update'],
  roleCode = 'admin',
  userId = 'admin-user-1',
} = {}) => ({
  permissions,
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
  adminPermissionService.getPermissions = originalGetPermissions;
  adminPermissionService.replaceRolePermissions =
    originalReplaceRolePermissions;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminPermissionService.getPermissions = originalGetPermissions;
  adminPermissionService.replaceRolePermissions =
    originalReplaceRolePermissions;
});

test('GET /api/admin/permissions requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/permissions`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/admin/permissions returns permission list for admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminPermissionService.getPermissions = async (context) => {
    capturedContext = context;

    return [
      {
        action: 'read',
        code: 'permission.read',
        created_at: '2026-07-01T00:00:00.000Z',
        description: 'Read permissions',
        id: '11111111-1111-4111-8111-111111111111',
        module: 'rbac',
        resource: 'permission',
      },
    ];
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/permissions?module=rbac&resource=permission`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Permissions retrieved successfully');
    assert.equal(response.body.data[0].code, 'permission.read');
    assert.equal(capturedContext.query.module, 'rbac');
    assert.equal(capturedContext.query.resource, 'permission');
  } finally {
    server.close();
  }
});

test('PUT /api/admin/roles/:roleId/permissions returns updated role permissions for system admin', async () => {
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
  adminPermissionService.replaceRolePermissions = async (context) => {
    capturedContext = context;

    return {
      permissions: [
        {
          action: 'read_all',
          code: 'user.read_all',
          created_at: '2026-07-01T00:00:00.000Z',
          description: 'Read all users',
          id: 'permission-1',
          module: 'user',
          resource: 'user',
        },
      ],
      role: {
        code: 'admin',
        id: '22222222-2222-4222-8222-222222222222',
        is_system_role: false,
        level: 90,
        name: 'Admin',
      },
      sessions_revoked: true,
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/roles/22222222-2222-4222-8222-222222222222/permissions`,
      {
        body: JSON.stringify({
          permission_codes: ['user.read_all'],
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'admin-permission-replace-route-test',
        },
        method: 'PUT',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Role permissions updated successfully');
    assert.equal(response.body.data.role.code, 'admin');
    assert.equal(response.body.data.permissions[0].code, 'user.read_all');
    assert.equal(capturedContext.actorRoleCode, 'system_admin');
    assert.equal(capturedContext.roleId, '22222222-2222-4222-8222-222222222222');
  } finally {
    server.close();
  }
});

test('PUT /api/admin/roles/:roleId/permissions returns 403 for admin actor', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/roles/22222222-2222-4222-8222-222222222222/permissions`,
      {
        body: JSON.stringify({
          permission_codes: ['user.read_all'],
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'PUT',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('PUT /api/admin/roles/:roleId/permissions surfaces validation errors', async () => {
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
  adminPermissionService.replaceRolePermissions = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'permission_codes',
          message: 'permission code does not exist: missing.permission',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/roles/22222222-2222-4222-8222-222222222222/permissions`,
      {
        body: JSON.stringify({
          permission_codes: ['missing.permission'],
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'PUT',
      },
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.equal(response.body.error.details[0].field, 'permission_codes');
  } finally {
    server.close();
  }
});
