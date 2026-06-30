const { getPool, query } = require('./queryClient');

const buildScopedWhere = ({
  allowedServiceIds,
  serviceId,
}) => {
  const params = [serviceId];
  const conditions = ['s.id = $1'];

  if (Array.isArray(allowedServiceIds)) {
    if (allowedServiceIds.length === 0) {
      conditions.push('1 = 0');
    } else {
      params.push(allowedServiceIds);
      conditions.push(`s.id = ANY($${params.length}::uuid[])`);
    }
  }

  return {
    params,
    whereSql: `WHERE ${conditions.join('\n        AND ')}`,
  };
};

const logUserAction = async (client, {
  action,
  entityId,
  metadata,
  userId,
}) => {
  await client.query(
    `
      INSERT INTO user_logs (
        user_id,
        action,
        entity_name,
        entity_id,
        metadata,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
    `,
    [userId, action, 'service', entityId, metadata || null],
  );
};

const createAdminServiceWorkflowRepository = ({
  getPoolImpl = getPool,
  queryImpl = query,
} = {}) => {
  const getServiceById = async ({
    allowedServiceIds,
    serviceId,
  }) => {
    const { params, whereSql } = buildScopedWhere({
      allowedServiceIds,
      serviceId,
    });
    const result = await queryImpl(
      `
        SELECT
          s.id,
          s.service_code,
          s.service_type,
          s.title,
          s.slug,
          s.short_description,
          s.description,
          s.provider_name,
          s.location_text,
          s.base_price,
          s.sale_price,
          s.currency,
          s.status,
          s.cancellation_policy,
          s.metadata,
          s.created_by,
          s.updated_by,
          s.approved_by,
          s.approved_at,
          s.created_at,
          s.updated_at,
          s.deleted_at
        FROM services s
        ${whereSql}
        LIMIT 1
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const updateWorkflowStatus = async ({
    action,
    actorUserId,
    metadata,
    serviceId,
    updates,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const assignments = [];
      const params = [serviceId];
      let index = 2;

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) {
          continue;
        }

        if (value && typeof value === 'object' && value.__raw === 'NOW()') {
          assignments.push(`${key} = NOW()`);
          continue;
        }

        assignments.push(`${key} = $${index}`);
        params.push(value);
        index += 1;
      }

      assignments.push(`updated_by = $${index}`);
      params.push(actorUserId);
      assignments.push('updated_at = NOW()');

      const result = await client.query(
        `
          UPDATE services
          SET ${assignments.join(', ')}
          WHERE id = $1
          RETURNING
            id,
            status,
            approved_by,
            approved_at,
            updated_at,
            deleted_at
        `,
        params,
      );

      await logUserAction(client, {
        action,
        entityId: serviceId,
        metadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return result.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    getServiceById,
    updateWorkflowStatus,
  };
};

const adminServiceWorkflowRepository = createAdminServiceWorkflowRepository();

module.exports = {
  createAdminServiceWorkflowRepository,
  getServiceById: adminServiceWorkflowRepository.getServiceById,
  updateWorkflowStatus: adminServiceWorkflowRepository.updateWorkflowStatus,
};
