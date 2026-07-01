const { getPool, query } = require('./client');

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
    [userId, action, 'train_detail', entityId, metadata || null],
  );
};

const mapTrainDetailRow = (row) => ({
  arrival_at: row.arrival_at,
  arrival_station: row.arrival_station,
  departure_at: row.departure_at,
  departure_station: row.departure_station,
  fare_price: Number(row.fare_price),
  id: row.id,
  seat_class: row.seat_class,
  seats_available: Number(row.seats_available),
  seats_total: Number(row.seats_total),
  service_id: row.service_id,
  status: row.status,
  train_number: row.train_number,
});

const createAdminTrainDetailRepository = ({
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

  const getTrainDetailById = async (trainDetailId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          train_number,
          departure_station,
          arrival_station,
          departure_at,
          arrival_at,
          seat_class,
          seats_total,
          seats_available,
          fare_price,
          status
        FROM train_details
        WHERE id = $1
        LIMIT 1
      `,
      [trainDetailId],
    );

    return result.rows[0] ? mapTrainDetailRow(result.rows[0]) : null;
  };

  const trainDetailHasBookings = async (trainDetailId) => {
    const result = await queryImpl(
      `
        SELECT 1
        FROM booking_items
        WHERE reference_id = $1
        LIMIT 1
      `,
      [trainDetailId],
    );

    return result.rows.length > 0;
  };

  const createTrainDetail = async ({
    actorUserId,
    logMetadata,
    payload,
    serviceId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const created = await client.query(
        `
          INSERT INTO train_details (
            service_id,
            train_number,
            departure_station,
            arrival_station,
            departure_at,
            arrival_at,
            seat_class,
            seats_total,
            seats_available,
            fare_price,
            status
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
          )
          RETURNING
            id,
            service_id,
            train_number,
            departure_station,
            arrival_station,
            departure_at,
            arrival_at,
            seat_class,
            seats_total,
            seats_available,
            fare_price,
            status
        `,
        [
          serviceId,
          payload.train_number,
          payload.departure_station,
          payload.arrival_station,
          payload.departure_at,
          payload.arrival_at,
          payload.seat_class,
          payload.seats_total,
          payload.seats_available,
          payload.fare_price,
          payload.status,
        ],
      );

      await logUserAction(client, {
        action: 'admin.train_detail.create',
        entityId: created.rows[0].id,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapTrainDetailRow(created.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const updateTrainDetail = async ({
    actorUserId,
    logMetadata,
    payload,
    trainDetailId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const assignments = [];
      const params = [trainDetailId];
      let index = 2;

      for (const [key, value] of Object.entries(payload)) {
        assignments.push(`${key} = $${index}`);
        params.push(value);
        index += 1;
      }

      const updated = await client.query(
        `
          UPDATE train_details
          SET ${assignments.join(', ')}
          WHERE id = $1
          RETURNING
            id,
            service_id,
            train_number,
            departure_station,
            arrival_station,
            departure_at,
            arrival_at,
            seat_class,
            seats_total,
            seats_available,
            fare_price,
            status
        `,
        params,
      );

      await logUserAction(client, {
        action: 'admin.train_detail.update',
        entityId: trainDetailId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapTrainDetailRow(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const cancelTrainDetail = async ({
    actorUserId,
    logMetadata,
    trainDetailId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const updated = await client.query(
        `
          UPDATE train_details
          SET status = 'cancelled'
          WHERE id = $1
          RETURNING
            id,
            service_id,
            train_number,
            departure_station,
            arrival_station,
            departure_at,
            arrival_at,
            seat_class,
            seats_total,
            seats_available,
            fare_price,
            status
        `,
        [trainDetailId],
      );

      await logUserAction(client, {
        action: 'admin.train_detail.delete',
        entityId: trainDetailId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapTrainDetailRow(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    cancelTrainDetail,
    createTrainDetail,
    getServiceById,
    getTrainDetailById,
    trainDetailHasBookings,
    updateTrainDetail,
  };
};

const adminTrainDetailRepository = createAdminTrainDetailRepository();

module.exports = {
  cancelTrainDetail: adminTrainDetailRepository.cancelTrainDetail,
  createAdminTrainDetailRepository,
  createTrainDetail: adminTrainDetailRepository.createTrainDetail,
  getServiceById: adminTrainDetailRepository.getServiceById,
  getTrainDetailById: adminTrainDetailRepository.getTrainDetailById,
  trainDetailHasBookings: adminTrainDetailRepository.trainDetailHasBookings,
  updateTrainDetail: adminTrainDetailRepository.updateTrainDetail,
};
