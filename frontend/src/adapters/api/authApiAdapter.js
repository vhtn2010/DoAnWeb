import { apiPost } from '../../services/apiClient.js'
import { saveAuthSession } from '../../utils/authSession.js'

export async function login(payload = {}) {
  const response = await apiPost('/auth/login', {
    auth: false,
    body: payload,
  })

  if (response?.data) {
    saveAuthSession(response.data)
  }

  return response
}
