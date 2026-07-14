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
import {
  createCustomerAuthRequiredResponse,
  isCustomerApiRequested,
  shouldUseCustomerApi,
} from '../utils/customerApiSession.js'

const checkoutAdapter = {
  applyVoucher: applyVoucherWithMockAdapter,
  buildCheckoutPayload: buildCheckoutPayloadWithMock,
  calculateCheckoutSummary: calculateCheckoutSummaryWithMock,
  getCheckoutDraft: getCheckoutDraftWithMockAdapter,
  submitCheckout: submitCheckoutWithMockAdapter,
  validateCheckoutForm: validateCheckoutFormWithMock,
}

export function getCheckoutDraft(params) {
  if (shouldUseCustomerApi(params?.authState)) {
    return getCheckoutDraftWithApiAdapter(params)
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return checkoutAdapter.getCheckoutDraft(params)
}

export function calculateCheckoutSummary(payload) {
  return checkoutAdapter.calculateCheckoutSummary(payload)
}

export function applyVoucher(code, currentSummary, options = {}) {
  if (shouldUseCustomerApi(options?.authState)) {
    return applyVoucherWithApiAdapter(code, {
      cartId: options.cartId,
      currentSummary,
    })
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
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
  if (shouldUseCustomerApi(options?.authState)) {
    return submitCheckoutWithApiAdapter(payload, options)
  }

  if (isCustomerApiRequested(options?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return checkoutAdapter.submitCheckout(payload)
}

