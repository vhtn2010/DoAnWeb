import { apiGet, apiGetRaw, apiPatch, apiPost } from '../../services/apiClient.js'

function normalizeParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

async function fetchPdf(pathname) {
  const response = await apiGetRaw(pathname, {
    headers: {
      Accept: 'application/pdf',
    },
    responseType: 'blob',
  })

  return {
    blob: response.data,
    filename:
      response.headers['content-disposition']?.match(/filename="?([^"]+)"?/)?.[1] ??
      'booking-summary.pdf',
  }
}

export function listMyBookings(params = {}) {
  return apiGet('/bookings', {
    params: normalizeParams(params),
  })
}

export function getMyBookingDetail(bookingId) {
  return apiGet(`/bookings/${bookingId}`)
}

export function getMyBookingItems(bookingId) {
  return apiGet(`/bookings/${bookingId}/items`)
}

export function getMyBookingStatusHistory(bookingId) {
  return apiGet(`/bookings/${bookingId}/status-history`)
}

export function getMyBookingInvoice(bookingId) {
  return apiGet(`/bookings/${bookingId}/invoice`)
}

export function downloadMyBookingSummary(bookingId) {
  return fetchPdf(`/bookings/${bookingId}/download-summary`)
}

export function submitCheckout(payload = {}, options = {}) {
  return apiPost('/bookings/checkout', payload, {
    headers: {
      'Idempotency-Key': options.idempotencyKey,
    },
  })
}

export function requestBookingCancellation(bookingId, payload = {}) {
  return apiPost(`/bookings/${bookingId}/cancel-request`, payload)
}

export function updateMyBookingContact(bookingId, payload = {}) {
  return apiPatch(`/bookings/${bookingId}/contact`, payload)
}
