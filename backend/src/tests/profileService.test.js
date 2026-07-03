const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  ACCOUNT_DEACTIVATION_REQUEST_ACTION,
  PROFILE_AVATAR_UPDATE_ACTION,
  PROFILE_CHANGE_PASSWORD_ACTION,
  PROFILE_UPDATE_ACTION,
  createProfileService,
  mapUserLogRow,
  maskSensitiveMetadata,
  normalizeAccountDeactivationPayload,
  normalizeLogsQuery,
} = require('../services/profileService');

test('getCurrentProfile returns safe profile data with role and permissions', async () => {
  let capturedParams;
  const service = createProfileService({
    queryImpl: async (sql, params = []) => {
      capturedParams = params;

      assert.match(sql, /FROM users u/);
      assert.match(sql, /JOIN roles r/);
      assert.match(sql, /LEFT JOIN role_permissions rp/);

      return {
        rowCount: 1,
        rows: [
          {
            avatar_url: 'https://cdn.example.com/avatar.jpg',
            created_at: new Date('2026-06-28T00:00:00.000Z'),
            deleted_at: null,
            email: 'customer@example.com',
            email_verified_at: new Date('2026-06-29T00:00:00.000Z'),
            full_name: 'Nguyen Van A',
            id: 'user-1',
            last_login_at: new Date('2026-06-30T00:00:00.000Z'),
            permissions: ['profile.read_self', 'booking.read_self'],
            phone: '0909000000',
            role_code: 'customer',
            role_name: 'Customer',
            status: 'active',
            updated_at: new Date('2026-06-30T01:00:00.000Z'),
          },
        ],
      };
    },
  });

  const profile = await service.getCurrentProfile({
    userId: 'user-1',
  });

  assert.deepEqual(capturedParams, ['user-1']);
  assert.deepEqual(profile, {
    avatar_url: 'https://cdn.example.com/avatar.jpg',
    created_at: '2026-06-28T00:00:00.000Z',
    email: 'customer@example.com',
    email_verified_at: '2026-06-29T00:00:00.000Z',
    full_name: 'Nguyen Van A',
    id: 'user-1',
    last_login_at: '2026-06-30T00:00:00.000Z',
    permissions: ['profile.read_self', 'booking.read_self'],
    phone: '0909000000',
    role: {
      code: 'customer',
      name: 'Customer',
    },
    status: 'active',
    updated_at: '2026-06-30T01:00:00.000Z',
  });
  assert.equal(Object.hasOwn(profile, 'password_hash'), false);
  assert.equal(Object.hasOwn(profile, 'deleted_at'), false);
  assert.equal(Object.hasOwn(profile, 'is_system_protected'), false);
});

test('getCurrentProfile returns 404 when user does not exist', async () => {
  const service = createProfileService({
    queryImpl: async () => ({
      rowCount: 0,
      rows: [],
    }),
  });

  await assert.rejects(
    () =>
      service.getCurrentProfile({
        userId: 'missing-user',
      }),
    (error) =>
      error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND &&
      error.statusCode === 404,
  );
});

test('getCurrentProfile returns 403 when current user is not active', async () => {
  const service = createProfileService({
    queryImpl: async () => ({
      rowCount: 1,
      rows: [
        {
          deleted_at: null,
          permissions: [],
          role_code: 'staff',
          role_name: 'Staff',
          status: 'locked',
        },
      ],
    }),
  });

  await assert.rejects(
    () =>
      service.getCurrentProfile({
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('getCurrentProfile returns 403 when current user was soft deleted', async () => {
  const service = createProfileService({
    queryImpl: async () => ({
      rowCount: 1,
      rows: [
        {
          deleted_at: new Date('2026-06-30T00:00:00.000Z'),
          permissions: [],
          role_code: 'admin',
          role_name: 'Admin',
          status: 'deleted',
        },
      ],
    }),
  });

  await assert.rejects(
    () =>
      service.getCurrentProfile({
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('normalizeLogsQuery applies defaults and validates bounds', () => {
  assert.deepEqual(normalizeLogsQuery({}), {
    limit: 20,
    page: 1,
  });
  assert.deepEqual(
    normalizeLogsQuery({
      limit: '100',
      page: '2',
    }),
    {
      limit: 100,
      page: 2,
    },
  );
  assert.throws(
    () =>
      normalizeLogsQuery({
        limit: '101',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'limit'),
  );
});

test('maskSensitiveMetadata redacts nested sensitive values', () => {
  assert.deepEqual(
    maskSensitiveMetadata({
      nested: {
        refresh_token: 'secret-token',
      },
      password_hash: 'hash-value',
      safe: 'value',
      tokens: [
        {
          token: 'abc',
        },
      ],
    }),
    {
      nested: {
        refresh_token: '[REDACTED]',
      },
      password_hash: '[REDACTED]',
      safe: 'value',
      tokens: [
        {
          token: '[REDACTED]',
        },
      ],
    },
  );
});

test('mapUserLogRow returns safe log payload', () => {
  assert.deepEqual(
    mapUserLogRow({
      action: 'auth.login_success',
      created_at: new Date('2026-07-01T10:00:00.000Z'),
      entity_id: 'user-1',
      entity_name: 'users',
      id: 'log-1',
      ip_address: '127.0.0.1',
      metadata: {
        refresh_token: 'sensitive',
        safe_flag: true,
      },
      user_agent: 'Mozilla/5.0',
    }),
    {
      action: 'auth.login_success',
      created_at: '2026-07-01T10:00:00.000Z',
      entity_id: 'user-1',
      entity_name: 'users',
      id: 'log-1',
      ip_address: '127.0.0.1',
      metadata: {
        refresh_token: '[REDACTED]',
        safe_flag: true,
      },
      user_agent: 'Mozilla/5.0',
    },
  );
});

test('getCurrentUserLogs returns current user logs with masked metadata and pagination meta', async () => {
  const capturedQueries = [];
  const service = createProfileService({
    queryImpl: async (sql, params = []) => {
      capturedQueries.push({
        params,
        sql,
      });

      if (sql.includes('FROM users') && sql.includes('WHERE id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              id: 'user-1',
              status: 'active',
            },
          ],
        };
      }

      if (sql.includes('COUNT(*)::integer AS total')) {
        return {
          rowCount: 1,
          rows: [
            {
              total: 3,
            },
          ],
        };
      }

      if (sql.includes('FROM user_logs') && sql.includes('ORDER BY created_at DESC')) {
        return {
          rowCount: 2,
          rows: [
            {
              action: 'auth.login_success',
              created_at: new Date('2026-07-01T10:00:00.000Z'),
              entity_id: 'user-1',
              entity_name: 'users',
              id: 'log-1',
              ip_address: '127.0.0.1',
              metadata: {
                refresh_token: 'secret-token',
                safe_flag: true,
              },
              user_agent: 'Browser 1',
            },
            {
              action: 'profile.update',
              created_at: new Date('2026-07-01T09:00:00.000Z'),
              entity_id: 'user-1',
              entity_name: 'users',
              id: 'log-2',
              ip_address: '127.0.0.2',
              metadata: {
                changed_fields: ['full_name'],
              },
              user_agent: 'Browser 2',
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  });

  const result = await service.getCurrentUserLogs({
    query: {
      limit: '2',
      page: '1',
    },
    userId: 'user-1',
  });

  assert.equal(capturedQueries.length, 3);
  assert.deepEqual(result.meta, {
    has_next: true,
    limit: 2,
    page: 1,
    total: 3,
    total_pages: 2,
  });
  assert.equal(result.data[0].metadata.refresh_token, '[REDACTED]');
  assert.equal(result.data[1].metadata.changed_fields[0], 'full_name');
});

test('getCurrentUserLogs rejects inactive current user before reading logs', async () => {
  let logQueryAttempts = 0;
  const service = createProfileService({
    queryImpl: async (sql) => {
      if (sql.includes('FROM users') && sql.includes('WHERE id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              id: 'user-1',
              status: 'locked',
            },
          ],
        };
      }

      if (sql.includes('FROM user_logs')) {
        logQueryAttempts += 1;
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  });

  await assert.rejects(
    () =>
      service.getCurrentUserLogs({
        query: {},
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );

  assert.equal(logQueryAttempts, 0);
});

test('normalizeAccountDeactivationPayload trims and validates reason', () => {
  assert.deepEqual(
    normalizeAccountDeactivationPayload({
      reason: '  Please deactivate my account  ',
    }),
    {
      reason: 'Please deactivate my account',
    },
  );
  assert.throws(
    () =>
      normalizeAccountDeactivationPayload({
        reason: '   ',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'reason'),
  );
});

test('requestAccountDeactivation writes request log without mutating user status', async () => {
  const fixedNow = new Date('2026-07-01T11:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              id: 'user-1',
              password_hash: 'stored-hash',
              status: 'active',
            },
          ],
        };
      }

      if (sql.includes('FROM user_logs') && sql.includes("metadata ->> 'request_status' = 'requested'")) {
        return {
          rowCount: 0,
          rows: [],
        };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.requestAccountDeactivation({
    ipAddress: '127.0.0.1',
    payload: {
      reason: '  I no longer need this account  ',
    },
    roleCode: 'customer',
    userAgent: 'profile-deactivation-service-test',
    userId: 'user-1',
  });

  const updateUserQueries = queries.filter((entry) =>
    entry.sql.includes('UPDATE users'),
  );
  const logQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const logMetadata = JSON.parse(logQuery.params[6]);

  assert.equal(updateUserQueries.length, 0);
  assert.equal(logQuery.params[1], ACCOUNT_DEACTIVATION_REQUEST_ACTION);
  assert.deepEqual(logMetadata, {
    reason: 'I no longer need this account',
    request_status: 'requested',
  });
  assert.deepEqual(result, {
    request_status: 'requested',
  });
});

test('requestAccountDeactivation rejects non-customer roles', async () => {
  const service = createProfileService();

  await assert.rejects(
    () =>
      service.requestAccountDeactivation({
        payload: {
          reason: 'Please deactivate',
        },
        roleCode: 'staff',
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('requestAccountDeactivation rejects duplicate pending requests', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  password_hash: 'stored-hash',
                  status: 'active',
                },
              ],
            };
          }

          if (
            sql.includes('FROM user_logs') &&
            sql.includes("metadata ->> 'request_status' = 'requested'")
          ) {
            return {
              rowCount: 1,
              rows: [
                {
                  id: 'log-1',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.requestAccountDeactivation({
        payload: {
          reason: 'Please deactivate',
        },
        roleCode: 'customer',
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.DUPLICATE_RESOURCE &&
      error.statusCode === 409,
  );
});

test('updateCurrentProfile updates full_name and phone, sets updated_at, and returns latest profile', async () => {
  const fixedNow = new Date('2026-06-30T02:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql === 'BEGIN' || sql === 'COMMIT') {
        return {
          rowCount: null,
          rows: [],
        };
      }

      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              full_name: 'Nguyen Van A',
              id: 'user-1',
              phone: '0909000000',
              status: 'active',
            },
          ],
        };
      }

      if (sql.includes('UPDATE users')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('FROM users u') && sql.includes('JOIN roles r')) {
        return {
          rowCount: 1,
          rows: [
            {
              avatar_url: 'https://cdn.example.com/avatar.jpg',
              created_at: new Date('2026-06-28T00:00:00.000Z'),
              deleted_at: null,
              email: 'customer@example.com',
              email_verified_at: new Date('2026-06-29T00:00:00.000Z'),
              full_name: 'Nguyen Van B',
              id: 'user-1',
              last_login_at: new Date('2026-06-30T00:00:00.000Z'),
              permissions: ['profile.read_self', 'profile.update_self'],
              phone: null,
              role_code: 'customer',
              role_name: 'Customer',
              status: 'active',
              updated_at: fixedNow,
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const profile = await service.updateCurrentProfile({
    ipAddress: '127.0.0.1',
    payload: {
      full_name: '  Nguyen Van B  ',
      phone: '   ',
    },
    userAgent: 'profile-update-service-test',
    userId: 'user-1',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));
  const logQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const logMetadata = JSON.parse(logQuery.params[6]);

  assert.ok(updateQuery);
  assert.equal(updateQuery.params[0], 'user-1');
  assert.equal(updateQuery.params[1], 'Nguyen Van B');
  assert.equal(updateQuery.params[2], null);
  assert.equal(updateQuery.params[3], fixedNow);
  assert.equal(logQuery.params[1], PROFILE_UPDATE_ACTION);
  assert.deepEqual(logMetadata, {
    changed_fields: ['full_name', 'phone'],
  });
  assert.deepEqual(profile, {
    avatar_url: 'https://cdn.example.com/avatar.jpg',
    created_at: '2026-06-28T00:00:00.000Z',
    email: 'customer@example.com',
    email_verified_at: '2026-06-29T00:00:00.000Z',
    full_name: 'Nguyen Van B',
    id: 'user-1',
    last_login_at: '2026-06-30T00:00:00.000Z',
    permissions: ['profile.read_self', 'profile.update_self'],
    phone: null,
    role: {
      code: 'customer',
      name: 'Customer',
    },
    status: 'active',
    updated_at: '2026-06-30T02:00:00.000Z',
  });
});

test('updateCurrentProfile rejects body without allowed fields', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {},
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.statusCode === 400,
  );
});

test('updateCurrentProfile rejects forbidden fields', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {
          email: 'new@example.com',
          full_name: 'Nguyen Van B',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'email' &&
          detail.message === 'email is not allowed in PATCH /me',
      ),
  );
});

test('updateCurrentProfile rejects empty full_name after trim', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {
          full_name: '   ',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'full_name' &&
          detail.message === 'full_name must not be empty',
      ),
  );
});

test('updateCurrentProfile rejects current user with non-active status', async () => {
  const client = {
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              id: 'user-1',
              status: 'suspended',
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    withTransactionImpl: async (callback) => callback(client),
  });

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {
          phone: '0909000000',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('updateCurrentProfile returns 404 before validating body when current user does not exist', async () => {
  let loadUserAttempts = 0;
  const client = {
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        loadUserAttempts += 1;
        return {
          rowCount: 0,
          rows: [],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    withTransactionImpl: async (callback) => callback(client),
  });

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {
          email: 'new@example.com',
        },
        userId: 'missing-user',
      }),
    (error) =>
      error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND &&
      error.statusCode === 404,
  );

  assert.equal(loadUserAttempts, 1);
});

test('updateCurrentProfile returns 403 before validating body when current user is not active', async () => {
  let updateAttempts = 0;
  const client = {
    query: async (sql) => {
      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              id: 'user-1',
              status: 'locked',
            },
          ],
        };
      }

      if (sql.includes('UPDATE users')) {
        updateAttempts += 1;
        return {
          rowCount: 1,
          rows: [],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    withTransactionImpl: async (callback) => callback(client),
  });

  await assert.rejects(
    () =>
      service.updateCurrentProfile({
        payload: {
          avatar_url: 'https://cdn.example.com/avatar.jpg',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );

  assert.equal(updateAttempts, 0);
});

test('updateCurrentAvatar updates avatar_url, sets updated_at, and returns latest profile', async () => {
  const fixedNow = new Date('2026-06-30T03:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [
            {
              avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/old-avatar.jpg',
              deleted_at: null,
              id: 'user-1',
              status: 'active',
            },
          ],
        };
      }

      if (sql.includes('UPDATE users')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('FROM users u') && sql.includes('JOIN roles r')) {
        return {
          rowCount: 1,
          rows: [
            {
              avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/new-avatar.jpg',
              created_at: new Date('2026-06-28T00:00:00.000Z'),
              deleted_at: null,
              email: 'customer@example.com',
              email_verified_at: new Date('2026-06-29T00:00:00.000Z'),
              full_name: 'Nguyen Van A',
              id: 'user-1',
              last_login_at: new Date('2026-06-30T00:00:00.000Z'),
              permissions: ['profile.read_self', 'profile.update_self'],
              phone: '0909000000',
              role_code: 'customer',
              role_name: 'Customer',
              status: 'active',
              updated_at: fixedNow,
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const profile = await service.updateCurrentAvatar({
    ipAddress: '127.0.0.1',
    payload: {
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/new-avatar.jpg',
    },
    userAgent: 'profile-avatar-service-test',
    userId: 'user-1',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));
  const logQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const logMetadata = JSON.parse(logQuery.params[6]);

  assert.ok(updateQuery);
  assert.equal(updateQuery.params[0], 'user-1');
  assert.equal(
    updateQuery.params[1],
    'https://res.cloudinary.com/demo/image/upload/v1/new-avatar.jpg',
  );
  assert.equal(updateQuery.params[2], fixedNow);
  assert.equal(logQuery.params[1], PROFILE_AVATAR_UPDATE_ACTION);
  assert.deepEqual(logMetadata, {
    avatar_changed: true,
  });
  assert.deepEqual(profile, {
    avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/new-avatar.jpg',
    created_at: '2026-06-28T00:00:00.000Z',
    email: 'customer@example.com',
    email_verified_at: '2026-06-29T00:00:00.000Z',
    full_name: 'Nguyen Van A',
    id: 'user-1',
    last_login_at: '2026-06-30T00:00:00.000Z',
    permissions: ['profile.read_self', 'profile.update_self'],
    phone: '0909000000',
    role: {
      code: 'customer',
      name: 'Customer',
    },
    status: 'active',
    updated_at: '2026-06-30T03:00:00.000Z',
  });
});

test('updateCurrentAvatar rejects missing avatar_url after current user is loaded', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentAvatar({
        payload: {},
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'avatar_url' &&
          detail.message === 'avatar_url is required',
      ),
  );
});

test('updateCurrentAvatar rejects non-cloudinary avatar_url', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentAvatar({
        payload: {
          avatar_url: 'https://example.com/avatar.jpg',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'avatar_url' &&
          detail.message === 'avatar_url must be a valid Cloudinary delivery URL',
      ),
  );
});

test('updateCurrentAvatar rejects forbidden fields', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentAvatar({
        payload: {
          avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/new-avatar.jpg',
          phone: '0909000000',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'phone' &&
          detail.message === 'phone is not allowed in PATCH /me/avatar',
      ),
  );
});

test('updateCurrentAvatar returns 404 before validating body when current user does not exist', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 0,
              rows: [],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentAvatar({
        payload: {
          avatar_url: 'https://example.com/avatar.jpg',
        },
        userId: 'missing-user',
      }),
    (error) =>
      error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND &&
      error.statusCode === 404,
  );
});

test('updateCurrentAvatar returns 403 before validating body when current user is not active', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  status: 'locked',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentAvatar({
        payload: {
          avatar_url: 'https://example.com/avatar.jpg',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('updateCurrentPassword updates password hash, sets updated_at, and returns latest profile', async () => {
  const fixedNow = new Date('2026-06-30T04:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
        return {
          rowCount: 1,
          rows: [
            {
              deleted_at: null,
              id: 'user-1',
              password_hash: 'stored-password-hash',
              status: 'active',
            },
          ],
        };
      }

      if (sql.includes('UPDATE users')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('FROM users u') && sql.includes('JOIN roles r')) {
        return {
          rowCount: 1,
          rows: [
            {
              avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
              created_at: new Date('2026-06-28T00:00:00.000Z'),
              deleted_at: null,
              email: 'customer@example.com',
              email_verified_at: new Date('2026-06-29T00:00:00.000Z'),
              full_name: 'Nguyen Van A',
              id: 'user-1',
              last_login_at: new Date('2026-06-30T00:00:00.000Z'),
              permissions: ['profile.read_self', 'profile.change_password'],
              phone: '0909000000',
              role_code: 'customer',
              role_name: 'Customer',
              status: 'active',
              updated_at: fixedNow,
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createProfileService({
    bcryptCompareImpl: async (plainTextPassword, hashedPassword) => {
      assert.equal(plainTextPassword, 'OldPassword123');
      assert.equal(hashedPassword, 'stored-password-hash');
      return true;
    },
    bcryptHashImpl: async (plainTextPassword, saltRounds) => {
      assert.equal(plainTextPassword, 'NewPassword123');
      assert.equal(saltRounds, 10);
      return 'new-password-hash';
    },
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const profile = await service.updateCurrentPassword({
    ipAddress: '127.0.0.1',
    payload: {
      current_password: 'OldPassword123',
      new_password: 'NewPassword123',
    },
    userAgent: 'profile-password-service-test',
    userId: 'user-1',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));
  const logQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const logMetadata = JSON.parse(logQuery.params[6]);

  assert.ok(updateQuery);
  assert.equal(updateQuery.params[0], 'user-1');
  assert.equal(updateQuery.params[1], 'new-password-hash');
  assert.equal(updateQuery.params[2], fixedNow);
  assert.equal(logQuery.params[1], PROFILE_CHANGE_PASSWORD_ACTION);
  assert.deepEqual(logMetadata, {
    password_changed: true,
    sessions_revoked: false,
  });
  assert.equal(Object.hasOwn(logMetadata, 'current_password'), false);
  assert.equal(Object.hasOwn(logMetadata, 'new_password'), false);
  assert.equal(Object.hasOwn(logMetadata, 'password_hash'), false);
  assert.deepEqual(profile, {
    avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
    created_at: '2026-06-28T00:00:00.000Z',
    email: 'customer@example.com',
    email_verified_at: '2026-06-29T00:00:00.000Z',
    full_name: 'Nguyen Van A',
    id: 'user-1',
    last_login_at: '2026-06-30T00:00:00.000Z',
    permissions: ['profile.read_self', 'profile.change_password'],
    phone: '0909000000',
    role: {
      code: 'customer',
      name: 'Customer',
    },
    status: 'active',
    updated_at: '2026-06-30T04:00:00.000Z',
  });
});

test('updateCurrentPassword rejects missing current_password after current user is loaded', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  password_hash: 'stored-password-hash',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentPassword({
        payload: {
          new_password: 'NewPassword123',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'current_password' &&
          detail.message === 'current_password is required',
      ),
  );
});

test('updateCurrentPassword rejects incorrect current_password', async () => {
  const service = createProfileService({
    bcryptCompareImpl: async () => false,
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  password_hash: 'stored-password-hash',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentPassword({
        payload: {
          current_password: 'WrongPassword123',
          new_password: 'NewPassword123',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.AUTH_INVALID_CREDENTIALS &&
      error.statusCode === 401,
  );
});

test('updateCurrentPassword rejects weak new_password and same-as-current password', async () => {
  const service = createProfileService({
    bcryptCompareImpl: async () => true,
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  password_hash: 'stored-password-hash',
                  status: 'active',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentPassword({
        payload: {
          current_password: 'Weakpass',
          new_password: 'Weakpass',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some(
        (detail) =>
          detail.field === 'new_password' &&
          detail.message === 'new_password must be different from current_password',
      ),
  );
});

test('updateCurrentPassword returns 404 before validating body when current user does not exist', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 0,
              rows: [],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentPassword({
        payload: {
          new_password: 'short',
        },
        userId: 'missing-user',
      }),
    (error) =>
      error.code === API_ERROR_CODES.RESOURCE_NOT_FOUND &&
      error.statusCode === 404,
  );
});

test('updateCurrentPassword returns 403 before validating body when current user is not active', async () => {
  const service = createProfileService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('SELECT') && sql.includes('FROM users') && sql.includes('FOR UPDATE')) {
            return {
              rowCount: 1,
              rows: [
                {
                  deleted_at: null,
                  id: 'user-1',
                  password_hash: 'stored-password-hash',
                  status: 'locked',
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.updateCurrentPassword({
        payload: {
          current_password: 'OldPassword123',
          new_password: 'weak',
        },
        userId: 'user-1',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});
