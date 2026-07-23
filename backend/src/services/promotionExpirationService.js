const { query } = require('../database/client');

const syncExpiredPromotionStatuses = async ({
  currentTime = new Date(),
  queryImpl = query,
} = {}) => {
  const result = await queryImpl(
    `
      WITH expired_promotions AS (
        UPDATE promotions
        SET
          status = 'expired',
          updated_at = $1
        WHERE status IN ('draft', 'active', 'paused')
          AND valid_to <= $1
        RETURNING id
      ),
      expired_vouchers AS (
        UPDATE vouchers
        SET status = 'expired'
        WHERE status = 'active'
          AND (
            valid_to <= $1
            OR promotion_id IN (SELECT id FROM expired_promotions)
          )
        RETURNING id
      )
      SELECT
        (SELECT COUNT(*)::integer FROM expired_promotions) AS promotion_count,
        (SELECT COUNT(*)::integer FROM expired_vouchers) AS voucher_count
    `,
    [currentTime],
  );
  const row = result.rows[0] || {};

  return {
    promotionCount: Number(row.promotion_count || 0),
    voucherCount: Number(row.voucher_count || 0),
  };
};

module.exports = {
  syncExpiredPromotionStatuses,
};
