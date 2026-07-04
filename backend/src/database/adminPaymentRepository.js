const { API_ERROR_CODES } = require('../constants/domainConstraints');
const AppError = require('../utils/AppError');
const { query, withTransaction } = require('./client');

const PAYMENT_DETAIL_SELECT = `
  SELECT
    p.id,
    p.booking_id,
    p.payment_code,
    p.provider,
    p.payment_method,
    p.status,
    p.amount,
    p.currency,
    p.provider_transaction_id,
    p.provider_order_id,
    p.checksum_verified,
    p.raw_response,
    p.paid_at,
    p.expired_at,
    p.created_at,
    p.updated_at,
    b.booking_code,
    b.user_id AS customer_user_id,
    b.status AS booking_status,
    b.total_amount AS booking_total_amount,
    b.currency AS booking_currency,
    b.expires_at AS booking_expires_at,
    b.created_at AS booking_created_at,
    b.contact_name,
    b.contact_email,
    b.contact_phone,
    u.id AS customer_id,
    u.full_name AS customer_full_name,
    u.email AS customer_email,
    u.phone AS customer_phone
  FROM payments p
  INNER JOIN bookings b
    ON b.id = p.booking_id
  LEFT JOIN users u
    ON u.id = b.user_id
`;

const createInvalidStateTransitionError = (
  message = 'Booking state no longer allows this transition',
) =>
  new AppError(message, {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const createAdminPaymentRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const buildWhereClause = ({
    from,
    method,
    provider,
    status,
    to,
  }) => {
    const conditions = [];
    const params = [];

    if (provider) {
      params.push(provider);
      conditions.push(`p.provider = $${params.length}`);
    }

    if (method) {
      params.push(method);
      conditions.push(`p.payment_method = $${params.length}`);
    }

    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    if (from) {
      params.push(from);
      conditions.push(`p.created_at >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`p.created_at <= $${params.length}`);
    }

    return {
      params,
      whereSql:
        conditions.length > 0
          ? `WHERE ${conditions.join('\n        AND ')}`
          : '',
    };
  };

  const selectPaymentById = async (executor, paymentId) => {
    const result = await executor.query(
      `
        ${PAYMENT_DETAIL_SELECT}
        WHERE p.id = $1
        LIMIT 1
      `,
      [paymentId],
    );

    return result.rows[0] || null;
  };

  const insertUserLog = async (client, {
    action,
    actorUserId,
    entityId,
    metadata,
  }) => {
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
        VALUES ($1, $2, 'payment', $3, $4, NOW())
      `,
      [
        actorUserId,
        action,
        entityId,
        metadata || null,
      ],
    );
  };

  const insertCustomerNotification = async (client, {
    body,
    paymentId,
    title,
    userId,
  }) => {
    if (!userId) {
      return;
    }

    await client.query(
      `
        INSERT INTO notifications (
          user_id,
          title,
          body,
          type,
          status,
          related_entity_name,
          related_entity_id,
          sent_at,
          read_at,
          created_at
        )
        VALUES ($1, $2, $3, 'payment', 'queued', 'payment', $4, NULL, NULL, NOW())
      `,
      [
        userId,
        title,
        body,
        paymentId,
      ],
    );
  };

  const setLocalConfig = async (client, key, value) => {
    await client.query(
      'SELECT set_config($1, $2, TRUE)',
      [key, value],
    );
  };

  const acquireTransactionLock = async (client, key) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
  };

  const lockPaymentAndBooking = async (client, paymentId) => {
    const paymentLockResult = await client.query(
      `
        SELECT id, booking_id
        FROM payments
        WHERE id = $1
        FOR UPDATE
      `,
      [paymentId],
    );

    if (paymentLockResult.rowCount === 0) {
      return null;
    }

    await client.query(
      `
        SELECT id
        FROM bookings
        WHERE id = $1
        FOR UPDATE
      `,
      [paymentLockResult.rows[0].booking_id],
    );

    return paymentLockResult.rows[0];
  };

  const transitionBookingStatus = async (client, {
    actorUserId,
    bookingId,
    fromStatus,
    reason,
    toStatus,
  }) => {
    await setLocalConfig(client, 'app.current_user_id', actorUserId);
    await setLocalConfig(client, 'app.status_change_reason', reason);

    const result = await client.query(
      `
        UPDATE bookings
        SET status = $2
        WHERE id = $1
          AND status = $3
        RETURNING id, booking_code, status, expires_at, updated_at
      `,
      [bookingId, toStatus, fromStatus],
    );

    return result.rows[0] || null;
  };

  const listPayments = async ({
    from,
    limit,
    method,
    offset,
    provider,
    status,
    to,
  }) => {
    const { params, whereSql } = buildWhereClause({
      from,
      method,
      provider,
      status,
      to,
    });
    const filteredSql = `
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
        p.expired_at,
        p.created_at,
        p.updated_at,
        b.booking_code,
        b.status AS booking_status,
        b.total_amount AS booking_total_amount,
        b.currency AS booking_currency,
        b.expires_at AS booking_expires_at,
        b.created_at AS booking_created_at,
        u.id AS customer_id,
        u.full_name AS customer_full_name,
        u.email AS customer_email,
        u.phone AS customer_phone
      FROM payments p
      INNER JOIN bookings b
        ON b.id = p.booking_id
      LEFT JOIN users u
        ON u.id = b.user_id
      ${whereSql}
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
          ) AS filtered_payments
        `,
        countParams,
      ),
      queryImpl(
        `
          SELECT *
          FROM (
            ${filteredSql}
          ) AS filtered_payments
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

  const getPaymentById = async (paymentId) => selectPaymentById(
    { query: queryImpl },
    paymentId,
  );

  const hasPaymentConfirmLogByIdempotencyKey = async ({
    idempotencyKey,
    paymentId,
  }) => {
    const result = await queryImpl(
      `
        SELECT 1
        FROM user_logs
        WHERE entity_name = 'payment'
          AND entity_id = $1
          AND action = 'payment.direct.confirm'
          AND metadata ->> 'idempotency_key' = $2
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [paymentId, idempotencyKey],
    );

    return result.rowCount > 0;
  };

  const confirmPayment = async ({
    actorUserId,
    collectorNote,
    idempotencyKey,
    nextBookingStatus,
    paymentId,
    receivedAmount,
    receivedAt,
  }) =>
    withTransactionImpl(async (client) => {
      await acquireTransactionLock(
        client,
        `payment:confirm:${actorUserId}:${paymentId}:${idempotencyKey}`,
      );
      const lockedPayment = await lockPaymentAndBooking(client, paymentId);

      if (!lockedPayment) {
        return null;
      }

      const currentPayment = await selectPaymentById(client, paymentId);

      if (!currentPayment) {
        return null;
      }

      const replayResult = await client.query(
        `
          SELECT 1
          FROM user_logs
          WHERE entity_name = 'payment'
            AND entity_id = $1
            AND action = 'payment.direct.confirm'
            AND metadata ->> 'idempotency_key' = $2
          ORDER BY created_at DESC
          LIMIT 1
        `,
        [paymentId, idempotencyKey],
      );

      if (replayResult.rowCount > 0) {
        return {
          bookingTransitionApplied: true,
          payment: currentPayment,
          reused: 'idempotency',
          transitionApplied: true,
        };
      }

      const paymentResult = await client.query(
        `
          UPDATE payments
          SET
            status = 'success',
            paid_at = $2,
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
              'confirmation',
              jsonb_build_object(
                'confirmed_at', NOW(),
                'confirmed_by_user_id', $3,
                'collector_note', $4,
                'idempotency_key', $5,
                'received_amount', $6,
                'received_at', $2
              )
            )
          WHERE id = $1
            AND status = 'pending'
            AND provider = 'direct'
          RETURNING id
        `,
        [
          paymentId,
          receivedAt,
          actorUserId,
          collectorNote,
          idempotencyKey,
          receivedAmount,
        ],
      );

      if (paymentResult.rowCount !== 1) {
        return {
          alreadyConfirmed:
            currentPayment.status === 'success' ||
            currentPayment.status === 'reconciled',
          payment: currentPayment,
          transitionApplied: false,
        };
      }

      let bookingStatus = currentPayment.booking_status;

      const paidBooking = await transitionBookingStatus(client, {
        actorUserId,
        bookingId: currentPayment.booking_id,
        fromStatus: 'pending_payment',
        reason: 'Direct payment confirmed and booking moved to paid',
        toStatus: 'paid',
      });

      if (!paidBooking) {
        throw createInvalidStateTransitionError(
          'Booking state no longer allows payment confirmation',
        );
      }

      bookingStatus = paidBooking.status;

      if (nextBookingStatus === 'confirmed') {
        const confirmedBooking = await transitionBookingStatus(client, {
          actorUserId,
          bookingId: currentPayment.booking_id,
          fromStatus: 'paid',
          reason: 'Direct payment confirmed and booking auto-confirmed',
          toStatus: 'confirmed',
        });

        if (!confirmedBooking) {
          throw createInvalidStateTransitionError(
            'Booking state no longer allows payment confirmation',
          );
        }

        bookingStatus = confirmedBooking.status;

        await client.query(
          `
            UPDATE booking_items
            SET status = 'confirmed'
            WHERE booking_id = $1
              AND status = 'pending'
          `,
          [currentPayment.booking_id],
        );
      }

      await insertUserLog(client, {
        action: 'payment.direct.confirm',
        actorUserId,
        entityId: paymentId,
        metadata: {
          booking_id: currentPayment.booking_id,
          booking_status: bookingStatus,
          idempotency_key: idempotencyKey,
          next_booking_status: nextBookingStatus,
          payment_code: currentPayment.payment_code,
          received_amount: receivedAmount,
          received_at: receivedAt,
        },
      });

      const updatedPayment = await selectPaymentById(client, paymentId);

      return {
        bookingTransitionApplied: true,
        payment: updatedPayment,
        transitionApplied: true,
      };
    });

  const rejectPayment = async ({
    actorUserId,
    paymentId,
    reason,
  }) =>
    withTransactionImpl(async (client) => {
      const paymentResult = await client.query(
        `
          UPDATE payments
          SET
            status = 'failed',
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
              'reject_reason', $2,
              'rejected_at', NOW(),
              'rejected_by_user_id', $3
            )
          WHERE id = $1
            AND status = 'pending'
            AND provider = 'direct'
          RETURNING id
        `,
        [paymentId, reason, actorUserId],
      );

      if (paymentResult.rowCount !== 1) {
        return null;
      }

      const updatedPayment = await selectPaymentById(client, paymentId);

      await insertUserLog(client, {
        action: 'payment.direct.reject',
        actorUserId,
        entityId: paymentId,
        metadata: {
          payment_code: updatedPayment.payment_code,
          reason,
          status: updatedPayment.status,
        },
      });

      await insertCustomerNotification(client, {
        body: `Payment ${updatedPayment.payment_code} was rejected. Reason: ${reason}`,
        paymentId,
        title: 'Payment rejected',
        userId: updatedPayment.customer_user_id,
      });

      return updatedPayment;
    });

  const expirePayment = async ({
    actorUserId,
    expireBooking,
    paymentId,
    reason,
  }) =>
    withTransactionImpl(async (client) => {
      const currentPayment = await selectPaymentById(client, paymentId);

      if (!currentPayment) {
        return null;
      }

      const paymentResult = await client.query(
        `
          UPDATE payments
          SET
            status = 'expired',
            expired_at = COALESCE(expired_at, NOW()),
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
              'expire_reason', $2,
              'expired_by_user_id', $3,
              'expired_marked_at', NOW()
            )
          WHERE id = $1
            AND status = 'pending'
            AND provider = 'direct'
          RETURNING id
        `,
        [paymentId, reason, actorUserId],
      );

      if (paymentResult.rowCount !== 1) {
        return {
          bookingExpired: false,
          payment: currentPayment,
          transitionApplied: false,
        };
      }

      let bookingExpired = false;

      if (expireBooking) {
        const expiredBooking = await transitionBookingStatus(client, {
          actorUserId,
          bookingId: currentPayment.booking_id,
          fromStatus: 'pending_payment',
          reason: 'Direct payment expired and booking payment window elapsed',
          toStatus: 'expired',
        });

        bookingExpired = Boolean(expiredBooking);
      }

      const updatedPayment = await selectPaymentById(client, paymentId);

      await insertUserLog(client, {
        action: 'payment.direct.expire',
        actorUserId,
        entityId: paymentId,
        metadata: {
          booking_expired: bookingExpired,
          payment_code: updatedPayment.payment_code,
          reason,
          status: updatedPayment.status,
        },
      });

      await insertCustomerNotification(client, {
        body: `Payment ${updatedPayment.payment_code} expired. Reason: ${reason}`,
        paymentId,
        title: 'Payment expired',
        userId: updatedPayment.customer_user_id,
      });

      return {
        bookingExpired,
        payment: updatedPayment,
        transitionApplied: true,
      };
    });

  const markPaymentReconciled = async ({
    actorUserId,
    note,
    paymentId,
  }) =>
    withTransactionImpl(async (client) => {
      const paymentResult = await client.query(
        `
          UPDATE payments
          SET
            status = 'reconciled',
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
              'reconciliation',
              jsonb_build_object(
                'note', $2,
                'reconciled_at', NOW(),
                'reconciled_by_user_id', $3
              )
            )
          WHERE id = $1
            AND status = 'success'
            AND provider = 'direct'
          RETURNING id
        `,
        [paymentId, note, actorUserId],
      );

      if (paymentResult.rowCount !== 1) {
        return null;
      }

      const updatedPayment = await selectPaymentById(client, paymentId);

      await insertUserLog(client, {
        action: 'payment.direct.reconcile',
        actorUserId,
        entityId: paymentId,
        metadata: {
          note,
          payment_code: updatedPayment.payment_code,
          status: updatedPayment.status,
        },
      });

      return updatedPayment;
    });

  const updatePaymentInternalNote = async ({
    actorUserId,
    note,
    paymentId,
  }) =>
    withTransactionImpl(async (client) => {
      const paymentResult = await client.query(
        `
          UPDATE payments
          SET
            raw_response = jsonb_set(
              COALESCE(raw_response, '{}'::jsonb),
              '{internal_note}',
              jsonb_build_object(
                'note', $2,
                'updated_at', NOW(),
                'updated_by_user_id', $3
              ),
              true
            )
          WHERE id = $1
            AND provider = 'direct'
          RETURNING id
        `,
        [paymentId, note, actorUserId],
      );

      if (paymentResult.rowCount !== 1) {
        return null;
      }

      const updatedPayment = await selectPaymentById(client, paymentId);

      await insertUserLog(client, {
        action: 'payment.direct.note_update',
        actorUserId,
        entityId: paymentId,
        metadata: {
          note,
          payment_code: updatedPayment.payment_code,
          status: updatedPayment.status,
        },
      });

      return updatedPayment;
    });

  return {
    confirmPayment,
    expirePayment,
    getPaymentById,
    hasPaymentConfirmLogByIdempotencyKey,
    listPayments,
    markPaymentReconciled,
    rejectPayment,
    updatePaymentInternalNote,
  };
};

module.exports = {
  createAdminPaymentRepository,
};
