import {
  addCartItem as addCartItemWithApiAdapter,
  getActiveCart as getActiveCartWithApiAdapter,
  getCartSummary as getCartSummaryWithApiAdapter,
  removeCartItem as removeCartItemWithApiAdapter,
  updateCartItem as updateCartItemWithApiAdapter,
  validateCart as validateCartWithApiAdapter,
} from '../adapters/api/cartApiAdapter.js'
import {
  addCartItemPreview as addCartItemPreviewWithMockAdapter,
  getActiveCart as getActiveCartWithMockAdapter,
  getCartSummary as getCartSummaryWithMockAdapter,
  removeCartItem as removeCartItemWithMockAdapter,
  updateCartItem as updateCartItemWithMockAdapter,
  validateCart as validateCartWithMockAdapter,
} from '../adapters/mock/cartMockAdapter.js'
import { ROLES } from '../constants/roles.js'
import { getStoredAccessToken, getStoredUserRole } from '../utils/authSession.js'

const cartAdapter = {
  addCartItemPreview: addCartItemPreviewWithMockAdapter,
  getActiveCart: getActiveCartWithMockAdapter,
  getCartSummary: getCartSummaryWithMockAdapter,
  removeCartItem: removeCartItemWithMockAdapter,
  updateCartItem: updateCartItemWithMockAdapter,
  validateCart: validateCartWithMockAdapter,
}

function shouldUseApi(authState = ROLES.guest) {
  return (
    authState === ROLES.customer &&
    getStoredUserRole() === ROLES.customer &&
    Boolean(getStoredAccessToken())
  )
}

export function addCartItemPreview(payload) {
  return cartAdapter.addCartItemPreview(payload)
}

export function addCartItem(payload, options = {}) {
  if (shouldUseApi(options?.authState)) {
    return addCartItemWithApiAdapter(payload)
  }

  return cartAdapter.addCartItemPreview({
    authState: options?.authState,
    item: options?.previewItem ?? payload,
  })
}

export function getActiveCart(params) {
  if (shouldUseApi(params?.authState)) {
    return getActiveCartWithApiAdapter()
  }

  return cartAdapter.getActiveCart(params)
}

export function getCartSummary(cartId, selectedItemIds, options = {}) {
  if (shouldUseApi(options?.authState)) {
    return getCartSummaryWithApiAdapter(cartId, selectedItemIds)
  }

  return cartAdapter.getCartSummary(cartId, selectedItemIds)
}

export function removeCartItem(cartItemId, options = {}) {
  if (shouldUseApi(options?.authState)) {
    return removeCartItemWithApiAdapter(cartItemId)
  }

  return cartAdapter.removeCartItem(cartItemId)
}

export function updateCartItem(cartItemId, payload, options = {}) {
  if (shouldUseApi(options?.authState)) {
    return updateCartItemWithApiAdapter(cartItemId, payload)
  }

  return cartAdapter.updateCartItem(cartItemId, payload)
}

export function validateCart(cartId, selectedItemIds, options = {}) {
  if (shouldUseApi(options?.authState)) {
    return validateCartWithApiAdapter()
  }

  return cartAdapter.validateCart(cartId, selectedItemIds)
}
