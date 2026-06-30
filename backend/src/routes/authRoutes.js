const express = require('express');
const { authRateLimit } = require('../config/auth');
const { register } = require('../controllers/authController');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const registerRateLimiter = createRateLimiter({
  keyGenerator: (req) => `auth-register:${req.ip || 'anonymous'}`,
  maxRequests: authRateLimit.registerMaxRequests,
  message: 'Too many registration attempts. Please try again later.',
  storeKey: 'auth-register',
  windowMs: authRateLimit.registerWindowMs,
});

router.post('/auth/register', registerRateLimiter, asyncHandler(register));

module.exports = router;
