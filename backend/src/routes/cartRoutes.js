const express = require('express');
const { getCart } = require('../controllers/cartController');
const { authRequired } = require('../middleware/authSession');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

router.get(
  '/cart',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(getCart),
);

module.exports = router;
