const { getPool, query, withTransaction } = require('./client');

const createSupportRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getAssignableAdminUserById = async (userId) => {
    const result = await queryImpl(
      `
        SELECT
          u.id,
          u.full_name,
          u.email,
          u.status,
          u.deleted_at,
          r.code AS role_code
        FROM users u
        JOIN roles r
          ON r.id = u.role_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId],
    );

    return result.rows[0] || null;
  };

  const updateTicketForAdmin = async ({
    action,
    actorUserId,
    metadata,
    ticketId,
    updates,
  }) =>
    withTransactionImpl(async (client) => {
      const assignments = [];
      const params = [ticketId];
      let index = 2;

      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined) {
          continue;
        }

        assignments.push(`${key} = $${index}`);
        params.push(value);
        index += 1;
      }

      assignments.push('updated_at = NOW()');

      const ticketResult = await client.query(
        `
          UPDATE support_tickets
          SET ${assignments.join(', ')}
          WHERE id = $1
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
        params,
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
          actorUserId,
          action,
          'support_ticket',
          ticketId,
          metadata || null,
        ],
      );

      return ticketResult.rows[0] || null;
    }, {
      pool: getPool(),
    });

  const listTicketsForAdmin = async ({
    assignedTo,
    limit,
    offset,
    priority,
    staffScopeUserId,
    status,
  }) => {
    const params = [];
    const filters = [];

    if (staffScopeUserId) {
      params.push(staffScopeUserId);
      filters.push(`(st.assigned_to = $${params.length} OR st.assigned_to IS NULL)`);
    }

    if (status) {
      params.push(status);
      filters.push(`st.status = $${params.length}`);
    }

    if (priority) {
      params.push(priority);
      filters.push(`st.priority = $${params.length}`);
    }

    if (assignedTo) {
      params.push(assignedTo);
      filters.push(`st.assigned_to = $${params.length}`);
    }

    const whereSql = filters.length > 0
      ? `WHERE ${filters.join(' AND ')}`
      : '';

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
          st.customer_name,
          st.customer_email,
          st.customer_phone,
          st.subject,
          st.status,
          st.priority,
          st.assigned_to,
          st.created_at,
          st.updated_at,
          st.closed_at,
          b.booking_code,
          b.status AS booking_status,
          s.title AS service_title,
          s.slug AS service_slug,
          s.service_type,
          cu.full_name AS customer_user_full_name,
          cu.email AS customer_user_email,
          cu.phone AS customer_user_phone,
          au.full_name AS assigned_user_full_name,
          ar.code AS assigned_user_role_code,
          COUNT(*) OVER()::int AS total_count
        FROM support_tickets st
        LEFT JOIN bookings b
          ON b.id = st.booking_id
        LEFT JOIN services s
          ON s.id = st.service_id
        LEFT JOIN users cu
          ON cu.id = st.user_id
        LEFT JOIN users au
          ON au.id = st.assigned_to
        LEFT JOIN roles ar
          ON ar.id = au.role_id
        ${whereSql}
        ORDER BY
          CASE st.priority
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
            ELSE 5
          END ASC,
          st.updated_at DESC,
          st.created_at DESC,
          st.id DESC
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

  const getTicketByIdForAdmin = async ({
    staffScopeUserId,
    ticketId,
  }) => {
    const params = [ticketId];
    let scopeSql = '';

    if (staffScopeUserId) {
      params.push(staffScopeUserId);
      scopeSql = `AND (st.assigned_to = $${params.length} OR st.assigned_to IS NULL)`;
    }

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
          st.assigned_to,
          st.created_at,
          st.updated_at,
          st.closed_at,
          b.booking_code,
          b.status AS booking_status,
          s.title AS service_title,
          s.slug AS service_slug,
          s.service_type,
          cu.full_name AS customer_user_full_name,
          cu.email AS customer_user_email,
          cu.phone AS customer_user_phone,
          au.full_name AS assigned_user_full_name,
          ar.code AS assigned_user_role_code
        FROM support_tickets st
        LEFT JOIN bookings b
          ON b.id = st.booking_id
        LEFT JOIN services s
          ON s.id = st.service_id
        LEFT JOIN users cu
          ON cu.id = st.user_id
        LEFT JOIN users au
          ON au.id = st.assigned_to
        LEFT JOIN roles ar
          ON ar.id = au.role_id
        WHERE st.id = $1
          ${scopeSql}
        LIMIT 1
      `,
      params,
    );

    return result.rows[0] || null;
  };

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

  const listRepliesByTicketIdForAdmin = async (ticketId) => {
    const result = await queryImpl(
      `
        SELECT
          sr.id,
          sr.ticket_id,
          sr.sender_id,
          sr.sender_type,
          sr.message,
          sr.is_internal_note,
          sr.created_at,
          su.full_name AS sender_full_name,
          sr2.code AS sender_role_code
        FROM support_replies sr
        LEFT JOIN users su
          ON su.id = sr.sender_id
        LEFT JOIN roles sr2
          ON sr2.id = su.role_id
        WHERE sr.ticket_id = $1
        ORDER BY sr.created_at ASC, sr.id ASC
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

  const addCustomerReply = async ({
    message,
    senderId,
    ticketId,
    toStatus,
  }) =>
    withTransactionImpl(async (client) => {
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
          ticketId,
          senderId,
          'customer',
          message,
          false,
        ],
      );

      const ticketResult = await client.query(
        `
          UPDATE support_tickets
          SET
            status = $2,
            updated_at = NOW()
          WHERE id = $1
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
            created_at,
            updated_at,
            closed_at
        `,
        [ticketId, toStatus],
      );

      return {
        reply: replyResult.rows[0],
        ticket: ticketResult.rows[0],
      };
    }, {
      pool: getPool(),
    });

  const closeTicketByCustomer = async ({
    reason,
    ticketId,
  }) =>
    withTransactionImpl(async (client) => {
      let reply = null;

      if (reason) {
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
            VALUES ($1, NULL, $2, $3, $4, NOW())
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
            ticketId,
            'customer',
            reason,
            false,
          ],
        );

        reply = replyResult.rows[0];
      }

      const ticketResult = await client.query(
        `
          UPDATE support_tickets
          SET
            status = $2,
            closed_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
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
            created_at,
            updated_at,
            closed_at
        `,
        [ticketId, 'closed'],
      );

      return {
        reply,
        ticket: ticketResult.rows[0],
      };
    }, {
      pool: getPool(),
    });

  return {
    addCustomerReply,
    closeTicketByCustomer,
    createTicket,
    getBookingById,
    getAssignableAdminUserById,
    getServiceById,
    getTicketByIdForAdmin,
    getTicketByIdAndUser,
    listRepliesByTicketIdForAdmin,
    listRepliesByTicketId,
    listTicketsForAdmin,
    listTicketsByUser,
    updateTicketForAdmin,
  };
};

module.exports = {
  createSupportRepository,
};
