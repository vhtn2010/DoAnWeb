import {
  getActiveCart as getActiveCartWithMockAdapter,
  getCartSummary as getCartSummaryWithMockAdapter,
  removeCartItem as removeCartItemWithMockAdapter,
  updateCartItem as updateCartItemWithMockAdapter,
  validateCart as validateCartWithMockAdapter,
} from '../adapters/mock/cartMockAdapter.js'

const cartAdapter = {
  getActiveCart: getActiveCartWithMockAdapter,
  getCartSummary: getCartSummaryWithMockAdapter,
  removeCartItem: removeCartItemWithMockAdapter,
  updateCartItem: updateCartItemWithMockAdapter,
  validateCart: validateCartWithMockAdapter,
}

export function getActiveCart(params) {
  return cartAdapter.getActiveCart(params)
}

export function getCartSummary(cartId, selectedItemIds) {
  return cartAdapter.getCartSummary(cartId, selectedItemIds)
}

export function removeCartItem(cartItemId) {
  return cartAdapter.removeCartItem(cartItemId)
}

export function updateCartItem(cartItemId, payload) {
  return cartAdapter.updateCartItem(cartItemId, payload)
}

export function validateCart(cartId, selectedItemIds) {
  return cartAdapter.validateCart(cartId, selectedItemIds)
}
