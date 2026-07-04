const {
  API_ERROR_CODES,
  CART_STATUS,
} = require('../constants/domainConstraints');
const { getPool, query } = require('./queryClient');
const AppError = require('../utils/AppError');

const createDuplicateCheckoutError = () =>
  new AppError('Cart is no longer active for checkout', {
    code: API_ERROR_CODES.DUPLICATE_RESOURCE,
    statusCode: 409,
  });

const createVoucherUsageLimitError = () =>
  new AppError('Voucher usage limit has been reached', {
    code: API_ERROR_CODES.VOUCHER_USAGE_LIMIT_REACHED,
    statusCode: 400,
  });

const createInvalidStateTransitionError = () =>
  new AppError('Booking state no longer allows this action', {
    code: API_ERROR_CODES.INVALID_STATE_TRANSITION,
    statusCode: 400,
  });

const createBookingRepository = ({
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

  const getBookingByIdAndUser = async ({
    bookingId,
    userId,
  }) => {
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
          b.updated_at
        FROM bookings b
        WHERE b.id = $1
          AND b.user_id = $2
        LIMIT 1
      `,
      [bookingId, userId],
    );

    return result.rows[0] || null;
  };

  const listBookingItemsByBookingIdWithExecutor = async (executor, bookingId) => {
    const result = await executeQuery(
      executor,
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
          traveller_info,
          service_snapshot
        FROM booking_items
        WHERE booking_id = $1
        ORDER BY start_at ASC NULLS LAST, id ASC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const listBookingItemsByBookingId = async (bookingId) =>
    listBookingItemsByBookingIdWithExecutor(queryImpl, bookingId);

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

  const listBookingsByUser = async ({
    limit,
    offset,
    status,
    userId,
  }) => {
    const params = [userId];
    let filterSql = 'WHERE b.user_id = $1';

    if (status) {
      params.push(status);
      filterSql += ` AND b.status = $${params.length}`;
    }

    params.push(limit);
    const limitIndex = params.length;
    params.push(offset);
    const offsetIndex = params.length;

    const result = await queryImpl(
      `
        WITH filtered_bookings AS (
          SELECT
            b.id,
            b.booking_code,
            b.user_id,
            b.status,
            b.contact_name,
            b.subtotal_amount,
            b.discount_amount,
            b.total_amount,
            b.currency,
            b.expires_at,
            b.created_at,
            COUNT(bi.id)::int AS item_count
          FROM bookings b
          LEFT JOIN booking_items bi
            ON bi.booking_id = b.id
          ${filterSql}
          GROUP BY
            b.id,
            b.booking_code,
            b.user_id,
            b.status,
            b.contact_name,
            b.subtotal_amount,
            b.discount_amount,
            b.total_amount,
            b.currency,
            b.expires_at,
            b.created_at
        )
        SELECT
          fb.*,
          COUNT(*) OVER()::int AS total_count
        FROM filtered_bookings fb
        ORDER BY fb.created_at DESC, fb.id DESC
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

  const getCartById = async (cartId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          user_id,
          status,
          created_at,
          updated_at
        FROM carts
        WHERE id = $1
        LIMIT 1
      `,
      [cartId],
    );

    return result.rows[0] || null;
  };

  const listCartItemsByCartId = async (cartId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          cart_id,
          service_id,
          service_type,
          reference_id,
          start_at,
          end_at,
          quantity,
          unit_price_snapshot,
          options,
          created_at
        FROM cart_items
        WHERE cart_id = $1
        ORDER BY created_at ASC, id ASC
      `,
      [cartId],
    );

    return result.rows;
  };

  const getPublicServiceById = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          s.id,
          s.service_code,
          s.service_type,
          s.title,
          s.slug,
          s.short_description,
          s.description,
          s.provider_name,
          s.location_text,
          s.base_price,
          s.sale_price,
          s.currency,
          s.status,
          s.cancellation_policy,
          s.metadata,
          s.created_at
        FROM services s
        WHERE s.id = $1
          AND s.status = 'active'
          AND s.deleted_at IS NULL
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getTourDetail = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          service_id,
          departure_schedule
        FROM tour_details
        WHERE service_id = $1
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getRoomTypeById = async (roomTypeId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          hotel_service_id,
          name,
          bed_type,
          max_adults,
          max_children,
          total_rooms,
          available_rooms,
          base_price,
          status,
          description
        FROM room_types
        WHERE id = $1
        LIMIT 1
      `,
      [roomTypeId],
    );

    return result.rows[0] || null;
  };

  const getFlightDetailById = async (flightDetailId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          airline_name,
          flight_number,
          departure_airport,
          arrival_airport,
          departure_at,
          arrival_at,
          cabin_class,
          seats_total,
          seats_available,
          fare_price,
          status
        FROM flight_details
        WHERE id = $1
        LIMIT 1
      `,
      [flightDetailId],
    );

    return result.rows[0] || null;
  };

  const getTrainDetailById = async (trainDetailId) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          service_id,
          train_number,
          departure_station,
          arrival_station,
          departure_at,
          arrival_at,
          seat_class,
          seats_total,
          seats_available,
          fare_price,
          status
        FROM train_details
        WHERE id = $1
        LIMIT 1
      `,
      [trainDetailId],
    );

    return result.rows[0] || null;
  };

  const getVoucherByCode = async (code) => {
    const result = await queryImpl(
      `
        SELECT
          id,
          code,
          discount_type,
          discount_value,
          max_discount_amount,
          min_order_amount,
          usage_limit_total,
          usage_limit_per_user,
          used_count,
          status,
          valid_from,
          valid_to
        FROM vouchers
        WHERE LOWER(code) = LOWER($1)
        LIMIT 1
      `,
      [code],
    );

    return result.rows[0] || null;
  };

  const countActiveBookingsByVoucherAndUser = async ({
    userId,
    voucherId,
  }) => {
    const result = await queryImpl(
      `
        SELECT COUNT(*)::int AS total
        FROM bookings
        WHERE user_id = $1
          AND voucher_id = $2
          AND status NOT IN ('cancelled', 'failed', 'expired')
      `,
      [userId, voucherId],
    );

    return result.rows[0]?.total || 0;
  };

  const findBookingByIdempotencyKeyWithExecutor = async (executor, {
    idempotencyKey,
    userId,
  }) => {
    const result = await executeQuery(
      executor,
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
          b.updated_at
        FROM user_logs ul
        INNER JOIN bookings b
          ON b.id = ul.entity_id
        WHERE ul.user_id = $1
          AND ul.action = 'customer.booking.checkout'
          AND ul.entity_name = 'booking'
          AND ul.metadata ->> 'idempotency_key' = $2
        ORDER BY ul.created_at DESC
        LIMIT 1
      `,
      [userId, idempotencyKey],
    );

    return result.rows[0] || null;
  };

  const findBookingByIdempotencyKey = async ({
    idempotencyKey,
    userId,
  }) => findBookingByIdempotencyKeyWithExecutor(queryImpl, {
    idempotencyKey,
    userId,
  });

  const createCheckout = async ({
    actorUserId,
    booking,
    bookingItems,
    cartId,
    idempotencyKey,
    voucherCode,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await setLocalConfig(client, 'app.current_user_id', actorUserId);
      await setLocalConfig(client, 'app.status_change_reason', '');

      if (idempotencyKey) {
        await acquireTransactionLock(
          client,
          `booking:checkout:${actorUserId}:${idempotencyKey}`,
        );

        const existingBooking = await findBookingByIdempotencyKeyWithExecutor(
          client.query.bind(client),
          {
            idempotencyKey,
            userId: actorUserId,
          },
        );

        if (existingBooking) {
          const existingItems = await listBookingItemsByBookingIdWithExecutor(
            client.query.bind(client),
            existingBooking.id,
          );

          await client.query('COMMIT');

          return {
            booking: existingBooking,
            items: existingItems,
            reused: 'idempotency',
          };
        }
      }

      if (booking.voucher_id && booking.user_id) {
        await acquireTransactionLock(
          client,
          `voucher:${booking.voucher_id}:user:${booking.user_id}`,
        );
      }

      const bookingResult = await client.query(
        `
          INSERT INTO bookings (
            booking_code,
            user_id,
            status,
            contact_name,
            contact_email,
            contact_phone,
            subtotal_amount,
            discount_amount,
            total_amount,
            currency,
            voucher_id,
            note,
            expires_at,
            created_at,
            updated_at
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()
          )
          RETURNING
            id,
            booking_code,
            user_id,
            status,
            contact_name,
            contact_email,
            contact_phone,
            subtotal_amount,
            discount_amount,
            total_amount,
            currency,
            voucher_id,
            note,
            expires_at,
            created_at,
            updated_at
        `,
        [
          booking.booking_code,
          booking.user_id,
          booking.status,
          booking.contact_name,
          booking.contact_email,
          booking.contact_phone,
          booking.subtotal_amount,
          booking.discount_amount,
          booking.total_amount,
          booking.currency,
          booking.voucher_id,
          booking.note,
          booking.expires_at,
        ],
      );
      const createdBooking = bookingResult.rows[0];
      const createdItems = [];

      for (const item of bookingItems) {
        const itemResult = await client.query(
          `
            INSERT INTO booking_items (
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
              traveller_info,
              service_snapshot
            )
            VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
            )
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
          [
            createdBooking.id,
            item.service_id,
            item.service_type,
            item.reference_id,
            item.title_snapshot,
            item.start_at,
            item.end_at,
            item.quantity,
            item.unit_price,
            item.total_amount,
            item.status,
            item.traveller_info,
            item.service_snapshot,
          ],
        );

        createdItems.push(itemResult.rows[0]);
      }

      const cartUpdate = await client.query(
        `
          UPDATE carts
          SET
            status = $2,
            updated_at = NOW()
          WHERE id = $1
            AND status = $3
          RETURNING id
        `,
        [cartId, CART_STATUS.CONVERTED, CART_STATUS.ACTIVE],
      );

      if (cartUpdate.rowCount !== 1) {
        throw createDuplicateCheckoutError();
      }

      if (booking.voucher_id) {
        const voucherUpdate = await client.query(
          `
            UPDATE vouchers
            SET used_count = used_count + 1
            WHERE id = $1
              AND (
                usage_limit_total IS NULL
                OR used_count < usage_limit_total
              )
            RETURNING used_count
          `,
          [booking.voucher_id],
        );

        if (voucherUpdate.rowCount !== 1) {
          throw createVoucherUsageLimitError();
        }
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
          'customer.booking.checkout',
          'booking',
          createdBooking.id,
          {
            booking_code: createdBooking.booking_code,
            cart_id: cartId,
            idempotency_key: idempotencyKey || null,
            item_count: bookingItems.length,
            total_amount: booking.total_amount,
            voucher_code: voucherCode || null,
          },
        ],
      );

      await client.query('COMMIT');

      return {
        booking: createdBooking,
        items: createdItems,
      };
    } catch (error) {
      await client.query('ROLLBACK');

      if (
        typeof error?.message === 'string' &&
        (
          error.message.includes('per-user voucher usage limit') ||
          error.message.includes('has reached the total usage limit')
        )
      ) {
        throw createVoucherUsageLimitError();
      }

      throw error;
    } finally {
      client.release();
    }
  };

  const requestBookingCancellation = async ({
    actorUserId,
    bookingId,
    fromStatus,
    reason,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      await setLocalConfig(client, 'app.current_user_id', actorUserId);
      await setLocalConfig(client, 'app.status_change_reason', reason);

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
        [bookingId, 'cancel_requested', fromStatus],
      );

      if (bookingResult.rowCount !== 1) {
        throw createInvalidStateTransitionError();
      }

      await client.query('COMMIT');

      return bookingResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  const updateBookingContact = async ({
    actorUserId,
    bookingId,
    updates,
  }) => {
    const pool = getPoolImpl();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const assignments = [];
      const values = [bookingId];
      const metadata = {};

      if (Object.prototype.hasOwnProperty.call(updates, 'contact_name')) {
        values.push(updates.contact_name);
        assignments.push(`contact_name = $${values.length}`);
        metadata.contact_name = updates.contact_name;
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'contact_phone')) {
        values.push(updates.contact_phone);
        assignments.push(`contact_phone = $${values.length}`);
        metadata.contact_phone = updates.contact_phone;
      }

      if (Object.prototype.hasOwnProperty.call(updates, 'note')) {
        values.push(updates.note);
        assignments.push(`note = $${values.length}`);
        metadata.note = updates.note;
      }

      assignments.push('updated_at = NOW()');

      const updateSql = `
        UPDATE bookings
        SET
          ${assignments.join(',\n          ')}
        WHERE id = $1
        RETURNING
          id,
          booking_code,
          status,
          contact_name,
          contact_phone,
          note,
          updated_at
      `;
      const updatedBookingResult = await client.query(updateSql, values);

      if (updatedBookingResult.rowCount !== 1) {
        throw new AppError('Booking not found', {
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
          'customer.booking.contact_update',
          'booking',
          bookingId,
          metadata,
        ],
      );

      await client.query('COMMIT');

      return updatedBookingResult.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  };

  return {
    countActiveBookingsByVoucherAndUser,
    createCheckout,
    findBookingByIdempotencyKey,
    getBookingByIdAndUser,
    getCartById,
    getFlightDetailById,
    getPublicServiceById,
    getRoomTypeById,
    getTourDetail,
    getTrainDetailById,
    getVoucherByCode,
    listBookingItemsByBookingId,
    listBookingPaymentsByBookingId,
    listBookingRefundsByBookingId,
    listBookingStatusHistoriesByBookingId,
    listBookingsByUser,
    listCartItemsByCartId,
    requestBookingCancellation,
    updateBookingContact,
  };
};

module.exports = {
  createBookingRepository,
};
