const { query, withTransaction } = require('./client');

const createReviewRepository = ({
  queryImpl = query,
  withTransactionImpl = withTransaction,
} = {}) => {
  const getBooking = async ({ bookingId, userId }) => {
    const result = await queryImpl(
      `
        SELECT id, booking_code, status, user_id
        FROM bookings
        WHERE id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [bookingId, userId],
    );

    return result.rows[0] || null;
  };

  const listTourItems = async (bookingId) => {
    const result = await queryImpl(
      `
        SELECT id, booking_id, service_id, service_type, start_at, end_at, title_snapshot
        FROM booking_items
        WHERE booking_id = $1
          AND service_type = 'tour'
        ORDER BY start_at ASC NULLS LAST, id ASC
      `,
      [bookingId],
    );

    return result.rows;
  };

  const getBookingTourItem = async ({ bookingId, bookingItemId, userId }) => {
    const result = await queryImpl(
      `
        SELECT
          bi.id,
          bi.booking_id,
          bi.service_id,
          bi.service_type,
          bi.start_at,
          bi.end_at,
          bi.title_snapshot,
          b.status AS booking_status,
          b.user_id
        FROM booking_items bi
        INNER JOIN bookings b ON b.id = bi.booking_id
        WHERE bi.id = $1
          AND bi.booking_id = $2
          AND b.user_id = $3
          AND bi.service_type = 'tour'
        LIMIT 1
      `,
      [bookingItemId, bookingId, userId],
    );

    return result.rows[0] || null;
  };

  const findReviewByBookingItem = async ({ bookingItemId, userId }) => {
    const result = await queryImpl(
      `
        SELECT id, booking_id, booking_item_id, service_id, user_id, rating, comment,
               is_visible, created_at, updated_at
        FROM service_reviews
        WHERE booking_item_id = $1
          AND user_id = $2
        LIMIT 1
      `,
      [bookingItemId, userId],
    );

    return result.rows[0] || null;
  };

  const createReview = async ({
    bookingId,
    bookingItemId,
    comment,
    rating,
    serviceId,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      const result = await client.query(
        `
          INSERT INTO service_reviews (
            booking_id,
            booking_item_id,
            service_id,
            user_id,
            rating,
            comment,
            is_visible,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW(), NOW())
          ON CONFLICT (booking_item_id, user_id) DO NOTHING
          RETURNING id, booking_id, booking_item_id, service_id, user_id, rating,
                    comment, is_visible, created_at, updated_at
        `,
        [bookingId, bookingItemId, serviceId, userId, rating, comment],
      );
      const review = result.rows[0] || null;

      if (!review) {
        return null;
      }

      await client.query(
        `
          INSERT INTO user_logs (
            user_id, action, entity_name, entity_id, metadata, created_at
          )
          VALUES ($1, 'customer.service.review.create', 'service_review', $2, $3, NOW())
        `,
        [
          userId,
          review.id,
          {
            booking_id: bookingId,
            booking_item_id: bookingItemId,
            rating,
            service_id: serviceId,
          },
        ],
      );

      return review;
    });

  const completeBooking = async ({
    bookingId,
    fromStatus,
    userId,
  }) =>
    withTransactionImpl(async (client) => {
      await client.query('SELECT set_config($1, $2, TRUE)', [
        'app.current_user_id',
        userId,
      ]);
      await client.query('SELECT set_config($1, $2, TRUE)', [
        'app.status_change_reason',
        'Customer confirmed tour completion',
      ]);

      const result = await client.query(
        `
          UPDATE bookings
          SET status = 'completed', updated_at = NOW()
          WHERE id = $1
            AND user_id = $2
            AND status = $3
          RETURNING id, booking_code, status, updated_at
        `,
        [bookingId, userId, fromStatus],
      );

      return result.rows[0] || null;
    });

  const getPublicTour = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT id
        FROM services
        WHERE id = $1
          AND service_type = 'tour'
          AND status = 'active'
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [serviceId],
    );

    return result.rows[0] || null;
  };

  const getReviewSummary = async (serviceId) => {
    const result = await queryImpl(
      `
        SELECT
          COUNT(*)::int AS review_count,
          COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS average_rating
        FROM service_reviews
        WHERE service_id = $1
          AND is_visible = TRUE
      `,
      [serviceId],
    );

    return result.rows[0];
  };

  const listPublicReviews = async ({ limit, offset, serviceId }) => {
    const result = await queryImpl(
      `
        SELECT
          sr.id,
          sr.rating,
          sr.comment,
          sr.created_at,
          u.full_name
        FROM service_reviews sr
        INNER JOIN users u ON u.id = sr.user_id
        WHERE sr.service_id = $1
          AND sr.is_visible = TRUE
        ORDER BY sr.created_at DESC, sr.id DESC
        LIMIT $2 OFFSET $3
      `,
      [serviceId, limit, offset],
    );

    return result.rows;
  };

  return {
    completeBooking,
    createReview,
    findReviewByBookingItem,
    getBooking,
    getBookingTourItem,
    getPublicTour,
    getReviewSummary,
    listPublicReviews,
    listTourItems,
  };
};

module.exports = {
  createReviewRepository,
};
