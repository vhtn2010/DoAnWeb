const { getPool, query } = require('./queryClient');

const FINAL_BOOKING_STATUSES = Object.freeze([
  'completed',
  'cancelled',
  'refunded',
  'failed',
  'expired',
]);

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

const createAdminServiceCrudRepository = ({
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

  const getServiceBySlug = async ({ excludeServiceId, slug }) => {
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

  const getServiceByCode = async ({ excludeServiceId, serviceCode }) => {
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

  const hasBlockingBookings = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT 1
        FROM booking_items bi
        INNER JOIN bookings b ON b.id = bi.booking_id
        WHERE bi.service_id = $1
          AND b.status <> ALL($2::booking_status[])
        LIMIT 1
      `,
      [serviceId, FINAL_BOOKING_STATUSES],
    );

    return result.rows.length > 0;
  };

  const upsertTourDetails = async (client, serviceId, details) => {
    await client.query(
      `
        INSERT INTO tour_details (
          service_id,
          departure_location,
          destination_location,
          duration_days,
          duration_nights,
          transport_type,
          max_group_size,
          departure_schedule,
          itinerary,
          included_services,
          excluded_services,
          terms
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        )
        ON CONFLICT (service_id) DO UPDATE SET
          departure_location = EXCLUDED.departure_location,
          destination_location = EXCLUDED.destination_location,
          duration_days = EXCLUDED.duration_days,
          duration_nights = EXCLUDED.duration_nights,
          transport_type = EXCLUDED.transport_type,
          max_group_size = EXCLUDED.max_group_size,
          departure_schedule = EXCLUDED.departure_schedule,
          itinerary = EXCLUDED.itinerary,
          included_services = EXCLUDED.included_services,
          excluded_services = EXCLUDED.excluded_services,
          terms = EXCLUDED.terms
      `,
      [
        serviceId,
        details.departure_location,
        details.destination_location,
        details.duration_days,
        details.duration_nights,
        details.transport_type,
        details.max_group_size,
        details.departure_schedule,
        details.itinerary,
        details.included_services,
        details.excluded_services,
        details.terms,
      ],
    );
  };

  const upsertHotelDetails = async (client, serviceId, details) => {
    await client.query(
      `
        INSERT INTO hotel_details (
          service_id,
          star_rating,
          address,
          checkin_time,
          checkout_time,
          amenities,
          hotel_policy
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (service_id) DO UPDATE SET
          star_rating = EXCLUDED.star_rating,
          address = EXCLUDED.address,
          checkin_time = EXCLUDED.checkin_time,
          checkout_time = EXCLUDED.checkout_time,
          amenities = EXCLUDED.amenities,
          hotel_policy = EXCLUDED.hotel_policy
      `,
      [
        serviceId,
        details.star_rating,
        details.address,
        details.checkin_time,
        details.checkout_time,
        details.amenities,
        details.hotel_policy,
      ],
    );
  };

  const upsertFlightDetails = async (client, serviceId, details) => {
    const existing = await client.query(
      `
        SELECT id
        FROM flight_details
        WHERE service_id = $1
        ORDER BY departure_at ASC, id ASC
        LIMIT 1
      `,
      [serviceId],
    );

    if (existing.rows[0]) {
      await client.query(
        `
          UPDATE flight_details
          SET
            airline_name = $2,
            flight_number = $3,
            departure_airport = $4,
            arrival_airport = $5,
            departure_at = $6,
            arrival_at = $7,
            cabin_class = $8,
            seats_total = $9,
            seats_available = $10,
            fare_price = $11,
            status = $12
          WHERE id = $1
        `,
        [
          existing.rows[0].id,
          details.airline_name,
          details.flight_number,
          details.departure_airport,
          details.arrival_airport,
          details.departure_at,
          details.arrival_at,
          details.cabin_class,
          details.seats_total,
          details.seats_available,
          details.fare_price,
          details.status,
        ],
      );
      return;
    }

    await client.query(
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
      `,
      [
        serviceId,
        details.airline_name,
        details.flight_number,
        details.departure_airport,
        details.arrival_airport,
        details.departure_at,
        details.arrival_at,
        details.cabin_class,
        details.seats_total,
        details.seats_available,
        details.fare_price,
        details.status,
      ],
    );
  };

  const upsertTrainDetails = async (client, serviceId, details) => {
    const existing = await client.query(
      `
        SELECT id
        FROM train_details
        WHERE service_id = $1
        ORDER BY departure_at ASC, id ASC
        LIMIT 1
      `,
      [serviceId],
    );

    if (existing.rows[0]) {
      await client.query(
        `
          UPDATE train_details
          SET
            train_number = $2,
            departure_station = $3,
            arrival_station = $4,
            departure_at = $5,
            arrival_at = $6,
            seat_class = $7,
            seats_total = $8,
            seats_available = $9,
            fare_price = $10,
            status = $11
          WHERE id = $1
        `,
        [
          existing.rows[0].id,
          details.train_number,
          details.departure_station,
          details.arrival_station,
          details.departure_at,
          details.arrival_at,
          details.seat_class,
          details.seats_total,
          details.seats_available,
          details.fare_price,
          details.status,
        ],
      );
      return;
    }

    await client.query(
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
      `,
      [
        serviceId,
        details.train_number,
        details.departure_station,
        details.arrival_station,
        details.departure_at,
        details.arrival_at,
        details.seat_class,
        details.seats_total,
        details.seats_available,
        details.fare_price,
        details.status,
      ],
    );
  };

  const createService = async ({
    actorUserId,
    detailPayload,
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
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
            $15, $15, NULL, NULL, NOW(), NOW(), NULL
          )
          RETURNING id
        `,
        [
          servicePayload.service_code,
          servicePayload.service_type,
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
      const serviceId = created.rows[0].id;

      if (servicePayload.service_type === 'tour') {
        await upsertTourDetails(client, serviceId, detailPayload);
      } else if (servicePayload.service_type === 'hotel') {
        await upsertHotelDetails(client, serviceId, detailPayload);
      } else if (servicePayload.service_type === 'flight') {
        await upsertFlightDetails(client, serviceId, detailPayload);
      } else if (servicePayload.service_type === 'train') {
        await upsertTrainDetails(client, serviceId, detailPayload);
      }

      await logUserAction(client, {
        action: 'admin.service.create',
        entityId: serviceId,
        metadata: {
          service_type: servicePayload.service_type,
          title: servicePayload.title,
        },
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

  const updateService = async ({
    actorUserId,
    detailPayload,
    serviceId,
    servicePayload,
    serviceType,
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
        index += 1;
        assignments.push(`updated_at = NOW()`);

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

      if (detailPayload) {
        if (serviceType === 'tour') {
          await upsertTourDetails(client, serviceId, detailPayload);
        } else if (serviceType === 'hotel') {
          await upsertHotelDetails(client, serviceId, detailPayload);
        } else if (serviceType === 'flight') {
          await upsertFlightDetails(client, serviceId, detailPayload);
        } else if (serviceType === 'train') {
          await upsertTrainDetails(client, serviceId, detailPayload);
        }
      }

      await logUserAction(client, {
        action: 'admin.service.update',
        entityId: serviceId,
        metadata: {
          updated_fields: Object.keys(servicePayload),
        },
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

  const softDeleteService = async ({
    actorUserId,
    reason,
    serviceId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const deleted = await client.query(
        `
          UPDATE services
          SET
            status = 'deleted',
            deleted_at = NOW(),
            updated_by = $2,
            updated_at = NOW()
          WHERE id = $1
          RETURNING id, status, deleted_at
        `,
        [serviceId, actorUserId],
      );

      await logUserAction(client, {
        action: 'admin.service.delete',
        entityId: serviceId,
        metadata: {
          reason,
        },
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return deleted.rows[0] || null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    createService,
    getServiceByCode,
    getServiceById,
    getServiceBySlug,
    hasBlockingBookings,
    softDeleteService,
    updateService,
  };
};

const adminServiceCrudRepository = createAdminServiceCrudRepository();

module.exports = {
  createAdminServiceCrudRepository,
  createService: adminServiceCrudRepository.createService,
  getServiceByCode: adminServiceCrudRepository.getServiceByCode,
  getServiceById: adminServiceCrudRepository.getServiceById,
  getServiceBySlug: adminServiceCrudRepository.getServiceBySlug,
  hasBlockingBookings: adminServiceCrudRepository.hasBlockingBookings,
  softDeleteService: adminServiceCrudRepository.softDeleteService,
  updateService: adminServiceCrudRepository.updateService,
};
