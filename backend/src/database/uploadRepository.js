const { query: defaultQuery } = require('./client');

const createUploadRepository = ({
  query = defaultQuery,
} = {}) => {
  const listPermissionCodesByRoleId = async (roleId) => {
    const result = await query(
      `
        SELECT p.code
        FROM role_permissions rp
        JOIN permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = $1
        ORDER BY p.code ASC
      `,
      [roleId],
    );

    return result.rows.map((row) => row.code);
  };

  const insertUserLog = async ({
    action,
    entityId,
    entityName = 'uploads',
    ipAddress,
    metadata,
    userAgent,
    userId,
  } = {}) =>
    query(
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
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
      `,
      [
        userId || null,
        action,
        entityName,
        entityId || null,
        ipAddress || null,
        userAgent || null,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

  return {
    insertUserLog,
    listPermissionCodesByRoleId,
  };
};

module.exports = {
  createUploadRepository,
};
