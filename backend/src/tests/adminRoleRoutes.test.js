const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminRoleService = require('../services/adminRoleService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetRoles = adminRoleService.getRoles;
const originalGetRoleById = adminRoleService.getRoleById;
const originalCreateRole = adminRoleService.createRole;
const originalUpdateRole = adminRoleService.updateRole;
const originalDeleteRole = adminRoleService.deleteRole;

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
    const body = options.body;
    const hasBody = typeof body === 'string';
    const headers = {
      Connection: 'close',
      ...(options.headers || {}),
    };

    if (hasBody && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-length')) {
      headers['Content-Length'] = Buffer.byteLength(body);
    }

    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      {
        ...options,
        agent: false,
        headers,
      },
      (res) => {
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
      },
    );

    req.on('error', reject);

    if (hasBody) {
      req.write(body);
    }

    req.end();
  });

const closeServer = (server) =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

test.beforeEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminRoleService.getRoles = originalGetRoles;
  adminRoleService.getRoleById = originalGetRoleById;
  adminRoleService.createRole = originalCreateRole;
  adminRoleService.updateRole = originalUpdateRole;
  adminRoleService.deleteRole = originalDeleteRole;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminRoleService.getRoles = originalGetRoles;
  adminRoleService.getRoleById = originalGetRoleById;
  adminRoleService.createRole = originalCreateRole;
  adminRoleService.updateRole = originalUpdateRole;
  adminRoleService.deleteRole = originalDeleteRole;
});

test('GET /api/admin/roles requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/roles`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/roles returns role list for admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminRoleService.getRoles = async () => [
    {
      code: 'admin',
      created_at: '2026-07-01T00:00:00.000Z',
      description: 'Business administrator role',
      id: '11111111-1111-4111-8111-111111111111',
      is_system_role: true,
      level: 80,
      name: 'Admin',
      updated_at: '2026-07-01T00:00:00.000Z',
    },
  ];

  try {
    const response = await request(server, `${apiPrefix}/admin/roles`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Roles retrieved successfully');
    assert.equal(response.body.data[0].code, 'admin');
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/roles/:roleId returns role detail for system admin', async () => {
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
  adminRoleService.getRoleById = async (context) => {
    capturedContext = context;

    return {
      code: 'admin',
      created_at: '2026-07-01T00:00:00.000Z',
      description: 'Business administrator role',
      id: '11111111-1111-4111-8111-111111111111',
      is_system_role: true,
      level: 80,
      name: 'Admin',
      permissions: [
        {
          code: 'role.read',
          id: 'permission-1',
        },
      ],
      updated_at: '2026-07-01T00:00:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/roles/11111111-1111-4111-8111-111111111111`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Role retrieved successfully');
    assert.equal(response.body.data.permissions[0].code, 'role.read');
    assert.equal(capturedContext.roleId, '11111111-1111-4111-8111-111111111111');
  } finally {
    await closeServer(server);
  }
});

test('POST /api/admin/roles returns created role for system admin', async () => {
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
  adminRoleService.createRole = async (context) => {
    capturedContext = context;

    return {
      code: 'sales_staff',
      created_at: '2026-07-01T00:00:00.000Z',
      description: 'Sales role',
      id: 'role-sales-id',
      is_system_role: false,
      level: 60,
      name: 'Sales Staff',
      permissions: [],
      updated_at: '2026-07-01T00:00:00.000Z',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/roles`, {
      body: JSON.stringify({
        code: 'sales_staff',
        description: 'Sales role',
        level: 60,
        name: 'Sales Staff',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'admin-role-create-route-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Role created successfully');
    assert.equal(response.body.data.code, 'sales_staff');
    assert.equal(capturedContext.actorRoleCode, 'system_admin');
  } finally {
    await closeServer(server);
  }
});

test('PATCH /api/admin/roles/:roleId returns updated role for system admin', async () => {
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
  adminRoleService.updateRole = async (context) => {
    capturedContext = context;

    return {
      code: 'sales_staff',
      created_at: '2026-07-01T00:00:00.000Z',
      description: 'Updated description',
      id: 'role-sales-id',
      is_system_role: false,
      level: 70,
      name: 'Updated Sales Staff',
      permissions: [],
      sessions_revoked: true,
      updated_at: '2026-07-01T01:00:00.000Z',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/roles/11111111-1111-4111-8111-111111111111`,
      {
        body: JSON.stringify({
          description: 'Updated description',
          level: 70,
          name: 'Updated Sales Staff',
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
    assert.equal(response.body.message, 'Role updated successfully');
    assert.equal(response.body.data.level, 70);
    assert.equal(capturedContext.roleId, '11111111-1111-4111-8111-111111111111');
  } finally {
    await closeServer(server);
  }
});

test('DELETE /api/admin/roles/:roleId returns delete result for system admin', async () => {
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
  adminRoleService.deleteRole = async (context) => {
    capturedContext = context;

    return {
      deleted: true,
      id: '11111111-1111-4111-8111-111111111111',
      reason: 'Unused custom role',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/roles/11111111-1111-4111-8111-111111111111`,
      {
        body: JSON.stringify({
          reason: 'Unused custom role',
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
    assert.equal(response.body.message, 'Role deleted successfully');
    assert.equal(response.body.data.deleted, true);
    assert.equal(capturedContext.payload.reason, 'Unused custom role');
  } finally {
    await closeServer(server);
  }
});

test('POST /api/admin/roles returns 403 for admin actor', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();

  try {
    const response = await request(server, `${apiPrefix}/admin/roles`, {
      body: JSON.stringify({
        code: 'sales_staff',
        level: 60,
        name: 'Sales Staff',
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
    await closeServer(server);
  }
});

test('PATCH /api/admin/roles/:roleId surfaces validation errors', async () => {
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
  adminRoleService.updateRole = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'level',
          message: 'level must be a valid integer greater than or equal to 0',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/roles/11111111-1111-4111-8111-111111111111`,
      {
        body: JSON.stringify({
          level: -1,
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.equal(response.body.error.details[0].field, 'level');
  } finally {
    await closeServer(server);
  }
});
