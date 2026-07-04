const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminBusinessSettingsService = require('../services/adminBusinessSettingsService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetBusinessSettings =
  adminBusinessSettingsService.getBusinessSettings;
const originalUpdateBusinessSettings =
  adminBusinessSettingsService.updateBusinessSettings;

const createAuthContext = ({
  permissions = ['settings.read', 'settings.update', 'system_setting.manage'],
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
  adminBusinessSettingsService.getBusinessSettings = originalGetBusinessSettings;
  adminBusinessSettingsService.updateBusinessSettings =
    originalUpdateBusinessSettings;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminBusinessSettingsService.getBusinessSettings = originalGetBusinessSettings;
  adminBusinessSettingsService.updateBusinessSettings =
    originalUpdateBusinessSettings;
});

test('GET /api/admin/settings/business requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/business`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/settings/business returns admin business settings for authorized admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminBusinessSettingsService.getBusinessSettings = async () => ({
    address: '12 Nguyen Hue, Quan 1, TP.HCM',
    business_license_no: '0312345678-001',
    company_name: 'Net Viet Travel Co., Ltd.',
    invoice_email: 'billing@netviet.test',
    invoice_note: 'Xuat hoa don theo yeu cau.',
    invoice_phone: '1900 8080',
    legal_representative: 'Nguyen Van A',
    tax_code: '0312345678',
    updated_at: '2026-07-02T11:00:00.000Z',
    updated_by: 'admin-user-1',
  });

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/business`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Admin business settings retrieved successfully',
    );
    assert.equal(response.body.data.company_name, 'Net Viet Travel Co., Ltd.');
  } finally {
    await closeServer(server);
  }
});

test('PATCH /api/admin/settings/business returns updated settings for authorized system admin', async () => {
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
  adminBusinessSettingsService.updateBusinessSettings = async () => ({
    address: '12 Nguyen Hue, Quan 1, TP.HCM',
    business_license_no: null,
    company_name: 'Net Viet Travel Co., Ltd.',
    invoice_email: 'billing@netviet.test',
    invoice_note: 'Xuat hoa don theo yeu cau.',
    invoice_phone: '1900 8080',
    legal_representative: 'Nguyen Van A',
    tax_code: '0312345678',
    updated_at: '2026-07-02T12:00:00.000Z',
    updated_by: 'sys-admin-1',
  });

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/business`, {
      body: JSON.stringify({
        company_name: 'Net Viet Travel Co., Ltd.',
        tax_code: '0312345678',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'PATCH',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Admin business settings updated successfully',
    );
    assert.equal(response.body.data.updated_by, 'sys-admin-1');
  } finally {
    await closeServer(server);
  }
});

test('PATCH /api/admin/settings/business surfaces validation errors', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminBusinessSettingsService.updateBusinessSettings = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'tax_code',
          message: 'tax_code must be a valid Vietnamese tax code with 10 or 13 digits',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/business`, {
      body: JSON.stringify({
        tax_code: '123',
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
  } finally {
    await closeServer(server);
  }
});
