const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const settingsRoutes = require('../routes/settingsRoutes');
const settingsService = require('../services/settingsService');

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(
      `http://127.0.0.1:${port}${path}`,
      options,
      (res) => {
        let body = '';

        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => {
          resolve({
            body: JSON.parse(body),
            headers: res.headers,
            statusCode: res.statusCode,
          });
        });
      },
    );

    req.on('error', reject);
    req.end();
  });

test('GET /api/settings/public is public and returns cacheable public settings', async () => {
  const originalGetPublicSettings = settingsService.getPublicSettings;
  const server = app.listen(0);

  clearRateLimitStore(settingsRoutes.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY);
  settingsService.getPublicSettings = async () => ({
    address: '12 Nguyen Hue, Quan 1, TP.HCM',
    business_hours: {
      weekdays: '08:00 - 17:30',
    },
    business_info_public: {
      company_name: 'Net Viet Travel Co., Ltd.',
    },
    hotline: '1900 8080',
    logo_url: 'https://cdn.netviet.test/logo.png',
    site_name: 'Net Viet Travel',
    social_links: {
      facebook: 'https://facebook.com/netviettravel',
    },
    support_email: 'support@netviet.test',
  });

  try {
    const anonymousResponse = await request(
      server,
      `${apiPrefix}/settings/public`,
    );
    const authenticatedResponse = await request(
      server,
      `${apiPrefix}/settings/public`,
      {
        headers: {
          Authorization: 'Bearer ignored-for-public-route',
        },
      },
    );

    assert.equal(anonymousResponse.statusCode, 200);
    assert.equal(anonymousResponse.body.success, true);
    assert.equal(
      anonymousResponse.body.message,
      'Public settings retrieved successfully',
    );
    assert.deepEqual(anonymousResponse.body.data, {
      address: '12 Nguyen Hue, Quan 1, TP.HCM',
      business_hours: {
        weekdays: '08:00 - 17:30',
      },
      business_info_public: {
        company_name: 'Net Viet Travel Co., Ltd.',
      },
      hotline: '1900 8080',
      logo_url: 'https://cdn.netviet.test/logo.png',
      site_name: 'Net Viet Travel',
      social_links: {
        facebook: 'https://facebook.com/netviettravel',
      },
      support_email: 'support@netviet.test',
    });
    assert.match(anonymousResponse.headers['cache-control'], /max-age=300/);

    assert.equal(authenticatedResponse.statusCode, 200);
    assert.equal(authenticatedResponse.body.success, true);
  } finally {
    settingsService.getPublicSettings = originalGetPublicSettings;
    clearRateLimitStore(settingsRoutes.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY);
    server.close();
  }
});

test('GET /api/settings/public returns INTERNAL_ERROR without exposing repository details', async () => {
  const originalGetPublicSettings = settingsService.getPublicSettings;
  const server = app.listen(0);

  clearRateLimitStore(settingsRoutes.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY);
  settingsService.getPublicSettings = settingsService.createSettingsService({
    repository: {
      getPublicSettings: async () => {
        throw new Error('database exploded');
      },
    },
  }).getPublicSettings;

  try {
    const response = await request(server, `${apiPrefix}/settings/public`);

    assert.equal(response.statusCode, 500);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'INTERNAL_ERROR');
    assert.equal(response.body.message, 'Internal server error');
  } finally {
    settingsService.getPublicSettings = originalGetPublicSettings;
    clearRateLimitStore(settingsRoutes.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY);
    server.close();
  }
});

test('GET /api/settings/public returns RATE_LIMITED after repeated requests', async () => {
  const originalGetPublicSettings = settingsService.getPublicSettings;
  const server = app.listen(0);

  clearRateLimitStore(settingsRoutes.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY);
  settingsService.getPublicSettings = async () => ({
    address: null,
    business_hours: null,
    business_info_public: null,
    hotline: null,
    logo_url: null,
    site_name: 'Net Viet Travel',
    social_links: {},
    support_email: null,
  });

  try {
    let lastResponse = null;

    for (let index = 0; index < 61; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/settings/public`);
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(lastResponse.body.error.code, 'RATE_LIMITED');
  } finally {
    settingsService.getPublicSettings = originalGetPublicSettings;
    clearRateLimitStore(settingsRoutes.PUBLIC_SETTINGS_RATE_LIMIT_STORE_KEY);
    server.close();
  }
});
