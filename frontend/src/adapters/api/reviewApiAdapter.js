import { apiGet, apiPost } from '../../services/apiClient.js'

export function completeCustomerBooking(bookingId) {
  return apiPost(`/bookings/${bookingId}/complete`, {})
}

export function createCustomerTourReview(bookingId, payload = {}) {
  return apiPost(`/bookings/${bookingId}/reviews`, payload)
}

export function getPublicTourReviews(serviceId, params = {}) {
  return apiGet(`/services/${serviceId}/reviews`, {
    params,
  })
}
