import {
  clearAuthTokens,
  configureAuthSessionHandlers,
  getAccessToken,
  getRefreshToken,
  notifyAuthSessionChanged,
  setAuthTokens,
} from './apiClient.js'
import { readStoredItem, writeStoredItem } from './authStorage.js'

function readJsonItem(key, fallbackValue) {
  const rawValue = readStoredItem(key)

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
    writeStoredItem(key, '')
    return
  }

  writeStoredItem(key, JSON.stringify(value))
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
    writeJsonItem('net-viet-travel.user', authData.user)
  }

  if (authData.permissions !== undefined) {
    writeJsonItem('net-viet-travel.permissions', authData.permissions)
  }

  if (authData.expires_in !== undefined) {
    writeStoredItem('net-viet-travel.expires-in', String(authData.expires_in || ''))
    writeStoredItem(
      'net-viet-travel.expires-at',
      String(getExpiryTimestamp(authData.expires_in) || ''),
    )
  }

  if (authData.refresh_expires_in !== undefined) {
    writeStoredItem(
      'net-viet-travel.refresh-expires-in',
      String(authData.refresh_expires_in || ''),
    )
    writeStoredItem(
      'net-viet-travel.refresh-expires-at',
      String(getExpiryTimestamp(authData.refresh_expires_in) || ''),
    )
  }
}

function clearAuthMetadata() {
  writeStoredItem('net-viet-travel.user', '')
  writeStoredItem('net-viet-travel.permissions', '')
  writeStoredItem('net-viet-travel.expires-in', '')
  writeStoredItem('net-viet-travel.refresh-expires-in', '')
  writeStoredItem('net-viet-travel.expires-at', '')
  writeStoredItem('net-viet-travel.refresh-expires-at', '')
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
  const accessExpiresAt = Number(readStoredItem('net-viet-travel.expires-at')) || 0
  const refreshExpiresAt = Number(readStoredItem('net-viet-travel.refresh-expires-at')) || 0
  const isAccessTokenExpired = isExpiredTimestamp(accessExpiresAt)
  const isRefreshTokenExpired = isExpiredTimestamp(refreshExpiresAt)
  const hasActiveAccessToken = Boolean(accessToken) && !isAccessTokenExpired
  const canRefreshSession = Boolean(refreshToken) && !isRefreshTokenExpired

  return {
    access_token: accessToken,
    access_token_expires_at: accessExpiresAt,
    canRefreshSession,
    expires_in: Number(readStoredItem('net-viet-travel.expires-in')) || 0,
    isAccessTokenExpired,
    isAuthenticated: hasActiveAccessToken || canRefreshSession,
    isRefreshTokenExpired,
    permissions: readJsonItem('net-viet-travel.permissions', []),
    refresh_token_expires_at: refreshExpiresAt,
    refresh_expires_in: Number(readStoredItem('net-viet-travel.refresh-expires-in')) || 0,
    refresh_token: refreshToken,
    user: readJsonItem('net-viet-travel.user', null),
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
