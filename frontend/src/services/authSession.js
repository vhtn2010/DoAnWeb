import {
  clearAuthTokens,
  configureAuthSessionHandlers,
  getAccessToken,
  getRefreshToken,
  notifyAuthSessionChanged,
  setAuthTokens,
} from './apiClient.js'

const AUTH_USER_STORAGE_KEY = 'net-viet-travel.user'
const AUTH_PERMISSIONS_STORAGE_KEY = 'net-viet-travel.permissions'
const AUTH_EXPIRES_IN_STORAGE_KEY = 'net-viet-travel.expires-in'
const AUTH_REFRESH_EXPIRES_IN_STORAGE_KEY = 'net-viet-travel.refresh-expires-in'
const AUTH_EXPIRES_AT_STORAGE_KEY = 'net-viet-travel.expires-at'
const AUTH_REFRESH_EXPIRES_AT_STORAGE_KEY = 'net-viet-travel.refresh-expires-at'

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.sessionStorage)
}

function canUseLegacyStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function readStorageItem(key) {
  if (!canUseStorage()) {
    return ''
  }

  try {
    const value = window.sessionStorage.getItem(key) ?? ''

    if (value || !canUseLegacyStorage()) {
      return value
    }

    const legacyValue = window.localStorage.getItem(key) ?? ''

    if (legacyValue) {
      window.sessionStorage.setItem(key, legacyValue)
      window.localStorage.removeItem(key)
    }

    return legacyValue
  } catch {
    return ''
  }
}

function writeStorageItem(key, value) {
  if (!canUseStorage()) {
    return
  }

  try {
    if (value) {
      window.sessionStorage.setItem(key, value)
      if (canUseLegacyStorage()) {
        window.localStorage.removeItem(key)
      }
      return
    }

    window.sessionStorage.removeItem(key)
    if (canUseLegacyStorage()) {
      window.localStorage.removeItem(key)
    }
  } catch {
    // Storage may be blocked by browser privacy settings.
  }
}

function readJsonItem(key, fallbackValue) {
  const rawValue = readStorageItem(key)

  if (!rawValue) {
    return fallbackValue
  }

  try {
    return JSON.parse(rawValue)
  } catch {
    return fallbackValue
  }
}

function writeJsonItem(key, value) {
  if (value == null) {
    writeStorageItem(key, '')
    return
  }

  writeStorageItem(key, JSON.stringify(value))
}

function getExpiryTimestamp(expiresInSeconds) {
  const seconds = Number(expiresInSeconds)

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0
  }

  return Date.now() + seconds * 1000
}

function isExpiredTimestamp(value) {
  const timestamp = Number(value)

  return Number.isFinite(timestamp) && timestamp > 0 && Date.now() >= timestamp
}

function writeAuthMetadata(authData = {}) {
  if (authData.user !== undefined) {
    writeJsonItem(AUTH_USER_STORAGE_KEY, authData.user)
  }

  if (authData.permissions !== undefined) {
    writeJsonItem(AUTH_PERMISSIONS_STORAGE_KEY, authData.permissions)
  }

  if (authData.expires_in !== undefined) {
    writeStorageItem(AUTH_EXPIRES_IN_STORAGE_KEY, String(authData.expires_in || ''))
    writeStorageItem(
      AUTH_EXPIRES_AT_STORAGE_KEY,
      String(getExpiryTimestamp(authData.expires_in) || ''),
    )
  }

  if (authData.refresh_expires_in !== undefined) {
    writeStorageItem(
      AUTH_REFRESH_EXPIRES_IN_STORAGE_KEY,
      String(authData.refresh_expires_in || ''),
    )
    writeStorageItem(
      AUTH_REFRESH_EXPIRES_AT_STORAGE_KEY,
      String(getExpiryTimestamp(authData.refresh_expires_in) || ''),
    )
  }
}

function clearAuthMetadata() {
  writeStorageItem(AUTH_USER_STORAGE_KEY, '')
  writeStorageItem(AUTH_PERMISSIONS_STORAGE_KEY, '')
  writeStorageItem(AUTH_EXPIRES_IN_STORAGE_KEY, '')
  writeStorageItem(AUTH_REFRESH_EXPIRES_IN_STORAGE_KEY, '')
  writeStorageItem(AUTH_EXPIRES_AT_STORAGE_KEY, '')
  writeStorageItem(AUTH_REFRESH_EXPIRES_AT_STORAGE_KEY, '')
}

configureAuthSessionHandlers({
  clearSession: clearAuthMetadata,
  writeSession: writeAuthMetadata,
})

export function setAuthSession(authData = {}) {
  setAuthTokens({
    accessToken: authData.access_token,
    refreshToken: authData.refresh_token,
  })

  writeAuthMetadata(authData)
  notifyAuthSessionChanged('session-updated', { source: 'auth-session' })
}

export function getAuthSession() {
  const accessToken = getAccessToken()
  const refreshToken = getRefreshToken()
  const accessExpiresAt = Number(readStorageItem(AUTH_EXPIRES_AT_STORAGE_KEY)) || 0
  const refreshExpiresAt = Number(readStorageItem(AUTH_REFRESH_EXPIRES_AT_STORAGE_KEY)) || 0
  const isAccessTokenExpired = isExpiredTimestamp(accessExpiresAt)
  const isRefreshTokenExpired = isExpiredTimestamp(refreshExpiresAt)
  const hasActiveAccessToken = Boolean(accessToken) && !isAccessTokenExpired
  const canRefreshSession = Boolean(refreshToken) && !isRefreshTokenExpired

  return {
    access_token: accessToken,
    access_token_expires_at: accessExpiresAt,
    canRefreshSession,
    expires_in: Number(readStorageItem(AUTH_EXPIRES_IN_STORAGE_KEY)) || 0,
    isAccessTokenExpired,
    isAuthenticated: hasActiveAccessToken || canRefreshSession,
    isRefreshTokenExpired,
    permissions: readJsonItem(AUTH_PERMISSIONS_STORAGE_KEY, []),
    refresh_token_expires_at: refreshExpiresAt,
    refresh_expires_in: Number(readStorageItem(AUTH_REFRESH_EXPIRES_IN_STORAGE_KEY)) || 0,
    refresh_token: refreshToken,
    user: readJsonItem(AUTH_USER_STORAGE_KEY, null),
  }
}

export function getCurrentUser() {
  return getAuthSession().user
}

export function getCurrentRole() {
  const user = getCurrentUser()

  return user?.role ?? user?.role_code ?? 'guest'
}

export function clearAuthSession() {
  clearAuthTokens()
  clearAuthMetadata()
  notifyAuthSessionChanged('session-cleared', { reason: 'manual-clear' })
}
