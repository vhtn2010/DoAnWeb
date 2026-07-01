const { PROMOTION_STATUS } = require('../constants/domainConstraints');
const { query } = require('./queryClient');

const PUBLIC_PROMOTION_SELECT = `
  SELECT
    p.id,
    p.name,
    p.description,
    p.status,
    p.valid_from,
    p.valid_to,
    p.target_service_type
  FROM promotions p
`;

const createPromotionRepository = ({ queryImpl = query } = {}) => {
  const buildPublicPromotionWhere = ({ currentTime, promotionId, serviceType }) => {
    const params = [PROMOTION_STATUS.ACTIVE, currentTime];
    const conditions = [
      'p.status = $1',
      'p.valid_from <= $2',
      'p.valid_to >= $2',
    ];

    if (promotionId) {
      params.push(promotionId);
      conditions.push(`p.id = $${params.length}`);
    }

    if (serviceType) {
      params.push(serviceType);
      conditions.push(
        `(p.target_service_type = $${params.length} OR p.target_service_type IS NULL)`,
      );
    }

    return {
      params,
      whereSql: `WHERE ${conditions.join('\n        AND ')}`,
    };
  };

  const listPublicPromotions = async ({
    currentTime,
    limit,
    offset,
    serviceType,
  }) => {
    const { params, whereSql } = buildPublicPromotionWhere({
      currentTime,
      serviceType,
    });
    const countResult = await queryImpl(
      `
        SELECT COUNT(*)::int AS total
        FROM promotions p
        ${whereSql}
      `,
      params,
    );
    const dataParams = [...params, limit, offset];
    const limitParam = `$${params.length + 1}`;
    const offsetParam = `$${params.length + 2}`;
    const result = await queryImpl(
      `
        ${PUBLIC_PROMOTION_SELECT}
        ${whereSql}
        ORDER BY p.valid_to ASC, p.valid_from DESC, p.created_at DESC, p.id ASC
        LIMIT ${limitParam}
        OFFSET ${offsetParam}
      `,
      dataParams,
    );

    return {
      rows: result.rows,
      total: Number(countResult.rows[0]?.total || 0),
    };
  };

  const getPublicPromotionById = async ({
    currentTime,
    promotionId,
  }) => {
    const { params, whereSql } = buildPublicPromotionWhere({
      currentTime,
      promotionId,
    });
    const result = await queryImpl(
      `
        ${PUBLIC_PROMOTION_SELECT}
        ${whereSql}
        LIMIT 1
      `,
      params,
    );

    return result.rows[0] || null;
  };

  return {
    getPublicPromotionById,
    listPublicPromotions,
  };
};

module.exports = {
  createPromotionRepository,
};
