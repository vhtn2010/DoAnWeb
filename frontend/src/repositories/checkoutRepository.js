import {
  applyVoucher as applyVoucherWithApiAdapter,
  getCheckoutDraft as getCheckoutDraftWithApiAdapter,
  submitCheckout as submitCheckoutWithApiAdapter,
} from '../adapters/api/checkoutApiAdapter.js'
import {
  applyVoucher as applyVoucherWithMockAdapter,
  buildCheckoutPayloadWithMock,
  calculateCheckoutSummaryWithMock,
  getCheckoutDraft as getCheckoutDraftWithMockAdapter,
  submitCheckout as submitCheckoutWithMockAdapter,
  validateCheckoutFormWithMock,
} from '../adapters/mock/checkoutMockAdapter.js'
import { ROLES } from '../constants/roles.js'
import { getAuthSession } from '../services/authSession.js'

const checkoutAdapter = {
  applyVoucher: applyVoucherWithMockAdapter,
  buildCheckoutPayload: buildCheckoutPayloadWithMock,
  calculateCheckoutSummary: calculateCheckoutSummaryWithMock,
  getCheckoutDraft: getCheckoutDraftWithMockAdapter,
  submitCheckout: submitCheckoutWithMockAdapter,
  validateCheckoutForm: validateCheckoutFormWithMock,
}

function shouldUseApi(authState = ROLES.guest) {
  const session = getAuthSession()
  const role = session.user?.role ?? session.user?.role_code ?? ''

  return authState === ROLES.customer && role === ROLES.customer && Boolean(session.access_token)
}

export function getCheckoutDraft(params) {
  if (shouldUseApi(params?.authState)) {
    return getCheckoutDraftWithApiAdapter(params)
  }

  return checkoutAdapter.getCheckoutDraft(params)
}

export function calculateCheckoutSummary(payload) {
  return checkoutAdapter.calculateCheckoutSummary(payload)
}

export function applyVoucher(code, currentSummary, options = {}) {
  if (shouldUseApi(options?.authState)) {
    return applyVoucherWithApiAdapter(code, {
      cartId: options.cartId,
      currentSummary,
    })
  }

  return checkoutAdapter.applyVoucher(code, currentSummary)
}

export function validateCheckoutForm(formState) {
  return checkoutAdapter.validateCheckoutForm(formState)
}

export function buildCheckoutPayload(formState) {
  return checkoutAdapter.buildCheckoutPayload(formState)
}

export function submitCheckout(payload, options = {}) {
  if (shouldUseApi(options?.authState)) {
    return submitCheckoutWithApiAdapter(payload, options)
  }

  return checkoutAdapter.submitCheckout(payload)
}

