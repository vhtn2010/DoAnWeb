const assert = require('node:assert/strict');
const test = require('node:test');

const {
  UPLOAD_COMPLETE_ACTION,
  createUploadCompleteService,
} = require('../services/uploadCompleteService');

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

test('uploadCompleteService.completeUpload validates and logs a customer avatar upload', async () => {
  let capturedLogPayload;

  const service = createUploadCompleteService({
    cloudinaryConfig: {
      apiKey: 'cloud-key',
      apiSecret: 'super-secret',
      cloudName: 'demo-cloud',
      folder: 'net-viet-travel',
      requestTimeoutMs: 20000,
    },
    now: () => new Date('2026-07-03T04:00:00.000Z'),
    repository: {
      findLatestUploadLogByPublicId: async () => null,
      insertUserLog: async (payload) => {
        capturedLogPayload = payload;
      },
      listPermissionCodesByRoleId: async () => [],
    },
    verifyAssetEnabled: false,
  });

  const result = await service.completeUpload({
    auth: createAuthContext({
      roleCode: 'customer',
      userId: 'customer-1',
    }),
    body: {
      asset_url:
        'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
      public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
      purpose: 'avatar',
      resource_type: 'image',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'upload-complete-service-test',
  });

  assert.deepEqual(result, {
    asset_url:
      'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
    public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
    purpose: 'avatar',
    resource_type: 'image',
  });
  assert.deepEqual(capturedLogPayload, {
    action: UPLOAD_COMPLETE_ACTION,
    entityName: 'uploads',
    ipAddress: '127.0.0.1',
    metadata: {
      asset_url:
        'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
      public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
      purpose: 'avatar',
      resource_type: 'image',
      role_code: 'customer',
      uploaded_at: '2026-07-03T04:00:00.000Z',
    },
    userAgent: 'upload-complete-service-test',
    userId: 'customer-1',
  });
});

test('uploadCompleteService.completeUpload returns idempotent success when the same user completes the same public_id and purpose again', async () => {
  const service = createUploadCompleteService({
    cloudinaryConfig: {
      apiKey: 'cloud-key',
      apiSecret: 'super-secret',
      cloudName: 'demo-cloud',
      folder: 'net-viet-travel',
      requestTimeoutMs: 20000,
    },
    repository: {
      findLatestUploadLogByPublicId: async () => ({
        action: UPLOAD_COMPLETE_ACTION,
        created_at: '2026-07-03T04:00:00.000Z',
        id: 'log-1',
        metadata: {
          asset_url:
            'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
          public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
          purpose: 'avatar',
          resource_type: 'image',
        },
        user_id: 'customer-1',
      }),
      insertUserLog: async () => {
        throw new Error('should-not-log-twice');
      },
      listPermissionCodesByRoleId: async () => [],
    },
    verifyAssetEnabled: false,
  });

  const result = await service.completeUpload({
    auth: createAuthContext({
      roleCode: 'customer',
      userId: 'customer-1',
    }),
    body: {
      asset_url:
        'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
      public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
      purpose: 'avatar',
      resource_type: 'image',
    },
  });

  assert.deepEqual(result, {
    asset_url:
      'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/avatars/customer-1/profile-avatar.jpg',
    public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
    purpose: 'avatar',
    resource_type: 'image',
  });
});

test('uploadCompleteService.completeUpload rejects invalid url, forbidden purpose scope, and duplicate public_id across contexts', async () => {
  const baseRepository = {
    findLatestUploadLogByPublicId: async () => null,
    insertUserLog: async () => {},
    listPermissionCodesByRoleId: async () => ['service.update'],
  };

  const service = createUploadCompleteService({
    cloudinaryConfig: {
      apiKey: 'cloud-key',
      apiSecret: 'super-secret',
      cloudName: 'demo-cloud',
      folder: 'net-viet-travel',
      requestTimeoutMs: 20000,
    },
    repository: baseRepository,
    verifyAssetEnabled: false,
  });

  await assert.rejects(
    service.completeUpload({
      auth: createAuthContext({
        roleCode: 'customer',
        userId: 'customer-1',
      }),
      body: {
        asset_url: 'https://example.com/avatar.jpg',
        public_id: 'net-viet-travel/avatars/customer-1/profile-avatar',
        purpose: 'avatar',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );

  await assert.rejects(
    service.completeUpload({
      auth: createAuthContext({
        roleCode: 'customer',
        userId: 'customer-1',
      }),
      body: {
        asset_url:
          'https://res.cloudinary.com/demo-cloud/raw/upload/v1783000000/net-viet-travel/reports/monthly-report.pdf',
        public_id: 'net-viet-travel/reports/monthly-report.pdf',
        purpose: 'report_file',
        resource_type: 'raw',
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );

  const duplicateService = createUploadCompleteService({
    cloudinaryConfig: {
      apiKey: 'cloud-key',
      apiSecret: 'super-secret',
      cloudName: 'demo-cloud',
      folder: 'net-viet-travel',
      requestTimeoutMs: 20000,
    },
    repository: {
      ...baseRepository,
      findLatestUploadLogByPublicId: async () => ({
        action: UPLOAD_COMPLETE_ACTION,
        created_at: '2026-07-03T04:00:00.000Z',
        id: 'log-2',
        metadata: {
          asset_url:
            'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/services/service-hero.jpg',
          public_id: 'net-viet-travel/services/service-hero',
          purpose: 'service_image',
          resource_type: 'image',
        },
        user_id: 'admin-2',
      }),
    },
    verifyAssetEnabled: false,
  });

  await assert.rejects(
    duplicateService.completeUpload({
      auth: createAuthContext({
        roleCode: 'staff',
        userId: 'staff-1',
      }),
      body: {
        asset_url:
          'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/services/service-hero.jpg',
        public_id: 'net-viet-travel/services/service-hero',
        purpose: 'service_image',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'DUPLICATE_RESOURCE');
      return true;
    },
  );
});

test('uploadCompleteService.completeUpload can verify Cloudinary asset existence and returns RESOURCE_NOT_FOUND when missing', async () => {
  const service = createUploadCompleteService({
    cloudinaryConfig: {
      apiKey: 'cloud-key',
      apiSecret: 'super-secret',
      cloudName: 'demo-cloud',
      folder: 'net-viet-travel',
      requestTimeoutMs: 20000,
    },
    repository: {
      findLatestUploadLogByPublicId: async () => null,
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => ['service.update'],
    },
    verifyAssetEnabled: true,
    verifyAssetExists: async () => false,
  });

  await assert.rejects(
    service.completeUpload({
      auth: createAuthContext({
        roleCode: 'staff',
        userId: 'staff-1',
      }),
      body: {
        asset_url:
          'https://res.cloudinary.com/demo-cloud/image/upload/v1783000000/net-viet-travel/services/service-banner.jpg',
        public_id: 'net-viet-travel/services/service-banner',
        purpose: 'service_image',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'RESOURCE_NOT_FOUND');
      return true;
    },
  );
});

test('uploadCompleteService.completeUpload allows customer support reply uploads for raw files', async () => {
  const service = createUploadCompleteService({
    cloudinaryConfig: {
      apiKey: 'cloud-key',
      apiSecret: 'super-secret',
      cloudName: 'demo-cloud',
      folder: 'net-viet-travel',
      requestTimeoutMs: 20000,
    },
    repository: {
      findLatestUploadLogByPublicId: async () => null,
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => [],
    },
    verifyAssetEnabled: false,
  });

  const result = await service.completeUpload({
    auth: createAuthContext({
      roleCode: 'customer',
      userId: 'customer-1',
    }),
    body: {
      asset_url:
        'https://res.cloudinary.com/demo-cloud/raw/upload/v1783000600/net-viet-travel/support/booking-change-request.pdf',
      public_id: 'net-viet-travel/support/booking-change-request.pdf',
      purpose: 'support_reply',
      resource_type: 'raw',
    },
  });

  assert.deepEqual(result, {
    asset_url:
      'https://res.cloudinary.com/demo-cloud/raw/upload/v1783000600/net-viet-travel/support/booking-change-request.pdf',
    public_id: 'net-viet-travel/support/booking-change-request.pdf',
    purpose: 'support_reply',
    resource_type: 'raw',
  });
});
