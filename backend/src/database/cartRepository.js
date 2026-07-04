const { CART_STATUS } = require('../constants/domainConstraints');
const { query } = require('./client');

const ROOM_BASED_CART_SERVICE_TYPES = Object.freeze(['hotel', 'room']);
const VOUCHER_USAGE_EXCLUDED_BOOKING_STATUSES = Object.freeze([
  'cancelled',
  'failed',
  'expired',
]);

const createCartRepository = ({ queryImpl = query } = {}) => {
  const findActiveCartsByUser = async (queryExecutor, userId) => {
    const result = await queryExecutor(
      `
        SELECT
          id,
          user_id,
          status,
          created_at,
          updated_at
        FROM carts
        WHERE user_id = $1
          AND status = $2
        ORDER BY created_at DESC, id DESC
        FOR UPDATE
      `,
      [userId, CART_STATUS.ACTIVE],
    );

    return result.rows;
  };

  const createActiveCart = async (
    queryExecutor,
    {
      createdAt,
      userId,
    },
  ) => {
    const result = await queryExecutor(
      `
        INSERT INTO carts (
          user_id,
          status,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $3)
        RETURNING
          id,
          user_id,
          status,
          created_at,
          updated_at
      `,
      [userId, CART_STATUS.ACTIVE, createdAt],
    );

    return result.rows[0] || null;
  };

  const getCartById = async (queryExecutor, cartId) => {
    const result = await queryExecutor(
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

  const listCartItemRecords = async (queryExecutor, cartId) => {
    const result = await queryExecutor(
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
        FOR UPDATE
      `,
      [cartId],
    );

    return result.rows;
  };

  const getCartItemById = async (queryExecutor, cartId, cartItemId) => {
    const result = await queryExecutor(
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
          AND id = $2
        LIMIT 1
        FOR UPDATE
      `,
      [cartId, cartItemId],
    );

    return result.rows[0] || null;
  };

  const getServiceById = async (queryExecutor, serviceId) => {
    const result = await queryExecutor(
      `
        SELECT
          id,
          service_type,
          title,
          slug,
          base_price,
          sale_price,
          currency,
          status,
          metadata,
          deleted_at
        FROM services
        WHERE id = $1
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getTourDetail = async (queryExecutor, serviceId) => {
    const result = await queryExecutor(
      `
        SELECT
          departure_schedule
        FROM tour_details
        WHERE service_id = $1
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getRoomTypeById = async (queryExecutor, roomTypeId) => {
    const result = await queryExecutor(
      `
        SELECT
          id,
          hotel_service_id,
          name,
          max_adults,
          max_children,
          available_rooms,
          base_price,
          status
        FROM room_types
        WHERE id = $1
        LIMIT 1
      `,
      [roomTypeId],
    );

    return result.rows[0] || null;
  };

  const getFlightDetailById = async (queryExecutor, flightDetailId) => {
    const result = await queryExecutor(
      `
        SELECT
          id,
          service_id,
          departure_at,
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

  const getTrainDetailById = async (queryExecutor, trainDetailId) => {
    const result = await queryExecutor(
      `
        SELECT
          id,
          service_id,
          departure_at,
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

  const getVoucherByCode = async (queryExecutor, voucherCode) => {
    const result = await queryExecutor(
      `
        SELECT
          v.id,
          v.promotion_id,
          v.code,
          v.discount_type,
          v.discount_value,
          v.max_discount_amount,
          v.min_order_amount,
          v.usage_limit_total,
          v.usage_limit_per_user,
          v.used_count,
          v.status AS voucher_status,
          v.valid_from AS voucher_valid_from,
          v.valid_to AS voucher_valid_to,
          p.status AS promotion_status,
          p.valid_from AS promotion_valid_from,
          p.valid_to AS promotion_valid_to,
          p.target_service_type
        FROM vouchers v
        INNER JOIN promotions p ON p.id = v.promotion_id
        WHERE UPPER(TRIM(v.code)) = $1
        ORDER BY v.created_at DESC, v.id DESC
        LIMIT 1
      `,
      [voucherCode],
    );

    return result.rows[0] || null;
  };

  const countUserVoucherUsages = async (
    queryExecutor,
    {
      userId,
      voucherId,
    },
  ) => {
    const result = await queryExecutor(
      `
        SELECT COUNT(*)::int AS usage_count
        FROM bookings
        WHERE user_id = $1
          AND voucher_id = $2
          AND status::text <> ALL($3::text[])
      `,
      [userId, voucherId, VOUCHER_USAGE_EXCLUDED_BOOKING_STATUSES],
    );

    return result.rows[0]?.usage_count ?? 0;
  };

  const insertCartItem = async (
    queryExecutor,
    {
      cartId,
      createdAt,
      endAt,
      options,
      quantity,
      referenceId,
      serviceId,
      serviceType,
      startAt,
      unitPriceSnapshot,
    },
  ) => {
    const result = await queryExecutor(
      `
        INSERT INTO cart_items (
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
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
        RETURNING
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
      `,
      [
        cartId,
        serviceId,
        serviceType,
        referenceId,
        startAt,
        endAt,
        quantity,
        unitPriceSnapshot,
        JSON.stringify(options),
        createdAt,
      ],
    );

    return result.rows[0] || null;
  };

  const updateCartItem = async (
    queryExecutor,
    {
      cartItemId,
      endAt,
      options,
      quantity,
      startAt,
      unitPriceSnapshot,
    },
  ) => {
    const result = await queryExecutor(
      `
        UPDATE cart_items
        SET
          quantity = $2,
          start_at = $3,
          end_at = $4,
          options = $5::jsonb,
          unit_price_snapshot = $6
        WHERE id = $1
        RETURNING
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
      `,
      [
        cartItemId,
        quantity,
        startAt,
        endAt,
        JSON.stringify(options),
        unitPriceSnapshot,
      ],
    );

    return result.rows[0] || null;
  };

  const deleteCartItem = async (queryExecutor, cartItemId) => {
    const result = await queryExecutor(
      `
        DELETE FROM cart_items
        WHERE id = $1
      `,
      [cartItemId],
    );

    return result.rowCount || 0;
  };

  const clearCartItems = async (queryExecutor, cartId) => {
    const result = await queryExecutor(
      `
        DELETE FROM cart_items
        WHERE cart_id = $1
      `,
      [cartId],
    );

    return result.rowCount || 0;
  };

  const touchCart = async (queryExecutor, { cartId, updatedAt }) => {
    const result = await queryExecutor(
      `
        UPDATE carts
        SET updated_at = $2
        WHERE id = $1
        RETURNING
          id,
          user_id,
          status,
          created_at,
          updated_at
      `,
      [cartId, updatedAt],
    );

    return result.rows[0] || null;
  };

  const listCartItems = async (queryExecutor, cartId) => {
    const result = await queryExecutor(
      `
        SELECT
          ci.id,
          ci.cart_id,
          ci.service_id,
          ci.service_type,
          ci.reference_id,
          ci.start_at,
          ci.end_at,
          ci.quantity,
          ci.unit_price_snapshot,
          ci.options,
          ci.created_at,
          s.title,
          s.slug,
          s.short_description,
          s.location_text,
          s.base_price,
          s.sale_price,
          COALESCE(s.sale_price, s.base_price) AS current_price,
          s.currency,
          s.status AS service_status,
          s.cancellation_policy,
          image.image_url AS primary_image,
          td.departure_location,
          td.destination_location,
          td.duration_days,
          td.duration_nights,
          td.transport_type,
          hd.star_rating,
          hd.address,
          hd.checkin_time,
          hd.checkout_time,
          rt.id AS room_type_id,
          rt.name AS room_type_name,
          rt.bed_type AS room_type_bed_type,
          rt.max_adults AS room_type_max_adults,
          rt.max_children AS room_type_max_children,
          rt.available_rooms AS room_type_available_rooms,
          rt.base_price AS room_type_base_price,
          rt.status AS room_type_status,
          fd.id AS flight_detail_id,
          fd.airline_name,
          fd.flight_number,
          fd.departure_airport,
          fd.arrival_airport,
          fd.departure_at,
          fd.arrival_at,
          fd.cabin_class,
          fd.seats_available,
          fd.fare_price,
          fd.status AS flight_status,
          trd.id AS train_detail_id,
          trd.train_number,
          trd.departure_station,
          trd.arrival_station,
          trd.departure_at AS train_departure_at,
          trd.arrival_at AS train_arrival_at,
          trd.seat_class,
          trd.seats_available AS train_seats_available,
          trd.fare_price AS train_fare_price,
          trd.status AS train_status
        FROM cart_items ci
        INNER JOIN services s ON s.id = ci.service_id
        LEFT JOIN LATERAL (
          SELECT si.image_url
          FROM service_images si
          WHERE si.service_id = s.id
          ORDER BY si.is_primary DESC, si.sort_order ASC, si.created_at ASC, si.id ASC
          LIMIT 1
        ) image ON TRUE
        LEFT JOIN tour_details td
          ON td.service_id = s.id
          AND ci.service_type = 'tour'
        LEFT JOIN hotel_details hd
          ON hd.service_id = s.id
          AND ci.service_type = ANY($2::service_type[])
        LEFT JOIN room_types rt
          ON rt.id = ci.reference_id
          AND ci.service_type = ANY($2::service_type[])
        LEFT JOIN flight_details fd
          ON fd.id = ci.reference_id
          AND ci.service_type = 'flight'
        LEFT JOIN train_details trd
          ON trd.id = ci.reference_id
          AND ci.service_type = 'train'
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC, ci.id ASC
      `,
      [cartId, ROOM_BASED_CART_SERVICE_TYPES],
    );

    return result.rows;
  };

  return {
    countUserVoucherUsages,
    clearCartItems,
    createActiveCart,
    deleteCartItem,
    findActiveCartsByUser,
    getCartById,
    getCartItemById,
    getFlightDetailById,
    getRoomTypeById,
    getServiceById,
    getTourDetail,
    getTrainDetailById,
    getVoucherByCode,
    insertCartItem,
    listCartItemRecords,
    listCartItems,
    touchCart,
    updateCartItem,
  };
};

module.exports = {
  createCartRepository,
};
