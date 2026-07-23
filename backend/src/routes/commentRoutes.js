const express = require('express');
const {
  createServiceComment,
  listServiceComments,
} = require('../controllers/commentController');
const asyncHandler = require('../middleware/asyncHandler');
const { authOptional } = require('../middleware/authSession');
const createRateLimit = require('../middleware/rateLimit');

const router = express.Router();
const readCommentRateLimit = createRateLimit({
  max: 120,
  windowMs: 60 * 1000,
});
const createCommentRateLimit = createRateLimit({
  max: 10,
  windowMs: 60 * 1000,
});

router.get(
  '/services/:service_id/comments',
  readCommentRateLimit,
  asyncHandler(listServiceComments),
);
router.post(
  '/services/:service_id/comments',
  authOptional(),
  createCommentRateLimit,
  asyncHandler(createServiceComment),
);

module.exports = router;
