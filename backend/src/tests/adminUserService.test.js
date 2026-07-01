const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE,
  ADMIN_USER_CHANGE_STATUS_ACTION,
  ADMIN_USER_CREATE_ACTION,
  ADMIN_USER_RESEND_VERIFICATION_ACTION,
  ADMIN_USER_SOFT_DELETE_ACTION,
  ADMIN_USER_UPDATE_PROFILE_ACTION,
  ADMIN_USER_VERIFY_EMAIL_TEMPLATE_CODE,
  createAdminUserService,
  normalizeListUsersQuery,
  normalizeCreateUserPayload,
  normalizeDeleteUserPayload,
  normalizePagination,
  normalizeStatusChangePayload,
  normalizeUpdateUserPayload,
  normalizeUserId,
} = require('../services/adminUserService');

test('normalizePagination applies defaults and validates bounds', () => {
  assert.deepEqual(normalizePagination({}), {
    limit: 20,
    page: 1,
  });
  assert.deepEqual(
    normalizePagination({
      limit: '100',
      page: '2',
    }),
    {
      limit: 100,
      page: 2,
    },
  );
  assert.throws(
    () => normalizePagination({ page: '0' }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'page'),
  );
});

test('normalizeUserId validates UUID format', () => {
  assert.equal(
    normalizeUserId('11111111-1111-4111-8111-111111111111'),
    '11111111-1111-4111-8111-111111111111',
  );
  assert.throws(
    () => normalizeUserId('not-a-uuid'),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'user_id'),
  );
});

test('normalizeListUsersQuery validates status and role format', () => {
  assert.deepEqual(
    normalizeListUsersQuery({
      limit: '10',
      page: '3',
      q: '  staff  ',
      role: 'staff',
      status: 'active',
    }),
    {
      limit: 10,
      page: 3,
      q: 'staff',
      roleCode: 'staff',
      status: 'active',
    },
  );
  assert.throws(
    () => normalizeListUsersQuery({ status: 'invalid-status' }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'status'),
  );
});

test('normalizeCreateUserPayload trims fields and validates body', () => {
  assert.deepEqual(
    normalizeCreateUserPayload({
      email: '  STAFF@Example.com ',
      full_name: '  Staff User  ',
      password: 'Password123',
      phone: ' 0909000000 ',
      role_code: 'staff',
    }),
    {
      email: 'staff@example.com',
      fullName: 'Staff User',
      password: 'Password123',
      phone: '0909000000',
      roleCode: 'staff',
    },
  );
  assert.throws(
    () =>
      normalizeCreateUserPayload({
        email: 'invalid',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'email'),
  );
});

test('normalizeUpdateUserPayload validates allowed fields and cloudinary avatar_url', () => {
  assert.deepEqual(
    normalizeUpdateUserPayload({
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      full_name: 'Updated Name',
      phone: '0909000000',
    }),
    {
      avatarUrl: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      changedFields: ['full_name', 'phone', 'avatar_url'],
      fullName: 'Updated Name',
      hasAvatarUrl: true,
      hasFullName: true,
      hasPhone: true,
      phone: '0909000000',
    },
  );
  assert.throws(
    () =>
      normalizeUpdateUserPayload({
        email: 'forbidden@example.com',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'email'),
  );
});

test('normalizeStatusChangePayload validates status enum and required reason', () => {
  assert.deepEqual(
    normalizeStatusChangePayload({
      reason: 'Repeated abuse',
      status: 'locked',
    }),
    {
      reason: 'Repeated abuse',
      status: 'locked',
    },
  );
  assert.throws(
    () =>
      normalizeStatusChangePayload({
        status: 'pending_verification',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'status'),
  );
});

test('normalizeDeleteUserPayload requires reason', () => {
  assert.deepEqual(
    normalizeDeleteUserPayload({
      reason: ' Left the company ',
    }),
    {
      reason: 'Left the company',
    },
  );
  assert.throws(
    () => normalizeDeleteUserPayload({}),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'reason'),
  );
});

test('getUsers excludes deleted users by default and returns pagination meta', async () => {
  const queries = [];
  const service = createAdminUserService({
    queryImpl: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('COUNT(*)::integer AS total')) {
        assert.match(sql, /u\.status <> \$1/);
        return {
          rowCount: 1,
          rows: [
            {
              total: 2,
            },
          ],
        };
      }

      if (sql.includes('ORDER BY u.created_at DESC')) {
        assert.deepEqual(params, ['deleted', 20, 0]);
        return {
          rowCount: 2,
          rows: [
            {
              avatar_url: null,
              created_at: new Date('2026-07-01T10:00:00.000Z'),
              deleted_at: null,
              email: 'admin@example.com',
              email_verified_at: new Date('2026-06-30T00:00:00.000Z'),
              full_name: 'Admin User',
              id: '11111111-1111-4111-8111-111111111111',
              last_login_at: new Date('2026-07-01T09:30:00.000Z'),
              phone: '0909000000',
              role_code: 'admin',
              role_id: '22222222-2222-4222-8222-222222222222',
              role_level: 90,
              role_name: 'Admin',
              status: 'active',
              updated_at: new Date('2026-07-01T10:00:00.000Z'),
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  });

  const result = await service.getUsers({
    query: {},
  });

  assert.equal(queries.length, 2);
  assert.equal(result.data[0].email, 'admin@example.com');
  assert.equal(Object.hasOwn(result.data[0], 'password_hash'), false);
  assert.deepEqual(result.meta, {
    has_next: false,
    limit: 20,
    page: 1,
    total: 2,
    total_pages: 1,
  });
});

test('getUsers validates role existence before querying list', async () => {
  let countQueries = 0;
  const service = createAdminUserService({
    queryImpl: async (sql) => {
      if (sql.includes('FROM roles')) {
        return {
          rowCount: 0,
          rows: [],
        };
      }

      if (sql.includes('FROM users')) {
        countQueries += 1;
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  });

  await assert.rejects(
    () =>
      service.getUsers({
        query: {
          role: 'missing_role',
        },
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'role'),
  );

  assert.equal(countQueries, 0);
});

test('getUserById returns sanitized user detail', async () => {
  const service = createAdminUserService({
    queryImpl: async (sql, params = []) => {
      assert.match(sql, /FROM users u/);
      assert.deepEqual(params, ['11111111-1111-4111-8111-111111111111']);

      return {
        rowCount: 1,
        rows: [
          {
            avatar_url: 'https://cdn.example.com/avatar.jpg',
            created_at: new Date('2026-07-01T00:00:00.000Z'),
            deleted_at: null,
            email: 'admin@example.com',
            email_verified_at: new Date('2026-06-30T00:00:00.000Z'),
            full_name: 'Admin User',
            id: '11111111-1111-4111-8111-111111111111',
            last_login_at: new Date('2026-07-01T08:00:00.000Z'),
            phone: '0909000000',
            role_code: 'admin',
            role_id: '22222222-2222-4222-8222-222222222222',
            role_level: 90,
            role_name: 'Admin',
            status: 'active',
            updated_at: new Date('2026-07-01T09:00:00.000Z'),
          },
        ],
      };
    },
  });

  const result = await service.getUserById({
    userId: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(result.id, '11111111-1111-4111-8111-111111111111');
  assert.equal(result.role.code, 'admin');
  assert.equal(Object.hasOwn(result, 'password_hash'), false);
});

test('getUserLogs returns only target user logs with masked metadata and meta', async () => {
  let countQuerySeen = false;
  let logsQuerySeen = false;
  const service = createAdminUserService({
    queryImpl: async (sql, params = []) => {
      if (sql.includes('FROM users u')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              role_code: 'staff',
              role_id: '22222222-2222-4222-8222-222222222222',
              role_level: 10,
              role_name: 'Staff',
            },
          ],
        };
      }

      if (sql.includes('COUNT(*)::integer AS total')) {
        countQuerySeen = true;
        assert.deepEqual(params, ['11111111-1111-4111-8111-111111111111']);
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
        logsQuerySeen = true;
        assert.deepEqual(params, ['11111111-1111-4111-8111-111111111111', 2, 0]);
        return {
          rowCount: 1,
          rows: [
            {
              action: 'auth.login_success',
              created_at: new Date('2026-07-01T10:00:00.000Z'),
              entity_id: '11111111-1111-4111-8111-111111111111',
              entity_name: 'users',
              id: 'log-1',
              ip_address: '127.0.0.1',
              metadata: {
                refresh_token: 'secret-token',
                safe_flag: true,
              },
              user_agent: 'Browser 1',
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  });

  const result = await service.getUserLogs({
    query: {
      limit: '2',
      page: '1',
    },
    userId: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(countQuerySeen, true);
  assert.equal(logsQuerySeen, true);
  assert.equal(result.data[0].metadata.refresh_token, '[REDACTED]');
  assert.deepEqual(result.meta, {
    has_next: true,
    limit: 2,
    page: 1,
    total: 3,
    total_pages: 2,
  });
});

test('createUser inserts pending verification internal user, queues email log, and writes admin audit log', async () => {
  const fixedNow = new Date('2026-07-01T10:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
        if (params[0] === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') {
          return {
            rowCount: 1,
            rows: [
              {
                avatar_url: null,
                created_at: fixedNow,
                deleted_at: null,
                email: 'admin@example.com',
                email_verified_at: new Date('2026-06-30T00:00:00.000Z'),
                full_name: 'Actor Admin',
                id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                is_system_protected: false,
                last_login_at: fixedNow,
                phone: null,
                role_code: 'admin',
                role_id: 'role-admin-id',
                role_level: 90,
                role_name: 'Admin',
                status: 'active',
                updated_at: fixedNow,
              },
            ],
          };
        }

        if (params[0] === 'cccccccc-cccc-4ccc-8ccc-cccccccccccc') {
          return {
            rowCount: 1,
            rows: [
              {
                avatar_url: null,
                created_at: fixedNow,
                deleted_at: null,
                email: 'staff@example.com',
                email_verified_at: null,
                full_name: 'Staff User',
                id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
                is_system_protected: false,
                last_login_at: null,
                phone: '0909000000',
                role_code: 'staff',
                role_id: 'role-staff-id',
                role_level: 10,
                role_name: 'Staff',
                status: 'pending_verification',
                updated_at: fixedNow,
              },
            ],
          };
        }
      }

      if (sql.includes('SELECT') && sql.includes('FROM users u') && sql.includes('WHERE u.email = $1')) {
        return {
          rowCount: 0,
          rows: [],
        };
      }

      if (sql.includes('FROM roles') && sql.includes('WHERE code = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              code: 'staff',
              id: 'role-staff-id',
              level: 10,
              name: 'Staff',
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO users')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO email_logs')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: 'email-log-1',
            },
          ],
        };
      }

      if (sql.includes('UPDATE email_logs')) {
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

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createAdminUserService({
    bcryptHashImpl: async (plainTextPassword, saltRounds) => {
      assert.equal(plainTextPassword, 'Password123');
      assert.equal(saltRounds, 10);
      return 'hashed-password';
    },
    createEmailVerificationTokenImpl: ({ email, userId }) => {
      assert.equal(email, 'staff@example.com');
      assert.equal(userId, 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
      return 'verification-token';
    },
    hashEmailVerificationTokenImpl: (token) => {
      assert.equal(token, 'verification-token');
      return 'verification-token-hash';
    },
    now: () => fixedNow,
    sendEmailImpl: async (payload) => {
      assert.equal(payload.to.email, 'staff@example.com');
      return {
        messageId: 'sendgrid-message-1',
      };
    },
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.createUser({
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    payload: {
      email: '  STAFF@example.com ',
      full_name: ' Staff User ',
      password: 'Password123',
      phone: '0909000000',
      role_code: 'staff',
    },
    userAgent: 'admin-user-create-service-test',
  });

  const insertUserQuery = queries.find((entry) => entry.sql.includes('INSERT INTO users'));
  const emailLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO email_logs'));
  const userLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const userLogMetadata = JSON.parse(userLogQuery.params[6]);

  assert.equal(userLogQuery.params[0], 'cccccccc-cccc-4ccc-8ccc-cccccccccccc');
  assert.equal(insertUserQuery.params[1], 'staff@example.com');
  assert.equal(insertUserQuery.params[3], 'hashed-password');
  assert.equal(insertUserQuery.params[5], 'pending_verification');
  assert.equal(emailLogQuery.params[3], ADMIN_USER_VERIFY_EMAIL_TEMPLATE_CODE);
  assert.equal(userLogQuery.params[1], ADMIN_USER_CREATE_ACTION);
  assert.deepEqual(userLogMetadata, {
    actor_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    email: 'staff@example.com',
    role_code: 'staff',
    status: 'pending_verification',
    target_user_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    verification_token_hash: 'verification-token-hash',
  });
  assert.equal(result.role.code, 'staff');
  assert.equal(result.last_login_at, null);
  assert.equal(result.email_verified_at, null);
});

test('createUser blocks admin from creating system_admin', async () => {
  const service = createAdminUserService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql, params = []) => {
          if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
            return {
              rowCount: 1,
              rows: [
                {
                  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  role_code: 'admin',
                  role_id: 'role-admin-id',
                  role_level: 90,
                },
              ],
            };
          }

          if (sql.includes('WHERE u.email = $1')) {
            return {
              rowCount: 0,
              rows: [],
            };
          }

          if (sql.includes('FROM roles') && params[0] === 'system_admin') {
            return {
              rowCount: 1,
              rows: [
                {
                  code: 'system_admin',
                  id: 'role-system-admin-id',
                  level: 100,
                  name: 'System Admin',
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
      service.createUser({
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        payload: {
          email: 'sysadmin@example.com',
          full_name: 'System Admin',
          password: 'Password123',
          role_code: 'system_admin',
        },
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('updateUser updates only basic fields and writes admin audit log', async () => {
  const fixedNow = new Date('2026-07-01T12:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({
        params,
        sql,
      });

      if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
        if (params[0] === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') {
          return {
            rowCount: 1,
            rows: [
              {
                avatar_url: null,
                created_at: fixedNow,
                deleted_at: null,
                email: 'admin@example.com',
                email_verified_at: fixedNow,
                full_name: 'Actor Admin',
                id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                is_system_protected: false,
                last_login_at: fixedNow,
                phone: null,
                role_code: 'admin',
                role_id: 'role-admin-id',
                role_level: 90,
                role_name: 'Admin',
                status: 'active',
                updated_at: fixedNow,
              },
            ],
          };
        }

        if (params[0] === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb') {
          return {
            rowCount: 1,
            rows: [
              {
                avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
                created_at: fixedNow,
                deleted_at: null,
                email: 'staff@example.com',
                email_verified_at: null,
                full_name: 'Updated Staff User',
                id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                is_system_protected: false,
                last_login_at: null,
                phone: '0909123456',
                role_code: 'staff',
                role_id: 'role-staff-id',
                role_level: 10,
                role_name: 'Staff',
                status: 'active',
                updated_at: fixedNow,
              },
            ],
          };
        }
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

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createAdminUserService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.updateUser({
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    payload: {
      avatar_url: 'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
      full_name: 'Updated Staff User',
      phone: '0909123456',
    },
    userAgent: 'admin-user-update-service-test',
    userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));
  const userLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const userLogMetadata = JSON.parse(userLogQuery.params[6]);

  assert.equal(userLogQuery.params[0], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  assert.equal(updateQuery.params[0], 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
  assert.equal(updateQuery.params[1], 'Updated Staff User');
  assert.equal(updateQuery.params[2], '0909123456');
  assert.equal(
    updateQuery.params[3],
    'https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg',
  );
  assert.equal(updateQuery.params[4], fixedNow);
  assert.equal(userLogQuery.params[1], ADMIN_USER_UPDATE_PROFILE_ACTION);
  assert.deepEqual(userLogMetadata, {
    actor_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    changed_fields: ['full_name', 'phone', 'avatar_url'],
    target_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });
  assert.equal(result.full_name, 'Updated Staff User');
});

test('updateUser blocks admin from updating system_admin target', async () => {
  const service = createAdminUserService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql, params = []) => {
          if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
            if (params[0] === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') {
              return {
                rowCount: 1,
                rows: [
                  {
                    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                    role_code: 'admin',
                    role_id: 'role-admin-id',
                    role_level: 90,
                    deleted_at: null,
                    status: 'active',
                  },
                ],
              };
            }

            return {
              rowCount: 1,
              rows: [
                {
                  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                  role_code: 'system_admin',
                  role_id: 'role-system-admin-id',
                  role_level: 100,
                  deleted_at: null,
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
      service.updateUser({
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        payload: {
          full_name: 'Nope',
        },
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('changeUserStatus updates deleted_at for deleted status and writes audit log', async () => {
  const fixedNow = new Date('2026-07-01T13:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
        if (params[0] === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                role_code: 'admin',
                role_id: 'role-admin-id',
                role_level: 90,
                deleted_at: null,
                status: 'active',
              },
            ],
          };
        }

        return {
          rowCount: 1,
          rows: [
            {
              avatar_url: null,
              created_at: fixedNow,
              deleted_at: null,
              email: 'staff@example.com',
              email_verified_at: new Date('2026-06-30T00:00:00.000Z'),
              full_name: 'Staff User',
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              is_system_protected: false,
              last_login_at: null,
              phone: '0909000000',
              role_code: 'staff',
              role_id: 'role-staff-id',
              role_level: 10,
              role_name: 'Staff',
              status: params[0] === 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
                ? 'deleted'
                : 'active',
              updated_at: fixedNow,
            },
          ],
        };
      }

      if (sql.includes('UPDATE users')) {
        return { rowCount: 1, rows: [] };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        return { rowCount: 1, rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createAdminUserService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.changeUserStatus({
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    payload: {
      reason: 'Policy violation',
      status: 'deleted',
    },
    userAgent: 'admin-status-service-test',
    userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));
  const userLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const userLogMetadata = JSON.parse(userLogQuery.params[6]);

  assert.equal(updateQuery.params[1], 'deleted');
  assert.equal(updateQuery.params[2], fixedNow);
  assert.equal(userLogQuery.params[1], ADMIN_USER_CHANGE_STATUS_ACTION);
  assert.deepEqual(userLogMetadata, {
    actor_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    from_status: 'deleted',
    reason: 'Policy violation',
    sessions_revoked: true,
    target_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    to_status: 'deleted',
  });
  assert.equal(result.status, 'deleted');
});

test('changeUserStatus rejects activating user without verified email', async () => {
  const service = createAdminUserService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql, params = []) => {
          if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
            if (params[0] === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') {
              return {
                rowCount: 1,
                rows: [
                  {
                    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                    role_code: 'system_admin',
                    role_id: 'role-system-admin-id',
                    role_level: 100,
                    deleted_at: null,
                    status: 'active',
                  },
                ],
              };
            }

            return {
              rowCount: 1,
              rows: [
                {
                  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                  role_code: 'staff',
                  role_id: 'role-staff-id',
                  role_level: 10,
                  deleted_at: null,
                  email_verified_at: null,
                  is_system_protected: false,
                  status: 'pending_verification',
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
      service.changeUserStatus({
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        payload: {
          status: 'active',
        },
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('deleteUser returns idempotent success for already deleted user', async () => {
  const service = createAdminUserService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql, params = []) => {
          if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
            if (params[0] === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') {
              return {
                rowCount: 1,
                rows: [
                  {
                    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                    role_code: 'system_admin',
                    role_id: 'role-system-admin-id',
                    role_level: 100,
                    deleted_at: null,
                    status: 'active',
                  },
                ],
              };
            }

            return {
              rowCount: 1,
              rows: [
                {
                  avatar_url: null,
                  created_at: new Date('2026-07-01T13:00:00.000Z'),
                  deleted_at: new Date('2026-07-01T13:00:00.000Z'),
                  email: 'staff@example.com',
                  email_verified_at: null,
                  full_name: 'Deleted Staff',
                  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
                  is_system_protected: false,
                  last_login_at: null,
                  phone: null,
                  role_code: 'staff',
                  role_id: 'role-staff-id',
                  role_level: 10,
                  role_name: 'Staff',
                  status: 'deleted',
                  updated_at: new Date('2026-07-01T13:00:00.000Z'),
                },
              ],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  const result = await service.deleteUser({
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    payload: {
      reason: 'No longer needed',
    },
    userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });

  assert.equal(result.request_status, 'already_deleted');
  assert.equal(result.deleted, true);
});

test('deleteUser soft deletes active user and writes audit log', async () => {
  const fixedNow = new Date('2026-07-01T14:00:00.000Z');
  const queries = [];
  let targetReadCount = 0;
  const client = {
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
        if (params[0] === 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                role_code: 'system_admin',
                role_id: 'role-system-admin-id',
                role_level: 100,
                deleted_at: null,
                status: 'active',
              },
            ],
          };
        }

        targetReadCount += 1;

        return {
          rowCount: 1,
          rows: [
            {
              avatar_url: null,
              created_at: fixedNow,
              deleted_at: targetReadCount > 1 ? fixedNow : null,
              email: 'staff@example.com',
              email_verified_at: null,
              full_name: 'Deleted Staff',
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              is_system_protected: false,
              last_login_at: null,
              phone: null,
              role_code: 'staff',
              role_id: 'role-staff-id',
              role_level: 10,
              role_name: 'Staff',
              status: targetReadCount > 1 ? 'deleted' : 'active',
              updated_at: fixedNow,
            },
          ],
        };
      }

      if (sql.includes('UPDATE users')) {
        return { rowCount: 1, rows: [] };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        return { rowCount: 1, rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createAdminUserService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.deleteUser({
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    payload: {
      reason: 'Requested by management',
    },
    userAgent: 'admin-delete-service-test',
    userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE users'));
  const userLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const userLogMetadata = JSON.parse(userLogQuery.params[6]);

  assert.equal(updateQuery.params[1], 'deleted');
  assert.equal(userLogQuery.params[1], ADMIN_USER_SOFT_DELETE_ACTION);
  assert.deepEqual(userLogMetadata, {
    actor_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    from_status: 'active',
    reason: 'Requested by management',
    sessions_revoked: true,
    target_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    to_status: 'deleted',
  });
  assert.equal(result.request_status, 'deleted');
});

test('resendVerificationEmail queues email and writes audit log for pending user', async () => {
  const fixedNow = new Date('2026-07-01T15:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      if (sql.includes('FROM users u') && sql.includes('WHERE u.id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              avatar_url: null,
              created_at: fixedNow,
              deleted_at: null,
              email: 'staff@example.com',
              email_verified_at: null,
              full_name: 'Pending Staff',
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              is_system_protected: false,
              last_login_at: null,
              phone: null,
              role_code: 'staff',
              role_id: 'role-staff-id',
              role_level: 10,
              role_name: 'Staff',
              status: 'pending_verification',
              updated_at: fixedNow,
            },
          ],
        };
      }

      if (sql.includes('INSERT INTO email_logs')) {
        return {
          rowCount: 1,
          rows: [{ id: 'email-log-2' }],
        };
      }

      if (sql.includes('UPDATE email_logs')) {
        return { rowCount: 1, rows: [] };
      }

      if (sql.includes('INSERT INTO user_logs')) {
        return { rowCount: 1, rows: [] };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  };
  const service = createAdminUserService({
    createEmailVerificationTokenImpl: () => 'new-verification-token',
    hashEmailVerificationTokenImpl: () => 'new-verification-token-hash',
    now: () => fixedNow,
    sendEmailImpl: async () => ({
      messageId: 'sendgrid-message-2',
    }),
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.resendVerificationEmail({
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    userAgent: 'admin-resend-service-test',
    userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  });

  const emailLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO email_logs'));
  const userLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const userLogMetadata = JSON.parse(userLogQuery.params[6]);

  assert.equal(emailLogQuery.params[3], ADMIN_RESEND_VERIFY_EMAIL_TEMPLATE_CODE);
  assert.equal(userLogQuery.params[1], ADMIN_USER_RESEND_VERIFICATION_ACTION);
  assert.deepEqual(userLogMetadata, {
    actor_user_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    from_status: 'pending_verification',
    sessions_revoked: false,
    target_user_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    to_status: 'pending_verification',
    verification_token_hash: 'new-verification-token-hash',
  });
  assert.equal(result.request_status, 'resent');
});

test('resendVerificationEmail rejects non-pending target status', async () => {
  const service = createAdminUserService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async () => ({
          rowCount: 1,
          rows: [
            {
              id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
              email: 'staff@example.com',
              email_verified_at: new Date('2026-06-30T00:00:00.000Z'),
              full_name: 'Active Staff',
              role_code: 'staff',
              role_id: 'role-staff-id',
              role_level: 10,
              role_name: 'Staff',
              status: 'active',
            },
          ],
        }),
      }),
  });

  await assert.rejects(
    () =>
      service.resendVerificationEmail({
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        userId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});
