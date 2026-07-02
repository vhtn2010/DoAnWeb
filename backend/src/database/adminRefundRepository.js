const {
  BOOKING_ITEM_STATUS,
  BOOKING_STATUS,
  PAYMENT_STATUS,
} = require('../constants/domainConstraints');
const { query, withTransaction } = require('./client');

const REFUND_DETAIL_SELECT = `
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
    b.user_id AS customer_user_id,
    b.status AS booking_status,
    b.total_amount AS booking_total_amount,
    b.currency AS booking_currency,
    b.expires_at AS booking_expires_at,
    b.created_at AS booking_created_at,
    b.contact_name,
    b.contact_email,
    b.contact_phone,
    p.payment_code,
    p.provider AS payment_provider,
    p.payment_method,
    p.status AS payment_status,
    p.amount AS payment_amount,
    p.currency AS payment_currency,
    p.paid_at AS payment_paid_at,
    customer.id AS customer_id,
    customer.full_name AS customer_full_name,
    customer.email AS customer_email,
    customer.phone AS customer_phone,
    requester.id AS requested_by_user_id,
    requester.full_name AS requested_by_full_name,
    requester.email AS requested_by_email,
    requester.phone AS requested_by_phone,
    approver.id AS approved_by_user_id,
    approver.full_name AS approved_by_full_name,
    approver.email AS approved_by_email,
    approver.phone AS approved_by_phone
  FROM refunds r
  INNER JOIN bookings b
    ON b.id = r.booking_id
  INNER JOIN payments p
    ON p.id = r.payment_id
  LEFT JOIN users customer
    ON customer.id = b.user_id
  LEFT JOIN users requester
    ON requester.id = r.requested_by
  LEFT JOIN users approver
    ON approver.id = r.approved_by
`;

const ACTIVE_REFUND_STATUSES = Object.freeze([
  'requested',
  'approved',
  'processing',
  'success',
]);

const REFUNDABLE_BOOKING_ITEM_STATUSES = Object.freeze([
  BOOKING_ITEM_STATUS.PENDING,
  BOOKING_ITEM_STATUS.CONFIRMED,
  BOOKING_ITEM_STATUS.COMPLETED,
]);

const createAdminRefundRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const toExecutor = (executor) => (
    typeof executor === 'function'
      ? { query: executor }
      : executor
  );

  const queryWith = (executor, text, params = []) =>
    toExecutor(executor).query(text, params);

  const buildPlainObject = (value) => (
    value && typeof value === 'object' && !Array.isArray(value)
      ? { ...value }
      : {}
  );

  const buildScopedWhere = ({
    allowedServiceIds,
    from,
    status,
    to,
  }) => {
    const conditions = [];
    const params = [];

    if (status) {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (from) {
      params.push(from);
      conditions.push(`r.created_at >= $${params.length}`);
    }

    if (to) {
      params.push(to);
      conditions.push(`r.created_at <= $${params.length}`);
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

  const selectRefundById = async (executor, {
    allowedServiceIds,
    refundId,
  }) => {
    const params = [refundId];
    let scopeSql = '';

    if (Array.isArray(allowedServiceIds)) {
      if (allowedServiceIds.length === 0) {
        return null;
      }

      params.push(allowedServiceIds);
      scopeSql = `
        AND EXISTS (
          SELECT 1
          FROM booking_items scoped_items
          WHERE scoped_items.booking_id = b.id
            AND scoped_items.service_id = ANY($${params.length}::uuid[])
        )
      `;
    }

    const result = await queryWith(
      executor,
      `
        ${REFUND_DETAIL_SELECT}
        WHERE r.id = $1
        ${scopeSql}
        LIMIT 1
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const listRefunds = async ({
    allowedServiceIds,
    from,
    limit,
    offset,
    status,
    to,
  }) => {
    const { params, whereSql } = buildScopedWhere({
      allowedServiceIds,
      from,
      status,
      to,
    });
    const filteredSql = `
      ${REFUND_DETAIL_SELECT}
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
          ) AS filtered_refunds
        `,
        countParams,
      ),
      queryImpl(
        `
          SELECT *
          FROM (
            ${filteredSql}
          ) AS filtered_refunds
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

  const getRefundById = async ({
    allowedServiceIds,
    refundId,
  }) => selectRefundById(queryImpl, {
    allowedServiceIds,
    refundId,
  });

  const getBookingItemsByBookingId = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          service_snapshot,
          status
        FROM booking_items
        WHERE booking_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const sumOtherActiveRefundAmountsByPaymentId = async ({
    excludedRefundId,
    paymentId,
  }) => {
    const result = await queryImpl(
      `
        SELECT COALESCE(SUM(amount), 0)::numeric AS total_reserved
        FROM refunds
        WHERE payment_id = $1
          AND id <> $2
          AND status = ANY($3::text[])
      `,
      [paymentId, excludedRefundId, ACTIVE_REFUND_STATUSES],
    );

    return Number(result.rows[0]?.total_reserved || 0);
  };

  const sumSuccessfulRefundAmountsByPaymentId = async (executor, paymentId) => {
    const result = await queryWith(
      executor,
      `
        SELECT COALESCE(SUM(amount), 0)::numeric AS total_success
        FROM refunds
        WHERE payment_id = $1
          AND status = 'success'
      `,
      [paymentId],
    );

    return Number(result.rows[0]?.total_success || 0);
  };

  const hasUserLogByIdempotencyKey = async ({
    action,
    idempotencyKey,
    refundId,
  }) => {
    const result = await queryImpl(
      `
        SELECT 1
        FROM user_logs
        WHERE entity_name = 'refund'
          AND entity_id = $1
          AND action = $2
          AND metadata ->> 'idempotency_key' = $3
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [refundId, action, idempotencyKey],
    );

    return result.rowCount > 0;
  };

  const hasApproveLogByIdempotencyKey = async ({
    idempotencyKey,
    refundId,
  }) => hasUserLogByIdempotencyKey({
    action: 'refund.approve',
    idempotencyKey,
    refundId,
  });

  const hasMarkSuccessLogByIdempotencyKey = async ({
    idempotencyKey,
    refundId,
  }) => hasUserLogByIdempotencyKey({
    action: 'refund.mark_success',
    idempotencyKey,
    refundId,
  });

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
        VALUES ($1, $2, 'refund', $3, $4, NOW())
      `,
      [
        actorUserId,
        action,
        entityId,
        metadata || null,
      ],
    );
  };

  const setLocalConfig = async (client, key, value) => {
    await client.query(
      'SELECT set_config($1, $2, TRUE)',
      [key, value],
    );
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

  const getLatestRefundPendingTransition = async (client, bookingId) => {
    const result = await client.query(
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

  const countOtherActiveRefunds = async (client, {
    bookingId,
    refundId,
  }) => {
    const result = await client.query(
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

  const appendInternalNote = ({
    actorUserId,
    note,
    rawResponse,
    nowIso,
  }) => {
    const mergedRawResponse = buildPlainObject(rawResponse);

    if (note) {
      mergedRawResponse.internal_notes = {
        note,
        updated_at: nowIso,
        updated_by_user_id: actorUserId,
      };
    }

    return mergedRawResponse;
  };

  const lockRefundContext = async (client, refundId) => {
    await client.query(
      `
        SELECT id
        FROM refunds
        WHERE id = $1
        FOR UPDATE
      `,
      [refundId],
    );

    const refund = await selectRefundById(client, {
      allowedServiceIds: null,
      refundId,
    });

    if (!refund) {
      return null;
    }

    const paymentResult = await client.query(
      `
        SELECT
          id,
          amount,
          status
        FROM payments
        WHERE id = $1
        FOR UPDATE
      `,
      [refund.payment_id],
    );
    const bookingResult = await client.query(
      `
        SELECT
          id,
          total_amount,
          status
        FROM bookings
        WHERE id = $1
        FOR UPDATE
      `,
      [refund.booking_id],
    );

    return {
      booking: bookingResult.rows[0] || null,
      payment: paymentResult.rows[0] || null,
      refund,
    };
  };

  const updateBookingItemsRefunded = async (client, bookingId) => {
    await client.query(
      `
        UPDATE booking_items
        SET status = $2
        WHERE booking_id = $1
          AND status = ANY($3::text[])
      `,
      [
        bookingId,
        BOOKING_ITEM_STATUS.REFUNDED,
        REFUNDABLE_BOOKING_ITEM_STATUSES,
      ],
    );
  };

  const resolveNextBookingRefundStatus = ({
    bookingStatus,
    isFullRefund,
  }) => {
    if (bookingStatus === BOOKING_STATUS.REFUND_PENDING) {
      return isFullRefund
        ? BOOKING_STATUS.REFUNDED
        : BOOKING_STATUS.PARTIALLY_REFUNDED;
    }

    if (
      bookingStatus === BOOKING_STATUS.PARTIALLY_REFUNDED &&
      isFullRefund
    ) {
      return BOOKING_STATUS.REFUNDED;
    }

    return null;
  };

  const approveRefund = async ({
    actorUserId,
    approvedAmount,
    idempotencyKey,
    nextBookingStatus,
    note,
    refund,
  }) =>
    withTransactionImpl(async (client) => {
      const currentRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId: refund.id,
      });

      if (!currentRefund) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const mergedRawResponse = appendInternalNote({
        actorUserId,
        note,
        nowIso,
        rawResponse: currentRefund.raw_response,
      });

      mergedRawResponse.approval = {
        approved_amount: approvedAmount,
        approved_at: nowIso,
        approved_by_user_id: actorUserId,
        idempotency_key: idempotencyKey,
      };

      if (approvedAmount !== Number(currentRefund.amount)) {
        mergedRawResponse.requested_amount = Number(currentRefund.amount);
      }

      const updateResult = await client.query(
        `
          UPDATE refunds
          SET
            status = 'approved',
            amount = $2,
            approved_by = $3,
            raw_response = $4::jsonb
          WHERE id = $1
            AND status = 'requested'
          RETURNING id
        `,
        [
          refund.id,
          approvedAmount,
          actorUserId,
          JSON.stringify(mergedRawResponse),
        ],
      );

      if (updateResult.rowCount !== 1) {
        return {
          refund: currentRefund,
          transitionApplied: false,
        };
      }

      let bookingStatus = currentRefund.booking_status;

      if (nextBookingStatus && nextBookingStatus !== currentRefund.booking_status) {
        const updatedBooking = await transitionBookingStatus(client, {
          actorUserId,
          bookingId: currentRefund.booking_id,
          fromStatus: currentRefund.booking_status,
          reason: 'Admin approved manual refund request',
          toStatus: nextBookingStatus,
        });

        if (updatedBooking) {
          bookingStatus = updatedBooking.status;
        }
      }

      await insertUserLog(client, {
        action: 'refund.approve',
        actorUserId,
        entityId: refund.id,
        metadata: {
          approved_amount: approvedAmount,
          booking_id: currentRefund.booking_id,
          booking_status_after: bookingStatus,
          booking_status_before: currentRefund.booking_status,
          idempotency_key: idempotencyKey,
          note,
          payment_id: currentRefund.payment_id,
          refund_code: currentRefund.refund_code,
        },
      });

      const updatedRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId: refund.id,
      });

      return {
        refund: updatedRefund,
        transitionApplied: true,
      };
    });

  const rejectRefund = async ({
    actorUserId,
    reason,
    refund,
  }) =>
    withTransactionImpl(async (client) => {
      const currentRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId: refund.id,
      });

      if (!currentRefund) {
        return null;
      }

      const mergedRawResponse = buildPlainObject(currentRefund.raw_response);
      mergedRawResponse.rejection_reason = reason;
      mergedRawResponse.rejected_at = new Date().toISOString();
      mergedRawResponse.rejected_by_user_id = actorUserId;

      const updateResult = await client.query(
        `
          UPDATE refunds
          SET
            status = 'rejected',
            raw_response = $2::jsonb
          WHERE id = $1
            AND status = 'requested'
          RETURNING id
        `,
        [refund.id, JSON.stringify(mergedRawResponse)],
      );

      if (updateResult.rowCount !== 1) {
        return {
          bookingStatus: currentRefund.booking_status,
          refund: currentRefund,
          transitionApplied: false,
        };
      }

      let bookingStatus = currentRefund.booking_status;

      if (currentRefund.booking_status === 'refund_pending') {
        const otherActiveRefunds = await countOtherActiveRefunds(client, {
          bookingId: currentRefund.booking_id,
          refundId: currentRefund.id,
        });

        if (otherActiveRefunds === 0) {
          const latestTransition = await getLatestRefundPendingTransition(
            client,
            currentRefund.booking_id,
          );
          const fallbackStatus = latestTransition?.from_status;

          if (fallbackStatus && fallbackStatus !== 'refund_pending') {
            const restoredBooking = await transitionBookingStatus(client, {
              actorUserId,
              bookingId: currentRefund.booking_id,
              fromStatus: 'refund_pending',
              reason: 'Admin rejected manual refund request',
              toStatus: fallbackStatus,
            });

            if (restoredBooking) {
              bookingStatus = restoredBooking.status;
            }
          }
        }
      }

      await insertUserLog(client, {
        action: 'refund.reject',
        actorUserId,
        entityId: refund.id,
        metadata: {
          booking_id: currentRefund.booking_id,
          booking_status_after: bookingStatus,
          booking_status_before: currentRefund.booking_status,
          payment_id: currentRefund.payment_id,
          reason,
          refund_code: currentRefund.refund_code,
        },
      });

      const updatedRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId: refund.id,
      });

      return {
        bookingStatus,
        refund: updatedRefund,
        transitionApplied: true,
      };
    });

  const markRefundProcessing = async ({
    actorUserId,
    note,
    refundId,
  }) =>
    withTransactionImpl(async (client) => {
      const currentRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId,
      });

      if (!currentRefund) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const mergedRawResponse = appendInternalNote({
        actorUserId,
        note,
        nowIso,
        rawResponse: currentRefund.raw_response,
      });
      mergedRawResponse.processing = {
        marked_at: nowIso,
        marked_by_user_id: actorUserId,
      };

      const updateResult = await client.query(
        `
          UPDATE refunds
          SET
            status = 'processing',
            raw_response = $2::jsonb
          WHERE id = $1
            AND status = 'approved'
          RETURNING id
        `,
        [refundId, JSON.stringify(mergedRawResponse)],
      );

      if (updateResult.rowCount !== 1) {
        return {
          refund: currentRefund,
          transitionApplied: false,
        };
      }

      await insertUserLog(client, {
        action: 'refund.mark_processing',
        actorUserId,
        entityId: refundId,
        metadata: {
          booking_id: currentRefund.booking_id,
          booking_status_after: currentRefund.booking_status,
          booking_status_before: currentRefund.booking_status,
          note,
          payment_id: currentRefund.payment_id,
          refund_code: currentRefund.refund_code,
        },
      });

      const updatedRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId,
      });

      return {
        refund: updatedRefund,
        transitionApplied: true,
      };
    });

  const markRefundSuccess = async ({
    actorUserId,
    idempotencyKey,
    note,
    processedAt,
    providerRefundId,
    refundId,
  }) =>
    withTransactionImpl(async (client) => {
      const lockedContext = await lockRefundContext(client, refundId);

      if (!lockedContext?.refund || !lockedContext.payment || !lockedContext.booking) {
        return null;
      }

      const currentRefund = lockedContext.refund;

      if (currentRefund.status !== 'processing') {
        return {
          refund: currentRefund,
          transitionApplied: false,
        };
      }

      const totalSuccessfulBefore = await sumSuccessfulRefundAmountsByPaymentId(
        client,
        currentRefund.payment_id,
      );
      const nextSuccessfulTotal = Number(
        (totalSuccessfulBefore + Number(currentRefund.amount)).toFixed(2),
      );
      const paymentAmount = Number(Number(currentRefund.payment_amount || 0).toFixed(2));

      if (nextSuccessfulTotal > paymentAmount) {
        return {
          overRefund: true,
          refund: currentRefund,
          transitionApplied: true,
        };
      }

      const nowIso = new Date().toISOString();
      const mergedRawResponse = appendInternalNote({
        actorUserId,
        note,
        nowIso,
        rawResponse: currentRefund.raw_response,
      });
      mergedRawResponse.success = {
        idempotency_key: idempotencyKey,
        processed_at: processedAt,
        processed_by_user_id: actorUserId,
        provider_refund_id: providerRefundId || null,
      };

      const updateResult = await client.query(
        `
          UPDATE refunds
          SET
            status = 'success',
            processed_at = $2,
            provider_refund_id = $3,
            raw_response = $4::jsonb
          WHERE id = $1
            AND status = 'processing'
          RETURNING id
        `,
        [
          refundId,
          processedAt,
          providerRefundId || null,
          JSON.stringify(mergedRawResponse),
        ],
      );

      if (updateResult.rowCount !== 1) {
        return {
          refund: currentRefund,
          transitionApplied: false,
        };
      }

      const totalSuccessfulAfter = await sumSuccessfulRefundAmountsByPaymentId(
        client,
        currentRefund.payment_id,
      );
      const normalizedSuccessfulAfter = Number(totalSuccessfulAfter.toFixed(2));
      const isFullRefund = normalizedSuccessfulAfter === paymentAmount;
      const nextPaymentStatus = isFullRefund
        ? PAYMENT_STATUS.REFUNDED
        : PAYMENT_STATUS.PARTIALLY_REFUNDED;

      await client.query(
        `
          UPDATE payments
          SET
            status = $2,
            updated_at = NOW()
          WHERE id = $1
        `,
        [currentRefund.payment_id, nextPaymentStatus],
      );

      const nextBookingStatus = resolveNextBookingRefundStatus({
        bookingStatus: currentRefund.booking_status,
        isFullRefund,
      });

      if (nextBookingStatus) {
        await transitionBookingStatus(client, {
          actorUserId,
          bookingId: currentRefund.booking_id,
          fromStatus: currentRefund.booking_status,
          reason: 'Admin marked manual refund as successful',
          toStatus: nextBookingStatus,
        });
      }

      if (isFullRefund) {
        await updateBookingItemsRefunded(client, currentRefund.booking_id);
      }

      await insertUserLog(client, {
        action: 'refund.mark_success',
        actorUserId,
        entityId: refundId,
        metadata: {
          booking_id: currentRefund.booking_id,
          booking_status_after:
            nextBookingStatus || currentRefund.booking_status,
          booking_status_before: currentRefund.booking_status,
          idempotency_key: idempotencyKey,
          note,
          payment_id: currentRefund.payment_id,
          payment_status_after: nextPaymentStatus,
          payment_status_before: currentRefund.payment_status,
          processed_at: processedAt,
          provider_refund_id: providerRefundId || null,
          refund_code: currentRefund.refund_code,
          total_successful_amount: normalizedSuccessfulAfter,
        },
      });

      const updatedRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId,
      });

      return {
        overRefund: false,
        refund: updatedRefund,
        transitionApplied: true,
      };
    });

  const markRefundFailed = async ({
    actorUserId,
    reason,
    refundId,
  }) =>
    withTransactionImpl(async (client) => {
      const currentRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId,
      });

      if (!currentRefund) {
        return null;
      }

      const mergedRawResponse = buildPlainObject(currentRefund.raw_response);
      mergedRawResponse.failure_reason = reason;
      mergedRawResponse.failed_at = new Date().toISOString();
      mergedRawResponse.failed_by_user_id = actorUserId;

      const updateResult = await client.query(
        `
          UPDATE refunds
          SET
            status = 'failed',
            raw_response = $2::jsonb
          WHERE id = $1
            AND status = 'processing'
          RETURNING id
        `,
        [refundId, JSON.stringify(mergedRawResponse)],
      );

      if (updateResult.rowCount !== 1) {
        return {
          refund: currentRefund,
          transitionApplied: false,
        };
      }

      await insertUserLog(client, {
        action: 'refund.mark_failed',
        actorUserId,
        entityId: refundId,
        metadata: {
          booking_id: currentRefund.booking_id,
          booking_status_after: currentRefund.booking_status,
          booking_status_before: currentRefund.booking_status,
          payment_id: currentRefund.payment_id,
          reason,
          refund_code: currentRefund.refund_code,
        },
      });

      const updatedRefund = await selectRefundById(client, {
        allowedServiceIds: null,
        refundId,
      });

      return {
        refund: updatedRefund,
        transitionApplied: true,
      };
    });

  return {
    approveRefund,
    getBookingItemsByBookingId,
    getRefundById,
    hasApproveLogByIdempotencyKey,
    hasMarkSuccessLogByIdempotencyKey,
    listRefunds,
    markRefundFailed,
    markRefundProcessing,
    markRefundSuccess,
    rejectRefund,
    sumOtherActiveRefundAmountsByPaymentId,
  };
};

module.exports = {
  createAdminRefundRepository,
};
