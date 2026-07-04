const assert = require('node:assert/strict');
const test = require('node:test');

const {
  UPLOAD_USAGE_VIEWED_ACTION,
  UPLOAD_USAGE_VIEW_FAILED_ACTION,
  createUploadUsageService,
  invalidateUploadUsageCache,
} = require('../services/uploadUsageService');

const createAuthContext = ({
  roleCode = 'admin',
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

test.beforeEach(() => {
  invalidateUploadUsageCache();
});

test.afterEach(() => {
  invalidateUploadUsageCache();
});

test('uploadUsageService.getUploadUsage returns normalized fresh usage, caches it, and logs safe metadata', async () => {
  const capturedLogs = [];
  let fetchCount = 0;

  const service = createUploadUsageService({
    fetchUsage: async () => {
      fetchCount += 1;

      return {
        asset_count: 12,
        bandwidth: {
          limit: 2048,
          usage: 1024,
        },
        resources_breakdown: {
          image: 6,
          raw: 1,
          video: 5,
        },
        storage: {
          limit: 4096,
          usage: 2048,
        },
      };
    },
    now: () => new Date('2026-07-03T03:30:00.000Z'),
    repository: {
      insertUserLog: async (payload) => {
        capturedLogs.push(payload);
      },
      listPermissionCodesByRoleId: async () => ['dashboard.read'],
    },
  });

  const freshResult = await service.getUploadUsage({
    auth: createAuthContext({
      roleCode: 'admin',
      userId: 'admin-1',
    }),
    body: {},
    ipAddress: '127.0.0.1',
    query: {},
    userAgent: 'upload-usage-service-test',
  });
  const cachedResult = await service.getUploadUsage({
    auth: createAuthContext({
      roleCode: 'admin',
      userId: 'admin-1',
    }),
    body: {},
    ipAddress: '127.0.0.1',
    query: {},
    userAgent: 'upload-usage-service-test',
  });

  assert.equal(fetchCount, 1);
  assert.deepEqual(freshResult, {
    asset_count: 12,
    bandwidth_usage: {
      limit_bytes: 2048,
      used_bytes: 1024,
    },
    cached: false,
    fetched_at: '2026-07-03T03:30:00.000Z',
    partial: false,
    provider: 'cloudinary',
    resource_breakdown: {
      image: 6,
      raw: 1,
      video: 5,
    },
    storage_usage: {
      limit_bytes: 4096,
      used_bytes: 2048,
    },
  });
  assert.deepEqual(cachedResult, {
    ...freshResult,
    cached: true,
  });
  assert.equal(capturedLogs.length, 2);
  assert.deepEqual(capturedLogs[0], {
    action: UPLOAD_USAGE_VIEWED_ACTION,
    entityName: 'uploads',
    ipAddress: '127.0.0.1',
    metadata: {
      cached: false,
      partial: false,
      provider: 'cloudinary',
      role_code: 'admin',
    },
    userAgent: 'upload-usage-service-test',
    userId: 'admin-1',
  });
  assert.deepEqual(capturedLogs[1], {
    action: UPLOAD_USAGE_VIEWED_ACTION,
    entityName: 'uploads',
    ipAddress: '127.0.0.1',
    metadata: {
      cached: true,
      partial: false,
      provider: 'cloudinary',
      role_code: 'admin',
    },
    userAgent: 'upload-usage-service-test',
    userId: 'admin-1',
  });
});

test('uploadUsageService.getUploadUsage rejects inactive users, staff, unsupported query, body, and missing permission', async () => {
  const service = createUploadUsageService({
    fetchUsage: async () => ({
      storage: {
        usage: 1,
      },
    }),
    repository: {
      insertUserLog: async () => {},
      listPermissionCodesByRoleId: async () => [],
    },
  });

  await assert.rejects(
    service.getUploadUsage({
      auth: createAuthContext({
        roleCode: 'staff',
      }),
      body: {},
      query: {},
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );

  await assert.rejects(
    service.getUploadUsage({
      auth: createAuthContext({
        status: 'locked',
      }),
      body: {},
      query: {},
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );

  await assert.rejects(
    service.getUploadUsage({
      auth: createAuthContext(),
      body: {
        unexpected: true,
      },
      query: {},
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );

  await assert.rejects(
    service.getUploadUsage({
      auth: createAuthContext(),
      body: {},
      query: {
        from: '2026-07-01',
      },
    }),
    (error) => {
      assert.equal(error.code, 'VALIDATION_ERROR');
      return true;
    },
  );

  await assert.rejects(
    service.getUploadUsage({
      auth: createAuthContext(),
      body: {},
      query: {},
    }),
    (error) => {
      assert.equal(error.code, 'FORBIDDEN');
      return true;
    },
  );
});

test('uploadUsageService.getUploadUsage normalizes partial provider data and logs failed provider calls safely', async () => {
  const successLogs = [];
  let shouldFail = false;

  const service = createUploadUsageService({
    fetchUsage: async () => {
      if (shouldFail) {
        throw new Error('provider-down');
      }

      return {
        bandwidth: {
          usage: 512,
        },
        storage: {
          usage: 1024,
        },
      };
    },
    now: () => new Date('2026-07-03T03:45:00.000Z'),
    repository: {
      insertUserLog: async (payload) => {
        successLogs.push(payload);
      },
      listPermissionCodesByRoleId: async () => ['dashboard.read'],
    },
    usageCacheTtlMs: 0,
  });

  const partialResult = await service.getUploadUsage({
    auth: createAuthContext({
      roleCode: 'system_admin',
      userId: 'sys-1',
    }),
    body: {},
    ipAddress: '127.0.0.1',
    query: {},
    userAgent: 'upload-usage-service-test',
  });

  assert.equal(partialResult.partial, true);
  assert.equal(partialResult.asset_count, null);
  assert.deepEqual(partialResult.resource_breakdown, {
    image: null,
    raw: null,
    video: null,
  });

  shouldFail = true;

  await assert.rejects(
    service.getUploadUsage({
      auth: createAuthContext({
        roleCode: 'system_admin',
        userId: 'sys-1',
      }),
      body: {},
      ipAddress: '127.0.0.1',
      query: {},
      userAgent: 'upload-usage-service-test',
    }),
    (error) => {
      assert.equal(error.code, 'INTERNAL_ERROR');
      return true;
    },
  );

  assert.deepEqual(successLogs[0], {
    action: UPLOAD_USAGE_VIEWED_ACTION,
    entityName: 'uploads',
    ipAddress: '127.0.0.1',
    metadata: {
      cached: false,
      partial: true,
      provider: 'cloudinary',
      role_code: 'system_admin',
    },
    userAgent: 'upload-usage-service-test',
    userId: 'sys-1',
  });
  assert.deepEqual(successLogs[1], {
    action: UPLOAD_USAGE_VIEW_FAILED_ACTION,
    entityName: 'uploads',
    ipAddress: '127.0.0.1',
    metadata: {
      error_code: 'INTERNAL_ERROR',
      provider: 'cloudinary',
      role_code: 'system_admin',
    },
    userAgent: 'upload-usage-service-test',
    userId: 'sys-1',
  });
});
