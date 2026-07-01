const { query, withTransaction } = require('../database/client');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const ADMIN_ROLE_CODES = ['admin', 'system_admin'];
const SYSTEM_ADMIN_ROLE_CODE = 'system_admin';
const ROLE_PERMISSION_REPLACE_ACTION = 'admin.role_permission.replace';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const createNotFoundError = (message = 'Resource not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const createForbiddenError = (message) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const trimToNull = (value) => {
  if (value == null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || null;
};

const normalizeRoleId = (roleId) => {
  const normalizedRoleId = trimToNull(roleId);

  if (!normalizedRoleId || !UUID_PATTERN.test(normalizedRoleId)) {
    throw createValidationError([
      {
        field: 'role_id',
        message: 'role_id must be a valid UUID',
      },
    ]);
  }

  return normalizedRoleId;
};

const normalizePermissionFilters = (query = {}) => {
  const normalizedQuery =
    query && typeof query === 'object' && !Array.isArray(query) ? query : {};
  const details = [];
  const module = trimToNull(normalizedQuery.module);
  const resource = trimToNull(normalizedQuery.resource);

  if (module && !/^[a-z_]+$/.test(module)) {
    details.push({
      field: 'module',
      message: 'module must be a valid lowercase snake_case value',
    });
  }

  if (resource && !/^[a-z_]+$/.test(resource)) {
    details.push({
      field: 'resource',
      message: 'resource must be a valid lowercase snake_case value',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    module,
    resource,
  };
};

const normalizeReplaceRolePermissionsPayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];

  if (!Object.prototype.hasOwnProperty.call(normalizedPayload, 'permission_codes')) {
    details.push({
      field: 'permission_codes',
      message: 'permission_codes is required',
    });
  } else if (!Array.isArray(normalizedPayload.permission_codes)) {
    details.push({
      field: 'permission_codes',
      message: 'permission_codes must be an array',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  const normalizedCodes = normalizedPayload.permission_codes.map((value, index) => {
    if (typeof value !== 'string') {
      details.push({
        field: `permission_codes[${index}]`,
        message: 'permission code must be a string',
      });
      return null;
    }

    const normalizedValue = value.trim();

    if (!normalizedValue) {
      details.push({
        field: `permission_codes[${index}]`,
        message: 'permission code must not be empty',
      });
      return null;
    }

    return normalizedValue;
  });

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    permissionCodes: [...new Set(normalizedCodes)],
  };
};

const mapPermission = (row) => ({
  action: row.action,
  code: row.code,
  created_at: row.created_at?.toISOString?.() || row.created_at,
  description: row.description,
  id: row.id,
  module: row.module,
  resource: row.resource,
});

const mapRolePermissionResult = (role, permissions, sessionsRevoked = true) => ({
  permissions,
  role: {
    code: role.code,
    id: role.id,
    is_system_role: role.is_system_role,
    level: role.level,
    name: role.name,
  },
  sessions_revoked: sessionsRevoked,
});

const loadRoleById = async (queryExecutor, roleId, { forUpdate = false } = {}) => {
  const result = await queryExecutor(
    `
      SELECT
        id,
        code,
        name,
        level,
        is_system_role
      FROM roles
      WHERE id = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [roleId],
  );

  return result.rows[0] || null;
};

const loadPermissionsByCodes = async (queryExecutor, permissionCodes) => {
  if (permissionCodes.length === 0) {
    return [];
  }

  const result = await queryExecutor(
    `
      SELECT
        id,
        code,
        module,
        resource,
        action,
        description,
        created_at
      FROM permissions
      WHERE code = ANY($1::text[])
      ORDER BY code ASC
    `,
    [permissionCodes],
  );

  return result.rows;
};

const loadPermissionsByRoleId = async (queryExecutor, roleId) => {
  const result = await queryExecutor(
    `
      SELECT
        p.id,
        p.code,
        p.module,
        p.resource,
        p.action,
        p.description,
        p.created_at
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.code ASC
    `,
    [roleId],
  );

  return result.rows;
};

const insertUserLog = async (
  client,
  {
    actorUserId,
    createdAt,
    entityId,
    ipAddress,
    metadata,
    userAgent,
  },
) =>
  client.query(
    `
      INSERT INTO user_logs (
        user_id,
        action,
        entity_name,
        entity_id,
        ip_address,
        user_agent,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    `,
    [
      actorUserId,
      ROLE_PERMISSION_REPLACE_ACTION,
      'roles',
      entityId,
      ipAddress || null,
      trimToNull(userAgent),
      metadata ? JSON.stringify(metadata) : null,
      createdAt,
    ],
  );

const createAdminPermissionService = ({
  now = () => new Date(),
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getPermissions = async ({ query: rawQuery }) => {
    const filters = normalizePermissionFilters(rawQuery);
    const whereClauses = [];
    const params = [];
    let parameterIndex = 1;

    if (filters.module) {
      whereClauses.push(`module = $${parameterIndex}`);
      params.push(filters.module);
      parameterIndex += 1;
    }

    if (filters.resource) {
      whereClauses.push(`resource = $${parameterIndex}`);
      params.push(filters.resource);
      parameterIndex += 1;
    }

    const whereSql =
      whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const result = await queryImpl(
      `
        SELECT
          id,
          code,
          module,
          resource,
          action,
          description,
          created_at
        FROM permissions
        ${whereSql}
        ORDER BY module ASC, resource ASC, action ASC, code ASC
      `,
      params,
    );

    return result.rows.map(mapPermission);
  };

  const replaceRolePermissions = async ({
    actorRoleCode,
    actorUserId,
    ipAddress,
    payload,
    roleId,
    userAgent,
  }) => {
    if (actorRoleCode !== SYSTEM_ADMIN_ROLE_CODE) {
      throw createForbiddenError(
        'Only system admin can replace role permissions',
      );
    }

    const normalizedRoleId = normalizeRoleId(roleId);
    const input = normalizeReplaceRolePermissionsPayload(payload);

    return withTransactionImpl(async (client) => {
      const role = await loadRoleById(client.query.bind(client), normalizedRoleId, {
        forUpdate: true,
      });

      if (!role) {
        throw createNotFoundError('Role not found');
      }

      if (role.code === SYSTEM_ADMIN_ROLE_CODE) {
        throw createForbiddenError(
          'System admin role permissions cannot be updated in MVP',
        );
      }

      const oldPermissions = await loadPermissionsByRoleId(
        client.query.bind(client),
        normalizedRoleId,
      );
      const newPermissions = await loadPermissionsByCodes(
        client.query.bind(client),
        input.permissionCodes,
      );

      if (newPermissions.length !== input.permissionCodes.length) {
        const existingCodes = new Set(newPermissions.map((permission) => permission.code));
        const missingCodes = input.permissionCodes.filter(
          (permissionCode) => !existingCodes.has(permissionCode),
        );

        throw createValidationError(
          missingCodes.map((permissionCode) => ({
            field: 'permission_codes',
            message: `permission code does not exist: ${permissionCode}`,
          })),
        );
      }

      await client.query(
        `
          DELETE FROM role_permissions
          WHERE role_id = $1
        `,
        [normalizedRoleId],
      );

      if (newPermissions.length > 0) {
        const values = [];
        const params = [];
        let parameterIndex = 1;

        for (const permission of newPermissions) {
          values.push(`($${parameterIndex}, $${parameterIndex + 1}, $${parameterIndex + 2})`);
          params.push(normalizedRoleId, permission.id, now());
          parameterIndex += 3;
        }

        await client.query(
          `
            INSERT INTO role_permissions (
              role_id,
              permission_id,
              created_at
            )
            VALUES ${values.join(', ')}
          `,
          params,
        );
      }

      const updatedPermissions = await loadPermissionsByRoleId(
        client.query.bind(client),
        normalizedRoleId,
      );
      const createdAt = now();

      await insertUserLog(client, {
        actorUserId,
        createdAt,
        entityId: normalizedRoleId,
        ipAddress,
        metadata: {
          new_permission_count: updatedPermissions.length,
          old_permission_count: oldPermissions.length,
          role_code: role.code,
          role_id: role.id,
          sessions_revoked: true,
        },
        userAgent,
      });

      return mapRolePermissionResult(
        role,
        updatedPermissions.map(mapPermission),
      );
    });
  };

  return {
    getPermissions,
    replaceRolePermissions,
  };
};

module.exports = createAdminPermissionService();
module.exports.ADMIN_ROLE_CODES = ADMIN_ROLE_CODES;
module.exports.ROLE_PERMISSION_REPLACE_ACTION = ROLE_PERMISSION_REPLACE_ACTION;
module.exports.createAdminPermissionService = createAdminPermissionService;
module.exports.normalizePermissionFilters = normalizePermissionFilters;
module.exports.normalizeReplaceRolePermissionsPayload =
  normalizeReplaceRolePermissionsPayload;
module.exports.normalizeRoleId = normalizeRoleId;
