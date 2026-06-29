const express = require('express');
const asyncHandler = require('../middleware/asyncHandler');
const {
  getHealth,
  getLiveness,
  getReadiness,
  getVersion,
} = require('../controllers/systemController');

const router = express.Router();

router.get('/health', getHealth);
router.get('/health/live', getLiveness);
router.get('/health/ready', asyncHandler(getReadiness));
router.get('/version', getVersion);

module.exports = router;
