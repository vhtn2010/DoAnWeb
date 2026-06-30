const express = require('express');
const { getMe, updateMe } = require('../controllers/profileController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/me',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  asyncHandler(getMe),
);
router.patch(
  '/me',
  authRequired({
    allowedRoles: ['customer', 'staff', 'admin', 'system_admin'],
  }),
  asyncHandler(updateMe),
);

module.exports = router;
