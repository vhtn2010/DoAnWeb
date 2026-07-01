const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  ROLE_PERMISSION_REPLACE_ACTION,
  createAdminPermissionService,
  normalizePermissionFilters,
  normalizeReplaceRolePermissionsPayload,
  normalizeRoleId,
} = require('../services/adminPermissionService');

test('normalizeRoleId validates UUID format', () => {
  assert.equal(
    normalizeRoleId('11111111-1111-4111-8111-111111111111'),
    '11111111-1111-4111-8111-111111111111',
  );
  assert.throws(
    () => normalizeRoleId('not-a-uuid'),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'role_id'),
  );
});

test('normalizePermissionFilters trims and validates query values', () => {
  assert.deepEqual(
    normalizePermissionFilters({
      module: ' rbac ',
      resource: ' permission ',
    }),
    {
      module: 'rbac',
      resource: 'permission',
    },
  );
  assert.throws(
    () =>
      normalizePermissionFilters({
        module: 'RBAC*',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'module'),
  );
});

test('normalizeReplaceRolePermissionsPayload deduplicates and validates permission codes', () => {
  assert.deepEqual(
    normalizeReplaceRolePermissionsPayload({
      permission_codes: ['user.read_all', 'user.read_all', 'role.read'],
    }),
    {
      permissionCodes: ['user.read_all', 'role.read'],
    },
  );
  assert.throws(
    () =>
      normalizeReplaceRolePermissionsPayload({
        permission_codes: 'user.read_all',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'permission_codes'),
  );
});

test('getPermissions filters by module and resource and maps safe fields', async () => {
  const capturedQueries = [];
  const service = createAdminPermissionService({
    queryImpl: async (sql, params = []) => {
      capturedQueries.push({ params, sql });
      assert.match(sql, /FROM permissions/);

      return {
        rowCount: 1,
        rows: [
          {
            action: 'read',
            code: 'permission.read',
            created_at: new Date('2026-07-01T00:00:00.000Z'),
            description: 'Read permissions',
            id: '11111111-1111-4111-8111-111111111111',
            module: 'rbac',
            resource: 'permission',
          },
        ],
      };
    },
  });

  const result = await service.getPermissions({
    query: {
      module: 'rbac',
      resource: 'permission',
    },
  });

  assert.equal(capturedQueries.length, 1);
  assert.deepEqual(capturedQueries[0].params, ['rbac', 'permission']);
  assert.equal(result[0].code, 'permission.read');
});

test('replaceRolePermissions replaces role_permissions in transaction and writes audit log', async () => {
  const fixedNow = new Date('2026-07-01T17:00:00.000Z');
  const queries = [];
  let rolePermissionReadCount = 0;
  const client = {
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              code: 'admin',
              id: '22222222-2222-4222-8222-222222222222',
              is_system_role: false,
              level: 90,
              name: 'Admin',
            },
          ],
        };
      }

      if (
        sql.includes('FROM role_permissions rp') &&
        sql.includes('JOIN permissions p')
      ) {
        rolePermissionReadCount += 1;

        if (rolePermissionReadCount === 1) {
          return {
            rowCount: 1,
            rows: [
              {
                action: 'read',
                code: 'role.read',
                created_at: fixedNow,
                description: 'Read roles',
                id: 'permission-old',
                module: 'rbac',
                resource: 'role',
              },
            ],
          };
        }

        return {
          rowCount: 2,
          rows: [
            {
              action: 'read_all',
              code: 'user.read_all',
              created_at: fixedNow,
              description: 'Read all users',
              id: 'permission-1',
              module: 'user',
              resource: 'user',
            },
            {
              action: 'read',
              code: 'role.read',
              created_at: fixedNow,
              description: 'Read roles',
              id: 'permission-2',
              module: 'rbac',
              resource: 'role',
            },
          ],
        };
      }

      if (sql.includes('FROM permissions') && sql.includes('WHERE code = ANY')) {
        return {
          rowCount: 2,
          rows: [
            {
              action: 'read',
              code: 'role.read',
              created_at: fixedNow,
              description: 'Read roles',
              id: 'permission-2',
              module: 'rbac',
              resource: 'role',
            },
            {
              action: 'read_all',
              code: 'user.read_all',
              created_at: fixedNow,
              description: 'Read all users',
              id: 'permission-1',
              module: 'user',
              resource: 'user',
            },
          ],
        };
      }

      if (sql.includes('DELETE FROM role_permissions')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('INSERT INTO role_permissions')) {
        return {
          rowCount: 2,
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
  const service = createAdminPermissionService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.replaceRolePermissions({
    actorRoleCode: 'system_admin',
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    payload: {
      permission_codes: ['user.read_all', 'role.read', 'user.read_all'],
    },
    roleId: '22222222-2222-4222-8222-222222222222',
    userAgent: 'admin-permission-service-test',
  });

  const deleteQuery = queries.find((entry) =>
    entry.sql.includes('DELETE FROM role_permissions'),
  );
  const insertRolePermissionsQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO role_permissions'),
  );
  const userLogQuery = queries.find((entry) =>
    entry.sql.includes('INSERT INTO user_logs'),
  );
  const userLogMetadata = JSON.parse(userLogQuery.params[6]);

  assert.ok(deleteQuery);
  assert.ok(insertRolePermissionsQuery);
  assert.equal(userLogQuery.params[1], ROLE_PERMISSION_REPLACE_ACTION);
  assert.deepEqual(userLogMetadata, {
    new_permission_count: 2,
    old_permission_count: 1,
    role_code: 'admin',
    role_id: '22222222-2222-4222-8222-222222222222',
    sessions_revoked: true,
  });
  assert.equal(result.role.code, 'admin');
  assert.equal(result.permissions.length, 2);
});

test('replaceRolePermissions rejects missing permission codes from database', async () => {
  const service = createAdminPermissionService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
            return {
              rowCount: 1,
              rows: [
                {
                  code: 'admin',
                  id: '22222222-2222-4222-8222-222222222222',
                  is_system_role: false,
                  level: 90,
                  name: 'Admin',
                },
              ],
            };
          }

          if (
            sql.includes('FROM role_permissions rp') &&
            sql.includes('JOIN permissions p')
          ) {
            return {
              rowCount: 0,
              rows: [],
            };
          }

          if (sql.includes('FROM permissions') && sql.includes('WHERE code = ANY')) {
            return {
              rowCount: 1,
              rows: [
                {
                  action: 'read_all',
                  code: 'user.read_all',
                  created_at: new Date('2026-07-01T00:00:00.000Z'),
                  description: 'Read all users',
                  id: 'permission-1',
                  module: 'user',
                  resource: 'user',
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
      service.replaceRolePermissions({
        actorRoleCode: 'system_admin',
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        payload: {
          permission_codes: ['user.read_all', 'missing.permission'],
        },
        roleId: '22222222-2222-4222-8222-222222222222',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) =>
        detail.message.includes('missing.permission'),
      ),
  );
});

test('replaceRolePermissions rejects protected system_admin role', async () => {
  const service = createAdminPermissionService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
            return {
              rowCount: 1,
              rows: [
                {
                  code: 'system_admin',
                  id: '22222222-2222-4222-8222-222222222222',
                  is_system_role: true,
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
      service.replaceRolePermissions({
        actorRoleCode: 'system_admin',
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        payload: {
          permission_codes: [],
        },
        roleId: '22222222-2222-4222-8222-222222222222',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('replaceRolePermissions allows updating non-system_admin system role', async () => {
  const fixedNow = new Date('2026-07-01T00:00:00.000Z');
  const queries = [];
  let rolePermissionReadCount = 0;
  const service = createAdminPermissionService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql, params = []) => {
          queries.push({ params, sql });

          if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
            return {
              rowCount: 1,
              rows: [
                {
                  code: 'admin',
                  id: '22222222-2222-4222-8222-222222222222',
                  is_system_role: true,
                  level: 80,
                  name: 'Admin',
                },
              ],
            };
          }

          if (
            sql.includes('FROM role_permissions rp') &&
            sql.includes('JOIN permissions p')
          ) {
            rolePermissionReadCount += 1;

            return {
              rowCount: rolePermissionReadCount === 1 ? 0 : 1,
              rows:
                rolePermissionReadCount === 1
                  ? []
                  : [
                      {
                        action: 'read_all',
                        code: 'user.read_all',
                        created_at: fixedNow,
                        description: 'Read all users',
                        id: 'permission-1',
                        module: 'user',
                        resource: 'user',
                      },
                    ],
            };
          }

          if (sql.includes('FROM permissions') && sql.includes('WHERE code = ANY')) {
            return {
              rowCount: 1,
              rows: [
                {
                  action: 'read_all',
                  code: 'user.read_all',
                  created_at: fixedNow,
                  description: 'Read all users',
                  id: 'permission-1',
                  module: 'user',
                  resource: 'user',
                },
              ],
            };
          }

          if (sql.includes('DELETE FROM role_permissions')) {
            return {
              rowCount: 0,
              rows: [],
            };
          }

          if (sql.includes('INSERT INTO role_permissions')) {
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
      }),
  });

  const result = await service.replaceRolePermissions({
    actorRoleCode: 'system_admin',
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    payload: {
      permission_codes: ['user.read_all'],
    },
    roleId: '22222222-2222-4222-8222-222222222222',
  });

  assert.equal(result.role.code, 'admin');
  assert.equal(result.permissions.length, 1);
  assert.ok(
    queries.some((entry) => entry.sql.includes('DELETE FROM role_permissions')),
  );
});
