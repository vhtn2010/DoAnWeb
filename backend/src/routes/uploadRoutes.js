const express = require('express');
const {
  completeUpload,
  createUploadSignature,
  deleteCloudinaryUpload,
  getAdminUploadUsage,
} = require('../controllers/uploadController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');
const { createRateLimiter } = require('../middleware/rateLimit');

const UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY = 'upload-signature';
const UPLOAD_COMPLETE_RATE_LIMIT_STORE_KEY = 'upload-complete';
const UPLOAD_CLOUDINARY_DELETE_RATE_LIMIT_STORE_KEY = 'upload-cloudinary-delete';
const ADMIN_UPLOAD_USAGE_RATE_LIMIT_STORE_KEY = 'admin-upload-usage';

const router = express.Router();
const uploadSignatureRateLimit = createRateLimiter({
  keyGenerator: (req) =>
    req.auth?.userId ? `${req.auth.userId}:${req.ip}` : (req.ip || 'anonymous'),
  maxRequests: 10,
  message: 'Too many upload signature requests. Please try again later.',
  storeKey: UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});
const uploadCloudinaryDeleteRateLimit = createRateLimiter({
  keyGenerator: (req) =>
    req.auth?.userId ? `${req.auth.userId}:${req.ip}` : (req.ip || 'anonymous'),
  maxRequests: 10,
  message: 'Too many Cloudinary delete requests. Please try again later.',
  storeKey: UPLOAD_CLOUDINARY_DELETE_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});
const uploadCompleteRateLimit = createRateLimiter({
  keyGenerator: (req) =>
    req.auth?.userId ? `${req.auth.userId}:${req.ip}` : (req.ip || 'anonymous'),
  maxRequests: 10,
  message: 'Too many upload complete requests. Please try again later.',
  storeKey: UPLOAD_COMPLETE_RATE_LIMIT_STORE_KEY,
  windowMs: 60 * 1000,
});
const adminUploadUsageRateLimit = createRateLimiter({
  keyGenerator: (req) =>
    req.auth?.userId ? `${req.auth.userId}:${req.ip}` : (req.ip || 'anonymous'),
  maxRequests: 10,
  message: 'Too many upload usage requests. Please try again later.',
  storeKey: ADMIN_UPLOAD_USAGE_RATE_LIMIT_STORE_KEY,
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
router.post(
  '/uploads/complete',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  uploadCompleteRateLimit,
  asyncHandler(completeUpload),
);
router.delete(
  '/uploads/cloudinary',
  authRequired({
    allowedRoles: ['staff', 'admin', 'system_admin'],
  }),
  uploadCloudinaryDeleteRateLimit,
  asyncHandler(deleteCloudinaryUpload),
);
router.get(
  '/admin/uploads/usage',
  authRequired({
    allowedRoles: ['admin', 'system_admin'],
  }),
  adminUploadUsageRateLimit,
  asyncHandler(getAdminUploadUsage),
);

module.exports = router;
module.exports.UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY =
  UPLOAD_SIGNATURE_RATE_LIMIT_STORE_KEY;
module.exports.UPLOAD_COMPLETE_RATE_LIMIT_STORE_KEY =
  UPLOAD_COMPLETE_RATE_LIMIT_STORE_KEY;
module.exports.UPLOAD_CLOUDINARY_DELETE_RATE_LIMIT_STORE_KEY =
  UPLOAD_CLOUDINARY_DELETE_RATE_LIMIT_STORE_KEY;
module.exports.ADMIN_UPLOAD_USAGE_RATE_LIMIT_STORE_KEY =
  ADMIN_UPLOAD_USAGE_RATE_LIMIT_STORE_KEY;
