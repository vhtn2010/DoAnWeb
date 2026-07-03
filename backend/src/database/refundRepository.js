const crypto = require('node:crypto');
const { query, withTransaction } = require('./client');

const ACTIVE_REFUND_STATUSES = Object.freeze([
  'requested',
  'approved',
  'processing',
  'success',
]);

const buildRefundCode = (now = new Date()) => {
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();

  return `RF${datePart}${randomPart}`;
};

const getBookingById = async (bookingId) => {
  const result = await query(
    `
      SELECT
        b.id,
        b.booking_code,
        b.user_id,
        b.status,
        b.total_amount,
        b.expires_at,
        b.updated_at
      FROM bookings AS b
      WHERE b.id = $1
      LIMIT 1
    `,
    [bookingId],
  );

  return result.rows[0] || null;
};

const getPaymentById = async (paymentId) => {
  const result = await query(
    `
      SELECT
        p.id,
        p.booking_id,
        p.payment_code,
        p.provider,
        p.payment_method,
        p.status,
        p.amount,
        p.currency,
        p.raw_response,
        p.paid_at,
        p.created_at
      FROM payments AS p
      WHERE p.id = $1
      LIMIT 1
    `,
    [paymentId],
  );

  return result.rows[0] || null;
};

const listBookingItemsByBookingId = async (bookingId) => {
  const result = await query(
    `
      SELECT
        bi.id,
        bi.status,
        bi.service_snapshot
      FROM booking_items AS bi
      WHERE bi.booking_id = $1
      ORDER BY bi.created_at ASC, bi.id ASC
    `,
    [bookingId],
  );

  return result.rows;
};

const sumActiveRefundAmountByPaymentId = async (paymentId) => {
  const result = await query(
    `
      SELECT COALESCE(SUM(amount), 0)::numeric AS total_reserved
      FROM refunds
      WHERE payment_id = $1
        AND status = ANY($2::text[])
    `,
    [paymentId, ACTIVE_REFUND_STATUSES],
  );

  return Number(result.rows[0]?.total_reserved || 0);
};

const listRefundsByBookingId = async (bookingId) => {
  const result = await query(
    `
      SELECT
        r.id,
        r.refund_code,
        r.booking_id,
        r.payment_id,
        r.status,
        r.amount,
        r.reason,
        r.requested_by,
        r.approved_by,
        r.provider_refund_id,
        r.raw_response,
        r.processed_at,
        r.created_at
      FROM refunds AS r
      WHERE r.booking_id = $1
      ORDER BY r.created_at DESC, r.id DESC
    `,
    [bookingId],
  );

  return result.rows;
};

const getRefundByIdWithBooking = async (refundId) => {
  const result = await query(
    `
      SELECT
        r.id,
        r.refund_code,
        r.booking_id,
        r.payment_id,
        r.status,
        r.amount,
        r.reason,
        r.requested_by,
        r.approved_by,
        r.provider_refund_id,
        r.raw_response,
        r.processed_at,
        r.created_at,
        b.booking_code,
        b.status AS booking_status,
        b.user_id
      FROM refunds AS r
      INNER JOIN bookings AS b ON b.id = r.booking_id
      WHERE r.id = $1
      LIMIT 1
    `,
    [refundId],
  );

  return result.rows[0] || null;
};

const findRefundByIdempotencyKey = async ({
  bookingId,
  idempotencyKey,
  userId,
}) => {
  const result = await query(
    `
      SELECT
        r.id,
        r.refund_code,
        r.booking_id,
        r.payment_id,
        r.status,
        r.amount,
        r.reason,
        r.requested_by,
        r.approved_by,
        r.provider_refund_id,
        r.raw_response,
        r.processed_at,
        r.created_at
      FROM user_logs AS ul
      INNER JOIN refunds AS r ON r.id = ul.entity_id
      WHERE ul.user_id = $1
        AND ul.action = 'refund.request'
        AND ul.entity_name = 'refund'
        AND ul.entity_id IS NOT NULL
        AND ul.metadata->>'booking_id' = $2
        AND ul.metadata->>'idempotency_key' = $3
      ORDER BY ul.created_at DESC, ul.id DESC
      LIMIT 1
    `,
    [userId, bookingId, idempotencyKey],
  );

  return result.rows[0] || null;
};

const insertBookingStatusHistory = async (
  db,
  { bookingId, changedBy, fromStatus, reason, toStatus },
) => {
  await db.query(
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
    [bookingId, fromStatus, toStatus, reason, changedBy],
  );
};

const insertUserLog = async (
  db,
  { action, entityId, entityName, metadata, userId },
) => {
  await db.query(
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
    [userId, action, entityName, entityId, metadata || null],
  );
};

const getLatestRefundPendingTransition = async (db, bookingId) => {
  const result = await db.query(
    `
      SELECT
        from_status,
        to_status
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

const countOtherActiveRefunds = async (db, { bookingId, refundId }) => {
  const result = await db.query(
    `
      SELECT COUNT(*)::int AS total
      FROM refunds
      WHERE booking_id = $1
        AND id <> $2
        AND status = ANY($3::text[])
    `,
    [bookingId, refundId, ACTIVE_REFUND_STATUSES],
  );

  return Number(result.rows[0]?.total || 0);
};

const createRefundRequest = async ({
  actorUserId,
  amount,
  booking,
  idempotencyKey,
  nextBookingStatus,
  payment,
  reason,
}) =>
  withTransaction(async (db) => {
    const refundCode = buildRefundCode();
    const insertResult = await db.query(
      `
        INSERT INTO refunds (
          refund_code,
          booking_id,
          payment_id,
          status,
          amount,
          reason,
          requested_by,
          approved_by,
          provider_refund_id,
          raw_response,
          processed_at
        )
        VALUES (
          $1,
          $2,
          $3,
          'requested',
          $4,
          $5,
          $6,
          NULL,
          NULL,
          $7::jsonb,
          NULL
        )
        RETURNING
          id,
          refund_code,
          booking_id,
          payment_id,
          status,
          amount,
          reason,
          requested_by,
          approved_by,
          provider_refund_id,
          raw_response,
          processed_at,
          created_at
      `,
      [
        refundCode,
        booking.id,
        payment.id,
        amount,
        reason,
        actorUserId,
        JSON.stringify({
          request: {
            idempotency_key: idempotencyKey,
            requested_amount: amount,
          },
        }),
      ],
    );

    const refund = insertResult.rows[0];
    let bookingStatus = booking.status;

    if (nextBookingStatus && nextBookingStatus !== booking.status) {
      await db.query(
        `
          UPDATE bookings
          SET status = $2, updated_at = NOW()
          WHERE id = $1
        `,
        [booking.id, nextBookingStatus],
      );

      await insertBookingStatusHistory(db, {
        bookingId: booking.id,
        changedBy: actorUserId,
        fromStatus: booking.status,
        reason: 'Customer requested manual refund',
        toStatus: nextBookingStatus,
      });

      bookingStatus = nextBookingStatus;
    }

    await insertUserLog(db, {
      action: 'refund.request',
      entityId: refund.id,
      entityName: 'refund',
      metadata: {
        amount,
        booking_id: booking.id,
        booking_status_after: bookingStatus,
        booking_status_before: booking.status,
        idempotency_key: idempotencyKey,
        payment_id: payment.id,
        refund_code: refund.refund_code,
      },
      userId: actorUserId,
    });

    return {
      booking: {
        ...booking,
        status: bookingStatus,
      },
      refund,
    };
  });

const cancelRefundRequest = async ({
  actorUserId,
  cancelReason,
  refund,
}) =>
  withTransaction(async (db) => {
    const mergedRawResponse = {
      ...(refund.raw_response && typeof refund.raw_response === 'object'
        ? refund.raw_response
        : {}),
      cancellation: {
        cancelled_at: new Date().toISOString(),
        cancelled_by: actorUserId,
        reason: cancelReason,
      },
    };

    const updateResult = await db.query(
      `
        UPDATE refunds
        SET status = 'cancelled',
            raw_response = $2::jsonb
        WHERE id = $1
        RETURNING
          id,
          refund_code,
          booking_id,
          payment_id,
          status,
          amount,
          reason,
          requested_by,
          approved_by,
          provider_refund_id,
          raw_response,
          processed_at,
          created_at
      `,
      [refund.id, JSON.stringify(mergedRawResponse)],
    );

    const updatedRefund = updateResult.rows[0];
    let bookingStatus = refund.booking_status;

    if (refund.booking_status === 'refund_pending') {
      const otherActiveRefunds = await countOtherActiveRefunds(db, {
        bookingId: refund.booking_id,
        refundId: refund.id,
      });

      if (otherActiveRefunds === 0) {
        const latestTransition = await getLatestRefundPendingTransition(
          db,
          refund.booking_id,
        );
        const fallbackStatus = latestTransition?.from_status;

        if (fallbackStatus && fallbackStatus !== 'refund_pending') {
          await db.query(
            `
              UPDATE bookings
              SET status = $2, updated_at = NOW()
              WHERE id = $1
            `,
            [refund.booking_id, fallbackStatus],
          );

          await insertBookingStatusHistory(db, {
            bookingId: refund.booking_id,
            changedBy: actorUserId,
            fromStatus: 'refund_pending',
            reason: 'Customer cancelled manual refund request',
            toStatus: fallbackStatus,
          });

          bookingStatus = fallbackStatus;
        }
      }
    }

    await insertUserLog(db, {
      action: 'refund.cancel',
      entityId: refund.id,
      entityName: 'refund',
      metadata: {
        booking_id: refund.booking_id,
        booking_status_after: bookingStatus,
        payment_id: refund.payment_id,
        reason: cancelReason,
        refund_code: refund.refund_code,
      },
      userId: actorUserId,
    });

    return {
      bookingStatus,
      refund: updatedRefund,
    };
  });

module.exports = {
  cancelRefundRequest,
  createRefundRequest,
  findRefundByIdempotencyKey,
  getBookingById,
  getPaymentById,
  getRefundByIdWithBooking,
  listBookingItemsByBookingId,
  listRefundsByBookingId,
  sumActiveRefundAmountByPaymentId,
};
