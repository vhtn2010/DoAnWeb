const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SHORT_LIVED_SIGNATURE_TTL_SECONDS,
  UPLOAD_SIGNATURE_REQUESTED_ACTION,
  createUploadSignatureService,
} = require('../services/uploadSignatureService');
const { buildCloudinarySignature } = require('../utils/cloudinary');

const createAuthContext = ({
  roleCode = 'customer',
  status = 'active',
  userId = 'user-1',
} = {}) => ({
  roleCode,
  user: {
    id: userId,
    role_id: 'role-1',
    status,
  },
  userId,
});

test('uploadSignatureService.createSignature returns a signed Cloudinary payload and logs safe metadata', async () => {
  let capturedLogPayload;

  const service = createUploadSignatureService({
    cloudinaryConfig: {
      apiKey: 'cloud-key',
      apiSecret: 'super-secret',
      cloudName: 'demo-cloud',
      folder: 'net-viet-travel',
    },
    now: () => new Date('2026-07-02T13:00:00.000Z'),
    repository: {
      insertUserLog: async (payload) => {
        capturedLogPayload = payload;
      },
      listPermissionCodesByRoleId: async () => [],
    },
  });

  const result = await service.createSignature({
    auth: createAuthContext({
      roleCode: 'customer',
      userId: 'customer-1',
    }),
    body: {
      folder: 'avatar',
      resource_type: 'image',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'upload-signature-service-test',
  });

  const expectedTimestamp = Math.floor(
    new Date('2026-07-02T13:00:00.000Z').getTime() / 1000,
  );
  const expectedFolder = 'net-viet-travel/avatars/customer-1';

  assert.deepEqual(result, {
    api_key: 'cloud-key',
    cloud_name: 'demo-cloud',
    folder: expectedFolder,
    resource_type: 'image',
    signature: buildCloudinarySignature(
      {
        folder: expectedFolder,
        timestamp: expectedTimestamp,
      },
      'super-secret',
    ),
    timestamp: expectedTimestamp,
  });
  assert.deepEqual(capturedLogPayload, {
    action: UPLOAD_SIGNATURE_REQUESTED_ACTION,
    entityName: 'uploads',
    ipAddress: '127.0.0.1',
    metadata: {
      folder: 'avatar',
      resource_type: 'image',
      role_code: 'customer',
      target_folder: expectedFolder,
      ttl_seconds: SHORT_LIVED_SIGNATURE_TTL_SECONDS,
    },
    userAgent: 'upload-signature-service-test',
    userId: 'customer-1',
  });
});

test('uploadSignatureService.createSignature rejects inactive users and forbidden folders', async () => {
  const service = createUploadSignatureService({
    repository: {
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => [],
    },
  });

  await assert.rejects(
    service.createSignature({
      auth: createAuthContext({
        status: 'locked',
      }),
      body: {
        folder: 'avatar',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );

  await assert.rejects(
    service.createSignature({
      auth: createAuthContext(),
      body: {
        folder: '../reports',
        resource_type: 'raw',
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );
});

test('uploadSignatureService.createSignature blocks customer access to admin folders and invalid resource types', async () => {
  const service = createUploadSignatureService({
    repository: {
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => [],
    },
  });

  await assert.rejects(
    service.createSignature({
      auth: createAuthContext({
        roleCode: 'customer',
        userId: 'customer-1',
      }),
      body: {
        folder: 'services',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );

  await assert.rejects(
    service.createSignature({
      auth: createAuthContext({
        roleCode: 'customer',
      }),
      body: {
        folder: 'avatar',
        resource_type: 'video',
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );
});

test('uploadSignatureService.createSignature requires valid Cloudinary config and role-based permissions for report folders', async () => {
  const misconfiguredService = createUploadSignatureService({
    cloudinaryConfig: {
      apiKey: null,
      apiSecret: null,
      cloudName: null,
      folder: 'net-viet-travel',
    },
    repository: {
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => ['report.read'],
    },
  });

  await assert.rejects(
    misconfiguredService.createSignature({
      auth: createAuthContext({
        roleCode: 'admin',
      }),
      body: {
        folder: 'reports',
        resource_type: 'raw',
      },
    }),
    (error) => {
      assert.equal(error.code, 'INTERNAL_ERROR');
      return true;
    },
  );

  const forbiddenService = createUploadSignatureService({
    cloudinaryConfig: {
      apiKey: 'cloud-key',
      apiSecret: 'super-secret',
      cloudName: 'demo-cloud',
      folder: 'net-viet-travel',
    },
    repository: {
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => [],
    },
  });

  await assert.rejects(
    forbiddenService.createSignature({
      auth: createAuthContext({
        roleCode: 'staff',
      }),
      body: {
        folder: 'reports',
        resource_type: 'raw',
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );
});
