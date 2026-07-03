const assert = require('node:assert/strict');
const test = require('node:test');

const AppError = require('../utils/AppError');
const {
  UPLOAD_CLOUDINARY_DELETE_FAILED_ACTION,
  UPLOAD_CLOUDINARY_DELETED_ACTION,
  createUploadDeleteService,
} = require('../services/uploadDeleteService');

const createAuthContext = ({
  roleCode = 'staff',
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

test('uploadDeleteService.deleteCloudinaryAsset deletes a scoped asset and logs safe metadata', async () => {
  const capturedLogs = [];
  let capturedDeletePayload;

  const service = createUploadDeleteService({
    deleteAsset: async (payload) => {
      capturedDeletePayload = payload;
      return {
        result: 'ok',
      };
    },
    now: () => new Date('2026-07-03T02:00:00.000Z'),
    repository: {
      findServiceImageByPublicId: async () => null,
      insertUserLog: async (payload) => {
        capturedLogs.push(payload);
      },
      listPermissionCodesByRoleId: async () => ['service.update'],
    },
    verifyAssetEnabled: false,
  });

  const result = await service.deleteCloudinaryAsset({
    auth: createAuthContext({
      roleCode: 'staff',
      userId: 'staff-1',
    }),
    body: {
      public_id: 'net-viet-travel/services/banner-home',
      resource_type: 'image',
    },
    ipAddress: '127.0.0.1',
    userAgent: 'upload-delete-service-test',
  });

  assert.deepEqual(capturedDeletePayload, {
    publicId: 'net-viet-travel/services/banner-home',
    resourceType: 'image',
  });
  assert.deepEqual(result, {
    deleted: true,
    deleted_at: '2026-07-03T02:00:00.000Z',
    public_id: 'net-viet-travel/services/banner-home',
    resource_type: 'image',
  });
  assert.equal(capturedLogs.length, 1);
  assert.deepEqual(capturedLogs[0], {
    action: UPLOAD_CLOUDINARY_DELETED_ACTION,
    entityName: 'uploads',
    ipAddress: '127.0.0.1',
    metadata: {
      deleted_at: '2026-07-03T02:00:00.000Z',
      public_id: 'net-viet-travel/services/banner-home',
      resource_type: 'image',
      role_code: 'staff',
    },
    userAgent: 'upload-delete-service-test',
    userId: 'staff-1',
  });
});

test('uploadDeleteService.deleteCloudinaryAsset rejects inactive users, customers, and invalid public_id input', async () => {
  const service = createUploadDeleteService({
    repository: {
      findServiceImageByPublicId: async () => null,
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => [],
    },
    verifyAssetEnabled: false,
  });

  await assert.rejects(
    service.deleteCloudinaryAsset({
      auth: createAuthContext({
        roleCode: 'customer',
      }),
      body: {
        public_id: 'net-viet-travel/services/banner-home',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );

  await assert.rejects(
    service.deleteCloudinaryAsset({
      auth: createAuthContext({
        status: 'locked',
      }),
      body: {
        public_id: 'net-viet-travel/services/banner-home',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );

  await assert.rejects(
    service.deleteCloudinaryAsset({
      auth: createAuthContext(),
      body: {
        public_id: '../services/banner-home',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );
});

test('uploadDeleteService.deleteCloudinaryAsset blocks deleting assets that are still referenced by service_images', async () => {
  const service = createUploadDeleteService({
    repository: {
      findServiceImageByPublicId: async () => ({
        cloudinary_public_id: 'net-viet-travel/services/banner-home',
        id: 'image-1',
        service_id: 'service-1',
      }),
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => ['service.update'],
    },
    verifyAssetEnabled: false,
  });

  await assert.rejects(
    service.deleteCloudinaryAsset({
      auth: createAuthContext({
        roleCode: 'staff',
      }),
      body: {
        public_id: 'net-viet-travel/services/banner-home',
        resource_type: 'image',
      },
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );
});

test('uploadDeleteService.deleteCloudinaryAsset logs failed deletion attempts and surfaces internal errors', async () => {
  const capturedLogs = [];

  const service = createUploadDeleteService({
    deleteAsset: async () => {
      throw new AppError('Cloudinary delete failed', {
        code: 'CLOUDINARY_DELETE_FAILED',
        statusCode: 502,
      });
    },
    repository: {
      findServiceImageByPublicId: async () => null,
      insertUserLog: async (payload) => {
        capturedLogs.push(payload);
      },
      listPermissionCodesByRoleId: async () => ['service.update'],
    },
    verifyAssetEnabled: false,
  });

  await assert.rejects(
    service.deleteCloudinaryAsset({
      auth: createAuthContext({
        roleCode: 'staff',
        userId: 'staff-1',
      }),
      body: {
        public_id: 'net-viet-travel/services/banner-home',
        resource_type: 'image',
      },
      ipAddress: '127.0.0.1',
      userAgent: 'upload-delete-service-test',
    }),
    (error) => {
      assert.equal(error.code, 'INTERNAL_ERROR');
      return true;
    },
  );

  assert.equal(capturedLogs.length, 1);
  assert.deepEqual(capturedLogs[0], {
    action: UPLOAD_CLOUDINARY_DELETE_FAILED_ACTION,
    entityName: 'uploads',
    ipAddress: '127.0.0.1',
    metadata: {
      error_code: 'CLOUDINARY_DELETE_FAILED',
      public_id: 'net-viet-travel/services/banner-home',
      resource_type: 'image',
      role_code: 'staff',
    },
    userAgent: 'upload-delete-service-test',
    userId: 'staff-1',
  });
});
