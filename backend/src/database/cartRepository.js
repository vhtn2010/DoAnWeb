const { CART_STATUS } = require('../constants/domainConstraints');
const { query } = require('./client');

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
          AND ci.service_type = 'hotel'
        LEFT JOIN room_types rt
          ON rt.id = ci.reference_id
          AND ci.service_type = 'hotel'
        LEFT JOIN flight_details fd
          ON fd.id = ci.reference_id
          AND ci.service_type = 'flight'
        LEFT JOIN train_details trd
          ON trd.id = ci.reference_id
          AND ci.service_type = 'train'
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at ASC, ci.id ASC
      `,
      [cartId],
    );

    return result.rows;
  };

  return {
    createActiveCart,
    findActiveCartsByUser,
    listCartItems,
  };
};

module.exports = {
  createCartRepository,
};
