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
const uploadSignatureService = require('../services/uploadSignatureService');
const {
  UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY,
} = require('../routes/uploadRoutes');
const { createAccessToken } = require('../utils/sessionToken');
const AppError = require('../utils/AppError');

const originalResolveAuthenticatedUser = authService.resolveAuthenticatedUser;
const originalCreateSignature = uploadSignatureService.createSignature;

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
  clearRateLimitStore(UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  uploadSignatureService.createSignature = originalCreateSignature;
});

test.afterEach(() => {
  clearRateLimitStore(UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY);
  authService.resolveAuthenticatedUser = originalResolveAuthenticatedUser;
  uploadSignatureService.createSignature = originalCreateSignature;
});

test('POST /api/uploads/signature requires access token', async () => {
  const server = app.listen(0);

  try {
    const response = await request(server, `${apiPrefix}/uploads/signature`, {
      body: JSON.stringify({
        folder: 'avatar',
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

test('POST /api/uploads/signature returns signed upload payload for authenticated customer', async () => {
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
  uploadSignatureService.createSignature = async (context) => {
    capturedContext = context;

    return {
      api_key: 'cloud-key',
      cloud_name: 'demo-cloud',
      folder: 'net-viet-travel/avatars/customer-1',
      resource_type: 'image',
      signature: 'signed-value',
      timestamp: 1782997200,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/uploads/signature`, {
      body: JSON.stringify({
        folder: 'avatar',
        resource_type: 'image',
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'upload-signature-route-test',
      },
      method: 'POST',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.body.success, true);
    assert.equal(
      response.body.message,
      'Upload signature generated successfully',
    );
    assert.equal(response.body.data.signature, 'signed-value');
    assert.deepEqual(capturedContext.body, {
      folder: 'avatar',
      resource_type: 'image',
    });
    assert.equal(capturedContext.auth.userId, 'customer-1');
  } finally {
    await closeServer(server);
  }
});

test('POST /api/uploads/signature surfaces validation errors and forbidden scope', async () => {
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

  uploadSignatureService.createSignature = async () => {
    throw new AppError('Validation failed', {
      code: API_ERROR_CODES.VALIDATION_ERROR,
      details: [
        {
          field: 'resource_type',
          message: 'resource_type is required',
        },
      ],
      statusCode: 400,
    });
  };

  try {
    const validationResponse = await request(
      server,
      `${apiPrefix}/uploads/signature`,
      {
        body: JSON.stringify({
          folder: 'avatar',
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

    uploadSignatureService.createSignature = async () => {
      throw new AppError('Forbidden', {
        code: API_ERROR_CODES.FORBIDDEN,
        statusCode: 403,
      });
    };

    const forbiddenResponse = await request(
      server,
      `${apiPrefix}/uploads/signature`,
      {
        body: JSON.stringify({
          folder: 'services',
          resource_type: 'image',
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
  } finally {
    await closeServer(server);
  }
});

test('POST /api/uploads/signature passes through customer support upload requests', async () => {
  const server = app.listen(0);
  const accessToken = createAccessToken({
    roleCode: 'customer',
    userId: 'customer-88',
  });
  let capturedContext;

  authService.resolveAuthenticatedUser = async () =>
    createAuthContext({
      roleCode: 'customer',
      userId: 'customer-88',
    });
  uploadSignatureService.createSignature = async (context) => {
    capturedContext = context;

    return {
      api_key: 'cloud-key',
      cloud_name: 'demo-cloud',
      folder: 'net-viet-travel/support',
      resource_type: 'raw',
      signature: 'support-signed-value',
      timestamp: 1782997500,
    };
  };

  try {
    const response = await request(server, `${apiPrefix}/uploads/signature`, {
      body: JSON.stringify({
        folder: 'support',
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
    assert.equal(response.body.data.folder, 'net-viet-travel/support');
    assert.equal(response.body.data.resource_type, 'raw');
    assert.deepEqual(capturedContext.body, {
      folder: 'support',
      resource_type: 'raw',
    });
  } finally {
    await closeServer(server);
  }
});

test('POST /api/uploads/signature returns 429 when the signature rate limit is exceeded', async () => {
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
  uploadSignatureService.createSignature = async () => ({
    api_key: 'cloud-key',
    cloud_name: 'demo-cloud',
    folder: 'net-viet-travel/avatars/customer-1',
    resource_type: 'image',
    signature: 'signed-value',
    timestamp: 1782997200,
  });

  try {
    let lastResponse;

    for (let index = 0; index < 11; index += 1) {
      lastResponse = await request(server, `${apiPrefix}/uploads/signature`, {
        body: JSON.stringify({
          folder: 'avatar',
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
