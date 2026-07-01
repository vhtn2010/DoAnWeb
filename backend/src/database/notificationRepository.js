const { query } = require('./client');

const createNotificationRepository = ({
  queryImpl = query,
} = {}) => {
  const markAllNotificationsReadForUser = async (userId) => {
    const result = await queryImpl(
      `
        WITH updated AS (
          UPDATE notifications n
          SET
            status = 'read',
            read_at = NOW()
          WHERE
            n.user_id = $1
            AND n.read_at IS NULL
          RETURNING n.id
        )
        SELECT COUNT(*)::int AS updated_count
        FROM updated
      `,
      [userId],
    );

    return result.rows[0]?.updated_count || 0;
  };

  const markNotificationReadForUser = async ({
    notificationId,
    userId,
  }) => {
    const result = await queryImpl(
      `
        UPDATE notifications n
        SET
          status = 'read',
          read_at = COALESCE(n.read_at, NOW())
        WHERE
          n.id = $1
          AND n.user_id = $2
        RETURNING
          n.id,
          n.status,
          n.read_at
      `,
      [notificationId, userId],
    );

    return result.rows[0] || null;
  };

  const markNotificationsReadForUser = async ({
    notificationIds,
    userId,
  }) => {
    const result = await queryImpl(
      `
        WITH owned AS (
          SELECT n.id
          FROM notifications n
          WHERE
            n.user_id = $1
            AND n.id = ANY($2::uuid[])
        ),
        updated AS (
          UPDATE notifications n
          SET
            status = 'read',
            read_at = NOW()
          WHERE
            n.user_id = $1
            AND n.id = ANY($2::uuid[])
            AND n.read_at IS NULL
          RETURNING n.id
        )
        SELECT
          COALESCE((SELECT COUNT(*)::int FROM updated), 0) AS updated_count,
          COALESCE(
            (SELECT ARRAY_AGG(owned.id ORDER BY owned.id) FROM owned),
            '{}'::uuid[]
          ) AS notification_ids
      `,
      [userId, notificationIds],
    );

    return {
      notificationIds: result.rows[0]?.notification_ids || [],
      updatedCount: result.rows[0]?.updated_count || 0,
    };
  };

  const countUnreadNotificationsForUser = async (userId) => {
    const result = await queryImpl(
      `
        SELECT COUNT(*)::int AS unread_count
        FROM notifications n
        WHERE
          n.user_id = $1
          AND n.read_at IS NULL
      `,
      [userId],
    );

    return result.rows[0]?.unread_count || 0;
  };

  const deleteNotificationForUser = async ({
    notificationId,
    userId,
  }) => {
    const result = await queryImpl(
      `
        DELETE FROM notifications n
        WHERE
          n.id = $1
          AND n.user_id = $2
        RETURNING n.id
      `,
      [notificationId, userId],
    );

    return result.rows[0] || null;
  };

  const getNotificationById = async (notificationId) => {
    const result = await queryImpl(
      `
        SELECT
          n.id,
          n.user_id,
          n.status,
          n.read_at
        FROM notifications n
        WHERE n.id = $1
        LIMIT 1
      `,
      [notificationId],
    );

    return result.rows[0] || null;
  };

  const listNotificationsForUser = async ({
    limit,
    offset,
    status,
    type,
    userId,
  }) => {
    const params = [userId];
    const filters = ['(n.user_id = $1 OR n.user_id IS NULL)'];

    if (status) {
      params.push(status);
      filters.push(`n.status = $${params.length}`);
    }

    if (type) {
      params.push(type);
      filters.push(`n.type = $${params.length}`);
    }

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const result = await queryImpl(
      `
        SELECT
          n.id,
          n.user_id,
          n.title,
          n.body,
          n.type,
          n.status,
          n.related_entity_name,
          n.related_entity_id,
          n.sent_at,
          n.read_at,
          n.created_at,
          COUNT(*) OVER()::int AS total_count
        FROM notifications n
        WHERE ${filters.join(' AND ')}
        ORDER BY n.created_at DESC, n.id DESC
        LIMIT $${limitIndex}
        OFFSET $${offsetIndex}
      `,
      params,
    );

    return {
      rows: result.rows,
      total: result.rows[0]?.total_count || 0,
    };
  };

  const getNotificationInboxDetail = async ({
    notificationId,
    userId,
  }) => {
    const result = await queryImpl(
      `
        SELECT
          n.id,
          n.user_id,
          n.title,
          n.body,
          n.type,
          n.status,
          n.related_entity_name,
          n.related_entity_id,
          n.sent_at,
          n.read_at,
          n.created_at
        FROM notifications n
        WHERE
          n.id = $1
          AND (n.user_id = $2 OR n.user_id IS NULL)
        LIMIT 1
      `,
      [notificationId, userId],
    );

    return result.rows[0] || null;
  };

  return {
    countUnreadNotificationsForUser,
    deleteNotificationForUser,
    getNotificationById,
    getNotificationInboxDetail,
    listNotificationsForUser,
    markAllNotificationsReadForUser,
    markNotificationReadForUser,
    markNotificationsReadForUser,
  };
};

module.exports = {
  createNotificationRepository,
};
