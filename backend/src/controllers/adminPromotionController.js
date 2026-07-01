const adminPromotionService = require('../services/adminPromotionService');

const listAdminPromotions = async (req, res) => {
  const result = await adminPromotionService.getPromotions({
    actor: req.auth.user,
    query: req.query,
  });

  res.success({
    data: result.data,
    message: 'Promotions retrieved successfully',
    meta: result.meta,
  });
};

const getAdminPromotionDetail = async (req, res) => {
  const promotion = await adminPromotionService.getPromotionById({
    actor: req.auth.user,
    promotionId: req.params.promotionId,
  });

  res.success({
    data: promotion,
    message: 'Promotion retrieved successfully',
  });
};

const createAdminPromotion = async (req, res) => {
  const promotion = await adminPromotionService.createPromotion({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: promotion,
    message: 'Promotion created successfully',
    statusCode: 201,
  });
};

const updateAdminPromotion = async (req, res) => {
  const promotion = await adminPromotionService.updatePromotion({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    promotionId: req.params.promotionId,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: promotion,
    message: 'Promotion updated successfully',
  });
};

const deleteAdminPromotion = async (req, res) => {
  const result = await adminPromotionService.deletePromotion({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    promotionId: req.params.promotionId,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: result,
    message: 'Promotion cancelled successfully',
  });
};

const changeAdminPromotionStatus = async (req, res) => {
  const promotion = await adminPromotionService.changePromotionStatus({
    actor: req.auth.user,
    actorUserId: req.auth.userId,
    ipAddress: req.ip,
    payload: req.body,
    promotionId: req.params.promotionId,
    userAgent: req.get('user-agent'),
  });

  res.success({
    data: promotion,
    message: 'Promotion status updated successfully',
  });
};

module.exports = {
  changeAdminPromotionStatus,
  createAdminPromotion,
  deleteAdminPromotion,
  getAdminPromotionDetail,
  listAdminPromotions,
  updateAdminPromotion,
};
