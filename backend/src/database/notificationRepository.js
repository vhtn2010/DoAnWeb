const { query } = require('./client');

const createNotificationRepository = ({
  queryImpl = query,
} = {}) => {
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
    getNotificationInboxDetail,
    listNotificationsForUser,
  };
};

module.exports = {
  createNotificationRepository,
};
