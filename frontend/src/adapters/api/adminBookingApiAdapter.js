import { apiGet, apiPatch, apiPost } from '../../services/apiClient.js'

function normalizeListParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

export function listAdminBookings(params = {}) {
  return apiGet('/admin/bookings', {
    params: normalizeListParams(params),
  })
}

export function getAdminBookingDetail(bookingId) {
  return apiGet(`/admin/bookings/${bookingId}`)
}

export function updateAdminBookingStatus(bookingId, payload = {}) {
  return apiPatch(`/admin/bookings/${bookingId}/status`, payload)
}

export function confirmAdminBooking(bookingId, payload = {}) {
  return apiPost(`/admin/bookings/${bookingId}/confirm`, payload)
}

export function completeAdminBooking(bookingId, payload = {}) {
  return apiPost(`/admin/bookings/${bookingId}/complete`, payload)
}

export function cancelAdminBooking(bookingId, payload = {}) {
  return apiPost(`/admin/bookings/${bookingId}/cancel`, payload)
}
