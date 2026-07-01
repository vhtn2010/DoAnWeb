const { getPool, query, withTransaction } = require('./client');

const createSupportRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
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
  };
};

module.exports = {
  createSupportRepository,
};
