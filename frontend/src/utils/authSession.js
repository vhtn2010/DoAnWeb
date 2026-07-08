const AUTH_SESSION_STORAGE_KEY = 'net-viet-travel.auth-session'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function normalizeRole(user = {}) {
  const role = user.role ?? user.role_code ?? ''

  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

function normalizeSessionPayload(session = {}) {
  const user = session.user && typeof session.user === 'object' ? session.user : null

  return {
    access_token:
      typeof session.access_token === 'string' && session.access_token.trim()
        ? session.access_token.trim()
        : '',
    expires_in: Number(session.expires_in) || 0,
    permissions: Array.isArray(session.permissions) ? session.permissions : [],
    refresh_expires_in: Number(session.refresh_expires_in) || 0,
    refresh_token:
      typeof session.refresh_token === 'string' && session.refresh_token.trim()
        ? session.refresh_token.trim()
        : '',
    user: user
      ? {
          ...user,
          role: normalizeRole(user),
        }
      : null,
  }
}

export function getStoredAuthSession() {
  if (!canUseStorage()) {
    return null
  }

  try {
    const rawValue = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)

    if (!rawValue) {
      return null
    }

    return normalizeSessionPayload(JSON.parse(rawValue))
  } catch {
    return null
  }
}

export function saveAuthSession(session) {
  if (!canUseStorage()) {
    return null
  }

  const normalizedSession = normalizeSessionPayload(session)
  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(normalizedSession))

  return normalizedSession
}

export function clearAuthSession() {
  if (!canUseStorage()) {
    return
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
}

export function getStoredAccessToken() {
  return getStoredAuthSession()?.access_token ?? ''
}

export function getStoredUserRole() {
  return getStoredAuthSession()?.user?.role ?? ''
}

export function hasCustomerSession() {
  return getStoredUserRole() === 'customer' && Boolean(getStoredAccessToken())
}
