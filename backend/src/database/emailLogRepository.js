const {
  API_ERROR_CODES,
  DOMAIN_CONSTRAINTS,
  EMAIL_STATUS,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');
const { query, withTransaction } = require('./client');

const createEmailLogRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
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

  const getUserEmailContextById = async (userId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          email,
          full_name,
          status,
          password_hash,
          email_verified_at,
          deleted_at
        FROM users
        WHERE id = $1
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] || null;
  };

  const getBookingEmailContextById = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          user_id,
          booking_code,
          contact_name,
          contact_email,
          status,
          subtotal_amount,
          discount_amount,
          total_amount,
          currency
        FROM bookings
        WHERE id = $1
        LIMIT 1
      `,
      [bookingId],
    );

    return result.rows[0] || null;
  };

  const getAdminEmailStats = async ({
    from,
    to,
  }) => {
    const totalResult = await queryImpl(
      `
        SELECT COUNT(*)::int AS total
        FROM email_logs
        WHERE created_at >= $1
          AND created_at <= $2
      `,
      [from, to],
    );

    const statusResult = await queryImpl(
      `
        SELECT
          status,
          COUNT(*)::int AS count
        FROM email_logs
        WHERE created_at >= $1
          AND created_at <= $2
        GROUP BY status
      `,
      [from, to],
    );

    const templateResult = await queryImpl(
      `
        SELECT
          COALESCE(template_code, 'UNSPECIFIED') AS template_code,
          COUNT(*)::int AS count
        FROM email_logs
        WHERE created_at >= $1
          AND created_at <= $2
        GROUP BY COALESCE(template_code, 'UNSPECIFIED')
        ORDER BY count DESC, template_code ASC
      `,
      [from, to],
    );

    return {
      byStatusRows: statusResult.rows,
      byTemplateRows: templateResult.rows,
      total: totalResult.rows[0]?.total || 0,
    };
  };

  const listBookingItemsByBookingId = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_type,
          title_snapshot,
          quantity,
          start_at,
          end_at
        FROM booking_items
        WHERE booking_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const createResendEmailLog = async ({
    actorUserId,
    bookingId,
    sourceEmailLogId,
    subject,
    templateCode,
    toEmail,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const emailLogResult = await client.query(
        `
          INSERT INTO email_logs (
            user_id,
            booking_id,
            to_email,
            subject,
            template_code,
            status,
            provider,
            provider_message_id,
            error_message,
            sent_at,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NULL, NOW())
          RETURNING
            id,
            user_id,
            booking_id,
            to_email,
            subject,
            template_code,
            status,
            provider,
            provider_message_id,
            error_message,
            sent_at,
            created_at
        `,
        [
          userId || null,
          bookingId || null,
          toEmail,
          subject,
          templateCode,
          EMAIL_STATUS.QUEUED,
          DOMAIN_CONSTRAINTS.emailProvider,
        ],
      );

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
          actorUserId || null,
          'admin.email_log.resend',
          'email_log',
          sourceEmailLogId,
          {
            resend_email_log_id: emailLogResult.rows[0].id,
            template_code: templateCode,
            to_email: toEmail,
          },
        ],
      );

      return emailLogResult.rows[0];
    });

  const markEmailLogSent = async ({
    emailLogId,
    messageId,
    sentAt,
  }) => {
    const result = await queryImpl(
      `
        UPDATE email_logs
        SET
          status = $2,
          provider_message_id = $3,
          error_message = NULL,
          sent_at = $4
        WHERE id = $1
        RETURNING
          id,
          user_id,
          booking_id,
          to_email,
          subject,
          template_code,
          status,
          provider,
          provider_message_id,
          error_message,
          sent_at,
          created_at
      `,
      [
        emailLogId,
        EMAIL_STATUS.SENT,
        messageId || null,
        sentAt,
      ],
    );

    if (result.rowCount !== 1) {
      throw new AppError('Email log not found', {
        code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
        statusCode: 404,
      });
    }

    return result.rows[0];
  };

  const markEmailLogFailed = async ({
    emailLogId,
    errorMessage,
  }) => {
    const result = await queryImpl(
      `
        UPDATE email_logs
        SET
          status = $2,
          error_message = $3
        WHERE id = $1
        RETURNING
          id,
          user_id,
          booking_id,
          to_email,
          subject,
          template_code,
          status,
          provider,
          provider_message_id,
          error_message,
          sent_at,
          created_at
      `,
      [
        emailLogId,
        EMAIL_STATUS.FAILED,
        errorMessage || 'Unknown email provider error',
      ],
    );

    if (result.rowCount !== 1) {
      throw new AppError('Email log not found', {
        code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
        statusCode: 404,
      });
    }

    return result.rows[0];
  };

  return {
    createResendEmailLog,
    getAdminEmailLogById,
    getAdminEmailStats,
    getBookingEmailContextById,
    getUserEmailContextById,
    listAdminEmailLogs,
    listBookingItemsByBookingId,
    markEmailLogFailed,
    markEmailLogSent,
  };
};

module.exports = {
  createEmailLogRepository,
};
