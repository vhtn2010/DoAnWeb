import {
  applyPaymentVoucher as applyPaymentVoucherWithMockAdapter,
  buildInvoiceDownloadPayloadWithMock,
  buildPaymentResultPayloadWithMock,
  confirmPaymentMock as confirmPaymentWithMockAdapter,
  getPaymentByBookingCode as getPaymentByBookingCodeWithMockAdapter,
  getPaymentByCode as getPaymentByCodeWithMockAdapter,
  getPaymentConfirmation as getPaymentConfirmationWithMockAdapter,
  getPaymentSuccess as getPaymentSuccessWithMockAdapter,
  getPaymentSuccessByCode as getPaymentSuccessByCodeWithMockAdapter,
} from '../adapters/mock/paymentMockAdapter.js'

const paymentAdapter = {
  applyPaymentVoucher: applyPaymentVoucherWithMockAdapter,
  buildInvoiceDownloadPayload: buildInvoiceDownloadPayloadWithMock,
  buildPaymentResultPayload: buildPaymentResultPayloadWithMock,
  confirmPaymentMock: confirmPaymentWithMockAdapter,
  getPaymentByBookingCode: getPaymentByBookingCodeWithMockAdapter,
  getPaymentByCode: getPaymentByCodeWithMockAdapter,
  getPaymentConfirmation: getPaymentConfirmationWithMockAdapter,
  getPaymentSuccess: getPaymentSuccessWithMockAdapter,
  getPaymentSuccessByCode: getPaymentSuccessByCodeWithMockAdapter,
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

export function getPaymentSuccess(params) {
  return paymentAdapter.getPaymentSuccess(params)
}

export function getPaymentSuccessByCode(paymentCode, params) {
  return paymentAdapter.getPaymentSuccessByCode(paymentCode, params)
}

export function buildInvoiceDownloadPayload(paymentSuccess) {
  return paymentAdapter.buildInvoiceDownloadPayload(paymentSuccess)
}
