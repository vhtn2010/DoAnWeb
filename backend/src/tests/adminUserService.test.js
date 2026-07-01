const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  createAdminUserService,
  normalizeListUsersQuery,
  normalizePagination,
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
