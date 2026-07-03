const { query } = require('./client');

const PENDING_PAYMENT_STATUSES = Object.freeze([
  'initiated',
  'pending',
  'processing',
]);

const ACTIVE_REFUND_REQUEST_STATUSES = Object.freeze([
  'requested',
  'approved',
  'processing',
]);

const GROUP_BY_SQL = Object.freeze({
  day: 'day',
  month: 'month',
  week: 'week',
});

const BOOKING_CHART_STATUSES = Object.freeze({
  cancelled: 'cancelled',
  completed: 'completed',
  confirmed: 'confirmed',
});

const createAdminDashboardRepository = ({
  queryImpl = query,
} = {}) => {
  const getOverviewSnapshot = async ({
    from,
    to,
  }) => {
    const result = await queryImpl(
      `
        SELECT
          COALESCE((
            SELECT SUM(p.amount)
            FROM payments p
            WHERE p.status IN ('success', 'reconciled')
              AND p.paid_at >= $1
              AND p.paid_at <= $2
          ), 0) AS total_revenue,
          COALESCE((
            SELECT SUM(r.amount)
            FROM refunds r
            WHERE r.status = 'success'
              AND r.processed_at >= $1
              AND r.processed_at <= $2
          ), 0) AS refund_success_amount,
          COALESCE((
            SELECT COUNT(*)
            FROM bookings b
            WHERE b.created_at >= $1
              AND b.created_at <= $2
          ), 0) AS total_bookings,
          COALESCE((
            SELECT COUNT(*)
            FROM users u
            WHERE u.deleted_at IS NULL
              AND u.created_at >= $1
              AND u.created_at <= $2
          ), 0) AS new_users,
          COALESCE((
            SELECT COUNT(*)
            FROM services s
            WHERE s.status = 'active'
              AND s.deleted_at IS NULL
          ), 0) AS active_services,
          COALESCE((
            SELECT COUNT(*)
            FROM payments p
            WHERE p.status = ANY($3::text[])
          ), 0) AS pending_payments,
          COALESCE((
            SELECT COUNT(*)
            FROM refunds r
            WHERE r.status = ANY($4::text[])
          ), 0) AS refund_requests
      `,
      [
        from,
        to,
        PENDING_PAYMENT_STATUSES,
        ACTIVE_REFUND_REQUEST_STATUSES,
      ],
    );

    return result.rows[0] || null;
  };

  const getOverviewBookingStatusBreakdown = async ({
    from,
    to,
  }) => {
    const result = await queryImpl(
      `
        SELECT
          b.status,
          COUNT(*)::int AS total_count
        FROM bookings b
        WHERE b.created_at >= $1
          AND b.created_at <= $2
        GROUP BY b.status
      `,
      [
        from,
        to,
      ],
    );

    return result.rows;
  };

  const getRevenueChartSummary = async ({
    from,
    groupBy,
    timezone,
    to,
  }) => {
    const bucketSql = GROUP_BY_SQL[groupBy];
    const result = await queryImpl(
      `
        WITH payment_buckets AS (
          SELECT
            TO_CHAR(
              DATE_TRUNC('${bucketSql}', TIMEZONE($1, p.paid_at)),
              'YYYY-MM-DD'
            ) AS period_key,
            COALESCE(SUM(p.amount), 0) AS gross_revenue,
            COUNT(*)::int AS payment_count
          FROM payments p
          WHERE p.status IN ('success', 'reconciled')
            AND p.paid_at >= $2
            AND p.paid_at <= $3
          GROUP BY 1
        ),
        refund_buckets AS (
          SELECT
            TO_CHAR(
              DATE_TRUNC('${bucketSql}', TIMEZONE($1, r.processed_at)),
              'YYYY-MM-DD'
            ) AS period_key,
            COALESCE(SUM(r.amount), 0) AS refund_amount
          FROM refunds r
          WHERE r.status = 'success'
            AND r.processed_at >= $2
            AND r.processed_at <= $3
          GROUP BY 1
        )
        SELECT
          COALESCE(pb.period_key, rb.period_key) AS period_key,
          COALESCE(pb.gross_revenue, 0) AS gross_revenue,
          COALESCE(rb.refund_amount, 0) AS refund_amount,
          COALESCE(pb.payment_count, 0) AS payment_count
        FROM payment_buckets pb
        FULL OUTER JOIN refund_buckets rb
          ON rb.period_key = pb.period_key
        ORDER BY period_key ASC
      `,
      [
        timezone,
        from,
        to,
      ],
    );

    return result.rows;
  };

  const getBookingChartSummary = async ({
    from,
    groupBy,
    timezone,
    to,
  }) => {
    const bucketSql = GROUP_BY_SQL[groupBy];
    const result = await queryImpl(
      `
        SELECT
          TO_CHAR(
            DATE_TRUNC('${bucketSql}', TIMEZONE($1, b.created_at)),
            'YYYY-MM-DD'
          ) AS period_key,
          COUNT(*)::int AS total_bookings,
          COUNT(*) FILTER (
            WHERE b.status = '${BOOKING_CHART_STATUSES.confirmed}'
          )::int AS confirmed_bookings,
          COUNT(*) FILTER (
            WHERE b.status = '${BOOKING_CHART_STATUSES.cancelled}'
          )::int AS cancelled_bookings,
          COUNT(*) FILTER (
            WHERE b.status = '${BOOKING_CHART_STATUSES.completed}'
          )::int AS completed_bookings
        FROM bookings b
        WHERE b.created_at >= $2
          AND b.created_at <= $3
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      [
        timezone,
        from,
        to,
      ],
    );

    return result.rows;
  };

  return {
    getBookingChartSummary,
    getOverviewBookingStatusBreakdown,
    getOverviewSnapshot,
    getRevenueChartSummary,
  };
};

module.exports = Object.assign(createAdminDashboardRepository(), {
  ACTIVE_REFUND_REQUEST_STATUSES,
  GROUP_BY_SQL,
  PENDING_PAYMENT_STATUSES,
  createAdminDashboardRepository,
});
