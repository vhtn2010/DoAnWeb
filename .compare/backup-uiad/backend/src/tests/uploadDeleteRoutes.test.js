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
const uploadDeleteService = require('../services/uploadDeleteService');
const {
  UPLOAD_CLOUDINARY_DELETE_RATE_LIMIT_STORE_KEY,
} = require('../routes/uploadRoutes');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalDeleteCloudinaryAsset =
  uploadDeleteService.deleteCloudinaryAsset;

const createAuthContext = ({
  roleCode = 'staff',
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
  clearRateLimitStore(UPLOAD_CLOUDINARY_DELETE_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  uploadDeleteService.deleteCloudinaryAsset = originalDeleteCloudinaryAsset;
});

test.afterEach(() => {
  clearRateLimitStore(UPLOAD_CLOUDINARY_DELETE_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  uploadDeleteService.deleteCloudinaryAsset = originalDeleteCloudinaryAsset;
});

test('DELETE /api/uploads/cloudinary requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/uploads/cloudinary`, {
      body: JSON.stringify({
        public_id: 'net-viet-travel/services/banner-home',
        resource_type: 'image',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'DELETE',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await closeServer(server);
  }
});

test('DELETE /api/uploads/cloudinary blocks customer tokens before reaching the service', async () => {
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
    const response = await request(server, `${apiPrefix}/uploads/cloudinary`, {
      body: JSON.stringify({
        public_id: 'net-viet-travel/services/banner-home',
        resource_type: 'image',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'DELETE',
    });

    assert.equal(response.statusCode, 403);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await closeServer(server);
  }
});

test('DELETE /api/uploads/cloudinary deletes an allowed asset for authenticated staff', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'staff',
    userId: 'staff-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'staff',
      userId: 'staff-1',
    });
  uploadDeleteService.deleteCloudinaryAsset = async (context) => {
    capturedContext = context;

    return {
      deleted: true,
      deleted_at: '2026-07-03T03:00:00.000Z',
      public_id: 'net-viet-travel/services/banner-home',
      resource_type: 'image',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/uploads/cloudinary`, {
      body: JSON.stringify({
        public_id: 'net-viet-travel/services/banner-home',
        resource_type: 'image',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'upload-delete-route-test',
      },
      method: 'DELETE',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Cloudinary asset deleted successfully',
    );
    assert.equal(response.body.data.deleted, true);
    assert.deepEqual(capturedContext.body, {
      public_id: 'net-viet-travel/services/banner-home',
      resource_type: 'image',
    });
    assert.equal(capturedContext.auth.userId, 'staff-1');
  } finally {
    await closeServer(server);
  }
});

test('DELETE /api/uploads/cloudinary surfaces validation and forbidden errors from the service', async () => {
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

  uploadDeleteService.deleteCloudinaryAsset = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'public_id',
          message: 'public_id is required',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const validationResponse = await request(
      server,
      `${apiPrefix}/uploads/cloudinary`,
      {
        body: JSON.stringify({
          resource_type: 'image',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
      },
    );

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationResponse.body.success, false);
    assert.equal(
      validationResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );

    uploadDeleteService.deleteCloudinaryAsset = async () => {
      throw new AppError('Forbidden', {
        code: API_ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      });
    };

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/uploads/cloudinary`,
      {
        body: JSON.stringify({
          public_id: 'net-viet-travel/services/banner-home',
          resource_type: 'image',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.success, false);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);
  } finally {
    await closeServer(server);
  }
});

test('DELETE /api/uploads/cloudinary returns 429 when the delete rate limit is exceeded', async () => {
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
  uploadDeleteService.deleteCloudinaryAsset = async () => ({
    deleted: true,
    deleted_at: '2026-07-03T03:00:00.000Z',
    public_id: 'net-viet-travel/services/banner-home',
    resource_type: 'image',
  });

  try {
    let lastResponse;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/uploads/cloudinary`, {
        body: JSON.stringify({
          public_id: 'net-viet-travel/services/banner-home',
          resource_type: 'image',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'DELETE',
      });
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    await closeServer(server);
  }
});
