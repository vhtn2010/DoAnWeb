const express = require('express');
const {
  addCartItem,
  clearCartItems,
  deleteCartItem,
  getCart,
  updateCartItem,
} = require('../controllers/cartController');
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
router.post(
  '/cart/items',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(addCartItem),
);
router.patch(
  '/cart/items/:cartItemId',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(updateCartItem),
);
router.delete(
  '/cart/items/:cartItemId',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(deleteCartItem),
);
router.delete(
  '/cart/items',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(clearCartItems),
);

module.exports = router;
