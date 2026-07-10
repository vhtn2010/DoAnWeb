import { apiGet, apiPatch, apiPost } from '../../services/apiClient.js'
import { getAccessToken } from '../../services/apiClient.js'

function normalizeParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

function resolveApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim()

  if (!configuredBaseUrl) {
    return '/api'
  }

  return configuredBaseUrl.replace(/\/+$/, '')
}

async function fetchPdf(pathname) {
  const response = await fetch(`${resolveApiBaseUrl()}${pathname}`, {
    headers: {
      Accept: 'application/pdf',
      Authorization: `Bearer ${getAccessToken()}`,
    },
  })

  if (!response.ok) {
    let errorMessage = 'Không thể tải tệp tóm tắt đơn hàng.'

    try {
      const errorPayload = await response.json()
      errorMessage = errorPayload?.message ?? errorMessage
    } catch {
      // Ignore JSON parsing errors for binary responses.
    }

    const error = new Error(errorMessage)
    error.status = response.status
    throw error
  }

  return {
    blob: await response.blob(),
    filename:
      response.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] ??
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
