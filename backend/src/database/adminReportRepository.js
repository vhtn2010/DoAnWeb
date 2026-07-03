const { query } = require('./client');

const GROUP_BY_SQL = Object.freeze({
  day: 'day',
  month: 'month',
  week: 'week',
});

const REVENUE_STATUSES = Object.freeze([
  'success',
  'reconciled',
]);

const createAdminReportRepository = ({
  queryImpl = query,
} = {}) => {
  const buildDateRangeWhere = ({
    alias,
    from,
    status,
    statusColumn = 'status',
    timestampColumn,
    to,
  }) => {
    const conditions = [
      `${alias}.${timestampColumn} >= $1`,
      `${alias}.${timestampColumn} <= $2`,
    ];
    const params = [
      from,
      to,
    ];

    if (status) {
      params.push(status);
      conditions.push(`${alias}.${statusColumn} = $${params.length}`);
    }

    return {
      params,
      whereSql: `WHERE ${conditions.join('\n        AND ')}`,
    };
  };

  const buildServiceWhere = ({
    serviceStatus,
    serviceType,
  }) => {
    const conditions = [];
    const params = [];

    if (serviceType) {
      params.push(serviceType);
      conditions.push(`s.service_type = $${params.length}`);
    }

    if (serviceStatus) {
      params.push(serviceStatus);
      conditions.push(`s.status = $${params.length}`);
    }

    return {
      params,
      whereSql:
        conditions.length === 0
          ? ''
          : `WHERE ${conditions.join('\n        AND ')}`,
    };
  };

  const getRevenueSummary = async ({
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
          ), 0) AS gross_revenue,
          COALESCE((
            SELECT COUNT(*)
            FROM payments p
            WHERE p.status IN ('success', 'reconciled')
              AND p.paid_at >= $1
              AND p.paid_at <= $2
          ), 0) AS payment_count,
          COALESCE((
            SELECT SUM(r.amount)
            FROM refunds r
            WHERE r.status = 'success'
              AND r.processed_at >= $1
              AND r.processed_at <= $2
          ), 0) AS refund_amount,
          COALESCE((
            SELECT COUNT(*)
            FROM refunds r
            WHERE r.status = 'success'
              AND r.processed_at >= $1
              AND r.processed_at <= $2
          ), 0) AS refund_count
      `,
      [
        from,
        to,
      ],
    );

    return result.rows[0] || null;
  };

  const countRevenuePaymentsMissingPaidAt = async () => {
    const result = await queryImpl(
      `
        SELECT COUNT(*)::int AS missing_count
        FROM payments p
        WHERE p.status IN ('success', 'reconciled')
          AND p.paid_at IS NULL
      `,
    );

    return Number(result.rows[0]?.missing_count || 0);
  };

  const getRevenuePeriods = async ({
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
          ON pb.period_key = rb.period_key
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

  const getBookingSummary = async ({
    from,
    status,
    to,
  }) => {
    const { params, whereSql } = buildDateRangeWhere({
      alias: 'b',
      from,
      status,
      timestampColumn: 'created_at',
      to,
    });
    const result = await queryImpl(
      `
        SELECT
          COUNT(*)::int AS total_bookings,
          COALESCE(SUM(b.total_amount), 0) AS total_booking_value
        FROM bookings b
        ${whereSql}
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const getBookingStatusBreakdown = async ({
    from,
    status,
    to,
  }) => {
    const { params, whereSql } = buildDateRangeWhere({
      alias: 'b',
      from,
      status,
      timestampColumn: 'created_at',
      to,
    });
    const result = await queryImpl(
      `
        SELECT
          b.status,
          COUNT(*)::int AS total_count
        FROM bookings b
        ${whereSql}
        GROUP BY b.status
      `,
      params,
    );

    return result.rows;
  };

  const listRecentBookings = async ({
    from,
    limit,
    status,
    to,
  }) => {
    const { params, whereSql } = buildDateRangeWhere({
      alias: 'b',
      from,
      status,
      timestampColumn: 'created_at',
      to,
    });
    const dataParams = [
      ...params,
      limit,
    ];
    const limitPlaceholder = `$${dataParams.length}`;
    const result = await queryImpl(
      `
        SELECT
          b.booking_code,
          b.status,
          b.total_amount,
          b.currency,
          b.created_at
        FROM bookings b
        ${whereSql}
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT ${limitPlaceholder}
      `,
      dataParams,
    );

    return result.rows;
  };

  const getServiceSummary = async ({
    serviceStatus,
    serviceType,
  }) => {
    const { params, whereSql } = buildServiceWhere({
      serviceStatus,
      serviceType,
    });
    const result = await queryImpl(
      `
        SELECT
          COUNT(*)::int AS total_services,
          COUNT(*) FILTER (
            WHERE s.status = 'active'
              AND s.deleted_at IS NULL
          )::int AS active_services
        FROM services s
        ${whereSql}
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const getServiceStatusBreakdown = async ({
    serviceStatus,
    serviceType,
  }) => {
    const { params, whereSql } = buildServiceWhere({
      serviceStatus,
      serviceType,
    });
    const result = await queryImpl(
      `
        SELECT
          s.status,
          COUNT(*)::int AS total_count
        FROM services s
        ${whereSql}
        GROUP BY s.status
      `,
      params,
    );

    return result.rows;
  };

  const getServiceTypeBreakdown = async ({
    serviceStatus,
    serviceType,
  }) => {
    const { params, whereSql } = buildServiceWhere({
      serviceStatus,
      serviceType,
    });
    const result = await queryImpl(
      `
        SELECT
          s.service_type,
          COUNT(*)::int AS total_count
        FROM services s
        ${whereSql}
        GROUP BY s.service_type
      `,
      params,
    );

    return result.rows;
  };

  const getServiceInventorySummary = async ({
    serviceStatus,
    serviceType,
  }) => {
    const { params, whereSql } = buildServiceWhere({
      serviceStatus,
      serviceType,
    });
    const hotelSql = whereSql
      ? whereSql
      : '';
    const result = await queryImpl(
      `
        SELECT
          COALESCE((
            SELECT SUM(rt.available_rooms)
            FROM room_types rt
            INNER JOIN services s
              ON s.id = rt.hotel_service_id
            ${hotelSql}
          ), 0) AS hotel_available_rooms,
          COALESCE((
            SELECT SUM(fd.seats_available)
            FROM flight_details fd
            INNER JOIN services s
              ON s.id = fd.service_id
            ${hotelSql}
          ), 0) AS flight_available_seats,
          COALESCE((
            SELECT SUM(td.seats_available)
            FROM train_details td
            INNER JOIN services s
              ON s.id = td.service_id
            ${hotelSql}
          ), 0) AS train_available_seats
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const getTopBookedServices = async ({
    limit,
    serviceStatus,
    serviceType,
  }) => {
    const { params, whereSql } = buildServiceWhere({
      serviceStatus,
      serviceType,
    });
    const dataParams = [
      ...params,
      limit,
    ];
    const limitPlaceholder = `$${dataParams.length}`;
    const result = await queryImpl(
      `
        SELECT
          s.id,
          s.service_code,
          s.title,
          s.service_type,
          s.status,
          s.deleted_at,
          COUNT(*)::int AS booking_item_count,
          COALESCE(SUM(bi.quantity), 0)::int AS booked_quantity,
          COALESCE(SUM(bi.total_amount), 0) AS booked_value
        FROM booking_items bi
        INNER JOIN services s
          ON s.id = bi.service_id
        ${whereSql}
        GROUP BY
          s.id,
          s.service_code,
          s.title,
          s.service_type,
          s.status,
          s.deleted_at
        ORDER BY
          booked_quantity DESC,
          booking_item_count DESC,
          booked_value DESC,
          s.title ASC
        LIMIT ${limitPlaceholder}
      `,
      dataParams,
    );

    return result.rows;
  };

  const getPaymentSummary = async ({
    from,
    status,
    to,
  }) => {
    const { params, whereSql } = buildDateRangeWhere({
      alias: 'p',
      from,
      status,
      timestampColumn: 'created_at',
      to,
    });
    const result = await queryImpl(
      `
        SELECT
          COUNT(*)::int AS total_payments,
          COALESCE(SUM(p.amount), 0) AS total_amount,
          COUNT(*) FILTER (
            WHERE p.status = 'success'
          )::int AS success_count,
          COALESCE(SUM(p.amount) FILTER (
            WHERE p.status = 'success'
          ), 0) AS success_amount,
          COUNT(*) FILTER (
            WHERE p.status = 'reconciled'
          )::int AS reconciled_count,
          COALESCE(SUM(p.amount) FILTER (
            WHERE p.status = 'reconciled'
          ), 0) AS reconciled_amount
        FROM payments p
        ${whereSql}
      `,
      params,
    );

    return result.rows[0] || null;
  };

  const getPaymentStatusBreakdown = async ({
    from,
    status,
    to,
  }) => {
    const { params, whereSql } = buildDateRangeWhere({
      alias: 'p',
      from,
      status,
      timestampColumn: 'created_at',
      to,
    });
    const result = await queryImpl(
      `
        SELECT
          p.status,
          COUNT(*)::int AS total_count
        FROM payments p
        ${whereSql}
        GROUP BY p.status
      `,
      params,
    );

    return result.rows;
  };

  const getPaymentMethodBreakdown = async ({
    from,
    status,
    to,
  }) => {
    const { params, whereSql } = buildDateRangeWhere({
      alias: 'p',
      from,
      status,
      timestampColumn: 'created_at',
      to,
    });
    const result = await queryImpl(
      `
        SELECT
          p.payment_method,
          COUNT(*)::int AS total_count
        FROM payments p
        ${whereSql}
        GROUP BY p.payment_method
      `,
      params,
    );

    return result.rows;
  };

  const listRecentPayments = async ({
    from,
    limit,
    status,
    to,
  }) => {
    const { params, whereSql } = buildDateRangeWhere({
      alias: 'p',
      from,
      status,
      timestampColumn: 'created_at',
      to,
    });
    const dataParams = [
      ...params,
      limit,
    ];
    const limitPlaceholder = `$${dataParams.length}`;
    const result = await queryImpl(
      `
        SELECT
          p.payment_code,
          p.provider,
          p.payment_method,
          p.status,
          p.amount,
          p.currency,
          p.created_at,
          p.paid_at,
          b.booking_code,
          CASE
            WHEN jsonb_typeof(p.raw_response -> 'proof') = 'object' THEN TRUE
            ELSE FALSE
          END AS has_proof
        FROM payments p
        INNER JOIN bookings b
          ON b.id = p.booking_id
        ${whereSql}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ${limitPlaceholder}
      `,
      dataParams,
    );

    return result.rows;
  };

  return {
    countRevenuePaymentsMissingPaidAt,
    getBookingStatusBreakdown,
    getBookingSummary,
    getPaymentMethodBreakdown,
    getPaymentStatusBreakdown,
    getPaymentSummary,
    getRevenuePeriods,
    getRevenueSummary,
    getServiceInventorySummary,
    getServiceStatusBreakdown,
    getServiceSummary,
    getServiceTypeBreakdown,
    getTopBookedServices,
    listRecentBookings,
    listRecentPayments,
  };
};

module.exports = Object.assign(createAdminReportRepository(), {
  GROUP_BY_SQL,
  REVENUE_STATUSES,
  createAdminReportRepository,
});
