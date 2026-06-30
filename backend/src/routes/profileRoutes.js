const express = require('express');
const { getMe } = require('../controllers/profileController');
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

module.exports = router;
