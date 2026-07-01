const express = require('express');
const {
  API_ERROR_CODES,
} = require('../constants/domainConstraints');
const {
  changeAdminPromotionStatus,
  createAdminPromotion,
  deleteAdminPromotion,
  getAdminPromotionDetail,
  listAdminPromotions,
  updateAdminPromotion,
} = require('../controllers/adminPromotionController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const AppError = require('../utils/AppError');

const router = express.Router();

const requirePromotionDeleteRoles = (req, res, next) => {
  if (['admin', 'system_admin'].includes(req.auth?.roleCode)) {
    next();
    return;
  }

  next(
    new AppError('Forbidden', {
      code: API_ERROR_CODES.FORBIDDEN,
      statusCode: 403,
    }),
  );
};

router.use(
  '/admin/promotions',
  authRequired({
    allowedRoles: ['staff', 'admin', 'system_admin'],
  }),
);

router.get('/admin/promotions', asyncHandler(listAdminPromotions));
router.post('/admin/promotions', asyncHandler(createAdminPromotion));
router.get(
  '/admin/promotions/:promotionId',
  asyncHandler(getAdminPromotionDetail),
);
router.patch(
  '/admin/promotions/:promotionId',
  asyncHandler(updateAdminPromotion),
);
router.patch(
  '/admin/promotions/:promotionId/status',
  asyncHandler(changeAdminPromotionStatus),
);
router.delete(
  '/admin/promotions/:promotionId',
  requirePromotionDeleteRoles,
  asyncHandler(deleteAdminPromotion),
);

module.exports = router;
