const { query, withTransaction } = require('./client');

const createNotificationRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const createNotificationUserLog = async (client, {
    action,
    actorUserId,
    metadata,
    notificationId,
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
      [
        actorUserId,
        action,
        'notification',
        notificationId,
        metadata || null,
      ],
    );
  };

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

  const listAdminNotifications = async ({
    limit,
    offset,
    status,
    type,
  }) => {
    const params = [];
    const filters = [];

    if (type) {
      params.push(type);
      filters.push(`n.type = $${params.length}`);
    }

    if (status) {
      params.push(status);
      filters.push(`n.status = $${params.length}`);
    }

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;
    const whereClause = filters.length > 0
      ? `WHERE ${filters.join(' AND ')}`
      : '';

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
          u.email AS recipient_email,
          u.full_name AS recipient_name,
          COUNT(*) OVER()::int AS total_count
        FROM notifications n
        LEFT JOIN users u ON u.id = n.user_id
        ${whereClause}
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
          n.title,
          n.body,
          n.type,
          n.status,
          n.related_entity_name,
          n.related_entity_id,
          n.created_at,
          n.sent_at,
          n.read_at
        FROM notifications n
        WHERE n.id = $1
        LIMIT 1
      `,
      [notificationId],
    );

    return result.rows[0] || null;
  };

  const updateNotificationStatus = async ({
    actorUserId,
    fromStatus,
    notificationId,
    readAt,
    sentAt,
    toStatus,
  }) =>
    withTransactionImpl(async (client) => {
      const result = await client.query(
        `
          UPDATE notifications
          SET
            status = $2,
            sent_at = COALESCE($3, sent_at),
            read_at = COALESCE($4, read_at)
          WHERE id = $1
            AND status = $5
          RETURNING
            id,
            user_id,
            title,
            body,
            type,
            status,
            related_entity_name,
            related_entity_id,
            sent_at,
            read_at,
            created_at
        `,
        [
          notificationId,
          toStatus,
          sentAt || null,
          readAt || null,
          fromStatus,
        ],
      );

      const notification = result.rows[0] || null;

      if (!notification) {
        return null;
      }

      await createNotificationUserLog(client, {
        action: 'admin.notification.status_update',
        actorUserId,
        metadata: {
          from_status: fromStatus,
          to_status: toStatus,
        },
        notificationId,
      });

      return notification;
    });

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
    listAdminNotifications,
    listNotificationsForUser,
    markAllNotificationsReadForUser,
    markNotificationReadForUser,
    markNotificationsReadForUser,
    updateNotificationStatus,
  };
};

module.exports = {
  createNotificationRepository,
};
