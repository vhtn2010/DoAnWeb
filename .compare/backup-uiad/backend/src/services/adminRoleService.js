const { query, withTransaction } = require('../database/client');
const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');

const ADMIN_ALLOWED_ROLE_CODES = ['admin', 'system_admin'];
const SYSTEM_ADMIN_ROLE_CODE = 'system_admin';
const DEFAULT_ROLE_CODES = new Set([
  'customer',
  'staff',
  'admin',
  'system_admin',
]);
const ROLE_CREATE_ACTION = 'admin.role.create';
const ROLE_UPDATE_ACTION = 'admin.role.update';
const ROLE_DELETE_ACTION = 'admin.role.delete';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const createValidationError = (details) =>
  new AppError('Validation failed', {
    code: API_ERROR_CODES.VALIDATION_ERROR,
    details,
    statusCode: 400,
  });

const createNotFoundError = (message = 'Role not found') =>
  new AppError(message, {
    code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
    statusCode: 404,
  });

const createForbiddenError = (message) =>
  new AppError(message, {
    code: API_ERROR_CODES.FORBIDDEN,
    statusCode: 403,
  });

const createDuplicateRoleCodeError = () =>
  new AppError('Role code already exists', {
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    details: [
      {
        field: 'code',
        message: 'code already exists',
      },
    ],
    statusCode: 409,
  });

const trimToNull = (value) => {
  if (value == null) {
    return null;
  }

  const normalizedValue = String(value).trim();
  return normalizedValue || null;
};

const parseInteger = (value) => {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== 'string' || !/^-?\d+$/.test(value.trim())) {
    return Number.NaN;
  }

  return Number.parseInt(value.trim(), 10);
};

const isUniqueViolation = (error) =>
  error?.code === '23505' || error?.constraint === 'roles_code_key';

const mapPermission = (row) => ({
  action: row.action,
  code: row.code,
  created_at: row.created_at?.toISOString?.() || row.created_at,
  description: row.description,
  id: row.id,
  module: row.module,
  resource: row.resource,
});

const mapRole = (row) => ({
  code: row.code,
  created_at: row.created_at?.toISOString?.() || row.created_at,
  description: row.description,
  id: row.id,
  is_system_role: row.is_system_role,
  level: row.level,
  name: row.name,
  updated_at: row.updated_at?.toISOString?.() || row.updated_at,
});

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

const normalizeCreateRolePayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const allowedFields = new Set(['code', 'name', 'description', 'level']);
  const disallowedFields = Object.keys(normalizedPayload).filter(
    (field) => !allowedFields.has(field),
  );
  const code = trimToNull(normalizedPayload.code);
  const name = trimToNull(normalizedPayload.name);
  const description = trimToNull(normalizedPayload.description);
  const level = parseInteger(normalizedPayload.level);

  if (disallowedFields.length > 0) {
    details.push(
      ...disallowedFields.map((field) => ({
        field,
        message: `${field} is not allowed in POST /admin/roles`,
      })),
    );
  }

  if (!code) {
    details.push({
      field: 'code',
      message: 'code is required',
    });
  } else if (!/^[a-z_]+$/.test(code)) {
    details.push({
      field: 'code',
      message: 'code must be a valid lowercase snake_case role code',
    });
  } else if (DEFAULT_ROLE_CODES.has(code)) {
    details.push({
      field: 'code',
      message: 'default system role codes cannot be created via this API',
    });
  }

  if (!name) {
    details.push({
      field: 'name',
      message: 'name is required',
    });
  } else if (name.length > 100) {
    details.push({
      field: 'name',
      message: 'name must be at most 100 characters',
    });
  }

  if (description && description.length > 1000) {
    details.push({
      field: 'description',
      message: 'description must be at most 1000 characters',
    });
  }

  if (level == null) {
    details.push({
      field: 'level',
      message: 'level is required',
    });
  } else if (Number.isNaN(level) || level < 0) {
    details.push({
      field: 'level',
      message: 'level must be a valid integer greater than or equal to 0',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    code,
    description,
    level,
    name,
  };
};

const normalizeUpdateRolePayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const allowedFields = new Set(['name', 'description', 'level']);
  const disallowedFields = Object.keys(normalizedPayload).filter(
    (field) => !allowedFields.has(field),
  );
  const hasName = Object.prototype.hasOwnProperty.call(normalizedPayload, 'name');
  const hasDescription = Object.prototype.hasOwnProperty.call(
    normalizedPayload,
    'description',
  );
  const hasLevel = Object.prototype.hasOwnProperty.call(normalizedPayload, 'level');
  const name = hasName ? trimToNull(normalizedPayload.name) : undefined;
  const description = hasDescription
    ? trimToNull(normalizedPayload.description)
    : undefined;
  const level = hasLevel ? parseInteger(normalizedPayload.level) : undefined;

  if (disallowedFields.length > 0) {
    details.push(
      ...disallowedFields.map((field) => ({
        field,
        message: `${field} is not allowed in PATCH /admin/roles/{role_id}`,
      })),
    );
  }

  if (!hasName && !hasDescription && !hasLevel) {
    details.push({
      field: 'body',
      message: 'At least one of name, description, or level is required',
    });
  }

  if (hasName) {
    if (!name) {
      details.push({
        field: 'name',
        message: 'name must not be empty',
      });
    } else if (name.length > 100) {
      details.push({
        field: 'name',
        message: 'name must be at most 100 characters',
      });
    }
  }

  if (hasDescription && description && description.length > 1000) {
    details.push({
      field: 'description',
      message: 'description must be at most 1000 characters',
    });
  }

  if (hasLevel) {
    if (level == null || Number.isNaN(level) || level < 0) {
      details.push({
        field: 'level',
        message: 'level must be a valid integer greater than or equal to 0',
      });
    }
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return {
    description,
    hasDescription,
    hasLevel,
    hasName,
    level,
    name,
  };
};

const normalizeDeleteRolePayload = (payload = {}) => {
  const normalizedPayload =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload
      : {};
  const details = [];
  const allowedFields = new Set(['reason']);
  const disallowedFields = Object.keys(normalizedPayload).filter(
    (field) => !allowedFields.has(field),
  );
  const reason = trimToNull(normalizedPayload.reason);

  if (disallowedFields.length > 0) {
    details.push(
      ...disallowedFields.map((field) => ({
        field,
        message: `${field} is not allowed in DELETE /admin/roles/{role_id}`,
      })),
    );
  }

  if (!reason) {
    details.push({
      field: 'reason',
      message: 'reason is required',
    });
  } else if (reason.length > 500) {
    details.push({
      field: 'reason',
      message: 'reason must be at most 500 characters',
    });
  }

  if (details.length > 0) {
    throw createValidationError(details);
  }

  return { reason };
};

const loadRoleById = async (queryExecutor, roleId, { forUpdate = false } = {}) => {
  const result = await queryExecutor(
    `
      SELECT
        id,
        code,
        name,
        description,
        level,
        is_system_role,
        created_at,
        updated_at
      FROM roles
      WHERE id = $1
      LIMIT 1
      ${forUpdate ? 'FOR UPDATE' : ''}
    `,
    [roleId],
  );

  return result.rows[0] || null;
};

const loadRoleByCode = async (queryExecutor, code) => {
  const result = await queryExecutor(
    `
      SELECT
        id,
        code,
        name,
        description,
        level,
        is_system_role,
        created_at,
        updated_at
      FROM roles
      WHERE code = $1
      LIMIT 1
    `,
    [code],
  );

  return result.rows[0] || null;
};

const loadRolePermissions = async (queryExecutor, roleId) => {
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

  return result.rows.map(mapPermission);
};

const loadSystemAdminRole = async (queryExecutor) => {
  const systemAdminRole = await loadRoleByCode(queryExecutor, SYSTEM_ADMIN_ROLE_CODE);

  if (!systemAdminRole) {
    throw new AppError('System admin role not found', {
      code: API_ERROR_CODES.INTERNAL_ERROR,
      statusCode: 500,
    });
  }

  return systemAdminRole;
};

const loadActorById = async (queryExecutor, actorUserId) => {
  const result = await queryExecutor(
    `
      SELECT
        u.id,
        u.role_id,
        r.code AS role_code,
        r.level AS role_level
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [actorUserId],
  );

  const actor = result.rows[0];

  if (!actor) {
    throw createNotFoundError('Authenticated system admin user not found');
  }

  return actor;
};

const countUsersByRoleId = async (queryExecutor, roleId) => {
  const result = await queryExecutor(
    `
      SELECT COUNT(*)::integer AS total
      FROM users
      WHERE role_id = $1
    `,
    [roleId],
  );

  return result.rows[0]?.total || 0;
};

const insertUserLog = async (
  client,
  {
    action,
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
      action,
      'roles',
      entityId,
      ipAddress || null,
      trimToNull(userAgent),
      metadata ? JSON.stringify(metadata) : null,
      createdAt,
    ],
  );

const createAdminRoleService = ({
  now = () => new Date(),
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getRoles = async () => {
    const result = await queryImpl(
      `
        SELECT
          id,
          code,
          name,
          description,
          level,
          is_system_role,
          created_at,
          updated_at
        FROM roles
        ORDER BY level DESC, code ASC
      `,
    );

    return result.rows.map(mapRole);
  };

  const getRoleById = async ({ roleId }) => {
    const normalizedRoleId = normalizeRoleId(roleId);
    const role = await loadRoleById(queryImpl, normalizedRoleId);

    if (!role) {
      throw createNotFoundError();
    }

    const permissions = await loadRolePermissions(queryImpl, normalizedRoleId);

    return {
      ...mapRole(role),
      permissions,
    };
  };

  const createRole = async ({
    actorRoleCode,
    actorUserId,
    ipAddress,
    payload,
    userAgent,
  }) => {
    if (actorRoleCode !== SYSTEM_ADMIN_ROLE_CODE) {
      throw createForbiddenError('Only system admin can create roles');
    }

    const input = normalizeCreateRolePayload(payload);

    try {
      return await withTransactionImpl(async (client) => {
        const systemAdminRole = await loadSystemAdminRole(client.query.bind(client));
        const existingRole = await loadRoleByCode(client.query.bind(client), input.code);

        if (existingRole) {
          throw createDuplicateRoleCodeError();
        }

        if (input.level >= systemAdminRole.level) {
          throw createForbiddenError(
            'Custom role level must be lower than system admin level',
          );
        }

        const createdAt = now();
        const result = await client.query(
          `
            INSERT INTO roles (
              code,
              name,
              description,
              level,
              is_system_role,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, FALSE, $5, $5)
            RETURNING
              id,
              code,
              name,
              description,
              level,
              is_system_role,
              created_at,
              updated_at
          `,
          [
            input.code,
            input.name,
            input.description,
            input.level,
            createdAt,
          ],
        );
        const role = result.rows[0];

        await insertUserLog(client, {
          action: ROLE_CREATE_ACTION,
          actorUserId,
          createdAt,
          entityId: role.id,
          ipAddress,
          metadata: {
            code: role.code,
            level: role.level,
            target_role_id: role.id,
          },
          userAgent,
        });

        return {
          ...mapRole(role),
          permissions: [],
        };
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw createDuplicateRoleCodeError();
      }

      throw error;
    }
  };

  const updateRole = async ({
    actorRoleCode,
    actorUserId,
    ipAddress,
    payload,
    roleId,
    userAgent,
  }) => {
    if (actorRoleCode !== SYSTEM_ADMIN_ROLE_CODE) {
      throw createForbiddenError('Only system admin can update roles');
    }

    const normalizedRoleId = normalizeRoleId(roleId);
    const input = normalizeUpdateRolePayload(payload);

    return withTransactionImpl(async (client) => {
      const actor = await loadActorById(client.query.bind(client), actorUserId);
      const systemAdminRole = await loadSystemAdminRole(client.query.bind(client));
      const role = await loadRoleById(client.query.bind(client), normalizedRoleId, {
        forUpdate: true,
      });

      if (!role) {
        throw createNotFoundError();
      }

      if (role.is_system_role) {
        throw createForbiddenError('System roles cannot be updated in MVP');
      }

      if (input.hasLevel && input.level >= systemAdminRole.level) {
        throw createForbiddenError(
          'Updated role level must be lower than system admin level',
        );
      }

      if (actor.role_id === role.id && input.hasLevel && input.level < actor.role_level) {
        throw createForbiddenError(
          'You cannot lower the level of the role currently assigned to your account',
        );
      }

      const setClauses = [];
      const params = [normalizedRoleId];
      let parameterIndex = 2;

      if (input.hasName) {
        setClauses.push(`name = $${parameterIndex}`);
        params.push(input.name);
        parameterIndex += 1;
      }

      if (input.hasDescription) {
        setClauses.push(`description = $${parameterIndex}`);
        params.push(input.description);
        parameterIndex += 1;
      }

      if (input.hasLevel) {
        setClauses.push(`level = $${parameterIndex}`);
        params.push(input.level);
        parameterIndex += 1;
      }

      const updatedAt = now();
      setClauses.push(`updated_at = $${parameterIndex}`);
      params.push(updatedAt);

      await client.query(
        `
          UPDATE roles
          SET ${setClauses.join(', ')}
          WHERE id = $1
        `,
        params,
      );

      const updatedRole = await loadRoleById(client.query.bind(client), normalizedRoleId);
      const permissions = await loadRolePermissions(client.query.bind(client), normalizedRoleId);

      await insertUserLog(client, {
        action: ROLE_UPDATE_ACTION,
        actorUserId,
        createdAt: updatedAt,
        entityId: normalizedRoleId,
        ipAddress,
        metadata: {
          changed_fields: [
            ...(input.hasName ? ['name'] : []),
            ...(input.hasDescription ? ['description'] : []),
            ...(input.hasLevel ? ['level'] : []),
          ],
          from_level: role.level,
          target_role_id: normalizedRoleId,
          to_level: updatedRole.level,
        },
        userAgent,
      });

      return {
        ...mapRole(updatedRole),
        permissions,
        sessions_revoked: input.hasLevel,
      };
    });
  };

  const deleteRole = async ({
    actorRoleCode,
    actorUserId,
    ipAddress,
    payload,
    roleId,
    userAgent,
  }) => {
    if (actorRoleCode !== SYSTEM_ADMIN_ROLE_CODE) {
      throw createForbiddenError('Only system admin can delete roles');
    }

    const normalizedRoleId = normalizeRoleId(roleId);
    const input = normalizeDeleteRolePayload(payload);

    return withTransactionImpl(async (client) => {
      const role = await loadRoleById(client.query.bind(client), normalizedRoleId, {
        forUpdate: true,
      });

      if (!role) {
        throw createNotFoundError();
      }

      if (role.is_system_role || DEFAULT_ROLE_CODES.has(role.code)) {
        throw createForbiddenError('System roles cannot be deleted');
      }

      const assignedUsers = await countUsersByRoleId(
        client.query.bind(client),
        normalizedRoleId,
      );

      if (assignedUsers > 0) {
        throw createValidationError([
          {
            field: 'role_id',
            message: 'Role is currently assigned to one or more users',
          },
        ]);
      }

      await client.query(
        `
          DELETE FROM role_permissions
          WHERE role_id = $1
        `,
        [normalizedRoleId],
      );

      await client.query(
        `
          DELETE FROM roles
          WHERE id = $1
        `,
        [normalizedRoleId],
      );

      const deletedAt = now();

      await insertUserLog(client, {
        action: ROLE_DELETE_ACTION,
        actorUserId,
        createdAt: deletedAt,
        entityId: normalizedRoleId,
        ipAddress,
        metadata: {
          code: role.code,
          reason: input.reason,
          target_role_id: normalizedRoleId,
        },
        userAgent,
      });

      return {
        deleted: true,
        id: normalizedRoleId,
        reason: input.reason,
      };
    });
  };

  return {
    createRole,
    deleteRole,
    getRoleById,
    getRoles,
    updateRole,
  };
};

module.exports = createAdminRoleService();
module.exports.ADMIN_ALLOWED_ROLE_CODES = ADMIN_ALLOWED_ROLE_CODES;
module.exports.ROLE_CREATE_ACTION = ROLE_CREATE_ACTION;
module.exports.ROLE_DELETE_ACTION = ROLE_DELETE_ACTION;
module.exports.ROLE_UPDATE_ACTION = ROLE_UPDATE_ACTION;
module.exports.createAdminRoleService = createAdminRoleService;
module.exports.normalizeCreateRolePayload = normalizeCreateRolePayload;
module.exports.normalizeDeleteRolePayload = normalizeDeleteRolePayload;
module.exports.normalizeRoleId = normalizeRoleId;
module.exports.normalizeUpdateRolePayload = normalizeUpdateRolePayload;
