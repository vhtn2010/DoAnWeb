const { getPool, query } = require('./queryClient');

const buildScopedWhere = ({
  allowedServiceIds,
  includeDeleted = false,
  serviceId,
}) => {
  const params = [serviceId];
  const conditions = ['s.id = $1'];

  if (!includeDeleted) {
    conditions.push('s.deleted_at IS NULL');
    conditions.push(`s.status <> 'deleted'`);
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

const createAdminServiceInventoryRepository = ({
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

  const getTourDetail = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          service_id,
          max_group_size,
          departure_schedule
        FROM tour_details
        WHERE service_id = $1
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getRoomTypeById = async (roomTypeId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          hotel_service_id,
          total_rooms,
          available_rooms,
          status
        FROM room_types
        WHERE id = $1
        LIMIT 1
      `,
      [roomTypeId],
    );

    return result.rows[0] || null;
  };

  const getFlightDetailById = async (detailId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          seats_total,
          seats_available,
          status
        FROM flight_details
        WHERE id = $1
        LIMIT 1
      `,
      [detailId],
    );

    return result.rows[0] || null;
  };

  const getTrainDetailById = async (detailId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          seats_total,
          seats_available,
          status
        FROM train_details
        WHERE id = $1
        LIMIT 1
      `,
      [detailId],
    );

    return result.rows[0] || null;
  };

  const updateTourInventory = async ({
    actorUserId,
    inventoryMetadata,
    serviceId,
    updatedSchedule,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `
          UPDATE tour_details
          SET departure_schedule = $2
          WHERE service_id = $1
        `,
        [serviceId, updatedSchedule],
      );

      await logUserAction(client, {
        action: 'admin.service.inventory_update',
        entityId: serviceId,
        metadata: inventoryMetadata,
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

  const updateRoomInventory = async ({
    actorUserId,
    availableQuantity,
    inventoryMetadata,
    roomTypeId,
    serviceId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
          UPDATE room_types
          SET available_rooms = $2
          WHERE id = $1
          RETURNING id
        `,
        [roomTypeId, availableQuantity],
      );

      await logUserAction(client, {
        action: 'admin.service.inventory_update',
        entityId: serviceId,
        metadata: inventoryMetadata,
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

  const updateFlightInventory = async ({
    actorUserId,
    availableQuantity,
    detailId,
    inventoryMetadata,
    serviceId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
          UPDATE flight_details
          SET seats_available = $2
          WHERE id = $1
          RETURNING id
        `,
        [detailId, availableQuantity],
      );

      await logUserAction(client, {
        action: 'admin.service.inventory_update',
        entityId: serviceId,
        metadata: inventoryMetadata,
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

  const updateTrainInventory = async ({
    actorUserId,
    availableQuantity,
    detailId,
    inventoryMetadata,
    serviceId,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      const result = await client.query(
        `
          UPDATE train_details
          SET seats_available = $2
          WHERE id = $1
          RETURNING id
        `,
        [detailId, availableQuantity],
      );

      await logUserAction(client, {
        action: 'admin.service.inventory_update',
        entityId: serviceId,
        metadata: inventoryMetadata,
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
    getFlightDetailById,
    getRoomTypeById,
    getServiceById,
    getTourDetail,
    getTrainDetailById,
    updateFlightInventory,
    updateRoomInventory,
    updateTourInventory,
    updateTrainInventory,
  };
};

const adminServiceInventoryRepository = createAdminServiceInventoryRepository();

module.exports = {
  createAdminServiceInventoryRepository,
  getFlightDetailById: adminServiceInventoryRepository.getFlightDetailById,
  getRoomTypeById: adminServiceInventoryRepository.getRoomTypeById,
  getServiceById: adminServiceInventoryRepository.getServiceById,
  getTourDetail: adminServiceInventoryRepository.getTourDetail,
  getTrainDetailById: adminServiceInventoryRepository.getTrainDetailById,
  updateFlightInventory: adminServiceInventoryRepository.updateFlightInventory,
  updateRoomInventory: adminServiceInventoryRepository.updateRoomInventory,
  updateTourInventory: adminServiceInventoryRepository.updateTourInventory,
  updateTrainInventory: adminServiceInventoryRepository.updateTrainInventory,
};
