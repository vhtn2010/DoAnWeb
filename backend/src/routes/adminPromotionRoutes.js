const express = require('express');
const {
  changeAdminPromotionStatus,
  createAdminPromotion,
  deleteAdminPromotion,
  getAdminPromotionDetail,
  getAdminPromotionVouchers,
  listAdminPromotions,
  updateAdminPromotion,
} = require('../controllers/adminPromotionController');
const { authRequired, requirePermissions } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.use(
  '/admin/promotions',
  authRequired({
    allowedRoles: ['staff', 'admin', 'system_admin'],
  }),
);

router.get('/admin/promotions', requirePermissions(['promotion.read']), asyncHandler(listAdminPromotions));
router.post('/admin/promotions', requirePermissions(['promotion.create']), asyncHandler(createAdminPromotion));
router.get(
  '/admin/promotions/:promotionId/vouchers',
  requirePermissions(['promotion.read']),
  asyncHandler(getAdminPromotionVouchers),
);
router.get(
  '/admin/promotions/:promotionId',
  requirePermissions(['promotion.read']),
  asyncHandler(getAdminPromotionDetail),
);
router.patch(
  '/admin/promotions/:promotionId',
  requirePermissions(['promotion.update']),
  asyncHandler(updateAdminPromotion),
);
router.patch(
  '/admin/promotions/:promotionId/status',
  requirePermissions(['promotion.change_status']),
  asyncHandler(changeAdminPromotionStatus),
);
router.delete(
  '/admin/promotions/:promotionId',
  requirePermissions(['promotion.delete']),
  asyncHandler(deleteAdminPromotion),
);

module.exports = router;
