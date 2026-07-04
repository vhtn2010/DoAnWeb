import {
  applyVoucher as applyVoucherWithMockAdapter,
  buildCheckoutPayloadWithMock,
  calculateCheckoutSummaryWithMock,
  getCheckoutDraft as getCheckoutDraftWithMockAdapter,
  submitCheckout as submitCheckoutWithMockAdapter,
  validateCheckoutFormWithMock,
} from '../adapters/mock/checkoutMockAdapter.js'

const checkoutAdapter = {
  applyVoucher: applyVoucherWithMockAdapter,
  buildCheckoutPayload: buildCheckoutPayloadWithMock,
  calculateCheckoutSummary: calculateCheckoutSummaryWithMock,
  getCheckoutDraft: getCheckoutDraftWithMockAdapter,
  submitCheckout: submitCheckoutWithMockAdapter,
  validateCheckoutForm: validateCheckoutFormWithMock,
}

export function getCheckoutDraft(params) {
  return checkoutAdapter.getCheckoutDraft(params)
}

export function calculateCheckoutSummary(payload) {
  return checkoutAdapter.calculateCheckoutSummary(payload)
}

export function applyVoucher(code, currentSummary) {
  return checkoutAdapter.applyVoucher(code, currentSummary)
}

export function validateCheckoutForm(formState) {
  return checkoutAdapter.validateCheckoutForm(formState)
}

export function buildCheckoutPayload(formState) {
  return checkoutAdapter.buildCheckoutPayload(formState)
}

export function submitCheckout(payload) {
  return checkoutAdapter.submitCheckout(payload)
}

