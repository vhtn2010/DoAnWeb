const express = require('express');
const {
  addCartItem,
  applyCartVoucher,
  clearCartItems,
  deleteCartItem,
  getCart,
  getCartSummary,
  mergeGuestCart,
  removeCartVoucher,
  validateCart,
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
router.get(
  '/cart/summary',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(getCartSummary),
);
router.post(
  '/cart/validate',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(validateCart),
);
router.post(
  '/cart/apply-voucher',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(applyCartVoucher),
);
router.delete(
  '/cart/voucher',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(removeCartVoucher),
);
router.post(
  '/cart/merge',
  authRequired({
    allowedRoles: ['customer'],
  }),
  asyncHandler(mergeGuestCart),
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
