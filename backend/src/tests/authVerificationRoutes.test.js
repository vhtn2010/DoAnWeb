const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES, USER_STATUS } = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const AppError = require('../utils/AppError');

const originalResendVerification = authService.resendVerification;
const originalVerifyEmail = authService.verifyEmail;

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
  clearRateLimitStore('auth-resend-verification');
  authService.resendVerification = originalResendVerification;
  authService.verifyEmail = originalVerifyEmail;
});

test.afterEach(() => {
  clearRateLimitStore('auth-resend-verification');
  authService.resendVerification = originalResendVerification;
  authService.verifyEmail = originalVerifyEmail;
});

test('POST /api/auth/verify-email returns verification success envelope', async () => {
  const server = app.listen(0);
  let capturedPayload;
  let capturedContext;

  authService.verifyEmail = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      already_verified: false,
      email_verified_at: '2026-06-30T00:00:00.000Z',
      message: 'Email verified successfully.',
      status: USER_STATUS.ACTIVE,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/verify-email`, {
      body: JSON.stringify({
        token: 'verify-token',
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'verify-route-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Email verified successfully.');
    assert.deepEqual(response.body.data, {
      already_verified: false,
      email_verified_at: '2026-06-30T00:00:00.000Z',
      status: USER_STATUS.ACTIVE,
    });
    assert.deepEqual(capturedPayload, {
      token: 'verify-token',
    });
    assert.equal(capturedContext.userAgent, 'verify-route-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/verify-email surfaces token failures with shared error code', async () => {
  const server = app.listen(0);

  authService.verifyEmail = async () => {
    throw new AppError('Verification token is invalid or expired', {
      code: API_ERROR_CODES.AUTH_TOKEN_EXPIRED,
      statusCode: 401,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/verify-email`, {
      body: JSON.stringify({
        token: 'expired-token',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Verification token is invalid or expired');
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    server.close();
  }
});

test('POST /api/auth/resend-verification returns generic success envelope', async () => {
  const server = app.listen(0);
  let capturedPayload;
  let capturedContext;

  authService.resendVerification = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      data: {
        acknowledged: true,
      },
      message: 'If the email is eligible, a verification email will be sent.',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/resend-verification`, {
      body: JSON.stringify({
        email: 'customer@example.com',
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'resend-route-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'If the email is eligible, a verification email will be sent.',
    );
    assert.deepEqual(response.body.data, {
      acknowledged: true,
    });
    assert.deepEqual(capturedPayload, {
      email: 'customer@example.com',
    });
    assert.equal(capturedContext.userAgent, 'resend-route-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/resend-verification returns 429 when resend rate limit is exceeded', async () => {
  const server = app.listen(0);

  authService.resendVerification = async () => ({
    data: {
      acknowledged: true,
    },
    message: 'If the email is eligible, a verification email will be sent.',
  });

  try {
    let lastResponse;

    for (let index = 0; index < 6; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/auth/resend-verification`, {
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
      'Too many verification email resend attempts. Please try again later.',
    );
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});
