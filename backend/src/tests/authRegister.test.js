const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES, USER_STATUS } = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const AppError = require('../utils/AppError');

const originalRegister = authService.register;

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
  clearRateLimitStore('auth-register');
  authService.register = originalRegister;
});

test.afterEach(() => {
  clearRateLimitStore('auth-register');
  authService.register = originalRegister;
});

test('POST /api/auth/register is public and returns the registered user envelope', async () => {
  const server = app.listen(0);
  let capturedPayload;
  let capturedContext;

  authService.register = async (payload, context) => {
    capturedPayload = payload;
    capturedContext = context;

    return {
      email: 'customer@example.com',
      full_name: 'Nguyen Van A',
      id: 'user-1',
      phone: '0909000000',
      role: 'customer',
      status: USER_STATUS.PENDING_VERIFICATION,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/register`, {
      body: JSON.stringify({
        email: 'customer@example.com',
        full_name: 'Nguyen Van A',
        password: 'Secret123',
        phone: '0909000000',
      }),
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'auth-register-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Registration successful. Please verify your email before logging in.',
    );
    assert.equal(response.body.data.email, 'customer@example.com');
    assert.equal(response.body.data.role, 'customer');
    assert.equal(response.body.data.status, USER_STATUS.PENDING_VERIFICATION);
    assert.equal(Object.hasOwn(response.body.data, 'password_hash'), false);
    assert.deepEqual(capturedPayload, {
      email: 'customer@example.com',
      full_name: 'Nguyen Van A',
      password: 'Secret123',
      phone: '0909000000',
    });
    assert.equal(capturedContext.userAgent, 'auth-register-test');
  } finally {
    server.close();
  }
});

test('POST /api/auth/register surfaces duplicate email conflicts', async () => {
  const server = app.listen(0);

  authService.register = async () => {
    throw new AppError('Email already exists', {
      code: API_ERROR_CODES.DUPLICATE_RESOURCE,
      details: [
        {
          field: 'email',
          message: 'Email already exists',
        },
      ],
      statusCode: 409,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/auth/register`, {
      body: JSON.stringify({
        email: 'customer@example.com',
        full_name: 'Nguyen Van A',
        password: 'Secret123',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 409);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Email already exists');
    assert.equal(response.body.error.code, API_ERROR_CODES.DUPLICATE_RESOURCE);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'email',
        message: 'Email already exists',
      },
    ]);
  } finally {
    server.close();
  }
});

test('POST /api/auth/register returns 429 when the rate limit is exceeded', async () => {
  const server = app.listen(0);

  authService.register = async () => ({
    email: 'customer@example.com',
    full_name: 'Nguyen Van A',
    id: 'user-1',
    phone: null,
    role: 'customer',
    status: USER_STATUS.PENDING_VERIFICATION,
  });

  try {
    let lastResponse;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/auth/register`, {
        body: JSON.stringify({
          email: 'customer@example.com',
          full_name: 'Nguyen Van A',
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
      'Too many registration attempts. Please try again later.',
    );
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    server.close();
  }
});
