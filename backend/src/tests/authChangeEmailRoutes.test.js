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

const originalChangeEmailConfirm = authService.changeEmailConfirm;
const originalChangeEmailRequest = authService.changeEmailRequest;
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

const authenticatedContext = {
  roleCode: 'customer',
  tokenId: 'access-jti-1',
  user: {
    email: 'current@example.com',
    id: 'user-1',
    role_code: 'customer',
  },
  userId: 'user-1',
};

const createAuthHeader = () =>
  `Bearer ${createAccessToken({
    emlv: 'email-version',
    pwdv: 'password-version',
    roleCode: 'customer',
    userId: 'user-1',
  })}`;

test.beforeEach(() => {
  clearRateLimitStore('auth-change-email-request');
  authService.changeEmailConfirm = originalChangeEmailConfirm;
  authService.changeEmailRequest = originalChangeEmailRequest;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
});

test.afterEach(() => {
  clearRateLimitStore('auth-change-email-request');
  authService.changeEmailConfirm = originalChangeEmailConfirm;
  authService.changeEmailRequest = originalChangeEmailRequest;
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
});

test('POST /api/auth/change-email/request requires authenticated user', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/auth/change-email/request`, {
      body: JSON.stringify({
        current_password: 'CurrentPassword123',
        new_email: 'new@example.com',
      }),
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

test('POST /api/auth/change-email/request returns generic success for authenticated users', async () => {
  const server = app.listen(0);
  let capturedPayload;
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => authenticatedContext;
  authService.changeEmailRequest = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      data: {
        acknowledged: true,
      },
      message: 'Change email confirmation has been sent.',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/change-email/request`, {
      body: JSON.stringify({
        current_password: 'CurrentPassword123',
        new_email: 'new@example.com',
      }),
      headers: {
        Authorization: createAuthHeader(),
        'Content-Type': 'application/json',
        'User-Agent': 'change-email-request-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Change email confirmation has been sent.');
    assert.deepEqual(response.body.data, {
      acknowledged: true,
    });
    assert.deepEqual(capturedPayload, {
      current_password: 'CurrentPassword123',
      new_email: 'new@example.com',
    });
    assert.equal(capturedContext.userId, 'user-1');
    assert.equal(capturedContext.userAgent, 'change-email-request-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/change-email/request returns 429 when request rate limit is exceeded', async () => {
  const server = app.listen(0);

  authService.resolveAuthenticatedUser = async () => authenticatedContext;
  authService.changeEmailRequest = async () => ({
    data: {
      acknowledged: true,
    },
    message: 'Change email confirmation has been sent.',
  });

  try {
    let lastResponse;

    for (let index = 0; index < 6; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/auth/change-email/request`, {
        body: JSON.stringify({
          current_password: 'CurrentPassword123',
          new_email: 'new@example.com',
        }),
        headers: {
          Authorization: createAuthHeader(),
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(
      lastResponse.body.message,
      'Too many change email requests. Please try again later.',
    );
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});

test('POST /api/auth/change-email/request surfaces invalid current password errors', async () => {
  const server = app.listen(0);

  authService.resolveAuthenticatedUser = async () => authenticatedContext;
  authService.changeEmailRequest = async () => {
    throw new AppError('Current password is incorrect', {
      code: API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
      statusCode: 401,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/change-email/request`, {
      body: JSON.stringify({
        current_password: 'WrongPassword123',
        new_email: 'new@example.com',
      }),
      headers: {
        Authorization: createAuthHeader(),
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_INVALID_CREDENTIALS);
  } finally {
    server.close();
  }
});

test('POST /api/auth/change-email/confirm returns success when token is confirmed', async () => {
  const server = app.listen(0);
  let capturedPayload;
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => authenticatedContext;
  authService.changeEmailConfirm = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      data: {
        acknowledged: true,
        email: 'new@example.com',
      },
      message: 'Email changed successfully.',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/change-email/confirm`, {
      body: JSON.stringify({
        token: 'change-email-token',
      }),
      headers: {
        Authorization: createAuthHeader(),
        'Content-Type': 'application/json',
        'User-Agent': 'change-email-confirm-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Email changed successfully.');
    assert.deepEqual(response.body.data, {
      acknowledged: true,
      email: 'new@example.com',
    });
    assert.deepEqual(capturedPayload, {
      token: 'change-email-token',
    });
    assert.equal(capturedContext.userId, 'user-1');
    assert.equal(capturedContext.userAgent, 'change-email-confirm-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/change-email/confirm surfaces ownership errors', async () => {
  const server = app.listen(0);

  authService.resolveAuthenticatedUser = async () => authenticatedContext;
  authService.changeEmailConfirm = async () => {
    throw new AppError('Change email token does not belong to current user', {
      code: API_ERROR_CODES.FORBIDDEN,
      statusCode: 403,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/change-email/confirm`, {
      body: JSON.stringify({
        token: 'other-user-token',
      }),
      headers: {
        Authorization: createAuthHeader(),
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(
      response.body.message,
      'Change email token does not belong to current user',
    );
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    server.close();
  }
});
