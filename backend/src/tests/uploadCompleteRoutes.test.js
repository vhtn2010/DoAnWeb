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
const uploadCompleteService = require('../services/uploadCompleteService');
const {
  UPLOAD_COMPLETE_RATE_LIMIT_STORE_KEY,
} = require('../routes/uploadRoutes');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalCompleteUpload = uploadCompleteService.completeUpload;

const createAuthContext = ({
  roleCode = 'customer',
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
  clearRateLimitStore(UPLOAD_COMPLETE_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  uploadCompleteService.completeUpload = originalCompleteUpload;
});

test.afterEach(() => {
  clearRateLimitStore(UPLOAD_COMPLETE_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  uploadCompleteService.completeUpload = originalCompleteUpload;
});

test('POST /api/uploads/complete requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/uploads/complete`, {
      body: JSON.stringify({
        asset_url:
          'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
        public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
        purpose: 'avatar',
        resource_type: 'image',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 401);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, API_ERROR_CODES.AUTH_TOKEN_EXPIRED);
  } finally {
    await closeServer(server);
  }
});

test('POST /api/uploads/complete returns normalized asset payload for authenticated customer', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'customer-1',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'customer-1',
    });
  uploadCompleteService.completeUpload = async (context) => {
    capturedContext = context;

    return {
      asset_url:
        'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
      public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
      purpose: 'avatar',
      resource_type: 'image',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/uploads/complete`, {
      body: JSON.stringify({
        asset_url:
          'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
        public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
        purpose: 'avatar',
        resource_type: 'image',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'upload-complete-route-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.message, 'Upload completed successfully');
    assert.equal(response.body.data.public_id, 'net-viet-travel/avatars/customer-1/profile-avatar');
    assert.deepEqual(capturedContext.body, {
      asset_url:
        'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
      public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
      purpose: 'avatar',
      resource_type: 'image',
    });
    assert.equal(capturedContext.auth.userId, 'customer-1');
  } finally {
    await closeServer(server);
  }
});

test('POST /api/uploads/complete surfaces validation, forbidden, and duplicate errors', async () => {
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

  uploadCompleteService.completeUpload = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'asset_url',
          message: 'asset_url is required',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const validationResponse = await request(
      server,
      `${apiPrefix}/uploads/complete`,
      {
        body: JSON.stringify({
          public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
          purpose: 'avatar',
          resource_type: 'image',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(validationResponse.statusCode, 400);
    assert.equal(validationResponse.body.success, false);
    assert.equal(
      validationResponse.body.error.code,
      API_ERROR_CODES.VALIDATION_ERROR,
    );

    uploadCompleteService.completeUpload = async () => {
      throw new AppError('Forbidden', {
        code: API_ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      });
    };

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/uploads/complete`,
      {
        body: JSON.stringify({
          asset_url:
            'https://res.cloudinary.com/demo-cloud/raw/upload/v1783000000/net-viet-travel/reports/monthly-report.pdf',
          public_id: 'net-viet-travel/reports/monthly-report.pdf',
          purpose: 'report_file',
          resource_type: 'raw',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(forbiddenResponse.statusCode, 403);
    assert.equal(forbiddenResponse.body.success, false);
    assert.equal(forbiddenResponse.body.error.code, API_ERROR_CODES.FORBIDDEN);

    uploadCompleteService.completeUpload = async () => {
      throw new AppError('Duplicate', {
        code: API_ERROR_CODES.DUPLICATE_RESOURCE,
        statusCode: 409,
      });
    };

    const duplicateResponse = await request(
      server,
      `${apiPrefix}/uploads/complete`,
      {
        body: JSON.stringify({
          asset_url:
            'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/payments/customer-2/proof.jpg',
          public_id: 'net-viet-travel/payments/customer-2/proof',
          purpose: 'payment_proof',
          resource_type: 'image',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      },
    );

    assert.equal(duplicateResponse.statusCode, 409);
    assert.equal(duplicateResponse.body.success, false);
    assert.equal(
      duplicateResponse.body.error.code,
      API_ERROR_CODES.DUPLICATE_RESOURCE,
    );
  } finally {
    await closeServer(server);
  }
});

test('POST /api/uploads/complete passes through customer support reply file uploads', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'customer-77',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'customer-77',
    });
  uploadCompleteService.completeUpload = async (context) => {
    capturedContext = context;

    return {
      asset_url:
        'https://res.cloudinary.com/demo-cloud/raw/upload/v1783000900/net-viet-travel/support/support-note.pdf',
      public_id: 'net-viet-travel/support/support-note.pdf',
      purpose: 'support_reply',
      resource_type: 'raw',
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/uploads/complete`, {
      body: JSON.stringify({
        asset_url:
          'https://res.cloudinary.com/demo-cloud/raw/upload/v1783000900/net-viet-travel/support/support-note.pdf',
        public_id: 'net-viet-travel/support/support-note.pdf',
        purpose: 'support_reply',
        resource_type: 'raw',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.data.purpose, 'support_reply');
    assert.equal(response.body.data.resource_type, 'raw');
    assert.deepEqual(capturedContext.body, {
      asset_url:
        'https://res.cloudinary.com/demo-cloud/raw/upload/v1783000900/net-viet-travel/support/support-note.pdf',
      public_id: 'net-viet-travel/support/support-note.pdf',
      purpose: 'support_reply',
      resource_type: 'raw',
    });
  } finally {
    await closeServer(server);
  }
});

test('POST /api/uploads/complete returns 429 when the complete rate limit is exceeded', async () => {
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
  uploadCompleteService.completeUpload = async () => ({
    asset_url:
      'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
    public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
    purpose: 'avatar',
    resource_type: 'image',
  });

  try {
    let lastResponse;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/uploads/complete`, {
        body: JSON.stringify({
          asset_url:
            'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
          public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
          purpose: 'avatar',
          resource_type: 'image',
        }),
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        method: 'POST',
      });
    }

    assert.equal(lastResponse.statusCode, 429);
    assert.equal(lastResponse.body.success, false);
    assert.equal(lastResponse.body.error.code, API_ERROR_CODES.RATE_LIMITED);
  } finally {
    await closeServer(server);
  }
});
