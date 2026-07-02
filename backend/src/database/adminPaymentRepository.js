const { query } = require('./client');

const createAdminPaymentRepository = ({
  queryImpl = query,
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
          b.booking_code,
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
        WHERE p.id = $1
        LIMIT 1
      `,
      [paymentId],
    );

    return result.rows[0] || null;
  };

  return {
    getPaymentById,
    listPayments,
  };
};

module.exports = {
  createAdminPaymentRepository,
};
