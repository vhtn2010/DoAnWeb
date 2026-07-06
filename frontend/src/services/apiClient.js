import axios from 'axios'

const DEFAULT_API_BASE_URL = '/api'
const DEFAULT_TIMEOUT_MS = 20000
const ACCESS_TOKEN_STORAGE_KEY = 'net-viet-travel.access-token'
const REFRESH_TOKEN_STORAGE_KEY = 'net-viet-travel.refresh-token'
const AUTH_REFRESH_PATH = '/auth/refresh-token'
const AUTH_EVENT_NAME = 'net-viet-travel.auth'

let authSessionWriter = null
let authSessionClearer = null
let refreshTokenPromise = null

function normalizeBaseUrl(value) {
  const baseUrl = typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_API_BASE_URL

  return baseUrl.replace(/\/+$/, '') || DEFAULT_API_BASE_URL
}

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
    // Storage can be unavailable in private mode or blocked browser contexts.
  }
}

function emitAuthEvent(type, payload = {}) {
  if (
    typeof window === 'undefined' ||
    typeof window.dispatchEvent !== 'function' ||
    typeof CustomEvent !== 'function'
  ) {
    return
  }

  window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME, {
    detail: {
      payload,
      type,
    },
  }))
}

function isAbsoluteUrl(value) {
  return /^https?:\/\//i.test(String(value ?? ''))
}

function getNormalizedBaseUrl(config = {}) {
  return normalizeBaseUrl(config.baseURL ?? apiClient.defaults.baseURL)
}

function getBasePathname(baseUrl) {
  if (!isAbsoluteUrl(baseUrl)) {
    return baseUrl.startsWith('/') ? baseUrl : `/${baseUrl}`
  }

  try {
    return new URL(baseUrl).pathname.replace(/\/+$/, '') || '/'
  } catch {
    return DEFAULT_API_BASE_URL
  }
}

function isApiRequest(config = {}) {
  const url = String(config.url ?? '')

  if (!url || !isAbsoluteUrl(url)) {
    return true
  }

  const baseUrl = getNormalizedBaseUrl(config)

  if (!isAbsoluteUrl(baseUrl)) {
    if (typeof window === 'undefined') {
      return false
    }

    try {
      const requestUrl = new URL(url)
      return requestUrl.origin === window.location.origin &&
        requestUrl.pathname.startsWith(getBasePathname(baseUrl))
    } catch {
      return false
    }
  }

  try {
    const requestUrl = new URL(url)
    const apiUrl = new URL(baseUrl)
    const apiPathname = apiUrl.pathname.replace(/\/+$/, '') || '/'

    return requestUrl.origin === apiUrl.origin &&
      requestUrl.pathname.startsWith(apiPathname)
  } catch {
    return false
  }
}

function shouldRefreshRequest(error) {
  const status = error.response?.status
  const config = error.config ?? {}
  const url = String(config.url ?? '')

  return (
    status === 401 &&
    !config._authRetry &&
    !url.endsWith(AUTH_REFRESH_PATH) &&
    Boolean(getRefreshToken())
  )
}

function setAuthorizationHeader(config, accessToken) {
  config.headers = config.headers ?? {}

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  } else {
    delete config.headers.Authorization
  }

  return config
}

function persistRefreshedSession(authData = {}) {
  setAuthTokens({
    accessToken: authData.access_token,
    refreshToken: authData.refresh_token,
  })

  if (typeof authSessionWriter === 'function') {
    authSessionWriter(authData)
  }

  emitAuthEvent('session-refreshed', { source: 'api-client' })
}

function clearStoredSession(reason = 'session-cleared') {
  clearAuthTokens()

  if (typeof authSessionClearer === 'function') {
    authSessionClearer()
  }

  emitAuthEvent('session-cleared', { reason })
}

async function refreshAccessToken() {
  if (!refreshTokenPromise) {
    const refreshToken = getRefreshToken()

    refreshTokenPromise = axios.post(
      `${getNormalizedBaseUrl()}${AUTH_REFRESH_PATH}`,
      {
        refresh_token: refreshToken,
      },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: DEFAULT_TIMEOUT_MS,
      },
    ).then((response) => {
      const authData = response.data?.data

      if (!response.data?.success || !authData?.access_token) {
        throw new Error(response.data?.message || 'Unable to refresh the session.')
      }

      persistRefreshedSession(authData)
      return authData.access_token
    }).catch((error) => {
      clearStoredSession('refresh-failed')
      throw error
    }).finally(() => {
      refreshTokenPromise = null
    })
  }

  return refreshTokenPromise
}

function normalizeApiError(error) {
  if (!axios.isAxiosError(error)) {
    return error
  }

  const responseData = error.response?.data
  const apiError = new Error(
    responseData?.message || error.message || 'Unable to connect to the API.',
  )

  apiError.code = responseData?.error?.code || error.code || 'API_REQUEST_FAILED'
  apiError.details = responseData?.error?.details
  apiError.status = error.response?.status ?? 0
  apiError.response = error.response

  return apiError
}

function unwrapApiResponse(response) {
  return response.data
}

export const apiClient = axios.create({
  baseURL: normalizeBaseUrl(import.meta.env.VITE_API_URL),
  headers: {
    Accept: 'application/json',
  },
  timeout: DEFAULT_TIMEOUT_MS,
})

apiClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken()

  if (accessToken && isApiRequest(config)) {
    setAuthorizationHeader(config, accessToken)
  }

  return config
})

apiClient.interceptors.response.use(
  unwrapApiResponse,
  async (error) => {
    if (axios.isAxiosError(error) && shouldRefreshRequest(error)) {
      try {
        const accessToken = await refreshAccessToken()
        const retryConfig = setAuthorizationHeader(
          {
            ...error.config,
            _authRetry: true,
          },
          accessToken,
        )

        return apiClient.request(retryConfig)
      } catch (refreshError) {
        return Promise.reject(normalizeApiError(refreshError))
      }
    }

    const normalizedError = normalizeApiError(error)

    if (axios.isAxiosError(error) && error.response?.status === 401) {
      clearStoredSession('unauthorized')
    }

    if (axios.isAxiosError(error) && error.response?.status === 403) {
      emitAuthEvent('forbidden', {
        message: normalizedError.message,
        status: normalizedError.status,
      })
    }

    return Promise.reject(normalizedError)
  },
)

export function configureAuthSessionHandlers({ clearSession, writeSession } = {}) {
  authSessionClearer = typeof clearSession === 'function' ? clearSession : authSessionClearer
  authSessionWriter = typeof writeSession === 'function' ? writeSession : authSessionWriter
}

export function notifyAuthSessionChanged(type = 'session-changed', payload = {}) {
  emitAuthEvent(type, payload)
}

export function subscribeAuthEvents(listener) {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {}
  }

  const handler = (event) => {
    listener?.(event.detail ?? {})
  }

  window.addEventListener(AUTH_EVENT_NAME, handler)

  return () => window.removeEventListener(AUTH_EVENT_NAME, handler)
}

export function getAccessToken() {
  return readStorageItem(ACCESS_TOKEN_STORAGE_KEY)
}

export function getRefreshToken() {
  return readStorageItem(REFRESH_TOKEN_STORAGE_KEY)
}

export function setAuthTokens({ accessToken, refreshToken } = {}) {
  if (accessToken !== undefined) {
    writeStorageItem(ACCESS_TOKEN_STORAGE_KEY, accessToken)
  }

  if (refreshToken !== undefined) {
    writeStorageItem(REFRESH_TOKEN_STORAGE_KEY, refreshToken)
  }
}

export function clearAuthTokens() {
  writeStorageItem(ACCESS_TOKEN_STORAGE_KEY, '')
  writeStorageItem(REFRESH_TOKEN_STORAGE_KEY, '')
}

export function apiGet(url, config) {
  return apiClient.get(url, config)
}

export function apiPost(url, data, config) {
  return apiClient.post(url, data, config)
}

export function apiPut(url, data, config) {
  return apiClient.put(url, data, config)
}

export function apiPatch(url, data, config) {
  return apiClient.patch(url, data, config)
}

export function apiDelete(url, config) {
  return apiClient.delete(url, config)
}

export default apiClient
