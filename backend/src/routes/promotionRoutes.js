const express = require('express');
const {
  getPublicPromotionById,
  listPublicPromotions,
} = require('../controllers/promotionController');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const publicPromotionRateLimiter = createRateLimiter({
  keyGenerator: (req) => req.ip || 'anonymous',
  maxRequests: 60,
  message: 'Too many promotion requests. Please try again later.',
  storeKey: 'promotion-public',
  windowMs: 60 * 1000,
});

router.get(
  '/promotions',
  publicPromotionRateLimiter,
  asyncHandler(listPublicPromotions),
);
router.get(
  '/promotions/:promotion_id',
  publicPromotionRateLimiter,
  asyncHandler(getPublicPromotionById),
);

module.exports = router;
