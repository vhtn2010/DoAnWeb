const { getPool, query } = require('./client');

const buildScopedWhere = ({
  allowedServiceIds,
  includeDeleted = true,
  serviceId,
}) => {
  const params = [serviceId];
  const conditions = ['s.id = $1'];

  if (!includeDeleted) {
    conditions.push('s.deleted_at IS NULL');
  }

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

const buildChildScopeSql = ({
  allowedServiceIds,
  serviceIds,
}) => {
  const params = [serviceIds];
  const conditions = ['s.id = ANY($1::uuid[])'];

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

const createAdminComboRepository = ({
  getPoolImpl = getPool,
  queryImpl = query,
} = {}) => {
  const getServiceById = async ({
    allowedServiceIds,
    includeDeleted = true,
    serviceId,
  }) => {
    const { params, whereSql } = buildScopedWhere({
      allowedServiceIds,
      includeDeleted,
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

  const getServiceBySlug = async ({
    excludeServiceId,
    slug,
  }) => {
    const params = [slug];
    let sql = `
      SELECT id, slug
      FROM services
      WHERE slug = $1
    `;

    if (excludeServiceId) {
      params.push(excludeServiceId);
      sql += ` AND id <> $${params.length}`;
    }

    sql += ' LIMIT 1';
    const result = await queryImpl(sql, params);
    return result.rows[0] || null;
  };

  const getServiceByCode = async ({
    excludeServiceId,
    serviceCode,
  }) => {
    const params = [serviceCode];
    let sql = `
      SELECT id, service_code
      FROM services
      WHERE service_code = $1
    `;

    if (excludeServiceId) {
      params.push(excludeServiceId);
      sql += ` AND id <> $${params.length}`;
    }

    sql += ' LIMIT 1';
    const result = await queryImpl(sql, params);
    return result.rows[0] || null;
  };

  const getServicesByIds = async ({
    allowedServiceIds,
    serviceIds,
  }) => {
    if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
      return [];
    }

    const { params, whereSql } = buildChildScopeSql({
      allowedServiceIds,
      serviceIds,
    });
    const result = await queryImpl(
      `
        SELECT
          s.id,
          s.service_type,
          s.title,
          s.slug,
          s.short_description,
          s.location_text,
          s.base_price,
          s.sale_price,
          s.status,
          s.deleted_at
        FROM services s
        ${whereSql}
      `,
      params,
    );

    return result.rows;
  };

  const createCombo = async ({
    actorUserId,
    logMetadata,
    servicePayload,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const created = await client.query(
        `
          INSERT INTO services (
            service_code,
            service_type,
            title,
            slug,
            short_description,
            description,
            provider_name,
            location_text,
            base_price,
            sale_price,
            currency,
            status,
            cancellation_policy,
            metadata,
            created_by,
            updated_by,
            approved_by,
            approved_at,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            $1, 'combo', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
            $14, $14, NULL, NULL, NOW(), NOW(), NULL
          )
          RETURNING id
        `,
        [
          servicePayload.service_code,
          servicePayload.title,
          servicePayload.slug,
          servicePayload.short_description,
          servicePayload.description,
          servicePayload.provider_name,
          servicePayload.location_text,
          servicePayload.base_price,
          servicePayload.sale_price,
          servicePayload.currency,
          servicePayload.status,
          servicePayload.cancellation_policy,
          servicePayload.metadata,
          actorUserId,
        ],
      );

      await logUserAction(client, {
        action: 'admin.service.combo.create',
        entityId: created.rows[0].id,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return created.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const updateCombo = async ({
    actorUserId,
    logMetadata,
    serviceId,
    servicePayload,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (Object.keys(servicePayload).length > 0) {
        const assignments = [];
        const params = [serviceId];
        let index = 2;

        for (const [key, value] of Object.entries(servicePayload)) {
          assignments.push(`${key} = $${index}`);
          params.push(value);
          index += 1;
        }

        assignments.push(`updated_by = $${index}`);
        params.push(actorUserId);
        assignments.push('updated_at = NOW()');

        await client.query(
          `
            UPDATE services
            SET ${assignments.join(', ')}
            WHERE id = $1
          `,
          params,
        );
      } else {
        await client.query(
          `
            UPDATE services
            SET updated_by = $2, updated_at = NOW()
            WHERE id = $1
          `,
          [serviceId, actorUserId],
        );
      }

      await logUserAction(client, {
        action: 'admin.service.combo.update',
        entityId: serviceId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return { id: serviceId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    createCombo,
    getServiceByCode,
    getServiceById,
    getServiceBySlug,
    getServicesByIds,
    updateCombo,
  };
};

const adminComboRepository = createAdminComboRepository();

module.exports = {
  createAdminComboRepository,
  createCombo: adminComboRepository.createCombo,
  getServiceByCode: adminComboRepository.getServiceByCode,
  getServiceById: adminComboRepository.getServiceById,
  getServiceBySlug: adminComboRepository.getServiceBySlug,
  getServicesByIds: adminComboRepository.getServicesByIds,
  updateCombo: adminComboRepository.updateCombo,
};
