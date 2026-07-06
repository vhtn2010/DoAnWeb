import { apiGet } from '../../services/apiClient.js'
import { setAuthSession } from '../../services/authSession.js'

function normalizeProfileUser(profile = {}) {
  const roleCode =
    profile.role_code ||
    profile.role?.code ||
    profile.role ||
    'guest'

  return {
    avatar_url: profile.avatar_url ?? null,
    email: profile.email ?? '',
    full_name: profile.full_name ?? '',
    id: profile.id ?? '',
    phone: profile.phone ?? null,
    role: roleCode,
    role_code: roleCode,
    status: profile.status ?? null,
  }
}

function persistProfileSession(profile = {}) {
  const user = normalizeProfileUser(profile)
  const permissions = Array.isArray(profile.permissions)
    ? profile.permissions
    : []

  setAuthSession({
    permissions,
    user,
  })

  return {
    permissions,
    user,
  }
}

export async function getCurrentProfile() {
  const response = await apiGet('/me')

  if (response?.success && response.data) {
    const session = persistProfileSession(response.data)

    return {
      ...response,
      data: {
        ...response.data,
        ...session,
      },
    }
  }

  return response
}
