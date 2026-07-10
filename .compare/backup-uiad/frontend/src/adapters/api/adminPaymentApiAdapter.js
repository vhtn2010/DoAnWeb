import {
  apiGet,
  apiPatch,
  apiPost,
} from '../../services/apiClient.js'

function createIdempotencyKey(scope) {
  const randomValue = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`

  return `${scope}-${randomValue}`
}

function normalizeParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

function getIdempotencyConfig(scope, idempotencyKey) {
  return {
    headers: {
      'Idempotency-Key': idempotencyKey || createIdempotencyKey(scope),
    },
  }
}

export function listAdminPayments(params = {}) {
  return apiGet('/admin/payments', {
    params: normalizeParams(params),
  })
}

export function getAdminPaymentDetail(paymentId) {
  return apiGet(`/admin/payments/${paymentId}`)
}

export function getAdminPaymentProof(paymentId) {
  return apiGet(`/admin/payments/${paymentId}/proof`)
}

export function confirmAdminPayment(paymentId, payload = {}, options = {}) {
  return apiPost(
    `/admin/payments/${paymentId}/confirm`,
    payload,
    getIdempotencyConfig(`payment-confirm-${paymentId}`, options.idempotencyKey),
  )
}

export function rejectAdminPayment(paymentId, payload = {}) {
  return apiPost(`/admin/payments/${paymentId}/reject`, payload)
}

export function expireAdminPayment(paymentId, payload = {}) {
  return apiPost(`/admin/payments/${paymentId}/expire`, payload)
}

export function markAdminPaymentReconciled(paymentId, payload = {}) {
  return apiPost(`/admin/payments/${paymentId}/mark-reconciled`, payload)
}

export function updateAdminPaymentNote(paymentId, payload = {}) {
  return apiPatch(`/admin/payments/${paymentId}/note`, payload)
}
