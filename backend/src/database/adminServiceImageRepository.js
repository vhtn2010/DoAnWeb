const { getPool, query } = require('./queryClient');

const buildScopedWhere = ({
  allowedServiceIds,
  serviceId,
}) => {
  const params = [serviceId];
  const conditions = [
    's.id = $1',
    's.deleted_at IS NULL',
    `s.status <> 'deleted'`,
  ];

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

const mapImageRow = (row) => ({
  alt_text: row.alt_text,
  cloudinary_public_id: row.cloudinary_public_id,
  created_at: row.created_at,
  id: row.id,
  image_url: row.image_url,
  is_primary: Boolean(row.is_primary),
  service_id: row.service_id,
  sort_order: Number(row.sort_order),
});

const createAdminServiceImageRepository = ({
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
          s.service_type,
          s.status,
          s.deleted_at
        FROM services s
        ${whereSql}
        LIMIT 1
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const getImageById = async (imageId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          image_url,
          cloudinary_public_id,
          alt_text,
          sort_order,
          is_primary,
          created_at
        FROM service_images
        WHERE id = $1
        LIMIT 1
      `,
      [imageId],
    );

    return result.rows[0] ? mapImageRow(result.rows[0]) : null;
  };

  const listImagesByService = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          image_url,
          cloudinary_public_id,
          alt_text,
          sort_order,
          is_primary,
          created_at
        FROM service_images
        WHERE service_id = $1
        ORDER BY is_primary DESC, sort_order ASC, created_at ASC, id ASC
      `,
      [serviceId],
    );

    return result.rows.map(mapImageRow);
  };

  const createImage = async ({
    actorUserId,
    serviceId,
    payload,
    logMetadata,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (payload.is_primary) {
        await client.query(
          `
            UPDATE service_images
            SET is_primary = FALSE
            WHERE service_id = $1
              AND is_primary = TRUE
          `,
          [serviceId],
        );
      }

      const created = await client.query(
        `
          INSERT INTO service_images (
            service_id,
            image_url,
            cloudinary_public_id,
            alt_text,
            sort_order,
            is_primary,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          RETURNING
            id,
            service_id,
            image_url,
            cloudinary_public_id,
            alt_text,
            sort_order,
            is_primary,
            created_at
        `,
        [
          serviceId,
          payload.image_url,
          payload.cloudinary_public_id,
          payload.alt_text,
          payload.sort_order,
          payload.is_primary,
        ],
      );

      await logUserAction(client, {
        action: 'admin.service.image.create',
        entityId: serviceId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapImageRow(created.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const updateImage = async ({
    actorUserId,
    imageId,
    payload,
    serviceId,
    logMetadata,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (payload.is_primary === true) {
        await client.query(
          `
            UPDATE service_images
            SET is_primary = FALSE
            WHERE service_id = $1
              AND id <> $2
              AND is_primary = TRUE
          `,
          [serviceId, imageId],
        );
      }

      const assignments = [];
      const params = [imageId];
      let index = 2;

      for (const [key, value] of Object.entries(payload)) {
        assignments.push(`${key} = $${index}`);
        params.push(value);
        index += 1;
      }

      const updated = await client.query(
        `
          UPDATE service_images
          SET ${assignments.join(', ')}
          WHERE id = $1
          RETURNING
            id,
            service_id,
            image_url,
            cloudinary_public_id,
            alt_text,
            sort_order,
            is_primary,
            created_at
        `,
        params,
      );

      await logUserAction(client, {
        action: 'admin.service.image.update',
        entityId: serviceId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapImageRow(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const deleteImage = async ({
    actorUserId,
    image,
    serviceId,
    logMetadata,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
          DELETE FROM service_images
          WHERE id = $1
        `,
        [image.id],
      );

      let promotedImage = null;

      if (image.is_primary) {
        const nextPrimary = await client.query(
          `
            SELECT id
            FROM service_images
            WHERE service_id = $1
            ORDER BY sort_order ASC, created_at ASC, id ASC
            LIMIT 1
          `,
          [serviceId],
        );

        if (nextPrimary.rows[0]) {
          const promoted = await client.query(
            `
              UPDATE service_images
              SET is_primary = TRUE
              WHERE id = $1
              RETURNING
                id,
                service_id,
                image_url,
                cloudinary_public_id,
                alt_text,
                sort_order,
                is_primary,
                created_at
            `,
            [nextPrimary.rows[0].id],
          );

          promotedImage = mapImageRow(promoted.rows[0]);
        }
      }

      await logUserAction(client, {
        action: 'admin.service.image.delete',
        entityId: serviceId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return {
        promotedImage,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const reorderImages = async ({
    actorUserId,
    imageOrders,
    serviceId,
    logMetadata,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      for (const item of imageOrders) {
        await client.query(
          `
            UPDATE service_images
            SET sort_order = $2
            WHERE id = $1
          `,
          [item.image_id, item.sort_order],
        );
      }

      await logUserAction(client, {
        action: 'admin.service.image.reorder',
        entityId: serviceId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    createImage,
    deleteImage,
    getImageById,
    getServiceById,
    listImagesByService,
    reorderImages,
    updateImage,
  };
};

const adminServiceImageRepository = createAdminServiceImageRepository();

module.exports = {
  createAdminServiceImageRepository,
  createImage: adminServiceImageRepository.createImage,
  deleteImage: adminServiceImageRepository.deleteImage,
  getImageById: adminServiceImageRepository.getImageById,
  getServiceById: adminServiceImageRepository.getServiceById,
  listImagesByService: adminServiceImageRepository.listImagesByService,
  reorderImages: adminServiceImageRepository.reorderImages,
  updateImage: adminServiceImageRepository.updateImage,
};
