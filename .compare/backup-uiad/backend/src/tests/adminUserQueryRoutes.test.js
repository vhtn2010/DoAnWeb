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
const adminUserService = require('../services/adminUserService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalChangeUserStatus = adminUserService.changeUserStatus;
const originalChangeUserRole = adminUserService.changeUserRole;
const originalCreateUser = adminUserService.createUser;
const originalDeleteUser = adminUserService.deleteUser;
const originalGetUsers = adminUserService.getUsers;
const originalGetUserById = adminUserService.getUserById;
const originalGetUserLogs = adminUserService.getUserLogs;
const originalResendVerificationEmail =
  adminUserService.resendVerificationEmail;
const originalUpdateUser = adminUserService.updateUser;

const createAuthContext = ({
  permissions = [
    'user.read_all',
    'user.create',
    'user.update',
    'user.delete',
    'user.change_status',
    'user.change_role',
    'email.send',
    'email.resend',
  ],
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
  clearRateLimitStore('admin-user-resend-verification');
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminUserService.changeUserStatus = originalChangeUserStatus;
  adminUserService.changeUserRole = originalChangeUserRole;
  adminUserService.createUser = originalCreateUser;
  adminUserService.deleteUser = originalDeleteUser;
  adminUserService.getUsers = originalGetUsers;
  adminUserService.getUserById = originalGetUserById;
  adminUserService.getUserLogs = originalGetUserLogs;
  adminUserService.resendVerificationEmail = originalResendVerificationEmail;
  adminUserService.updateUser = originalUpdateUser;
});

test.afterEach(() => {
  clearRateLimitStore('admin-user-resend-verification');
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminUserService.changeUserStatus = originalChangeUserStatus;
  adminUserService.changeUserRole = originalChangeUserRole;
  adminUserService.createUser = originalCreateUser;
  adminUserService.deleteUser = originalDeleteUser;
  adminUserService.getUsers = originalGetUsers;
  adminUserService.getUserById = originalGetUserById;
  adminUserService.getUserLogs = originalGetUserLogs;
  adminUserService.resendVerificationEmail = originalResendVerificationEmail;
  adminUserService.updateUser = originalUpdateUser;
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

test('POST /api/admin/users returns created user for admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminUserService.createUser = async (context) => {
    capturedContext = context;

    return {
      email: 'staff@example.com',
      full_name: 'Staff User',
      id: '11111111-1111-4111-8111-111111111111',
      role: {
        code: 'staff',
        id: '22222222-2222-4222-8222-222222222222',
        level: 10,
        name: 'Staff',
      },
      status: 'pending_verification',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/users`, {
      body: JSON.stringify({
        email: 'staff@example.com',
        full_name: 'Staff User',
        password: 'Password123',
        role_code: 'staff',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'admin-user-create-route-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'User created successfully');
    assert.equal(response.body.data.email, 'staff@example.com');
    assert.equal(Object.hasOwn(response.body.data, 'password_hash'), false);
    assert.equal(capturedContext.actorUserId, 'admin-user-1');
    assert.equal(capturedContext.userAgent, 'admin-user-create-route-test');
    assert.equal(typeof capturedContext.payload, 'object');
  } finally {
    server.close();
  }
});

test('POST /api/admin/users surfaces duplicate email conflict', async () => {
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
  adminUserService.createUser = async () => {
    throw new AppError('Email already exists', {
      code: API_ERROR_CODES.DUPLICATE_RESOURCE,
      statusCode: 409,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/users`, {
      body: JSON.stringify({
        email: 'staff@example.com',
        full_name: 'Staff User',
        password: 'Password123',
        role_code: 'staff',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.error.code,
      API_ERROR_CODES.DUPLICATE_RESOURCE,
    );
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/users/:userId returns updated user for system admin', async () => {
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
  adminUserService.updateUser = async (context) => {
    capturedContext = context;

    return {
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      email: 'staff@example.com',
      full_name: 'Updated Staff User',
      id: '11111111-1111-4111-8111-111111111111',
      phone: '0909123456',
      role: {
        code: 'staff',
        id: '22222222-2222-4222-8222-222222222222',
        level: 10,
        name: 'Staff',
      },
      status: 'active',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111`,
      {
        body: JSON.stringify({
          avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
          full_name: 'Updated Staff User',
          phone: '0909123456',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'admin-user-update-route-test',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'User updated successfully');
    assert.equal(response.body.data.full_name, 'Updated Staff User');
    assert.equal(capturedContext.actorUserId, 'sys-admin-1');
    assert.equal(capturedContext.userId, '11111111-1111-4111-8111-111111111111');
    assert.equal(capturedContext.userAgent, 'admin-user-update-route-test');
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/users/:userId/role returns updated role result for system admin', async () => {
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
  adminUserService.changeUserRole = async (context) => {
    capturedContext = context;

    return {
      id: '11111111-1111-4111-8111-111111111111',
      permissions: ['booking.read_all', 'user.read_all'],
      role: {
        code: 'admin',
        id: '22222222-2222-4222-8222-222222222222',
        level: 90,
        name: 'Admin',
      },
      sessions_revoked: true,
      status: 'active',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111/role`,
      {
        body: JSON.stringify({
          role_code: 'admin',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'admin-role-route-test',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'User role updated successfully');
    assert.equal(response.body.data.role.code, 'admin');
    assert.deepEqual(response.body.data.permissions, [
      'booking.read_all',
      'user.read_all',
    ]);
    assert.equal(capturedContext.userId, '11111111-1111-4111-8111-111111111111');
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/users/:userId/role returns 403 for admin actor', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111/role`,
      {
        body: JSON.stringify({
          role_code: 'admin',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/users/:userId surfaces validation errors', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminUserService.updateUser = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'email',
          message: 'email is not allowed in PATCH /admin/users/{user_id}',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111`,
      {
        body: JSON.stringify({
          email: 'new@example.com',
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
    assert.equal(response.body.error.details[0].field, 'email');
  } finally {
    server.close();
  }
});

test('PATCH /api/admin/users/:userId/status returns updated status result', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminUserService.changeUserStatus = async (context) => {
    capturedContext = context;

    return {
      id: '11111111-1111-4111-8111-111111111111',
      sessions_revoked: true,
      status: 'locked',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111/status`,
      {
        body: JSON.stringify({
          reason: 'Repeated violations',
          status: 'locked',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'admin-status-route-test',
        },
        method: 'PATCH',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'User status updated successfully');
    assert.equal(response.body.data.status, 'locked');
    assert.equal(capturedContext.userId, '11111111-1111-4111-8111-111111111111');
    assert.equal(capturedContext.userAgent, 'admin-status-route-test');
  } finally {
    server.close();
  }
});

test('DELETE /api/admin/users/:userId returns soft delete result', async () => {
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
  adminUserService.deleteUser = async (context) => {
    capturedContext = context;

    return {
      deleted: true,
      id: '11111111-1111-4111-8111-111111111111',
      request_status: 'deleted',
      status: 'deleted',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111`,
      {
        body: JSON.stringify({
          reason: 'Left the company',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'admin-delete-route-test',
        },
        method: 'DELETE',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'User deleted successfully');
    assert.equal(response.body.data.status, 'deleted');
    assert.equal(capturedContext.userId, '11111111-1111-4111-8111-111111111111');
  } finally {
    server.close();
  }
});

test('POST /api/admin/users/:userId/resend-verification-email returns resend result', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminUserService.resendVerificationEmail = async (context) => {
    capturedContext = context;

    return {
      email: 'staff@example.com',
      request_status: 'resent',
      status: 'pending_verification',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111/resend-verification-email`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'admin-resend-route-test',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Verification email resent successfully',
    );
    assert.equal(response.body.data.request_status, 'resent');
    assert.equal(capturedContext.userId, '11111111-1111-4111-8111-111111111111');
  } finally {
    server.close();
  }
});

test('POST /api/admin/users/:userId/resend-verification-email returns 429 when rate limit is exceeded', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminUserService.resendVerificationEmail = async () => ({
    request_status: 'resent',
    status: 'pending_verification',
  });

  try {
    let lastResponse;

    for (let index = 0; index < 6; index += 1) {
      lastResponse = await request(
        server,
        `${apiPrefix}/admin/users/11111111-1111-4111-8111-111111111111/resend-verification-email`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          method: 'POST',
        },
      );
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});
