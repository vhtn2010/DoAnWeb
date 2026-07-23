import { apiGet, apiPost } from '../../services/apiClient.js'

export function createPublicTourComment(serviceId, payload = {}) {
  return apiPost(`/services/${serviceId}/comments`, payload)
}

export function getPublicTourComments(serviceId, params = {}) {
  return apiGet(`/services/${serviceId}/comments`, {
    params,
  })
}
