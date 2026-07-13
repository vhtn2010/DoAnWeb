const {
  API_ERROR_CODES,
  DOMAIN_CONSTRAINTS,
  EMAIL_STATUS,
} = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');
const { query, withTransaction } = require('./client');

const createInvalidStateTransitionError = () =>
  new AppError('Booking state no longer allows this transition', {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const createAdminBookingRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const setLocalConfig = async (client, key, value) => {
    await client.query('SELECT set_config($1, $2, TRUE)', [
      key,
      value == null ? '' : String(value),
    ]);
  };

  const listConfirmedInventoryItemsForUpdate = async (client, bookingId) => {
    const result = await client.query(
      `
        SELECT
          id,
          service_type,
          reference_id,
          quantity,
          status
        FROM booking_items
        WHERE booking_id = $1
          AND status = 'confirmed'
          AND reference_id IS NOT NULL
        FOR UPDATE
      `,
      [bookingId],
    );

    return result.rows;
  };

  const restoreInventoryForItems = async (client, items) => {
    for (const item of items) {
      if (!item.reference_id) {
        continue;
      }

      if (item.service_type === 'hotel' || item.service_type === 'room') {
        await client.query(
          `
            UPDATE room_types
            SET available_rooms = available_rooms + $2
            WHERE id = $1
          `,
          [item.reference_id, item.quantity],
        );
        continue;
      }

      if (item.service_type === 'flight') {
        await client.query(
          `
            UPDATE flight_details
            SET seats_available = seats_available + $2
            WHERE id = $1
          `,
          [item.reference_id, item.quantity],
        );
        continue;
      }

      if (item.service_type === 'train') {
        await client.query(
          `
            UPDATE train_details
            SET seats_available = seats_available + $2
            WHERE id = $1
          `,
          [item.reference_id, item.quantity],
        );
      }
    }
  };

  const getLatestRefundPendingTransition = async (client, bookingId) => {
    const result = await client.query(
      `
        SELECT from_status
        FROM booking_status_histories
        WHERE booking_id = $1
          AND to_status = 'refund_pending'
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [bookingId],
    );

    return result.rows[0] || null;
  };

  const transitionBookingStatusWithItems = async ({
    actorUserId,
    bookingId,
    fromStatus,
    itemStatusFrom = [],
    itemStatusTo,
    logAction,
    reason,
    toStatus,
  }) =>
    withTransactionImpl(async (client) => {
      await setLocalConfig(client, 'app.current_user_id', actorUserId);
      await setLocalConfig(client, 'app.status_change_reason', reason);
      let shouldRestoreInventory = false;

      if (fromStatus === 'confirmed' && ['cancelled', 'refunded'].includes(toStatus)) {
        shouldRestoreInventory = true;
      }

      if (fromStatus === 'refund_pending' && toStatus === 'refunded') {
        const latestRefundPendingTransition = await getLatestRefundPendingTransition(
          client,
          bookingId,
        );
        shouldRestoreInventory = latestRefundPendingTransition?.from_status === 'confirmed';
      }

      const inventoryItems = shouldRestoreInventory
        ? await listConfirmedInventoryItemsForUpdate(client, bookingId)
        : [];

      const bookingResult = await client.query(
        `
          UPDATE bookings
          SET
            status = $2,
            updated_at = NOW()
          WHERE id = $1
            AND status = $3
          RETURNING
            id,
            booking_code,
            status,
            updated_at
        `,
        [bookingId, toStatus, fromStatus],
      );

      if (bookingResult.rowCount !== 1) {
        throw createInvalidStateTransitionError();
      }

      if (shouldRestoreInventory && inventoryItems.length > 0) {
        await restoreInventoryForItems(client, inventoryItems);
      }

      if (itemStatusTo && itemStatusFrom.length > 0) {
        await client.query(
          `
            UPDATE booking_items
            SET status = $2
            WHERE booking_id = $1
              AND status = ANY($3::booking_item_status[])
          `,
          [bookingId, itemStatusTo, itemStatusFrom],
        );
      }

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
          logAction,
          'booking',
          bookingId,
          {
            from_status: fromStatus,
            reason,
            to_status: toStatus,
          },
        ],
      );

      return bookingResult.rows[0];
    });

  const buildScopedWhere = ({
    allowedServiceIds,
    bookingStatus,
    from,
    keyword,
    to,
  }) => {
    const params = [];
    const conditions = [];

    if (bookingStatus) {
      params.push(bookingStatus);
      conditions.push(`b.status = $${params.length}`);
    }

    if (from) {
      params.push(from);
      conditions.push(`b.created_at >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`b.created_at <= $${params.length}`);
    }

    if (keyword) {
      params.push(`%${keyword}%`);
      const keywordParam = `$${params.length}`;
      conditions.push(`
        (
          b.booking_code ILIKE ${keywordParam}
          OR COALESCE(b.contact_name, '') ILIKE ${keywordParam}
          OR COALESCE(b.contact_email, '') ILIKE ${keywordParam}
          OR COALESCE(b.contact_phone, '') ILIKE ${keywordParam}
        )
      `);
    }

    if (Array.isArray(allowedServiceIds)) {
      if (allowedServiceIds.length === 0) {
        conditions.push('1 = 0');
      } else {
        params.push(allowedServiceIds);
        conditions.push(`
          EXISTS (
            SELECT 1
            FROM booking_items scoped_items
            WHERE scoped_items.booking_id = b.id
              AND scoped_items.service_id = ANY($${params.length}::uuid[])
          )
        `);
      }
    }

    return {
      params,
      whereSql:
        conditions.length > 0
          ? `WHERE ${conditions.join('\n        AND ')}`
          : '',
    };
  };

  const listBookings = async ({
    allowedServiceIds,
    bookingStatus,
    from,
    keyword,
    limit,
    offset,
    to,
  }) => {
    const { params, whereSql } = buildScopedWhere({
      allowedServiceIds,
      bookingStatus,
      from,
      keyword,
      to,
    });
    const filteredSql = `
      SELECT
        b.id,
        b.booking_code,
        b.user_id,
        b.status,
        b.contact_name,
        b.contact_email,
        b.contact_phone,
        b.subtotal_amount,
        b.discount_amount,
        b.total_amount,
        b.currency,
        b.expires_at,
        b.created_at,
        b.updated_at,
        u.full_name AS customer_full_name,
        u.email AS customer_email,
        u.phone AS customer_phone,
        lp.id AS latest_payment_id,
        lp.payment_code AS latest_payment_code,
        lp.provider AS latest_payment_provider,
        lp.payment_method AS latest_payment_method,
        lp.status AS latest_payment_status,
        lp.amount AS latest_payment_amount,
        lp.currency AS latest_payment_currency,
        lp.raw_response AS latest_payment_raw_response,
        lp.paid_at AS latest_payment_paid_at,
        lp.expired_at AS latest_payment_expired_at,
        lp.created_at AS latest_payment_created_at,
        COUNT(bi.id)::int AS item_count,
        (ARRAY_AGG(bi.title_snapshot ORDER BY bi.start_at ASC NULLS LAST, bi.id ASC)
          FILTER (WHERE bi.id IS NOT NULL))[1] AS service_title
      FROM bookings b
      LEFT JOIN users u
        ON u.id = b.user_id
      LEFT JOIN LATERAL (
        SELECT
          p.id,
          p.payment_code,
          p.provider,
          p.payment_method,
          p.status,
          p.amount,
          p.currency,
          p.raw_response,
          p.paid_at,
          p.expired_at,
          p.created_at
        FROM payments p
        WHERE p.booking_id = b.id
        ORDER BY
          CASE
            WHEN p.status = 'pending' AND p.raw_response ? 'proof' THEN 0
            WHEN p.status = 'pending' THEN 1
            WHEN p.status IN ('success', 'reconciled') THEN 2
            ELSE 3
          END,
          p.created_at DESC,
          p.id DESC
        LIMIT 1
      ) lp ON TRUE
      LEFT JOIN booking_items bi
        ON bi.booking_id = b.id
      ${whereSql}
      GROUP BY
        b.id,
        b.booking_code,
        b.user_id,
        b.status,
        b.contact_name,
        b.contact_email,
        b.contact_phone,
        b.subtotal_amount,
        b.discount_amount,
        b.total_amount,
        b.currency,
        b.expires_at,
        b.created_at,
        b.updated_at,
        u.full_name,
        u.email,
        u.phone,
        lp.id,
        lp.payment_code,
        lp.provider,
        lp.payment_method,
        lp.status,
        lp.amount,
        lp.currency,
        lp.raw_response,
        lp.paid_at,
        lp.expired_at,
        lp.created_at
    `;
    const countParams = [...params];
    const dataParams = [...params, limit, offset];
    const limitParam = `$${dataParams.length - 1}`;
    const offsetParam = `$${dataParams.length}`;
    const [countResult, dataResult] = await Promise.all([
      queryImpl(
        `
          SELECT COUNT(*) AS total_count
          FROM (
            ${filteredSql}
          ) AS filtered_bookings
        `,
        countParams,
      ),
      queryImpl(
        `
          SELECT *
          FROM (
            ${filteredSql}
          ) AS filtered_bookings
          ORDER BY
            CASE WHEN status = 'paid' THEN 0 ELSE 1 END,
            created_at DESC,
            id DESC
          LIMIT ${limitParam}
          OFFSET ${offsetParam}
        `,
        dataParams,
      ),
    ]);

    return {
      rows: dataResult.rows,
      total: Number(countResult.rows[0]?.total_count || 0),
    };
  };

  const getBookingById = async ({
    allowedServiceIds,
    bookingId,
  }) => {
    const { params, whereSql } = buildScopedWhere({
      allowedServiceIds,
    });

    params.push(bookingId);

    const result = await queryImpl(
      `
        SELECT
          b.id,
          b.booking_code,
          b.user_id,
          b.status,
          b.contact_name,
          b.contact_email,
          b.contact_phone,
          b.subtotal_amount,
          b.discount_amount,
          b.total_amount,
          b.currency,
          b.voucher_id,
          b.note,
          b.expires_at,
          b.created_at,
          b.updated_at,
          u.full_name AS customer_full_name,
          u.email AS customer_email,
          u.phone AS customer_phone
        FROM bookings b
        LEFT JOIN users u
          ON u.id = b.user_id
        ${whereSql ? `${whereSql}\n          AND b.id = $${params.length}` : `WHERE b.id = $${params.length}`}
        LIMIT 1
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const listBookingItemsByBookingId = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          booking_id,
          service_id,
          service_type,
          reference_id,
          title_snapshot,
          start_at,
          end_at,
          quantity,
          unit_price,
          total_amount,
          status,
          traveller_info
        FROM booking_items
        WHERE booking_id = $1
        ORDER BY start_at ASC NULLS LAST, id ASC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const getBookingItemById = async ({
    allowedServiceIds,
    bookingItemId,
  }) => {
    const params = [bookingItemId];
    let scopeSql = '';

    if (Array.isArray(allowedServiceIds)) {
      if (allowedServiceIds.length === 0) {
        return null;
      }

      params.push(allowedServiceIds);
      scopeSql = `AND bi.service_id = ANY($${params.length}::uuid[])`;
    }

    const result = await queryImpl(
      `
        SELECT
          bi.id,
          bi.booking_id,
          bi.service_id,
          bi.service_type,
          bi.reference_id,
          bi.title_snapshot,
          bi.start_at,
          bi.end_at,
          bi.quantity,
          bi.unit_price,
          bi.total_amount,
          bi.status,
          bi.traveller_info,
          b.status AS booking_status,
          b.booking_code,
          b.user_id
        FROM booking_items bi
        INNER JOIN bookings b
          ON b.id = bi.booking_id
        WHERE bi.id = $1
          ${scopeSql}
        LIMIT 1
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const listBookingPaymentsByBookingId = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          booking_id,
          payment_code,
          provider,
          payment_method,
          status,
          amount,
          currency,
          raw_response,
          paid_at,
          expired_at,
          created_at
        FROM payments
        WHERE booking_id = $1
        ORDER BY created_at DESC, id DESC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const listBookingRefundsByBookingId = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          refund_code,
          booking_id,
          payment_id,
          status,
          amount,
          reason,
          processed_at,
          created_at
        FROM refunds
        WHERE booking_id = $1
        ORDER BY created_at DESC, id DESC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const listBookingStatusHistoriesByBookingId = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT
          bsh.id,
          bsh.booking_id,
          bsh.from_status,
          bsh.to_status,
          bsh.reason,
          bsh.changed_by,
          bsh.created_at,
          u.full_name AS changed_by_full_name,
          r.code AS changed_by_role_code
        FROM booking_status_histories bsh
        LEFT JOIN users u
          ON u.id = bsh.changed_by
        LEFT JOIN roles r
          ON r.id = u.role_id
        WHERE bsh.booking_id = $1
        ORDER BY bsh.created_at ASC, bsh.id ASC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const updateBookingStatus = async ({
    actorUserId,
    bookingId,
    fromStatus,
    reason,
    toStatus,
  }) =>
    transitionBookingStatusWithItems({
      actorUserId,
      bookingId,
      fromStatus,
      logAction: 'admin.booking.status_override',
      reason,
      toStatus,
    });

  const confirmBooking = async ({
    actorUserId,
    bookingId,
    reason,
  }) =>
    transitionBookingStatusWithItems({
      actorUserId,
      bookingId,
      fromStatus: 'paid',
      itemStatusFrom: ['pending'],
      itemStatusTo: 'confirmed',
      logAction: 'admin.booking.confirm',
      reason,
      toStatus: 'confirmed',
    });

  const completeBooking = async ({
    actorUserId,
    bookingId,
    reason,
  }) =>
    transitionBookingStatusWithItems({
      actorUserId,
      bookingId,
      fromStatus: 'in_progress',
      itemStatusFrom: ['pending', 'confirmed'],
      itemStatusTo: 'completed',
      logAction: 'admin.booking.complete',
      reason,
      toStatus: 'completed',
    });

  const cancelBooking = async ({
    actorUserId,
    bookingId,
    fromStatus,
    reason,
  }) =>
    transitionBookingStatusWithItems({
      actorUserId,
      bookingId,
      fromStatus,
      itemStatusFrom: ['pending', 'confirmed'],
      itemStatusTo: 'cancelled',
      logAction: 'admin.booking.cancel',
      reason,
      toStatus: 'cancelled',
    });

  const expireBooking = async ({
    actorUserId,
    bookingId,
    reason,
  }) =>
    transitionBookingStatusWithItems({
      actorUserId,
      bookingId,
      fromStatus: 'pending_payment',
      itemStatusFrom: ['pending', 'confirmed'],
      itemStatusTo: 'failed',
      logAction: 'admin.booking.expire',
      reason,
      toStatus: 'expired',
    });

  const updateBookingItemStatus = async ({
    actorUserId,
    bookingItemId,
    fromStatus,
    reason,
    toStatus,
  }) =>
    withTransactionImpl(async (client) => {
      const itemResult = await client.query(
        `
          UPDATE booking_items
          SET status = $2
          WHERE id = $1
            AND status = $3
          RETURNING
            id,
            booking_id,
            service_id,
            service_type,
            reference_id,
            title_snapshot,
            start_at,
            end_at,
            quantity,
            unit_price,
            total_amount,
            status,
            traveller_info
        `,
        [bookingItemId, toStatus, fromStatus],
      );

      if (itemResult.rowCount !== 1) {
        throw createInvalidStateTransitionError();
      }

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
          'admin.booking_item.status_update',
          'booking_item',
          bookingItemId,
          {
            from_status: fromStatus,
            reason,
            to_status: toStatus,
          },
        ],
      );

      return itemResult.rows[0];
    });

  const updateBookingItemTravellerInfo = async ({
    actorUserId,
    bookingItemId,
    travellerInfo,
    travellerInfoLogSummary,
  }) =>
    withTransactionImpl(async (client) => {
      const itemResult = await client.query(
        `
          UPDATE booking_items
          SET traveller_info = $2
          WHERE id = $1
          RETURNING
            id,
            booking_id,
            service_id,
            service_type,
            reference_id,
            title_snapshot,
            start_at,
            end_at,
            quantity,
            unit_price,
            total_amount,
            status,
            traveller_info
        `,
        [bookingItemId, travellerInfo],
      );

      if (itemResult.rowCount !== 1) {
        throw new AppError('Booking item not found', {
          code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
          statusCode: 404,
        });
      }

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
          'admin.booking_item.traveller_info_update',
          'booking_item',
          bookingItemId,
          travellerInfoLogSummary,
        ],
      );

      return itemResult.rows[0];
    });

  const createBookingConfirmationResendEmailLog = async ({
    actorUserId,
    bookingId,
    bookingStatus,
    createdAt,
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
          VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, NULL, NULL, $8)
          RETURNING
            id,
            booking_id,
            to_email,
            template_code,
            status,
            provider,
            sent_at
        `,
        [
          userId,
          bookingId,
          toEmail,
          subject,
          templateCode,
          EMAIL_STATUS.QUEUED,
          DOMAIN_CONSTRAINTS.emailProvider,
          createdAt,
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
          actorUserId,
          'admin.mail.booking_confirmation_resend',
          'booking',
          bookingId,
          {
            booking_status: bookingStatus,
            email_log_id: emailLogResult.rows[0].id,
            template_code: templateCode,
            to_email: toEmail,
          },
        ],
      );

      return emailLogResult.rows[0];
    });

  const markBookingEmailLogSent = async ({
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
          booking_id,
          to_email,
          template_code,
          status,
          provider,
          sent_at
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

  const markBookingEmailLogFailed = async ({
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
          booking_id,
          to_email,
          template_code,
          status,
          provider,
          sent_at
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
    cancelBooking,
    completeBooking,
    confirmBooking,
    createBookingConfirmationResendEmailLog,
    expireBooking,
    getBookingById,
    getBookingItemById,
    listBookingItemsByBookingId,
    listBookingPaymentsByBookingId,
    listBookingRefundsByBookingId,
    listBookingStatusHistoriesByBookingId,
    listBookings,
    markBookingEmailLogFailed,
    markBookingEmailLogSent,
    updateBookingItemStatus,
    updateBookingItemTravellerInfo,
    updateBookingStatus,
  };
};

module.exports = {
  createAdminBookingRepository,
};
