const promotionService = require('../services/promotionService');

const listPublicPromotions = async (req, res) => {
  const result = await promotionService.listPublicPromotions(req.query);

  res.success({
    data: result.promotions,
    message: 'Public promotions retrieved successfully',
    meta: result.meta,
  });
};

const getPublicPromotionById = async (req, res) => {
  const data = await promotionService.getPublicPromotionById(req.params);

  res.success({
    data,
    message: 'Promotion retrieved successfully',
  });
};

module.exports = {
  getPublicPromotionById,
  listPublicPromotions,
};
