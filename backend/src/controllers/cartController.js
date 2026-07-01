const cartService = require('../services/cartService');

const getCart = async (req, res) => {
  const cart = await cartService.getActiveCart({
    userId: req.auth.userId,
  });

  res.success({
    data: cart,
    message: 'Active cart retrieved successfully',
  });
};

const getCartSummary = async (req, res) => {
  const summary = await cartService.getCartSummary({
    query: req.query,
    userId: req.auth.userId,
  });

  res.success({
    data: summary,
    message: 'Cart summary retrieved successfully',
  });
};

const validateCart = async (req, res) => {
  const result = await cartService.validateCart({
    payload: req.body,
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Cart validated successfully',
  });
};

const applyCartVoucher = async (req, res) => {
  const result = await cartService.applyCartVoucher({
    payload: req.body,
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Voucher applied successfully',
  });
};

const removeCartVoucher = async (req, res) => {
  const result = await cartService.removeCartVoucher({
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Voucher removed successfully',
  });
};

const mergeGuestCart = async (req, res) => {
  const result = await cartService.mergeGuestCart({
    payload: req.body,
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Guest cart merged successfully',
  });
};

const addCartItem = async (req, res) => {
  const result = await cartService.addCartItem({
    payload: req.body,
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Cart item added successfully',
  });
};

const updateCartItem = async (req, res) => {
  const result = await cartService.updateCartItem({
    cartItemId: req.params.cartItemId,
    payload: req.body,
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Cart item updated successfully',
  });
};

const deleteCartItem = async (req, res) => {
  const result = await cartService.deleteCartItem({
    cartItemId: req.params.cartItemId,
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Cart item deleted successfully',
  });
};

const clearCartItems = async (req, res) => {
  const result = await cartService.clearCartItems({
    userId: req.auth.userId,
  });

  res.success({
    data: result,
    message: 'Cart cleared successfully',
  });
};

module.exports = {
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
};
