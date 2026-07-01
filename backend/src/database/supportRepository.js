const { getPool, query, withTransaction } = require('./client');

const createSupportRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getTicketByIdAndUser = async ({
    ticketId,
    userId,
  }) => {
    const result = await queryImpl(
      `
        SELECT
          st.id,
          st.ticket_code,
          st.user_id,
          st.booking_id,
          st.service_id,
          st.customer_name,
          st.customer_email,
          st.customer_phone,
          st.subject,
          st.status,
          st.priority,
          st.created_at,
          st.updated_at,
          st.closed_at,
          b.booking_code,
          b.status AS booking_status,
          s.title AS service_title,
          s.slug AS service_slug,
          s.service_type
        FROM support_tickets st
        LEFT JOIN bookings b
          ON b.id = st.booking_id
        LEFT JOIN services s
          ON s.id = st.service_id
        WHERE st.id = $1
          AND st.user_id = $2
        LIMIT 1
      `,
      [ticketId, userId],
    );

    return result.rows[0] || null;
  };

  const listRepliesByTicketId = async (ticketId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          ticket_id,
          sender_id,
          sender_type,
          message,
          is_internal_note,
          created_at
        FROM support_replies
        WHERE ticket_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [ticketId],
    );

    return result.rows;
  };

  const listTicketsByUser = async ({
    limit,
    offset,
    status,
    userId,
  }) => {
    const params = [userId];
    let filterSql = 'WHERE st.user_id = $1';

    if (status) {
      params.push(status);
      filterSql += ` AND st.status = $${params.length}`;
    }

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const result = await queryImpl(
      `
        SELECT
          st.id,
          st.ticket_code,
          st.user_id,
          st.booking_id,
          st.service_id,
          st.subject,
          st.status,
          st.priority,
          st.created_at,
          st.updated_at,
          st.closed_at,
          b.booking_code,
          b.status AS booking_status,
          s.title AS service_title,
          s.slug AS service_slug,
          s.service_type,
          COUNT(*) OVER()::int AS total_count
        FROM support_tickets st
        LEFT JOIN bookings b
          ON b.id = st.booking_id
        LEFT JOIN services s
          ON s.id = st.service_id
        ${filterSql}
        ORDER BY st.updated_at DESC, st.created_at DESC, st.id DESC
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

  const getBookingById = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          user_id,
          status
        FROM bookings
        WHERE id = $1
        LIMIT 1
      `,
      [bookingId],
    );

    return result.rows[0] || null;
  };

  const getServiceById = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_type,
          status,
          deleted_at
        FROM services
        WHERE id = $1
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const createTicket = async ({
    reply,
    ticket,
  }) =>
    withTransactionImpl(async (client) => {
      const ticketResult = await client.query(
        `
          INSERT INTO support_tickets (
            ticket_code,
            user_id,
            booking_id,
            service_id,
            customer_name,
            customer_email,
            customer_phone,
            subject,
            status,
            priority,
            assigned_to,
            created_at,
            updated_at,
            closed_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NOW(), NOW(), NULL
          )
          RETURNING
            id,
            ticket_code,
            user_id,
            booking_id,
            service_id,
            customer_name,
            customer_email,
            customer_phone,
            subject,
            status,
            priority,
            assigned_to,
            created_at,
            updated_at,
            closed_at
        `,
        [
          ticket.ticket_code,
          ticket.user_id,
          ticket.booking_id,
          ticket.service_id,
          ticket.customer_name,
          ticket.customer_email,
          ticket.customer_phone,
          ticket.subject,
          ticket.status,
          ticket.priority,
        ],
      );
      const createdTicket = ticketResult.rows[0];

      const replyResult = await client.query(
        `
          INSERT INTO support_replies (
            ticket_id,
            sender_id,
            sender_type,
            message,
            is_internal_note,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
          RETURNING
            id,
            ticket_id,
            sender_id,
            sender_type,
            message,
            is_internal_note,
            created_at
        `,
        [
          createdTicket.id,
          reply.sender_id,
          reply.sender_type,
          reply.message,
          reply.is_internal_note,
        ],
      );

      return {
        reply: replyResult.rows[0],
        ticket: createdTicket,
      };
    }, {
      pool: getPool(),
    });

  return {
    createTicket,
    getBookingById,
    getServiceById,
    getTicketByIdAndUser,
    listRepliesByTicketId,
    listTicketsByUser,
  };
};

module.exports = {
  createSupportRepository,
};
