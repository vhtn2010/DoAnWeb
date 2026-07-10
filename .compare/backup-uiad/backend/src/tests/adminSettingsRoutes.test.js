const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const authService = require('../services/authService');
const adminSettingsService = require('../services/adminSettingsService');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetPublicSettings = adminSettingsService.getPublicSettings;
const originalUpdatePublicSettings = adminSettingsService.updatePublicSettings;

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
  adminSettingsService.getPublicSettings = originalGetPublicSettings;
  adminSettingsService.updatePublicSettings = originalUpdatePublicSettings;
});

test.afterEach(() => {
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  adminSettingsService.getPublicSettings = originalGetPublicSettings;
  adminSettingsService.updatePublicSettings = originalUpdatePublicSettings;
});

test('GET /api/admin/settings/public requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/public`);

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/settings/public blocks customer role', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'customer-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'customer-1',
    });

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/public`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/settings/public returns admin public settings for authorized admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminSettingsService.getPublicSettings = async (context) => {
    capturedContext = context;

    return {
      address: '12 Nguyen Hue, Quan 1, TP.HCM',
      business_hours: {
        weekdays: '08:00 - 17:30',
      },
      business_info_public: null,
      footer_text: 'Explore Vietnam with confidence.',
      hotline: '1900 8080',
      logo_url: 'https://cdn.netviet.test/logo.png',
      seo_description: 'Travel smarter with Net Viet Travel.',
      seo_title: 'Net Viet Travel',
      site_name: 'Net Viet Travel',
      social_links: {
        facebook: 'https://facebook.com/netviettravel',
      },
      support_email: 'support@netviet.test',
      updated_at: '2026-07-02T04:00:00.000Z',
      updated_by: 'admin-user-1',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/public`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Admin public settings retrieved successfully',
    );
    assert.equal(response.body.data.site_name, 'Net Viet Travel');
    assert.equal(capturedContext.auth.userId, 'admin-user-1');
  } finally {
    await closeServer(server);
  }
});

test('PATCH /api/admin/settings/public returns updated settings for authorized system admin', async () => {
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
  adminSettingsService.updatePublicSettings = async (context) => {
    capturedContext = context;

    return {
      address: null,
      business_hours: null,
      business_info_public: null,
      footer_text: null,
      hotline: '1900 8080',
      logo_url: null,
      seo_description: null,
      seo_title: null,
      site_name: 'New Site Name',
      social_links: {},
      support_email: 'support@netviet.test',
      updated_at: '2026-07-02T05:00:00.000Z',
      updated_by: 'sys-admin-1',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/public`, {
      body: JSON.stringify({
        site_name: 'New Site Name',
        support_email: 'support@netviet.test',
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
      'Admin public settings updated successfully',
    );
    assert.equal(response.body.data.updated_by, 'sys-admin-1');
    assert.equal(capturedContext.auth.userId, 'sys-admin-1');
    assert.equal(capturedContext.body.site_name, 'New Site Name');
  } finally {
    await closeServer(server);
  }
});

test('PATCH /api/admin/settings/public surfaces validation errors', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-user-1',
  });

  authService.resolveAuthenticatedUser = async () => createAuthContext();
  adminSettingsService.updatePublicSettings = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'site_name',
          message: 'site_name is required',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/settings/public`, {
      body: JSON.stringify({
        site_name: '',
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
