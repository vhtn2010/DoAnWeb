import {
  clearAuthSession as clearCurrentAuthSession,
  getAuthSession,
  setAuthSession,
} from '../services/authSession.js'

function normalizeRole(user = {}) {
  const role = user.role ?? user.role_code ?? ''
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

export function getStoredAuthSession() {
  const session = getAuthSession()
  const user = session.user && typeof session.user === 'object' ? session.user : null

  return {
    access_token: session.access_token ?? '',
    expires_in: Number(session.expires_in) || 0,
    permissions: Array.isArray(session.permissions) ? session.permissions : [],
    refresh_expires_in: Number(session.refresh_expires_in) || 0,
    refresh_token: session.refresh_token ?? '',
    user: user
      ? {
          ...user,
          role: normalizeRole(user),
        }
      : null,
  }
}

export function saveAuthSession(session = {}) {
  setAuthSession(session)
  return getStoredAuthSession()
}

export function clearAuthSession() {
  clearCurrentAuthSession()
}

export function getStoredAccessToken() {
  return getStoredAuthSession().access_token
}

export function getStoredUserRole() {
  return getStoredAuthSession().user?.role ?? ''
}

export function hasCustomerSession() {
  return getStoredUserRole() === 'customer' && Boolean(getStoredAccessToken())
}
