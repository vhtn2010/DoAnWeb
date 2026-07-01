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
  clearCartItems,
  deleteCartItem,
  getCart,
  updateCartItem,
};
