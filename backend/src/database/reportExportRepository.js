const { query: defaultQuery } = require('./client');

const createReportExportRepository = ({
  query = defaultQuery,
} = {}) => {
  const insertUserLog = async ({
    action,
    entityId,
    entityName = 'reports',
    ipAddress,
    metadata,
    userAgent,
    userId,
  } = {}) =>
    query(
      `
        INSERT INTO user_logs (
          user_id,
          action,
          entity_name,
          entity_id,
          ip_address,
          user_agent,
          metadata,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW())
      `,
      [
        userId || null,
        action,
        entityName,
        entityId || null,
        ipAddress || null,
        userAgent || null,
        metadata ? JSON.stringify(metadata) : null,
      ],
    );

  const listExportBookings = async ({
    from,
    limit,
    status,
    to,
  }) => {
    const params = [
      from,
      to,
    ];
    const conditions = [
      'b.created_at >= $1',
      'b.created_at <= $2',
    ];

    if (status) {
      params.push(status);
      conditions.push(`b.status = $${params.length}`);
    }

    params.push(limit);
    const limitPlaceholder = `$${params.length}`;
    const result = await query(
      `
        SELECT
          b.booking_code,
          b.status,
          b.total_amount,
          b.currency,
          b.created_at
        FROM bookings b
        WHERE ${conditions.join('\n          AND ')}
        ORDER BY b.created_at DESC, b.id DESC
        LIMIT ${limitPlaceholder}
      `,
      params,
    );

    return result.rows;
  };

  const listExportServices = async ({
    limit,
    serviceStatus,
    serviceType,
  }) => {
    const params = [];
    const conditions = [];

    if (serviceType) {
      params.push(serviceType);
      conditions.push(`s.service_type = $${params.length}`);
    }

    if (serviceStatus) {
      params.push(serviceStatus);
      conditions.push(`s.status = $${params.length}`);
    }

    params.push(limit);
    const limitPlaceholder = `$${params.length}`;
    const whereSql =
      conditions.length === 0
        ? ''
        : `WHERE ${conditions.join('\n          AND ')}`;
    const result = await query(
      `
        SELECT
          s.service_code,
          s.title,
          s.service_type,
          s.status,
          s.base_price,
          s.sale_price,
          s.currency,
          s.created_at,
          s.updated_at,
          s.deleted_at
        FROM services s
        ${whereSql}
        ORDER BY s.updated_at DESC, s.id DESC
        LIMIT ${limitPlaceholder}
      `,
      params,
    );

    return result.rows;
  };

  const listExportPayments = async ({
    from,
    limit,
    status,
    to,
  }) => {
    const params = [
      from,
      to,
    ];
    const conditions = [
      'p.created_at >= $1',
      'p.created_at <= $2',
    ];

    if (status) {
      params.push(status);
      conditions.push(`p.status = $${params.length}`);
    }

    params.push(limit);
    const limitPlaceholder = `$${params.length}`;
    const result = await query(
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
        WHERE ${conditions.join('\n          AND ')}
        ORDER BY p.created_at DESC, p.id DESC
        LIMIT ${limitPlaceholder}
      `,
      params,
    );

    return result.rows;
  };

  return {
    insertUserLog,
    listExportBookings,
    listExportPayments,
    listExportServices,
  };
};

module.exports = {
  createReportExportRepository,
};
