import { apiGet, apiPatch } from '../../services/apiClient.js'

export function getAdminPublicSettings() {
  return apiGet('/admin/settings/public')
}

export function updateAdminPublicSettings(payload = {}) {
  return apiPatch('/admin/settings/public', payload)
}

export function getAdminBusinessSettings() {
  return apiGet('/admin/settings/business')
}

export function updateAdminBusinessSettings(payload = {}) {
  return apiPatch('/admin/settings/business', payload)
}

export function getAdminDirectPaymentSettings() {
  return apiGet('/admin/settings/direct-payment')
}

export function updateAdminDirectPaymentSettings(payload = {}) {
  return apiPatch('/admin/settings/direct-payment', payload)
}
