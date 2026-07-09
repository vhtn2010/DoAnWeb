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

export function listAdminRefunds(params = {}) {
  return apiGet('/admin/refunds', {
    params: normalizeParams(params),
  })
}

export function getAdminRefundDetail(refundId) {
  return apiGet(`/admin/refunds/${refundId}`)
}

export function approveAdminRefund(refundId, payload = {}, options = {}) {
  return apiPost(
    `/admin/refunds/${refundId}/approve`,
    {
      approved_amount: payload.approvedAmount,
      note: payload.note,
    },
    getIdempotencyConfig(`refund-approve-${refundId}`, options.idempotencyKey),
  )
}

export function rejectAdminRefund(refundId, payload = {}) {
  return apiPost(`/admin/refunds/${refundId}/reject`, {
    reason: payload.reason,
  })
}

export function markAdminRefundProcessing(refundId, payload = {}) {
  return apiPost(`/admin/refunds/${refundId}/mark-processing`, {
    note: payload.note,
  })
}

export function markAdminRefundSuccess(refundId, payload = {}, options = {}) {
  return apiPost(
    `/admin/refunds/${refundId}/mark-success`,
    {
      note: payload.note,
      processed_at: payload.processedAt,
      provider_refund_id: payload.providerRefundId,
    },
    getIdempotencyConfig(`refund-success-${refundId}`, options.idempotencyKey),
  )
}

export function markAdminRefundFailed(refundId, payload = {}) {
  return apiPost(`/admin/refunds/${refundId}/mark-failed`, {
    reason: payload.reason,
  })
}

export function updateAdminRefundNote(refundId, payload = {}) {
  return apiPatch(`/admin/refunds/${refundId}/note`, {
    note: payload.note,
  })
}
