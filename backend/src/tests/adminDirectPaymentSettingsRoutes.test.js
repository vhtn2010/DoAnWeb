const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminDirectPaymentSettingsService = require('../services/adminDirectPaymentSettingsService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetDirectPaymentSettings =
  adminDirectPaymentSettingsService.getDirectPaymentSettings;
const originalUpdateDirectPaymentSettings =
  adminDirectPaymentSettingsService.updateDirectPaymentSettings;

const createAuthContext = ({
  permissions = ['settings.read', 'settings.update'],
  roleCode = 'admin',
  userId = 'admin-user-1',
} = {}) => ({
  permissions,
  roleCode,
  tokenId: 'access-jti-1',
  user: {
    email: `${userId}@example.com`,
    id: userId,
    role_id: 'role-1',
    role_code: roleCode,
    status: 'active',
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

    if (
      hasBody &&
      !Object.keys(headers).some((key) => key.toLowerCase() === 'content-length')
    ) {
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
        let responseBody = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          responseBody += chunk;
        });
        res.on('end', () => {
          resolve({
            body: JSON.parse(responseBody),
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
  adminDirectPaymentSettingsService.getDirectPaymentSettings =
    originalGetDirectPaymentSettings;
  adminDirectPaymentSettingsService.updateDirectPaymentSettings =
    originalUpdateDirectPaymentSettings;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminDirectPaymentSettingsService.getDirectPaymentSettings =
    originalGetDirectPaymentSettings;
  adminDirectPaymentSettingsService.updateDirectPaymentSettings =
    originalUpdateDirectPaymentSettings;
});

test('GET /api/admin/settings/direct-payment requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/settings/direct-payment`,
    );

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/settings/direct-payment returns admin direct payment settings for authorized admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminDirectPaymentSettingsService.getDirectPaymentSettings = async () => ({
    methods: [
      {
        code: 'cash_at_office',
        display_name: 'Office payment',
        enabled: false,
        sort_order: 0,
      },
    ],
    updated_at: '2026-07-02T07:00:00.000Z',
    updated_by: 'admin-user-1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/settings/direct-payment`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Admin direct payment settings retrieved successfully',
    );
    assert.equal(response.body.data.methods[0].code, 'cash_at_office');
  } finally {
    await closeServer(server);
  }
});

test('PATCH /api/admin/settings/direct-payment returns updated settings for authorized admin', async () => {
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
  adminDirectPaymentSettingsService.updateDirectPaymentSettings = async () => ({
    methods: [
      {
        code: 'manual_bank_transfer',
        display_name: 'Bank transfer',
        enabled: true,
        sort_order: 1,
      },
    ],
    updated_at: '2026-07-02T08:00:00.000Z',
    updated_by: 'sys-admin-1',
  });

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/settings/direct-payment`,
      {
        body: JSON.stringify({
          methods: [
            {
              account_holder: 'NET VIET TRAVEL',
              account_number: '0123456789',
              bank_name: 'Vietcombank',
              code: 'manual_bank_transfer',
              display_name: 'Bank transfer',
              enabled: true,
              transfer_content_template: 'NVT {booking_code}',
            },
          ],
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
    assert.equal(
      response.body.message,
      'Admin direct payment settings updated successfully',
    );
    assert.equal(response.body.data.updated_by, 'sys-admin-1');
  } finally {
    await closeServer(server);
  }
});

test('PATCH /api/admin/settings/direct-payment surfaces validation errors', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminDirectPaymentSettingsService.updateDirectPaymentSettings = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'methods',
          message: 'methods is required',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(
      server,
      `${apiPrefix}/admin/settings/direct-payment`,
      {
        body: JSON.stringify({}),
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
  } finally {
    await closeServer(server);
  }
});
