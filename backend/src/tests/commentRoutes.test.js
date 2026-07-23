const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';

const app = require('../app');
const commentService = require('../services/commentService');
const { apiPrefix } = require('../config');

const serviceId = '33333333-3333-4333-8333-333333333333';
const originalCreateServiceComment = commentService.createServiceComment;
const originalListServiceComments = commentService.listServiceComments;

const request = (server, path, options = {}) =>
  new Promise((resolve, reject) => {
    const { port } = server.address();
    const body = options.body;
    const headers = {
      Connection: 'close',
      ...(options.headers || {}),
    };

    if (
      typeof body === 'string' &&
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

    if (body) {
      req.write(body);
    }

    req.on('error', reject);
    req.end();
  });

test.afterEach(() => {
  commentService.createServiceComment = originalCreateServiceComment;
  commentService.listServiceComments = originalListServiceComments;
});

test('GET /api/services/{service_id}/comments returns public discussion', async () => {
  commentService.listServiceComments = async () => ({
    items: [{ author_name: 'Minh Anh', content: 'Tour rất thú vị.', id: 'comment-1' }],
    meta: {
      comment_count: 1,
      has_next: false,
      limit: 20,
      page: 1,
      total: 1,
      total_pages: 1,
    },
  });
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/${serviceId}/comments`,
    );

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data[0].author_name, 'Minh Anh');
    assert.equal(response.body.meta.comment_count, 1);
  } finally {
    server.close();
  }
});

test('POST /api/services/{service_id}/comments allows a guest comment', async () => {
  let capturedContext;
  commentService.createServiceComment = async (context) => {
    capturedContext = context;
    return {
      author_name: context.body.display_name,
      content: context.body.content,
      id: 'comment-2',
      is_registered: false,
    };
  };
  const server = app.listen(0);

  try {
    const response = await request(
      server,
      `${apiPrefix}/services/${serviceId}/comments`,
      {
        body: JSON.stringify({
          content: 'Tour này có phù hợp với trẻ nhỏ không?',
          display_name: 'Minh Anh',
        }),
        headers: {
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(response.statusCode, 201);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.is_registered, false);
    assert.equal(capturedContext.auth, null);
    assert.equal(capturedContext.serviceId, serviceId);
  } finally {
    server.close();
  }
});
