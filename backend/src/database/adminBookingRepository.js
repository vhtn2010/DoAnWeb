const { API_ERROR_CODES } = require('../constants/domainConstraints');
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

      if (itemStatusTo && itemStatusFrom.length > 0) {
        await client.query(
          `
            UPDATE booking_items
            SET status = $2
            WHERE booking_id = $1
              AND status = ANY($3::text[])
          `,
          [bookingId, itemStatusTo, itemStatusFrom],
        );
      }

      await client.query(
        `
          INSERT INTO booking_status_histories (
            booking_id,
            from_status,
            to_status,
            reason,
            changed_by,
            created_at
          )
          VALUES ($1, $2, $3, $4, $5, NOW())
        `,
        [bookingId, fromStatus, toStatus, reason, actorUserId],
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
        COUNT(bi.id)::int AS item_count
      FROM bookings b
      LEFT JOIN users u
        ON u.id = b.user_id
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
        u.phone
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
          ORDER BY created_at DESC, id DESC
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

  return {
    completeBooking,
    confirmBooking,
    getBookingById,
    listBookingItemsByBookingId,
    listBookingPaymentsByBookingId,
    listBookingRefundsByBookingId,
    listBookingStatusHistoriesByBookingId,
    listBookings,
    updateBookingStatus,
  };
};

module.exports = {
  createAdminBookingRepository,
};
