const { query } = require('./client');

const buildListFilters = ({
  action,
  entityName,
  userId,
}) => {
  const conditions = [];
  const params = [];

  if (action) {
    params.push(action);
    conditions.push(`ul.action = $${params.length}`);
  }

  if (userId) {
    params.push(userId);
    conditions.push(`ul.user_id = $${params.length}::uuid`);
  }

  if (entityName) {
    params.push(entityName);
    conditions.push(`ul.entity_name = $${params.length}`);
  }

  return {
    params,
    whereSql: conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '',
  };
};

const createAdminAuditLogRepository = ({
  queryImpl = query,
} = {}) => {
  const listAuditLogs = async ({
    action,
    entityName,
    limit,
    offset,
    userId,
  }) => {
    const filters = buildListFilters({
      action,
      entityName,
      userId,
    });
    const listParams = [
      ...filters.params,
      limit,
      offset,
    ];

    const [rowsResult, totalResult] = await Promise.all([
      queryImpl(
        `
          SELECT
            ul.id,
            ul.user_id,
            ul.action,
            ul.entity_name,
            ul.entity_id,
            ul.created_at,
            (ul.metadata IS NOT NULL) AS has_metadata,
            u.full_name AS actor_full_name,
            u.deleted_at AS actor_deleted_at,
            r.code AS actor_role_code
          FROM user_logs ul
          LEFT JOIN users u
            ON u.id = ul.user_id
          LEFT JOIN roles r
            ON r.id = u.role_id
          ${filters.whereSql}
          ORDER BY ul.created_at DESC, ul.id DESC
          LIMIT $${filters.params.length + 1}
          OFFSET $${filters.params.length + 2}
        `,
        listParams,
      ),
      queryImpl(
        `
          SELECT COUNT(*)::int AS total
          FROM user_logs ul
          ${filters.whereSql}
        `,
        filters.params,
      ),
    ]);

    return {
      rows: rowsResult.rows,
      total: totalResult.rows[0]?.total || 0,
    };
  };

  const getAuditLogById = async (logId) => {
    const result = await queryImpl(
      `
        SELECT
          ul.id,
          ul.user_id,
          ul.action,
          ul.entity_name,
          ul.entity_id,
          ul.ip_address::text AS ip_address,
          ul.user_agent,
          ul.metadata,
          ul.created_at,
          u.full_name AS actor_full_name,
          u.deleted_at AS actor_deleted_at,
          r.code AS actor_role_code
        FROM user_logs ul
        LEFT JOIN users u
          ON u.id = ul.user_id
        LEFT JOIN roles r
          ON r.id = u.role_id
        WHERE ul.id = $1::uuid
        LIMIT 1
      `,
      [logId],
    );

    return result.rows[0] || null;
  };

  return {
    getAuditLogById,
    listAuditLogs,
  };
};

module.exports = Object.assign(createAdminAuditLogRepository(), {
  createAdminAuditLogRepository,
});
