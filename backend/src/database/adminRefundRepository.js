const { query } = require('./client');

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

const createAdminRefundRepository = ({
  queryImpl = query,
} = {}) => {
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

    const result = await queryImpl(
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

  return {
    getRefundById,
    listRefunds,
  };
};

module.exports = {
  createAdminRefundRepository,
};
