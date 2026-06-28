const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');

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
