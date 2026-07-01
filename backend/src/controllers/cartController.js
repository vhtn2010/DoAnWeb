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

module.exports = {
  getCart,
};
