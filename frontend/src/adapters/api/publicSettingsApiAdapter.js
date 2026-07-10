import { apiGet } from '../../services/apiClient.js'

export function getPublicSettings() {
  return apiGet('/settings/public')
}
