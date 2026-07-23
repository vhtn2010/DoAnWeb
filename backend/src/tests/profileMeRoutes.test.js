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
const profileService = require('../services/profileService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetCurrentProfile = profileService.getCurrentProfile;
const originalGetCurrentUserLogs = profileService.getCurrentUserLogs;
const originalGetCurrentUserVouchers = profileService.getCurrentUserVouchers;
const originalSaveCurrentUserVoucher = profileService.saveCurrentUserVoucher;
const originalRequestAccountDeactivation =
  profileService.requestAccountDeactivation;
const originalUpdateCurrentAvatar = profileService.updateCurrentAvatar;
const originalUpdateCurrentPassword = profileService.updateCurrentPassword;
const originalUpdateCurrentProfile = profileService.updateCurrentProfile;

const createAuthContext = ({
  permissions = [
    'profile.read_self',
    'profile.update_self',
    'profile.change_password',
  ],
  roleCode = 'customer',
  userId = 'user-1',
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

    if (options.body) {
      req.write(options.body);
    }

    req.on('error', reject);
    req.end();
  });

test.beforeEach(() => {
  clearRateLimitStore('profile-change-password');
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  profileService.getCurrentProfile = originalGetCurrentProfile;
  profileService.getCurrentUserLogs = originalGetCurrentUserLogs;
  profileService.getCurrentUserVouchers = originalGetCurrentUserVouchers;
  profileService.saveCurrentUserVoucher = originalSaveCurrentUserVoucher;
  profileService.requestAccountDeactivation =
    originalRequestAccountDeactivation;
  profileService.updateCurrentAvatar = originalUpdateCurrentAvatar;
  profileService.updateCurrentPassword = originalUpdateCurrentPassword;
  profileService.updateCurrentProfile = originalUpdateCurrentProfile;
});

test.afterEach(() => {
  clearRateLimitStore('profile-change-password');
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  profileService.getCurrentProfile = originalGetCurrentProfile;
  profileService.getCurrentUserLogs = originalGetCurrentUserLogs;
  profileService.getCurrentUserVouchers = originalGetCurrentUserVouchers;
  profileService.saveCurrentUserVoucher = originalSaveCurrentUserVoucher;
  profileService.requestAccountDeactivation =
    originalRequestAccountDeactivation;
  profileService.updateCurrentAvatar = originalUpdateCurrentAvatar;
  profileService.updateCurrentPassword = originalUpdateCurrentPassword;
  profileService.updateCurrentProfile = originalUpdateCurrentProfile;
});

test('GET /api/me requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/me`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/me returns current profile for authenticated user', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });

  profileService.getCurrentProfile = async (context) => {
    capturedContext = context;

    return {
      avatar_url: 'https://cdn.example.com/avatar.jpg',
      created_at: '2026-06-28T00:00:00.000Z',
      email: 'customer@example.com',
      email_verified_at: '2026-06-29T00:00:00.000Z',
      full_name: 'Nguyen Van A',
      id: 'user-1',
      last_login_at: '2026-06-30T00:00:00.000Z',
      permissions: ['profile.read_self', 'booking.read_self'],
      phone: '0909000000',
      role: {
        code: 'customer',
        name: 'Customer',
      },
      status: 'active',
      updated_at: '2026-06-30T00:00:00.000Z',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Profile retrieved successfully');
    assert.equal(response.body.data.id, 'user-1');
    assert.deepEqual(response.body.data.role, {
      code: 'customer',
      name: 'Customer',
    });
    assert.deepEqual(response.body.data.permissions, [
      'profile.read_self',
      'booking.read_self',
    ]);
    assert.equal(Object.hasOwn(response.body.data, 'password_hash'), false);
    assert.equal(Object.hasOwn(response.body.data, 'deleted_at'), false);
    assert.equal(Object.hasOwn(response.body.data, 'is_system_protected'), false);
    assert.deepEqual(capturedContext, {
      userId: 'user-1',
    });
  } finally {
    server.close();
  }
});

test('GET /api/me returns 403 for disallowed role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'guest',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'guest',
      userId: 'user-1',
    });

  try {
    const response = await request(server, `${apiPrefix}/me`, {
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

test('GET /api/me surfaces resource not found when current user is missing', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'missing-user',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'missing-user',
    });

  profileService.getCurrentProfile = async () => {
    throw new AppError('User not found', {
      code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
      statusCode: 404,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.RESOURCE_NOT_FOUND);
  } finally {
    server.close();
  }
});

test('PATCH /api/me requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/me`, {
      body: JSON.stringify({
        full_name: 'Nguyen Van B',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('PATCH /api/me returns updated profile for authenticated user', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });

  profileService.updateCurrentProfile = async (context) => {
    capturedContext = context;

    return {
      avatar_url: 'https://cdn.example.com/avatar.jpg',
      created_at: '2026-06-28T00:00:00.000Z',
      email: 'customer@example.com',
      email_verified_at: '2026-06-29T00:00:00.000Z',
      full_name: 'Nguyen Van B',
      id: 'user-1',
      last_login_at: '2026-06-30T00:00:00.000Z',
      permissions: ['profile.read_self', 'profile.update_self'],
      phone: '0909123456',
      role: {
        code: 'customer',
        name: 'Customer',
      },
      status: 'active',
      updated_at: '2026-06-30T02:00:00.000Z',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/me`, {
      body: JSON.stringify({
        full_name: '  Nguyen Van B  ',
        phone: ' 0909123456 ',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'profile-update-route-test',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Profile updated successfully');
    assert.equal(response.body.data.full_name, 'Nguyen Van B');
    assert.equal(response.body.data.phone, '0909123456');
    assert.equal(Object.hasOwn(response.body.data, 'password_hash'), false);
    assert.deepEqual(capturedContext.payload, {
      full_name: '  Nguyen Van B  ',
      phone: ' 0909123456 ',
    });
    assert.equal(capturedContext.userAgent, 'profile-update-route-test');
    assert.equal(capturedContext.userId, 'user-1');
    assert.match(capturedContext.ipAddress, /127\.0\.0\.1/);
  } finally {
    server.close();
  }
});

test('PATCH /api/me surfaces validation errors for forbidden fields', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'user-1',
    });

  profileService.updateCurrentProfile = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'email',
          message: 'email is not allowed in PATCH /me',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/me`, {
      body: JSON.stringify({
        email: 'new@example.com',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.equal(response.body.error.details[0].field, 'email');
  } finally {
    server.close();
  }
});

test('PATCH /api/me surfaces invalid current password errors', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });

  profileService.updateCurrentProfile = async () => {
    throw new AppError('Current password is incorrect', {
      code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      statusCode: 401,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/me`, {
      body: JSON.stringify({
        current_password: 'WrongPassword123',
        phone: '0909123456',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  } finally {
    server.close();
  }
});

test('PATCH /api/me/avatar requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/me/avatar`, {
      body: JSON.stringify({
        avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('PATCH /api/me/avatar returns updated avatar profile for authenticated user', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });

  profileService.updateCurrentAvatar = async (context) => {
    capturedContext = context;

    return {
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      created_at: '2026-06-28T00:00:00.000Z',
      email: 'customer@example.com',
      email_verified_at: '2026-06-29T00:00:00.000Z',
      full_name: 'Nguyen Van A',
      id: 'user-1',
      last_login_at: '2026-06-30T00:00:00.000Z',
      permissions: ['profile.read_self', 'profile.update_self'],
      phone: '0909000000',
      role: {
        code: 'customer',
        name: 'Customer',
      },
      status: 'active',
      updated_at: '2026-06-30T03:00:00.000Z',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/me/avatar`, {
      body: JSON.stringify({
        avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'profile-avatar-route-test',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Avatar updated successfully');
    assert.equal(
      response.body.data.avatar_url,
      'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
    );
    assert.equal(Object.hasOwn(response.body.data, 'password_hash'), false);
    assert.deepEqual(capturedContext.payload, {
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
    });
    assert.equal(capturedContext.userAgent, 'profile-avatar-route-test');
    assert.equal(capturedContext.userId, 'user-1');
    assert.match(capturedContext.ipAddress, /127\.0\.0\.1/);
  } finally {
    server.close();
  }
});

test('PATCH /api/me/avatar surfaces validation errors for invalid avatar_url', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'user-1',
    });

  profileService.updateCurrentAvatar = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'avatar_url',
          message: 'avatar_url must be a valid Cloudinary delivery URL',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/me/avatar`, {
      body: JSON.stringify({
        avatar_url: 'https://example.com/avatar.jpg',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.equal(response.body.error.details[0].field, 'avatar_url');
  } finally {
    server.close();
  }
});

test('PATCH /api/me/password requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/me/password`, {
      body: JSON.stringify({
        current_password: 'OldPassword123',
        new_password: 'NewPassword123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('PATCH /api/me/password returns success for authenticated user', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });

  profileService.updateCurrentPassword = async (context) => {
    capturedContext = context;

    return {
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      created_at: '2026-06-28T00:00:00.000Z',
      email: 'customer@example.com',
      email_verified_at: '2026-06-29T00:00:00.000Z',
      full_name: 'Nguyen Van A',
      id: 'user-1',
      last_login_at: '2026-06-30T00:00:00.000Z',
      permissions: ['profile.read_self', 'profile.change_password'],
      phone: '0909000000',
      role: {
        code: 'customer',
        name: 'Customer',
      },
      status: 'active',
      updated_at: '2026-06-30T04:00:00.000Z',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/me/password`, {
      body: JSON.stringify({
        current_password: 'OldPassword123',
        new_password: 'NewPassword123',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'profile-password-route-test',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Password changed successfully');
    assert.equal(response.body.data.id, 'user-1');
    assert.equal(Object.hasOwn(response.body.data, 'password_hash'), false);
    assert.deepEqual(capturedContext.payload, {
      current_password: 'OldPassword123',
      new_password: 'NewPassword123',
    });
    assert.equal(capturedContext.userAgent, 'profile-password-route-test');
    assert.equal(capturedContext.userId, 'user-1');
    assert.match(capturedContext.ipAddress, /127\.0\.0\.1/);
  } finally {
    server.close();
  }
});

test('PATCH /api/me/password surfaces invalid current password errors', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'user-1',
    });

  profileService.updateCurrentPassword = async () => {
    throw new AppError('Current password is incorrect', {
      code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      statusCode: 401,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/me/password`, {
      body: JSON.stringify({
        current_password: 'WrongPassword123',
        new_password: 'NewPassword123',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  } finally {
    server.close();
  }
});

test('PATCH /api/me/password returns 429 when password change rate limit is exceeded', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });

  profileService.updateCurrentPassword = async () => ({
    avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
    created_at: '2026-06-28T00:00:00.000Z',
    email: 'customer@example.com',
    email_verified_at: '2026-06-29T00:00:00.000Z',
    full_name: 'Nguyen Van A',
    id: 'user-1',
    last_login_at: '2026-06-30T00:00:00.000Z',
    permissions: ['profile.read_self', 'profile.change_password'],
    phone: '0909000000',
    role: {
      code: 'customer',
      name: 'Customer',
    },
    status: 'active',
    updated_at: '2026-06-30T04:00:00.000Z',
  });

  try {
    let lastResponse;

    for (let index = 0; index < 6; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/me/password`, {
        body: JSON.stringify({
          current_password: 'OldPassword123',
          new_password: 'NewPassword123',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'PATCH',
      });
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(lastResponse.body.message, 'Too many password change attempts. Please try again later.');
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});

test('GET /api/me/logs requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/me/logs`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('GET /api/me/logs returns current user logs with pagination meta', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });
  profileService.getCurrentUserLogs = async (context) => {
    capturedContext = context;

    return {
      data: [
        {
          action: 'profile.update',
          created_at: '2026-07-01T10:00:00.000Z',
          entity_id: 'user-1',
          entity_name: 'users',
          id: 'log-1',
          ip_address: '127.0.0.1',
          metadata: {
            changed_fields: ['full_name'],
          },
          user_agent: 'profile-log-test',
        },
      ],
      meta: {
        has_next: true,
        limit: 10,
        page: 2,
        total: 11,
        total_pages: 2,
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/me/logs?page=2&limit=10`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Profile activity logs retrieved successfully',
    );
    assert.equal(response.body.data[0].id, 'log-1');
    assert.deepEqual(response.body.meta, {
      has_next: true,
      limit: 10,
      page: 2,
      total: 11,
      total_pages: 2,
    });
    assert.equal(capturedContext.userId, 'user-1');
    assert.equal(capturedContext.query.page, '2');
    assert.equal(capturedContext.query.limit, '10');
  } finally {
    server.close();
  }
});

test('GET /api/me/logs surfaces validation errors for invalid pagination', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'user-1',
    });
  profileService.getCurrentUserLogs = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'limit',
          message: 'limit must be an integer between 1 and 100',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/me/logs?limit=101`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.VALIDATION_ERROR);
    assert.equal(response.body.error.details[0].field, 'limit');
  } finally {
    server.close();
  }
});

test('GET /api/me/vouchers returns current user vouchers for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });
  profileService.getCurrentUserVouchers = async (context) => {
    capturedContext = context;

    return [
      {
        code: 'NETVIET500',
        description: 'Ưu đãi cho tour nội địa.',
        discount_type: 'fixed_amount',
        discount_value: 500000,
        id: 'voucher-1',
        max_discount_amount: null,
        min_order_amount: 6000000,
        promotion: {
          id: 'promotion-1',
          name: 'Hè du lịch',
          status: 'active',
        },
        status: 'active',
        target_service_type: 'tour',
        title: 'Giảm 500.000đ cho tour nội địa',
        usage_limit_per_user: 1,
        usage_limit_total: 100,
        used_at: null,
        user_usage_count: 0,
        valid_from: '2026-07-01T00:00:00.000Z',
        valid_to: '2026-07-25T00:00:00.000Z',
      },
    ];
  };

  try {
    const response = await request(server, `${apiPrefix}/me/vouchers`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Profile vouchers retrieved successfully',
    );
    assert.equal(response.body.data[0].code, 'NETVIET500');
    assert.equal(response.body.data[0].status, 'active');
    assert.deepEqual(capturedContext, {
      userId: 'user-1',
    });
  } finally {
    server.close();
  }
});

test('GET /api/me/vouchers returns 403 for non-customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'user-1',
    });

  try {
    const response = await request(server, `${apiPrefix}/me/vouchers`, {
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

test('POST /api/me/vouchers saves a voucher for the authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });
  profileService.saveCurrentUserVoucher = async (context) => {
    capturedContext = context;

    return {
      code: 'NETVIET500',
      id: 'voucher-1',
      status: 'active',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/me/vouchers`, {
      body: JSON.stringify({ code: 'netviet500' }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.code, 'NETVIET500');
    assert.equal(capturedContext.payload.code, 'netviet500');
    assert.equal(capturedContext.userId, 'user-1');
  } finally {
    server.close();
  }
});

test('POST /api/me/account-deactivation-request requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/me/account-deactivation-request`,
      {
        body: JSON.stringify({
          reason: 'I no longer need this account',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('POST /api/me/account-deactivation-request returns request status for customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });
  profileService.requestAccountDeactivation = async (context) => {
    capturedContext = context;

    return {
      request_status: 'requested',
    };
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/me/account-deactivation-request`,
      {
        body: JSON.stringify({
          reason: '  I want to deactivate my account  ',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'User-Agent': 'profile-deactivation-route-test',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Account deactivation request submitted successfully',
    );
    assert.deepEqual(response.body.data, {
      request_status: 'requested',
    });
    assert.deepEqual(capturedContext.payload, {
      reason: '  I want to deactivate my account  ',
    });
    assert.equal(capturedContext.roleCode, 'customer');
    assert.equal(capturedContext.userId, 'user-1');
    assert.equal(capturedContext.userAgent, 'profile-deactivation-route-test');
    assert.match(capturedContext.ipAddress, /127\.0\.0\.1/);
  } finally {
    server.close();
  }
});

test('POST /api/me/account-deactivation-request returns 403 for non-customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'user-1',
    });

  try {
    const response = await request(
      server,
      `${apiPrefix}/me/account-deactivation-request`,
      {
        body: JSON.stringify({
          reason: 'Please deactivate',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});

test('POST /api/me/account-deactivation-request surfaces duplicate requests', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'user-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'user-1',
    });
  profileService.requestAccountDeactivation = async () => {
    throw new AppError('An account deactivation request is already pending', {
      code: API_ERROR_CODES.DUPLICATE_RESOURCE,
      statusCode: 409,
    });
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/me/account-deactivation-request`,
      {
        body: JSON.stringify({
          reason: 'Please deactivate',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

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
