const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const profileService = require('../services/profileService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalGetCurrentProfile = profileService.getCurrentProfile;
const originalUpdateCurrentProfile = profileService.updateCurrentProfile;

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
  profileService.getCurrentProfile = originalGetCurrentProfile;
  profileService.updateCurrentProfile = originalUpdateCurrentProfile;
});

test.afterEach(() => {
  profileService.getCurrentProfile = originalGetCurrentProfile;
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
