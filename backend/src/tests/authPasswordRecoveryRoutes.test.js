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
const AppError = require('../utils/AppError');

const originalForgotPassword = authService.forgotPassword;
const originalResetPassword = authService.resetPassword;

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
  clearRateLimitStore('auth-forgot-password');
  clearRateLimitStore('auth-reset-password');
  authService.forgotPassword = originalForgotPassword;
  authService.resetPassword = originalResetPassword;
});

test.afterEach(() => {
  clearRateLimitStore('auth-forgot-password');
  clearRateLimitStore('auth-reset-password');
  authService.forgotPassword = originalForgotPassword;
  authService.resetPassword = originalResetPassword;
});

test('POST /api/auth/forgot-password returns the generic recovery response', async () => {
  const server = app.listen(0);
  let capturedPayload;
  let capturedContext;

  authService.forgotPassword = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      data: {
        acknowledged: true,
      },
      message: 'If the email is eligible, a password reset email will be sent.',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/forgot-password`, {
      body: JSON.stringify({
        email: 'customer@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'forgot-route-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'If the email is eligible, a password reset email will be sent.',
    );
    assert.deepEqual(response.body.data, {
      acknowledged: true,
    });
    assert.deepEqual(capturedPayload, {
      email: 'customer@example.com',
    });
    assert.equal(capturedContext.userAgent, 'forgot-route-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/forgot-password returns 429 when forgot-password rate limit is exceeded', async () => {
  const server = app.listen(0);

  authService.forgotPassword = async () => ({
    data: {
      acknowledged: true,
    },
    message: 'If the email is eligible, a password reset email will be sent.',
  });

  try {
    let lastResponse;

    for (let index = 0; index < 6; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/auth/forgot-password`, {
        body: JSON.stringify({
          email: 'customer@example.com',
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
      'Too many password reset requests. Please try again later.',
    );
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});

test('POST /api/auth/reset-password returns reset success envelope', async () => {
  const server = app.listen(0);
  let capturedPayload;
  let capturedContext;

  authService.resetPassword = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      data: {
        acknowledged: true,
      },
      message: 'Password reset successful.',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/reset-password`, {
      body: JSON.stringify({
        new_password: 'NewStrong123',
        token: 'reset-token',
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'reset-route-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Password reset successful.');
    assert.deepEqual(response.body.data, {
      acknowledged: true,
    });
    assert.deepEqual(capturedPayload, {
      new_password: 'NewStrong123',
      token: 'reset-token',
    });
    assert.equal(capturedContext.userAgent, 'reset-route-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/reset-password surfaces expired token errors', async () => {
  const server = app.listen(0);

  authService.resetPassword = async () => {
    throw new AppError('Reset password token is invalid or expired', {
      code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
      statusCode: 401,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/reset-password`, {
      body: JSON.stringify({
        new_password: 'NewStrong123',
        token: 'expired-token',
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
