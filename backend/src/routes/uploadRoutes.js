const express = require('express');
const { createUploadSignature } = require('../controllers/uploadController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY = 'upload-signature';

const router = express.Router();
const uploadSignatureRateLimit = createRateLimiter({
  keyGenerator: (req) =>
    req.auth?.userId ? `${req.auth.userId}:${req.ip}` : (req.ip || 'anonymous'),
  maxRequests: 10,
  message: 'Too many upload signature requests. Please try again later.',
  storeKey: UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});

router.post(
  '/uploads/signature',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  uploadSignatureRateLimit,
  asyncHandler(createUploadSignature),
);

module.exports = router;
module.exports.UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY =
  UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY;
