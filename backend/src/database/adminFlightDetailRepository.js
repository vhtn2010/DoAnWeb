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
    [userId, action, 'flight_detail', entityId, metadata || null],
  );
};

const mapFlightDetailRow = (row) => ({
  airline_name: row.airline_name,
  arrival_airport: row.arrival_airport,
  arrival_at: row.arrival_at,
  cabin_class: row.cabin_class,
  departure_airport: row.departure_airport,
  departure_at: row.departure_at,
  fare_price: Number(row.fare_price),
  flight_number: row.flight_number,
  id: row.id,
  seats_available: Number(row.seats_available),
  seats_total: Number(row.seats_total),
  service_id: row.service_id,
  status: row.status,
});

const createAdminFlightDetailRepository = ({
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

  const getFlightDetailById = async (flightDetailId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          airline_name,
          flight_number,
          departure_airport,
          arrival_airport,
          departure_at,
          arrival_at,
          cabin_class,
          seats_total,
          seats_available,
          fare_price,
          status
        FROM flight_details
        WHERE id = $1
        LIMIT 1
      `,
      [flightDetailId],
    );

    return result.rows[0] ? mapFlightDetailRow(result.rows[0]) : null;
  };

  const flightDetailHasBookings = async (flightDetailId) => {
    const result = await queryImpl(
      `
        SELECT 1
        FROM booking_items
        WHERE reference_id = $1
        LIMIT 1
      `,
      [flightDetailId],
    );

    return result.rows.length > 0;
  };

  const createFlightDetail = async ({
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
          INSERT INTO flight_details (
            service_id,
            airline_name,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_at,
            arrival_at,
            cabin_class,
            seats_total,
            seats_available,
            fare_price,
            status
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          )
          RETURNING
            id,
            service_id,
            airline_name,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_at,
            arrival_at,
            cabin_class,
            seats_total,
            seats_available,
            fare_price,
            status
        `,
        [
          serviceId,
          payload.airline_name,
          payload.flight_number,
          payload.departure_airport,
          payload.arrival_airport,
          payload.departure_at,
          payload.arrival_at,
          payload.cabin_class,
          payload.seats_total,
          payload.seats_available,
          payload.fare_price,
          payload.status,
        ],
      );

      await logUserAction(client, {
        action: 'admin.flight_detail.create',
        entityId: created.rows[0].id,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapFlightDetailRow(created.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const updateFlightDetail = async ({
    actorUserId,
    flightDetailId,
    logMetadata,
    payload,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const assignments = [];
      const params = [flightDetailId];
      let index = 2;

      for (const [key, value] of Object.entries(payload)) {
        assignments.push(`${key} = $${index}`);
        params.push(value);
        index += 1;
      }

      const updated = await client.query(
        `
          UPDATE flight_details
          SET ${assignments.join(', ')}
          WHERE id = $1
          RETURNING
            id,
            service_id,
            airline_name,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_at,
            arrival_at,
            cabin_class,
            seats_total,
            seats_available,
            fare_price,
            status
        `,
        params,
      );

      await logUserAction(client, {
        action: 'admin.flight_detail.update',
        entityId: flightDetailId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapFlightDetailRow(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const cancelFlightDetail = async ({
    actorUserId,
    flightDetailId,
    logMetadata,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const updated = await client.query(
        `
          UPDATE flight_details
          SET status = 'cancelled'
          WHERE id = $1
          RETURNING
            id,
            service_id,
            airline_name,
            flight_number,
            departure_airport,
            arrival_airport,
            departure_at,
            arrival_at,
            cabin_class,
            seats_total,
            seats_available,
            fare_price,
            status
        `,
        [flightDetailId],
      );

      await logUserAction(client, {
        action: 'admin.flight_detail.delete',
        entityId: flightDetailId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapFlightDetailRow(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    cancelFlightDetail,
    createFlightDetail,
    flightDetailHasBookings,
    getFlightDetailById,
    getServiceById,
    updateFlightDetail,
  };
};

const adminFlightDetailRepository = createAdminFlightDetailRepository();

module.exports = {
  cancelFlightDetail: adminFlightDetailRepository.cancelFlightDetail,
  createAdminFlightDetailRepository,
  createFlightDetail: adminFlightDetailRepository.createFlightDetail,
  flightDetailHasBookings: adminFlightDetailRepository.flightDetailHasBookings,
  getFlightDetailById: adminFlightDetailRepository.getFlightDetailById,
  getServiceById: adminFlightDetailRepository.getServiceById,
  updateFlightDetail: adminFlightDetailRepository.updateFlightDetail,
};
