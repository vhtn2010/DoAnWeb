import {
  buildPaymentRedirectPayloadWithMock,
  getBookingByCode as getBookingByCodeWithMockAdapter,
  getBookingConfirmation as getBookingConfirmationWithMockAdapter,
} from '../adapters/mock/bookingMockAdapter.js'

const bookingAdapter = {
  buildPaymentRedirectPayload: buildPaymentRedirectPayloadWithMock,
  getBookingByCode: getBookingByCodeWithMockAdapter,
  getBookingConfirmation: getBookingConfirmationWithMockAdapter,
}

export function getBookingConfirmation(params) {
  return bookingAdapter.getBookingConfirmation(params)
}

export function getBookingByCode(bookingCode, params) {
  return bookingAdapter.getBookingByCode(bookingCode, params)
}

export function buildPaymentRedirectPayload(booking, selectedPaymentMethod) {
  return bookingAdapter.buildPaymentRedirectPayload(booking, selectedPaymentMethod)
}
