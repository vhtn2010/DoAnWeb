const { query, withTransaction } = require('./client');

const createCommentRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getPublicTour = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT id
        FROM services
        WHERE id = $1
          AND service_type = 'tour'
          AND status = 'active'
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getUserDisplayName = async (userId) => {
    const result = await queryImpl(
      `
        SELECT full_name
        FROM users
        WHERE id = $1
          AND status = 'active'
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0]?.full_name || null;
  };

  const createComment = async ({
    content,
    displayName,
    serviceId,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const result = await client.query(
        `
          INSERT INTO service_comments (
            service_id,
            user_id,
            display_name_snapshot,
            content,
            is_visible,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, TRUE, NOW(), NOW())
          RETURNING id, service_id, user_id, display_name_snapshot, content,
                    is_visible, created_at, updated_at
        `,
        [serviceId, userId || null, displayName, content],
      );
      const comment = result.rows[0];

      if (userId) {
        await client.query(
          `
            INSERT INTO user_logs (
              user_id, action, entity_name, entity_id, metadata, created_at
            )
            VALUES ($1, 'service.comment.create', 'service_comment', $2, $3, NOW())
          `,
          [
            userId,
            comment.id,
            {
              service_id: serviceId,
            },
          ],
        );
      }

      return comment;
    });

  const countPublicComments = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT COUNT(*)::int AS comment_count
        FROM service_comments
        WHERE service_id = $1
          AND is_visible = TRUE
      `,
      [serviceId],
    );

    return Number(result.rows[0]?.comment_count || 0);
  };

  const listPublicComments = async ({ limit, offset, serviceId }) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          user_id,
          display_name_snapshot,
          content,
          created_at
        FROM service_comments
        WHERE service_id = $1
          AND is_visible = TRUE
        ORDER BY created_at DESC, id DESC
        LIMIT $2 OFFSET $3
      `,
      [serviceId, limit, offset],
    );

    return result.rows;
  };

  return {
    countPublicComments,
    createComment,
    getPublicTour,
    getUserDisplayName,
    listPublicComments,
  };
};

module.exports = {
  createCommentRepository,
};
