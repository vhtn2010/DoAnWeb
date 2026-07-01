const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');

const request = (server, path) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const req = http.request(`http://127.0.0.1:${port}${path}`, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        resolve({
          body,
          headers: res.headers,
          statusCode: res.statusCode,
        });
      });
    });

    req.on('error', reject);
    req.end();
  });

test('GET /swagger-ui/index.html returns Swagger UI HTML', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, '/swagger-ui/index.html');

    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'], /^text\/html/);
    assert.equal(response.headers['content-security-policy'], undefined);
    assert.match(response.body, /Net Viet Travel Swagger UI/i);
    assert.match(response.body, /swagger-ui-bundle\.js/i);
  } finally {
    server.close();
  }
});

test('GET /swagger-ui/openapi.json returns the OpenAPI document', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, '/swagger-ui/openapi.json');
    const payload = JSON.parse(response.body);

    assert.equal(response.statusCode, 200);
    assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');
    assert.equal(payload.openapi, '3.0.3');
    assert.equal(payload.info.title, 'Net Viet Travel API');
    assert.ok(payload.paths['/auth/login']);
    assert.ok(payload.paths['/services']);
    assert.ok(payload.paths['/tours']);
    assert.equal(payload.paths['/swagger-ui/openapi.json'], undefined);
    assert.equal(payload.paths['/docs/index.html'], undefined);
  } finally {
    server.close();
  }
});

test('GET /api/docs/index.html returns Swagger UI alias', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, '/api/docs/index.html');

    assert.equal(response.statusCode, 200);
    assert.match(response.headers['content-type'], /^text\/html/);
    assert.match(response.body, /Net Viet Travel Swagger UI/i);
  } finally {
    server.close();
  }
});
