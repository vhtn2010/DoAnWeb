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
import {
  createCustomerAuthRequiredResponse,
  isCustomerApiRequested,
  shouldUseCustomerApi,
} from '../utils/customerApiSession.js'

const cartAdapter = {
  addCartItemPreview: addCartItemPreviewWithMockAdapter,
  getActiveCart: getActiveCartWithMockAdapter,
  getCartSummary: getCartSummaryWithMockAdapter,
  removeCartItem: removeCartItemWithMockAdapter,
  updateCartItem: updateCartItemWithMockAdapter,
  validateCart: validateCartWithMockAdapter,
}

export function addCartItemPreview(payload) {
  return cartAdapter.addCartItemPreview(payload)
}

export function addCartItem(payload, options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return addCartItemWithApiAdapter(payload)
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return cartAdapter.addCartItemPreview({
    authState: options?.authState,
    item: options?.previewItem ?? payload,
  })
}

export function getActiveCart(params) {
  if (shouldUseCustomerApi(params?.authState)) {
    return getActiveCartWithApiAdapter()
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return cartAdapter.getActiveCart(params)
}

export function getCartSummary(cartId, selectedItemIds, options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return getCartSummaryWithApiAdapter(cartId, selectedItemIds)
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return cartAdapter.getCartSummary(cartId, selectedItemIds)
}

export function removeCartItem(cartItemId, options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return removeCartItemWithApiAdapter(cartItemId)
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return cartAdapter.removeCartItem(cartItemId)
}

export function updateCartItem(cartItemId, payload, options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return updateCartItemWithApiAdapter(cartItemId, payload)
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return cartAdapter.updateCartItem(cartItemId, payload)
}

export function validateCart(cartId, selectedItemIds, options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return validateCartWithApiAdapter(cartId, selectedItemIds, options.voucherCode)
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return cartAdapter.validateCart(cartId, selectedItemIds)
}

export function applyCartVoucher(payload = {}, options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return applyCartVoucherWithApiAdapter(payload)
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return Promise.resolve({
    data: null,
    message: 'Tài khoản xem trước chưa hỗ trợ áp dụng voucher vào giỏ hàng.',
    success: false,
  })
}

export function removeCartVoucher(options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return removeCartVoucherWithApiAdapter()
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return Promise.resolve({
    data: null,
    message: 'Tài khoản xem trước chưa hỗ trợ gỡ voucher trong giỏ hàng.',
    success: false,
  })
}

export function clearCartItems(options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return clearCartItemsWithApiAdapter()
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return Promise.resolve({
    data: null,
    message: 'Tài khoản xem trước chưa hỗ trợ xóa toàn bộ giỏ hàng.',
    success: false,
  })
}
