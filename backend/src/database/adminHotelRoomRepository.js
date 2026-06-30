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
    [userId, action, 'room_type', entityId, metadata || null],
  );
};

const mapRoomRow = (row) => ({
  available_rooms: Number(row.available_rooms),
  base_price: Number(row.base_price),
  bed_type: row.bed_type,
  created_at: row.created_at,
  description: row.description,
  hotel_service_id: row.hotel_service_id,
  id: row.id,
  max_adults: Number(row.max_adults),
  max_children: Number(row.max_children),
  name: row.name,
  status: row.status,
  total_rooms: Number(row.total_rooms),
  updated_at: row.updated_at,
});

const createAdminHotelRoomRepository = ({
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

  const listRoomsByHotel = async ({
    hotelServiceId,
    status,
  }) => {
    const params = [hotelServiceId];
    let whereSql = 'WHERE hotel_service_id = $1';

    if (status) {
      params.push(status);
      whereSql += ` AND status = $${params.length}`;
    }

    const result = await queryImpl(
      `
        SELECT
          id,
          hotel_service_id,
          name,
          bed_type,
          max_adults,
          max_children,
          total_rooms,
          available_rooms,
          base_price,
          description,
          status,
          created_at,
          updated_at
        FROM room_types
        ${whereSql}
        ORDER BY created_at DESC, id ASC
      `,
      params,
    );

    return result.rows.map(mapRoomRow);
  };

  const getRoomById = async (roomTypeId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          hotel_service_id,
          name,
          bed_type,
          max_adults,
          max_children,
          total_rooms,
          available_rooms,
          base_price,
          description,
          status,
          created_at,
          updated_at
        FROM room_types
        WHERE id = $1
        LIMIT 1
      `,
      [roomTypeId],
    );

    return result.rows[0] ? mapRoomRow(result.rows[0]) : null;
  };

  const roomHasBookings = async (roomTypeId) => {
    const result = await queryImpl(
      `
        SELECT 1
        FROM booking_items
        WHERE reference_id = $1
        LIMIT 1
      `,
      [roomTypeId],
    );

    return result.rows.length > 0;
  };

  const createRoom = async ({
    actorUserId,
    hotelServiceId,
    logMetadata,
    payload,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const created = await client.query(
        `
          INSERT INTO room_types (
            hotel_service_id,
            name,
            bed_type,
            max_adults,
            max_children,
            total_rooms,
            available_rooms,
            base_price,
            description,
            status,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
          RETURNING
            id,
            hotel_service_id,
            name,
            bed_type,
            max_adults,
            max_children,
            total_rooms,
            available_rooms,
            base_price,
            description,
            status,
            created_at,
            updated_at
        `,
        [
          hotelServiceId,
          payload.name,
          payload.bed_type,
          payload.max_adults,
          payload.max_children,
          payload.total_rooms,
          payload.available_rooms,
          payload.base_price,
          payload.description,
          payload.status,
        ],
      );

      await logUserAction(client, {
        action: 'admin.hotel_room.create',
        entityId: created.rows[0].id,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapRoomRow(created.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const updateRoom = async ({
    actorUserId,
    logMetadata,
    payload,
    roomTypeId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const assignments = [];
      const params = [roomTypeId];
      let index = 2;

      for (const [key, value] of Object.entries(payload)) {
        assignments.push(`${key} = $${index}`);
        params.push(value);
        index += 1;
      }

      assignments.push('updated_at = NOW()');

      const updated = await client.query(
        `
          UPDATE room_types
          SET ${assignments.join(', ')}
          WHERE id = $1
          RETURNING
            id,
            hotel_service_id,
            name,
            bed_type,
            max_adults,
            max_children,
            total_rooms,
            available_rooms,
            base_price,
            description,
            status,
            created_at,
            updated_at
        `,
        params,
      );

      await logUserAction(client, {
        action: 'admin.hotel_room.update',
        entityId: roomTypeId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapRoomRow(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const softDeleteRoom = async ({
    actorUserId,
    logMetadata,
    nextStatus,
    roomTypeId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const updated = await client.query(
        `
          UPDATE room_types
          SET status = $2, updated_at = NOW()
          WHERE id = $1
          RETURNING
            id,
            hotel_service_id,
            name,
            bed_type,
            max_adults,
            max_children,
            total_rooms,
            available_rooms,
            base_price,
            description,
            status,
            created_at,
            updated_at
        `,
        [roomTypeId, nextStatus],
      );

      await logUserAction(client, {
        action: 'admin.hotel_room.delete',
        entityId: roomTypeId,
        metadata: logMetadata,
        userId: actorUserId,
      });

      await client.query('COMMIT');
      return mapRoomRow(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    createRoom,
    getRoomById,
    getServiceById,
    listRoomsByHotel,
    roomHasBookings,
    softDeleteRoom,
    updateRoom,
  };
};

const adminHotelRoomRepository = createAdminHotelRoomRepository();

module.exports = {
  createAdminHotelRoomRepository,
  createRoom: adminHotelRoomRepository.createRoom,
  getRoomById: adminHotelRoomRepository.getRoomById,
  getServiceById: adminHotelRoomRepository.getServiceById,
  listRoomsByHotel: adminHotelRoomRepository.listRoomsByHotel,
  roomHasBookings: adminHotelRoomRepository.roomHasBookings,
  softDeleteRoom: adminHotelRoomRepository.softDeleteRoom,
  updateRoom: adminHotelRoomRepository.updateRoom,
};
