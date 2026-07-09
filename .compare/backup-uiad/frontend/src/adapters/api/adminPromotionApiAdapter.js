import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '../../services/apiClient.js'

function normalizeParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

function normalizePromotionPayload(payload = {}, { includeStatus = true } = {}) {
  const normalizedPayload = {
    description: payload.description,
    name: payload.name,
    target_service_type: payload.targetServiceType || null,
    valid_from: payload.validFrom,
    valid_to: payload.validTo,
  }

  if (includeStatus) {
    normalizedPayload.status = payload.status
  }

  return normalizedPayload
}

export function listAdminPromotions(params = {}) {
  return apiGet('/admin/promotions', {
    params: normalizeParams(params),
  })
}

export function getAdminPromotionDetail(promotionId) {
  return apiGet(`/admin/promotions/${promotionId}`)
}

export function getAdminPromotionVouchers(promotionId, params = {}) {
  return apiGet(`/admin/promotions/${promotionId}/vouchers`, {
    params: normalizeParams(params),
  })
}

export function createAdminPromotion(payload = {}) {
  return apiPost('/admin/promotions', normalizePromotionPayload(payload))
}

export function updateAdminPromotion(promotionId, payload = {}) {
  return apiPatch(
    `/admin/promotions/${promotionId}`,
    normalizePromotionPayload(payload, { includeStatus: false }),
  )
}

export function changeAdminPromotionStatus(promotionId, payload = {}) {
  return apiPatch(`/admin/promotions/${promotionId}/status`, {
    status: payload.status,
  })
}

export function deleteAdminPromotion(promotionId, payload = {}) {
  return apiDelete(`/admin/promotions/${promotionId}`, {
    data: {
      reason: payload.reason,
    },
  })
}
