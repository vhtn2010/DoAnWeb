import { apiGet, apiPost } from '../../services/apiClient.js'
import { createIdempotencyKey } from '../../utils/idempotency.js'

export function getDirectPaymentMethods() {
  return apiGet('/payment-methods/direct')
}

export function createCustomerDirectPayment(bookingId, payload = {}, options = {}) {
  return apiPost(`/bookings/${bookingId}/direct-payments`, payload, {
    headers: {
      'Idempotency-Key':
        options.idempotencyKey ?? createIdempotencyKey(`direct-payment-${bookingId}`),
    },
  })
}

export function listCustomerBookingPayments(bookingId) {
  return apiGet(`/bookings/${bookingId}/payments`)
}

export function getCustomerPaymentDetail(paymentId) {
  return apiGet(`/payments/${paymentId}`)
}

export function cancelCustomerPayment(paymentId, payload = {}) {
  return apiPost(`/payments/${paymentId}/cancel`, payload)
}

export function uploadCustomerPaymentProof(paymentId, payload = {}) {
  return apiPost(`/payments/${paymentId}/proof`, payload)
}

export function getCustomerPaymentProof(paymentId) {
  return apiGet(`/payments/${paymentId}/proof`)
}
