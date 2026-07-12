const { getPool, query } = require('./queryClient');
const AppError = require('../utils/AppError');
const { API_ERROR_CODES } = require('../constants/domainConstraints');

const isUniqueViolation = (error) => error?.code === '23505';
const LEGACY_PAYMENT_METHOD_FALLBACKS = Object.freeze({
  manual_bank_transfer: 'bank_transfer',
  staff_collect: 'cash_at_office',
});
const isCheckConstraintViolation = (error, constraintName) =>
  error?.code === '23514' && (
    !constraintName ||
    error?.constraint === constraintName ||
    String(error?.message ?? '').includes(constraintName)
  );

const createPaymentRepository = ({
  getPoolImpl = getPool,
  queryImpl = query,
} = {}) => {
  const executeQuery = (executor, text, params) =>
    typeof executor === 'function'
      ? executor(text, params)
      : executor.query(text, params);

  const setLocalConfig = async (client, key, value) => {
    await client.query('SELECT set_config($1, $2, TRUE)', [
      key,
      value == null ? '' : String(value),
    ]);
  };

  const acquireTransactionLock = async (client, key) => {
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [key]);
  };

  const getBookingByIdWithExecutor = async (executor, bookingId, {
    forUpdate = false,
  } = {}) => {
    const result = await executeQuery(
      executor,
      `
        SELECT
          id,
          booking_code,
          user_id,
          status,
          total_amount,
          currency,
          expires_at,
          created_at,
          updated_at
        FROM bookings
        WHERE id = $1
        LIMIT 1
        ${forUpdate ? 'FOR UPDATE' : ''}
      `,
      [bookingId],
    );

    return result.rows[0] || null;
  };

  const getBookingById = async (bookingId) =>
    getBookingByIdWithExecutor(queryImpl, bookingId);

  const listPaymentsByBookingId = async (bookingId) => {
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
          created_at,
          updated_at
        FROM payments
        WHERE booking_id = $1
        ORDER BY created_at DESC, id DESC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const getPaymentById = async (paymentId) => {
    const result = await queryImpl(
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
          p.provider_transaction_id,
          p.provider_order_id,
          p.checksum_verified,
          p.raw_response,
          p.paid_at,
          p.expired_at,
          p.created_at,
          p.updated_at,
          b.user_id,
          b.booking_code,
          b.status AS booking_status,
          b.expires_at AS booking_expires_at
        FROM payments p
        INNER JOIN bookings b
          ON b.id = p.booking_id
        WHERE p.id = $1
        LIMIT 1
      `,
      [paymentId],
    );

    return result.rows[0] || null;
  };

  const findDirectPaymentByIdempotencyKeyWithExecutor = async (executor, {
    bookingId,
    idempotencyKey,
    userId,
  }) => {
    const result = await executeQuery(
      executor,
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
          p.expired_at,
          p.created_at,
          p.updated_at
        FROM user_logs ul
        INNER JOIN payments p
          ON p.id = ul.entity_id
        WHERE ul.user_id = $1
          AND ul.action = 'payment.direct.create'
          AND ul.entity_name = 'payment'
          AND p.booking_id = $2
          AND ul.metadata ->> 'idempotency_key' = $3
        ORDER BY ul.created_at DESC, ul.entity_id DESC
        LIMIT 1
      `,
      [userId, bookingId, idempotencyKey],
    );

    return result.rows[0] || null;
  };

  const findDirectPaymentByIdempotencyKey = async ({
    bookingId,
    idempotencyKey,
    userId,
  }) => findDirectPaymentByIdempotencyKeyWithExecutor(queryImpl, {
    bookingId,
    idempotencyKey,
    userId,
  });

  const findLatestPendingDirectPaymentByBookingIdWithExecutor = async (
    executor,
    bookingId,
  ) => {
    const result = await executeQuery(
      executor,
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
          created_at,
          updated_at
        FROM payments
        WHERE booking_id = $1
          AND provider = 'direct'
          AND status = 'pending'
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      `,
      [bookingId],
    );

    return result.rows[0] || null;
  };

  const findLatestPendingDirectPaymentByBookingId = async (bookingId) =>
    findLatestPendingDirectPaymentByBookingIdWithExecutor(queryImpl, bookingId);

  const createDirectPayment = async ({
    actorUserId,
    amount,
    bookingCode,
    bookingId,
    currency,
    expiredAt,
    idempotencyKey,
    note,
    payerName,
    payerPhone,
    paymentCode,
    paymentMethod,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();
    const insertPaymentSql = `
      INSERT INTO payments (
        booking_id,
        payment_code,
        provider,
        payment_method,
        status,
        amount,
        currency,
        provider_transaction_id,
        provider_order_id,
        checksum_verified,
        raw_response,
        paid_at,
        expired_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, 'direct', $3, 'pending', $4, $5, NULL, NULL, FALSE, $6, NULL, $7, NOW(), NOW()
      )
      RETURNING
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
        created_at,
        updated_at
    `;

    try {
      await client.query('BEGIN');
      await setLocalConfig(client, 'app.current_user_id', actorUserId);
      await acquireTransactionLock(
        client,
        `payment:create:${actorUserId}:${bookingId}:${idempotencyKey}`,
      );

      const currentBooking = await getBookingByIdWithExecutor(
        client.query.bind(client),
        bookingId,
        { forUpdate: true },
      );

      if (!currentBooking) {
        throw new AppError('Booking not found', {
          code: API_ERROR_CODES.RESOURCE_NOT_FOUND,
          statusCode: 404,
        });
      }

      if (currentBooking.user_id !== actorUserId) {
        throw new AppError('You do not have permission to access this booking', {
          code: API_ERROR_CODES.FORBIDDEN,
          statusCode: 403,
        });
      }

      const existingPayment = await findDirectPaymentByIdempotencyKeyWithExecutor(
        client.query.bind(client),
        {
          bookingId,
          idempotencyKey,
          userId: actorUserId,
        },
      );

      if (existingPayment) {
        await client.query('COMMIT');

        return {
          created: false,
          payment: existingPayment,
          reused: 'idempotency',
        };
      }

      if (currentBooking.status !== 'pending_payment') {
        throw new AppError('Booking state no longer allows direct payment creation', {
          code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
          statusCode: 400,
        });
      }

      if (currentBooking.expires_at) {
        const expiresAt = new Date(currentBooking.expires_at);

        if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() <= Date.now()) {
          throw new AppError('Booking payment window has expired', {
            code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
            statusCode: 400,
          });
        }
      }

      if (Number(currentBooking.total_amount) <= 0) {
        throw new AppError('Booking no longer requires direct payment', {
          code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
          statusCode: 400,
        });
      }

      const pendingPayment = await findLatestPendingDirectPaymentByBookingIdWithExecutor(
        client.query.bind(client),
        bookingId,
      );

      if (pendingPayment) {
        await client.query('COMMIT');

        return {
          created: false,
          payment: pendingPayment,
          reused: 'pending',
        };
      }

      const buildRawResponse = (storedPaymentMethod) => ({
        customer_input: {
          note,
          payer_name: payerName,
          payer_phone: payerPhone,
        },
        direct_payment: {
          requested_method: paymentMethod,
          stored_method: storedPaymentMethod,
        },
      });
      const insertPaymentRecord = (storedPaymentMethod) =>
        client.query(insertPaymentSql, [
          bookingId,
          paymentCode,
          storedPaymentMethod,
          amount,
          currency,
          buildRawResponse(storedPaymentMethod),
          expiredAt,
        ]);

      let storedPaymentMethod = paymentMethod;
      let paymentResult;

      try {
        paymentResult = await insertPaymentRecord(storedPaymentMethod);
      } catch (error) {
        const fallbackMethod = LEGACY_PAYMENT_METHOD_FALLBACKS[paymentMethod];

        if (
          !fallbackMethod ||
          fallbackMethod === paymentMethod ||
          !isCheckConstraintViolation(error, 'chk_payments_method')
        ) {
          throw error;
        }

        storedPaymentMethod = fallbackMethod;
        paymentResult = await insertPaymentRecord(storedPaymentMethod);
      }

      const createdPayment = paymentResult.rows[0];

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
          'payment.direct.create',
          'payment',
          createdPayment.id,
          {
            amount,
            booking_code: bookingCode,
            booking_id: bookingId,
            idempotency_key: idempotencyKey,
            payment_code: createdPayment.payment_code,
            payment_method: paymentMethod,
            stored_payment_method: createdPayment.payment_method,
            provider: 'direct',
          },
        ],
      );

      await client.query('COMMIT');

      return {
        created: true,
        payment: createdPayment,
        reused: null,
      };
    } catch (error) {
      await client.query('ROLLBACK');

      if (isUniqueViolation(error)) {
        throw new AppError('Payment code already exists', {
          code: API_ERROR_CODES.DUPLICATE_RESOURCE,
          statusCode: 409,
        });
      }

      throw error;
    } finally {
      client.release();
    }
  };

  const cancelDirectPayment = async ({
    actorUserId,
    paymentId,
    reason,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const paymentResult = await client.query(
        `
          UPDATE payments
          SET
            status = 'cancelled',
            raw_response = COALESCE(raw_response, '{}'::jsonb) || jsonb_build_object(
              'cancel_reason', $2,
              'cancelled_at', NOW(),
              'cancelled_by', 'customer'
            ),
            updated_at = NOW()
          WHERE id = $1
          RETURNING
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
            created_at,
            updated_at
        `,
        [paymentId, reason],
      );

      const cancelledPayment = paymentResult.rows[0];

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
          'payment.direct.cancel',
          'payment',
          paymentId,
          {
            cancel_reason: reason,
            payment_code: cancelledPayment.payment_code,
            payment_method: cancelledPayment.payment_method,
            status: cancelledPayment.status,
          },
        ],
      );

      await client.query('COMMIT');

      return cancelledPayment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const uploadPaymentProof = async ({
    actorUserId,
    bankTransactionCode,
    paymentId,
    proofImageUrl,
    transferNote,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const paymentResult = await client.query(
        `
          UPDATE payments
          SET
            raw_response = jsonb_set(
              COALESCE(raw_response, '{}'::jsonb),
              '{proof}',
              jsonb_build_object(
                'proof_image_url', $2,
                'transfer_note', $3,
                'bank_transaction_code', $4,
                'submitted_at', NOW()
              ),
              true
            ),
            updated_at = NOW()
          WHERE id = $1
          RETURNING
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
            created_at,
            updated_at
        `,
        [
          paymentId,
          proofImageUrl,
          transferNote,
          bankTransactionCode,
        ],
      );

      const updatedPayment = paymentResult.rows[0];

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
          'payment.proof.upload',
          'payment',
          paymentId,
          {
            bank_transaction_code: bankTransactionCode,
            has_transfer_note: Boolean(transferNote),
            payment_code: updatedPayment.payment_code,
            proof_image_url: proofImageUrl,
            status: updatedPayment.status,
          },
        ],
      );

      await client.query('COMMIT');

      return updatedPayment;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    cancelDirectPayment,
    createDirectPayment,
    findDirectPaymentByIdempotencyKey,
    findLatestPendingDirectPaymentByBookingId,
    getBookingById,
    getPaymentById,
    listPaymentsByBookingId,
    uploadPaymentProof,
  };
};

module.exports = {
  createPaymentRepository,
};
