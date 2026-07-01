const assert = require('node:assert/strict');
const test = require('node:test');

const { API_ERROR_CODES } = require('../constants/domainConstraints');
const {
  ROLE_CREATE_ACTION,
  ROLE_DELETE_ACTION,
  ROLE_UPDATE_ACTION,
  createAdminRoleService,
  normalizeCreateRolePayload,
  normalizeDeleteRolePayload,
  normalizeRoleId,
  normalizeUpdateRolePayload,
} = require('../services/adminRoleService');

test('normalizeRoleId validates UUID format', () => {
  assert.equal(
    normalizeRoleId('11111111-1111-4111-8111-111111111111'),
    '11111111-1111-4111-8111-111111111111',
  );
  assert.throws(
    () => normalizeRoleId('invalid'),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'role_id'),
  );
});

test('normalizeCreateRolePayload validates required fields and reserved codes', () => {
  assert.deepEqual(
    normalizeCreateRolePayload({
      code: 'sales_staff',
      description: ' Sales role ',
      level: '60',
      name: ' Sales Staff ',
    }),
    {
      code: 'sales_staff',
      description: 'Sales role',
      level: 60,
      name: 'Sales Staff',
    },
  );
  assert.throws(
    () =>
      normalizeCreateRolePayload({
        code: 'system_admin',
        name: 'System',
        level: 100,
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'code'),
  );
});

test('normalizeUpdateRolePayload validates allowed fields', () => {
  assert.deepEqual(
    normalizeUpdateRolePayload({
      description: ' Updated description ',
      level: '70',
      name: ' Updated Name ',
    }),
    {
      description: 'Updated description',
      hasDescription: true,
      hasLevel: true,
      hasName: true,
      level: 70,
      name: 'Updated Name',
    },
  );
  assert.throws(
    () =>
      normalizeUpdateRolePayload({
        code: 'forbidden',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'code'),
  );
});

test('normalizeDeleteRolePayload requires reason', () => {
  assert.deepEqual(
    normalizeDeleteRolePayload({
      reason: ' No longer used ',
    }),
    {
      reason: 'No longer used',
    },
  );
  assert.throws(
    () => normalizeDeleteRolePayload({}),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'reason'),
  );
});

test('getRoles returns safe role list', async () => {
  const service = createAdminRoleService({
    queryImpl: async (sql) => {
      assert.match(sql, /FROM roles/);
      return {
        rowCount: 1,
        rows: [
          {
            code: 'admin',
            created_at: new Date('2026-07-01T00:00:00.000Z'),
            description: 'Business administrator role',
            id: '11111111-1111-4111-8111-111111111111',
            is_system_role: true,
            level: 80,
            name: 'Admin',
            updated_at: new Date('2026-07-01T00:00:00.000Z'),
          },
        ],
      };
    },
  });

  const result = await service.getRoles();

  assert.equal(result.length, 1);
  assert.equal(result[0].code, 'admin');
  assert.equal(Object.hasOwn(result[0], 'password_hash'), false);
});

test('getRoleById returns role detail with permissions', async () => {
  let roleReadCount = 0;
  const service = createAdminRoleService({
    queryImpl: async (sql, params = []) => {
      if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
        roleReadCount += 1;
        assert.deepEqual(params, ['11111111-1111-4111-8111-111111111111']);
        return {
          rowCount: 1,
          rows: [
            {
              code: 'admin',
              created_at: new Date('2026-07-01T00:00:00.000Z'),
              description: 'Business administrator role',
              id: '11111111-1111-4111-8111-111111111111',
              is_system_role: true,
              level: 80,
              name: 'Admin',
              updated_at: new Date('2026-07-01T00:00:00.000Z'),
            },
          ],
        };
      }

      if (sql.includes('FROM role_permissions rp')) {
        return {
          rowCount: 1,
          rows: [
            {
              action: 'read',
              code: 'role.read',
              created_at: new Date('2026-07-01T00:00:00.000Z'),
              description: 'Read roles',
              id: 'permission-1',
              module: 'rbac',
              resource: 'role',
            },
          ],
        };
      }

      throw new Error(`Unexpected SQL in test: ${sql}`);
    },
  });

  const result = await service.getRoleById({
    roleId: '11111111-1111-4111-8111-111111111111',
  });

  assert.equal(roleReadCount, 1);
  assert.equal(result.code, 'admin');
  assert.equal(result.permissions[0].code, 'role.read');
});

test('createRole inserts custom role and writes audit log', async () => {
  const fixedNow = new Date('2026-07-01T18:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      if (sql.includes('FROM roles') && sql.includes('WHERE code = $1')) {
        if (params[0] === 'system_admin') {
          return {
            rowCount: 1,
            rows: [
              {
                code: 'system_admin',
                id: 'role-system-admin-id',
                is_system_role: true,
                level: 100,
              },
            ],
          };
        }

        return {
          rowCount: 0,
          rows: [],
        };
      }

      if (sql.includes('INSERT INTO roles')) {
        return {
          rowCount: 1,
          rows: [
            {
              code: 'sales_staff',
              created_at: fixedNow,
              description: 'Sales role',
              id: 'role-sales-id',
              is_system_role: false,
              level: 60,
              name: 'Sales Staff',
              updated_at: fixedNow,
            },
          ],
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
  const service = createAdminRoleService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.createRole({
    actorRoleCode: 'system_admin',
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    payload: {
      code: 'sales_staff',
      description: 'Sales role',
      level: 60,
      name: 'Sales Staff',
    },
    userAgent: 'admin-role-create-test',
  });

  const insertRoleQuery = queries.find((entry) => entry.sql.includes('INSERT INTO roles'));
  const userLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const metadata = JSON.parse(userLogQuery.params[6]);

  assert.equal(insertRoleQuery.params[0], 'sales_staff');
  assert.equal(userLogQuery.params[1], ROLE_CREATE_ACTION);
  assert.deepEqual(metadata, {
    code: 'sales_staff',
    level: 60,
    target_role_id: 'role-sales-id',
  });
  assert.deepEqual(result.permissions, []);
});

test('createRole rejects duplicate role code', async () => {
  const service = createAdminRoleService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql, params = []) => {
          if (sql.includes('FROM roles') && sql.includes('WHERE code = $1')) {
            if (params[0] === 'system_admin') {
              return {
                rowCount: 1,
                rows: [
                  {
                    code: 'system_admin',
                    id: 'role-system-admin-id',
                    is_system_role: true,
                    level: 100,
                  },
                ],
              };
            }

            return {
              rowCount: 1,
              rows: [
                {
                  code: 'sales_staff',
                  id: 'role-sales-id',
                  is_system_role: false,
                  level: 60,
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
      service.createRole({
        actorRoleCode: 'system_admin',
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        payload: {
          code: 'sales_staff',
          level: 60,
          name: 'Sales Staff',
        },
      }),
    (error) =>
      error.code === API_ERROR_CODES.DUPLICATE_RESOURCE &&
      error.statusCode === 409,
  );
});

test('updateRole updates custom role and writes audit log', async () => {
  const fixedNow = new Date('2026-07-01T19:00:00.000Z');
  const queries = [];
  let roleReadCount = 0;
  const client = {
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      if (sql.includes('FROM users u') && sql.includes('JOIN roles r')) {
        return {
          rowCount: 1,
          rows: [
            {
              id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
              role_code: 'system_admin',
              role_id: 'role-system-admin-id',
              role_level: 100,
            },
          ],
        };
      }

      if (sql.includes('FROM roles') && sql.includes('WHERE code = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              code: 'system_admin',
              id: 'role-system-admin-id',
              is_system_role: true,
              level: 100,
            },
          ],
        };
      }

      if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
        roleReadCount += 1;

        return {
          rowCount: 1,
          rows: [
            {
              code: 'sales_staff',
              created_at: fixedNow,
              description: roleReadCount > 1 ? 'Updated description' : 'Old description',
              id: 'role-sales-id',
              is_system_role: false,
              level: roleReadCount > 1 ? 70 : 60,
              name: roleReadCount > 1 ? 'Updated Sales Staff' : 'Sales Staff',
              updated_at: fixedNow,
            },
          ],
        };
      }

      if (sql.includes('UPDATE roles')) {
        return {
          rowCount: 1,
          rows: [],
        };
      }

      if (sql.includes('FROM role_permissions rp')) {
        return {
          rowCount: 1,
          rows: [
            {
              action: 'read',
              code: 'role.read',
              created_at: fixedNow,
              description: 'Read roles',
              id: 'permission-1',
              module: 'rbac',
              resource: 'role',
            },
          ],
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
  const service = createAdminRoleService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.updateRole({
    actorRoleCode: 'system_admin',
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    payload: {
      description: 'Updated description',
      level: 70,
      name: 'Updated Sales Staff',
    },
    roleId: '11111111-1111-4111-8111-111111111111',
    userAgent: 'admin-role-update-test',
  });

  const updateQuery = queries.find((entry) => entry.sql.includes('UPDATE roles'));
  const userLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const metadata = JSON.parse(userLogQuery.params[6]);

  assert.ok(updateQuery);
  assert.equal(userLogQuery.params[1], ROLE_UPDATE_ACTION);
  assert.deepEqual(metadata, {
    changed_fields: ['name', 'description', 'level'],
    from_level: 60,
    target_role_id: '11111111-1111-4111-8111-111111111111',
    to_level: 70,
  });
  assert.equal(result.level, 70);
  assert.equal(result.sessions_revoked, true);
});

test('updateRole rejects system role in MVP', async () => {
  const service = createAdminRoleService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql, params = []) => {
          if (sql.includes('FROM users u') && sql.includes('JOIN roles r')) {
            return {
              rowCount: 1,
              rows: [
                {
                  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
                  role_code: 'system_admin',
                  role_id: 'role-system-admin-id',
                  role_level: 100,
                },
              ],
            };
          }

          if (sql.includes('FROM roles') && sql.includes('WHERE code = $1')) {
            return {
              rowCount: 1,
              rows: [
                {
                  code: 'system_admin',
                  id: 'role-system-admin-id',
                  is_system_role: true,
                  level: 100,
                },
              ],
            };
          }

          if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
            return {
              rowCount: 1,
              rows: [
                {
                  code: 'admin',
                  id: 'role-admin-id',
                  is_system_role: true,
                  level: 80,
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
      service.updateRole({
        actorRoleCode: 'system_admin',
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        payload: {
          name: 'Updated Admin',
        },
        roleId: '11111111-1111-4111-8111-111111111111',
      }),
    (error) =>
      error.code === API_ERROR_CODES.FORBIDDEN &&
      error.statusCode === 403,
  );
});

test('deleteRole deletes custom role and role_permissions in transaction', async () => {
  const fixedNow = new Date('2026-07-01T20:00:00.000Z');
  const queries = [];
  const client = {
    query: async (sql, params = []) => {
      queries.push({ params, sql });

      if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
        return {
          rowCount: 1,
          rows: [
            {
              code: 'sales_staff',
              created_at: fixedNow,
              description: 'Sales role',
              id: 'role-sales-id',
              is_system_role: false,
              level: 60,
              name: 'Sales Staff',
              updated_at: fixedNow,
            },
          ],
        };
      }

      if (sql.includes('COUNT(*)::integer AS total') && sql.includes('FROM users')) {
        return {
          rowCount: 1,
          rows: [{ total: 0 }],
        };
      }

      if (sql.includes('DELETE FROM role_permissions')) {
        return {
          rowCount: 2,
          rows: [],
        };
      }

      if (sql.includes('DELETE FROM roles')) {
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
  const service = createAdminRoleService({
    now: () => fixedNow,
    withTransactionImpl: async (callback) => callback(client),
  });

  const result = await service.deleteRole({
    actorRoleCode: 'system_admin',
    actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ipAddress: '127.0.0.1',
    payload: {
      reason: 'Unused custom role',
    },
    roleId: '11111111-1111-4111-8111-111111111111',
    userAgent: 'admin-role-delete-test',
  });

  const deletePermissionsQuery = queries.find((entry) =>
    entry.sql.includes('DELETE FROM role_permissions'),
  );
  const deleteRoleQuery = queries.find((entry) => entry.sql.includes('DELETE FROM roles'));
  const userLogQuery = queries.find((entry) => entry.sql.includes('INSERT INTO user_logs'));
  const metadata = JSON.parse(userLogQuery.params[6]);

  assert.ok(deletePermissionsQuery);
  assert.ok(deleteRoleQuery);
  assert.equal(userLogQuery.params[1], ROLE_DELETE_ACTION);
  assert.deepEqual(metadata, {
    code: 'sales_staff',
    reason: 'Unused custom role',
    target_role_id: '11111111-1111-4111-8111-111111111111',
  });
  assert.equal(result.deleted, true);
});

test('deleteRole rejects role that is still assigned to users', async () => {
  const service = createAdminRoleService({
    withTransactionImpl: async (callback) =>
      callback({
        query: async (sql) => {
          if (sql.includes('FROM roles') && sql.includes('WHERE id = $1')) {
            return {
              rowCount: 1,
              rows: [
                {
                  code: 'sales_staff',
                  id: 'role-sales-id',
                  is_system_role: false,
                  level: 60,
                },
              ],
            };
          }

          if (sql.includes('COUNT(*)::integer AS total') && sql.includes('FROM users')) {
            return {
              rowCount: 1,
              rows: [{ total: 2 }],
            };
          }

          throw new Error(`Unexpected SQL in test: ${sql}`);
        },
      }),
  });

  await assert.rejects(
    () =>
      service.deleteRole({
        actorRoleCode: 'system_admin',
        actorUserId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        payload: {
          reason: 'Unused custom role',
        },
        roleId: '11111111-1111-4111-8111-111111111111',
      }),
    (error) =>
      error.code === API_ERROR_CODES.VALIDATION_ERROR &&
      error.details?.some((detail) => detail.field === 'role_id'),
  );
});
