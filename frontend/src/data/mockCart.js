import { guestActiveCartFixture } from '../fixtures/cart.fixtures.js'
import {
  createCartSummaryFromItems,
  createCartSummaryPayload,
  mapCartItemToView,
} from '../mappers/cartMappers.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

export const mockActiveCart = {
  ...guestActiveCartFixture.cart,
  cart_items: guestActiveCartFixture.cart_items.map((item) => mapCartItemToView(item)),
}

export { formatCurrencyVND }

export function calculateCartSummary(cartItems, selectedItemIds = []) {
  return createCartSummaryFromItems(cartItems, selectedItemIds)
}

export function buildCartSummaryPayload(cart, cartItemsOrSummary, selectedItemIds = []) {
  const summary = Array.isArray(cartItemsOrSummary)
    ? createCartSummaryFromItems(cartItemsOrSummary, selectedItemIds)
    : cartItemsOrSummary

  return createCartSummaryPayload(cart, summary, selectedItemIds)
}
