import {
  addCartItem as addCartItemWithApiAdapter,
  applyCartVoucher as applyCartVoucherWithApiAdapter,
  clearCartItems as clearCartItemsWithApiAdapter,
  getActiveCart as getActiveCartWithApiAdapter,
  getCartSummary as getCartSummaryWithApiAdapter,
  removeCartVoucher as removeCartVoucherWithApiAdapter,
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
import { getAuthSession } from '../services/authSession.js'

const cartAdapter = {
  addCartItemPreview: addCartItemPreviewWithMockAdapter,
  getActiveCart: getActiveCartWithMockAdapter,
  getCartSummary: getCartSummaryWithMockAdapter,
  removeCartItem: removeCartItemWithMockAdapter,
  updateCartItem: updateCartItemWithMockAdapter,
  validateCart: validateCartWithMockAdapter,
}

function shouldUseApi(authState = ROLES.guest) {
  const session = getAuthSession()
  const role = session.user?.role ?? session.user?.role_code ?? ''

  return authState === ROLES.customer && role === ROLES.customer && Boolean(session.access_token)
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
    return validateCartWithApiAdapter(cartId, selectedItemIds)
  }

  return cartAdapter.validateCart(cartId, selectedItemIds)
}

export function applyCartVoucher(payload = {}, options = {}) {
  if (shouldUseApi(options?.authState)) {
    return applyCartVoucherWithApiAdapter(payload)
  }

  return Promise.resolve({
    data: null,
    message: 'Tài khoản xem trước chưa hỗ trợ áp dụng voucher vào giỏ hàng.',
    success: false,
  })
}

export function removeCartVoucher(options = {}) {
  if (shouldUseApi(options?.authState)) {
    return removeCartVoucherWithApiAdapter()
  }

  return Promise.resolve({
    data: null,
    message: 'Tài khoản xem trước chưa hỗ trợ gỡ voucher trong giỏ hàng.',
    success: false,
  })
}

export function clearCartItems(options = {}) {
  if (shouldUseApi(options?.authState)) {
    return clearCartItemsWithApiAdapter()
  }

  return Promise.resolve({
    data: null,
    message: 'Tài khoản xem trước chưa hỗ trợ xóa toàn bộ giỏ hàng.',
    success: false,
  })
}
