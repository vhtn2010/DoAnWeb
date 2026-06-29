const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const systemService = require('../services/systemService');

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
          statusCode: res.statusCode,
          body: JSON.parse(body),
        });
      });
    });

    if (options.body) {
      req.write(options.body);
    }

    req.on('error', reject);
    req.end();
  });

test('GET /api/health returns service status', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/health`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Service is healthy');
    assert.equal(response.body.data.status, 'ok');
    assert.equal(response.body.data.service, 'net-viet-travel-api');
    assert.equal(typeof response.body.data.uptimeSeconds, 'number');
  } finally {
    server.close();
  }
});

test('GET /api/health/live returns liveness payload', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/health/live`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Service is live');
    assert.equal(response.body.data.status, 'alive');
    assert.equal(response.body.data.service, 'net-viet-travel-api');
  } finally {
    server.close();
  }
});

test('GET /api/health/ready returns readiness payload when dependencies are ready', async () => {
  const originalGetReadinessReport = systemService.getReadinessReport;
  const server = app.listen(0);

  systemService.getReadinessReport = async () => ({
    checks: {
      cloudinary: {
        message: 'Cloudinary connection is working',
        ready: true,
        service: 'cloudinary',
        status: 'connected',
      },
      database: {
        message: 'Supabase connection is working',
        ready: true,
        service: 'database',
        status: 'connected',
      },
      sendgrid: {
        message: 'SendGrid connection is working',
        ready: true,
        service: 'sendgrid',
        status: 'connected',
      },
    },
    ready: true,
    service: 'net-viet-travel-api',
    status: 'ready',
    timestamp: '2026-06-29T00:00:00.000Z',
    uptimeSeconds: 12.345,
  });

  try {
    const response = await request(server, `${apiPrefix}/health/ready`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Service is ready');
    assert.equal(response.body.data.ready, true);
    assert.equal(response.body.data.status, 'ready');
    assert.equal(response.body.data.checks.database.status, 'connected');
  } finally {
    systemService.getReadinessReport = originalGetReadinessReport;
    server.close();
  }
});

test('GET /api/health/ready returns 503 when a dependency is not ready', async () => {
  const originalGetReadinessReport = systemService.getReadinessReport;
  const server = app.listen(0);

  systemService.getReadinessReport = async () => ({
    checks: {
      cloudinary: {
        message: 'Cloudinary credentials are missing',
        ready: false,
        service: 'cloudinary',
        status: 'not_configured',
      },
      database: {
        message: 'Supabase connection is working',
        ready: true,
        service: 'database',
        status: 'connected',
      },
      sendgrid: {
        message: 'SendGrid credentials are missing',
        ready: false,
        service: 'sendgrid',
        status: 'not_configured',
      },
    },
    ready: false,
    service: 'net-viet-travel-api',
    status: 'degraded',
    timestamp: '2026-06-29T00:00:00.000Z',
    uptimeSeconds: 12.345,
  });

  try {
    const response = await request(server, `${apiPrefix}/health/ready`);

    assert.equal(response.statusCode, 503);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Service dependencies are not ready');
    assert.equal(response.body.data.ready, false);
    assert.equal(response.body.data.status, 'degraded');
    assert.equal(response.body.data.checks.cloudinary.status, 'not_configured');
  } finally {
    systemService.getReadinessReport = originalGetReadinessReport;
    server.close();
  }
});

test('GET /api/version returns API, build, and runtime metadata', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/version`);

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Version retrieved successfully');
    assert.equal(response.body.data.api.name, 'net-viet-travel-api');
    assert.equal(response.body.data.api.prefix, apiPrefix);
    assert.equal(response.body.data.api.version, '1.0.0');
    assert.equal(response.body.data.build.environment, 'test');
    assert.equal(response.body.data.build.version, '0.1.0');
    assert.equal(response.body.data.runtime.node, process.version);
    assert.equal(response.body.data.runtime.platform, process.platform);
  } finally {
    server.close();
  }
});

test('GET unknown route returns standard error envelope', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/unknown`);

    assert.equal(response.statusCode, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Route not found');
    assert.equal(response.body.error.code, API_ERROR_CODES.ROUTE_NOT_FOUND);
  } finally {
    server.close();
  }
});

test('invalid JSON payload returns standard parse error envelope', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/health`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{"broken": true',
    });

    assert.equal(response.statusCode, 400);
    assert.equal(response.body.success, false);
    assert.equal(response.body.message, 'Request JSON is invalid');
    assert.equal(response.body.error.code, API_ERROR_CODES.INVALID_JSON);
    assert.deepEqual(response.body.error.details, [
      {
        field: 'body',
        message: 'Malformed JSON payload',
      },
    ]);
  } finally {
    server.close();
  }
});
