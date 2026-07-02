const { query } = require('./client');

const createEmailLogRepository = ({
  queryImpl = query,
} = {}) => {
  const listAdminEmailLogs = async ({
    limit,
    offset,
    status,
    templateCode,
    toEmail,
  }) => {
    const params = [];
    const filters = [];

    if (status) {
      params.push(status);
      filters.push(`el.status = $${params.length}`);
    }

    if (toEmail) {
      params.push(`%${toEmail}%`);
      filters.push(`el.to_email ILIKE $${params.length}`);
    }

    if (templateCode) {
      params.push(templateCode);
      filters.push(`UPPER(el.template_code) = UPPER($${params.length})`);
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
          el.id,
          el.user_id,
          el.booking_id,
          el.to_email,
          el.subject,
          el.template_code,
          el.status,
          el.provider,
          el.sent_at,
          el.created_at,
          u.email AS user_email,
          u.full_name AS user_full_name,
          b.booking_code,
          COUNT(*) OVER()::int AS total_count
        FROM email_logs el
        LEFT JOIN users u
          ON u.id = el.user_id
        LEFT JOIN bookings b
          ON b.id = el.booking_id
        ${whereClause}
        ORDER BY el.created_at DESC, el.id DESC
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

  const getAdminEmailLogById = async (emailLogId) => {
    const result = await queryImpl(
      `
        SELECT
          el.id,
          el.user_id,
          el.booking_id,
          el.to_email,
          el.subject,
          el.template_code,
          el.status,
          el.provider,
          el.provider_message_id,
          el.error_message,
          el.sent_at,
          el.created_at,
          u.email AS user_email,
          u.full_name AS user_full_name,
          b.booking_code
        FROM email_logs el
        LEFT JOIN users u
          ON u.id = el.user_id
        LEFT JOIN bookings b
          ON b.id = el.booking_id
        WHERE el.id = $1
        LIMIT 1
      `,
      [emailLogId],
    );

    return result.rows[0] || null;
  };

  return {
    getAdminEmailLogById,
    listAdminEmailLogs,
  };
};

module.exports = {
  createEmailLogRepository,
};
