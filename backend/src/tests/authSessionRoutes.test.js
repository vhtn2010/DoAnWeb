const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalLogin = authService.login;
const originalLogout = authService.logout;
const originalRefreshToken = authService.refreshToken;
const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;

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
  clearRateLimitStore('auth-login');
  authService.login = originalLogin;
  authService.logout = originalLogout;
  authService.refreshToken = originalRefreshToken;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
});

test.afterEach(() => {
  clearRateLimitStore('auth-login');
  authService.login = originalLogin;
  authService.logout = originalLogout;
  authService.refreshToken = originalRefreshToken;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
});

test('POST /api/auth/login returns session payload and permissions', async () => {
  const server = app.listen(0);
  let capturedPayload;
  let capturedContext;

  authService.login = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      access_token: 'access-token',
      expires_in: 1800,
      permissions: ['booking.create', 'booking.read_self'],
      refresh_expires_in: 604800,
      refresh_token: 'refresh-token',
      user: {
        email: 'customer@example.com',
        full_name: 'Nguyen Van A',
        id: 'user-1',
        role: 'customer',
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/login`, {
      body: JSON.stringify({
        email: 'customer@example.com',
        password: 'Secret123',
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'auth-login-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Login successful.');
    assert.equal(response.body.data.access_token, 'access-token');
    assert.equal(response.body.data.refresh_token, 'refresh-token');
    assert.deepEqual(response.body.data.permissions, [
      'booking.create',
      'booking.read_self',
    ]);
    assert.equal(Object.hasOwn(response.body.data.user, 'password_hash'), false);
    assert.deepEqual(capturedPayload, {
      email: 'customer@example.com',
      password: 'Secret123',
    });
    assert.equal(capturedContext.userAgent, 'auth-login-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/login returns 429 when login rate limit is exceeded', async () => {
  const server = app.listen(0);

  authService.login = async () => ({
    access_token: 'access-token',
    expires_in: 1800,
    permissions: [],
    refresh_expires_in: 604800,
    refresh_token: 'refresh-token',
    user: {
      email: 'customer@example.com',
      full_name: 'Nguyen Van A',
      id: 'user-1',
      role: 'customer',
    },
  });

  try {
    let lastResponse;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/auth/login`, {
        body: JSON.stringify({
          email: 'customer@example.com',
          password: 'Secret123',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(
      lastResponse.body.message,
      'Too many login attempts. Please try again later.',
    );
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});

test('POST /api/auth/refresh-token returns rotated token payload', async () => {
  const server = app.listen(0);
  let capturedPayload;

  authService.refreshToken = async (payload) => {
    capturedPayload = payload;

    return {
      access_token: 'new-access-token',
      expires_in: 1800,
      permissions: ['booking.create'],
      refresh_expires_in: 604800,
      refresh_token: 'new-refresh-token',
      user: {
        email: 'customer@example.com',
        full_name: 'Nguyen Van A',
        id: 'user-1',
        role: 'customer',
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/refresh-token`, {
      body: JSON.stringify({
        refresh_token: 'old-refresh-token',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Token refreshed successfully.');
    assert.equal(response.body.data.access_token, 'new-access-token');
    assert.equal(response.body.data.refresh_token, 'new-refresh-token');
    assert.deepEqual(capturedPayload, {
      refresh_token: 'old-refresh-token',
    });
  } finally {
    server.close();
  }
});

test('POST /api/auth/logout requires a valid access token', async () => {
  const server = app.listen(0);

  authService.logout = async () => ({
    data: {
      acknowledged: true,
    },
    message: 'Logout successful.',
  });

  try {
    const response = await request(server, `${apiPrefix}/auth/logout`, {
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('POST /api/auth/logout returns success for authenticated users', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    emlv: 'email-version',
    pwdv: 'password-version',
    roleCode: 'customer',
    userId: 'user-1',
  });
  let capturedPayload;
  let capturedContext;

  authService.logout = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      data: {
        acknowledged: true,
      },
      message: 'Logout successful.',
    };
  };
  authService.resolveAuthenticatedUser = async () => ({
    roleCode: 'customer',
    tokenId: 'access-jti-1',
    user: {
      email: 'customer@example.com',
      id: 'user-1',
      role_code: 'customer',
    },
    userId: 'user-1',
  });

  try {
    const response = await request(server, `${apiPrefix}/auth/logout`, {
      body: JSON.stringify({
        refresh_token: 'refresh-token',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'auth-logout-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Logout successful.');
    assert.deepEqual(response.body.data, {
      acknowledged: true,
    });
    assert.deepEqual(capturedPayload, {
      refresh_token: 'refresh-token',
    });
    assert.equal(capturedContext.roleCode, 'customer');
    assert.equal(capturedContext.userId, 'user-1');
    assert.equal(capturedContext.userAgent, 'auth-logout-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/login surfaces invalid credential errors', async () => {
  const server = app.listen(0);

  authService.login = async () => {
    throw new AppError('Email or password is incorrect', {
      code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      statusCode: 401,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/login`, {
      body: JSON.stringify({
        email: 'customer@example.com',
        password: 'wrong-password',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Email or password is incorrect');
    assert.equal(
      response.body.error.code,
      API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
    );
  } finally {
    server.close();
  }
});
