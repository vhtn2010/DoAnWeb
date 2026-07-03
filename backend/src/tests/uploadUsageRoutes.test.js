const assert = require('node:assert/strict');
const http = require('node:http');
const test = require('node:test');

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret';

const app = require('../app');
const { apiPrefix } = require('../config');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const { clearRateLimitStore } = require('../middleware/rateLimit');
const authService = require('../services/authService');
const uploadUsageService = require('../services/uploadUsageService');
const {
  ADMIN_UPLOAD_USAGE_RATE_LIMIT_STORE_KEY,
} = require('../routes/uploadRoutes');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalGetUploadUsage = uploadUsageService.getUploadUsage;

const createAuthContext = ({
  roleCode = 'admin',
  userId = 'user-1',
} = {}) => ({
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
  clearRateLimitStore(ADMIN_UPLOAD_USAGE_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  uploadUsageService.getUploadUsage = originalGetUploadUsage;
});

test.afterEach(() => {
  clearRateLimitStore(ADMIN_UPLOAD_USAGE_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  uploadUsageService.getUploadUsage = originalGetUploadUsage;
});

test('GET /api/admin/uploads/usage requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/admin/uploads/usage`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/uploads/usage blocks staff tokens before reaching the service', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-1',
    });

  try {
    const response = await request(server, `${apiPrefix}/admin/uploads/usage`, {
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

test('GET /api/admin/uploads/usage returns normalized usage payload for authenticated admin', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-1',
    });
  uploadUsageService.getUploadUsage = async (context) => {
    capturedContext = context;

    return {
      asset_count: 8,
      bandwidth_usage: {
        limit_bytes: 2000,
        used_bytes: 1000,
      },
      cached: false,
      fetched_at: '2026-07-03T10:00:00.000Z',
      partial: false,
      provider: 'cloudinary',
      resource_breakdown: {
        image: 5,
        raw: 1,
        video: 2,
      },
      storage_usage: {
        limit_bytes: 4000,
        used_bytes: 2000,
      },
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/admin/uploads/usage`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'User-Agent': 'upload-usage-route-test',
      },
      method: 'GET',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Upload usage retrieved successfully',
    );
    assert.equal(response.body.data.provider, 'cloudinary');
    assert.equal(capturedContext.auth.userId, 'admin-1');
    assert.deepEqual({ ...capturedContext.query }, {});
    assert.deepEqual(capturedContext.body ?? {}, {});
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/uploads/usage surfaces validation and forbidden errors from the service', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'system_admin',
    userId: 'sys-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'system_admin',
      userId: 'sys-1',
    });

  uploadUsageService.getUploadUsage = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'query',
          message: 'query parameters are not supported',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const validationResponse = await request(
      server,
      `${apiPrefix}/admin/uploads/usage?from=2026-07-01`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationResponse.body.success, false);
    assert.equal(
      validationResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );

    uploadUsageService.getUploadUsage = async () => {
      throw new AppError('Forbidden', {
        code: API_ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      });
    };

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/admin/uploads/usage`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        method: 'GET',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.success, false);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await closeServer(server);
  }
});

test('GET /api/admin/uploads/usage returns 429 when the usage rate limit is exceeded', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'admin',
    userId: 'admin-1',
  });

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'admin',
      userId: 'admin-1',
    });
  uploadUsageService.getUploadUsage = async () => ({
    asset_count: 8,
    bandwidth_usage: {
      limit_bytes: 2000,
      used_bytes: 1000,
    },
    cached: false,
    fetched_at: '2026-07-03T10:00:00.000Z',
    partial: false,
    provider: 'cloudinary',
    resource_breakdown: {
      image: 5,
      raw: 1,
      video: 2,
    },
    storage_usage: {
      limit_bytes: 4000,
      used_bytes: 2000,
    },
  });

  try {
    let lastResponse;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await request(
        server,
        `${apiPrefix}/admin/uploads/usage`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          method: 'GET',
        },
      );
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    await closeServer(server);
  }
});
