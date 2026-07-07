import {
  applyPaymentVoucher as applyPaymentVoucherWithMockAdapter,
  buildPaymentResultPayloadWithMock,
  confirmPaymentMock as confirmPaymentWithMockAdapter,
  getPaymentByBookingCode as getPaymentByBookingCodeWithMockAdapter,
  getPaymentByCode as getPaymentByCodeWithMockAdapter,
  getPaymentConfirmation as getPaymentConfirmationWithMockAdapter,
} from '../adapters/mock/paymentMockAdapter.js'

const paymentAdapter = {
  applyPaymentVoucher: applyPaymentVoucherWithMockAdapter,
  buildPaymentResultPayload: buildPaymentResultPayloadWithMock,
  confirmPaymentMock: confirmPaymentWithMockAdapter,
  getPaymentByBookingCode: getPaymentByBookingCodeWithMockAdapter,
  getPaymentByCode: getPaymentByCodeWithMockAdapter,
  getPaymentConfirmation: getPaymentConfirmationWithMockAdapter,
}

export function getPaymentConfirmation(params) {
  return paymentAdapter.getPaymentConfirmation(params)
}

export function getPaymentByCode(paymentCode, params) {
  return paymentAdapter.getPaymentByCode(paymentCode, params)
}

export function getPaymentByBookingCode(bookingCode, params) {
  return paymentAdapter.getPaymentByBookingCode(bookingCode, params)
}

export function applyPaymentVoucher(code, currentSummary) {
  return paymentAdapter.applyPaymentVoucher(code, currentSummary)
}

export function confirmPaymentMock(payload) {
  return paymentAdapter.confirmPaymentMock(payload)
}

export function buildPaymentResultPayload(payment) {
  return paymentAdapter.buildPaymentResultPayload(payment)
}
