import { ROLES } from '../constants/roles.js'
import {
  customerActiveCartFixture,
  guestActiveCartFixture,
} from '../fixtures/cart.fixtures.js'
import {
  customerCheckoutDraftFixture,
  guestCheckoutDraftFixture,
} from '../fixtures/checkout.fixtures.js'
import {
  buildCheckoutDraftFromCartSnapshot,
  buildCheckoutPayload,
  calculateCheckoutSummary,
  cloneCheckoutValue,
  validateCheckoutForm,
} from '../mappers/checkoutMappers.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

function getCartSnapshot(authState = ROLES.guest) {
  return authState === ROLES.customer
    ? customerActiveCartFixture
    : guestActiveCartFixture
}

export const mockCheckoutPreviewService = cloneCheckoutValue(
  guestCheckoutDraftFixture.summary_service,
)

export const mockCheckoutDraft = cloneCheckoutValue(guestCheckoutDraftFixture)

export const mockCustomerCheckoutDraft = cloneCheckoutValue(customerCheckoutDraftFixture)

export { buildCheckoutPayload, calculateCheckoutSummary, formatCurrencyVND, validateCheckoutForm }

export function createMockCheckoutDraft({
  authState = ROLES.guest,
  selectedCartItemIds,
  cartSummaryPayload,
} = {}) {
  return buildCheckoutDraftFromCartSnapshot(getCartSnapshot(authState), {
    authState,
    selectedCartItemIds,
    cartSummaryPayload,
  })
}
