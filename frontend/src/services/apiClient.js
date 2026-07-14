import axios from 'axios'
import { AUTH_STORAGE_EVENT_KEYS, readStoredItem, writeStoredItem, subscribeStorageChanges } from './authStorage.js'

const DEFAULT_API_BASE_URL = '/api'
const DEFAULT_TIMEOUT_MS = 20000
const AUTH_REFRESH_PATH = '/auth/refresh-token'
const AUTH_EVENT_NAME = 'net-viet-travel.auth'
const SESSION_ERROR_CODES = new Set(['AUTH_TOKEN_EXPIRED', 'UNAUTHORIZED'])

let authSessionWriter = null
let authSessionClearer = null
let refreshTokenPromise = null

function normalizeBaseUrl(value) {
  const baseUrl = typeof value === 'string' && value.trim()
    ? value.trim()
    : DEFAULT_API_BASE_URL

  return baseUrl.replace(/\/+$/, '') || DEFAULT_API_BASE_URL
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

function normalizeLegacyConfig(config = {}) {
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    return config
  }

  const {
    auth,
    body,
    query,
    params,
    ...restConfig
  } = config

  return {
    ...restConfig,
    ...(auth === undefined ? {} : { auth }),
    ...(body === undefined ? {} : { data: body }),
    ...(params !== undefined ? { params } : query !== undefined ? { params: query } : {}),
  }
}

function looksLikeLegacyMutationConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  return (
    'auth' in value ||
    'baseURL' in value ||
    'body' in value ||
    'headers' in value ||
    'params' in value ||
    'query' in value ||
    'responseType' in value ||
    'timeout' in value ||
    'withCredentials' in value
  )
}

function shouldRefreshRequest(error) {
  const status = error.response?.status
  const config = error.config ?? {}
  const url = String(config.url ?? '')
  const errorCode = error.response?.data?.error?.code

  return (
    status === 401 &&
    (!errorCode || SESSION_ERROR_CODES.has(errorCode)) &&
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

function shouldClearSessionForError(error) {
  if (!axios.isAxiosError(error) || error.response?.status !== 401) {
    return false
  }

  const errorCode = error.response?.data?.error?.code

  return !errorCode || SESSION_ERROR_CODES.has(errorCode)
}

function unwrapApiResponse(response) {
  if (response.config?.rawResponse) {
    return response
  }

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

  if (config.auth === false) {
    setAuthorizationHeader(config, '')
    return config
  }

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

    if (shouldClearSessionForError(error)) {
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

  const unsubscribeStorage = subscribeStorageChanges(({ key, newValue }) => {
    if (!key || !AUTH_STORAGE_EVENT_KEYS.includes(key)) {
      return
    }

    listener?.({
      payload: {
        key,
        newValue: newValue ?? '',
        source: 'storage',
      },
      type: newValue ? 'session-updated' : 'session-cleared',
    })
  })

  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, handler)
    unsubscribeStorage()
  }
}

export function getAccessToken() {
  return readStoredItem('net-viet-travel.access-token')
}

export function getRefreshToken() {
  return readStoredItem('net-viet-travel.refresh-token')
}

export function setAuthTokens({ accessToken, refreshToken } = {}) {
  if (accessToken !== undefined) {
    writeStoredItem('net-viet-travel.access-token', accessToken)
  }

  if (refreshToken !== undefined) {
    writeStoredItem('net-viet-travel.refresh-token', refreshToken)
  }
}

export function clearAuthTokens() {
  writeStoredItem('net-viet-travel.access-token', '')
  writeStoredItem('net-viet-travel.refresh-token', '')
}

export function apiGet(url, config) {
  return apiClient.get(url, normalizeLegacyConfig(config))
}

export function apiGetRaw(url, config) {
  return apiClient.get(url, {
    ...normalizeLegacyConfig(config),
    rawResponse: true,
  })
}

export function apiPost(url, data, config) {
  if (looksLikeLegacyMutationConfig(data) && config === undefined) {
    const normalizedConfig = normalizeLegacyConfig(data)
    return apiClient.post(url, normalizedConfig?.data, normalizedConfig)
  }

  return apiClient.post(url, data, normalizeLegacyConfig(config))
}

export function apiPut(url, data, config) {
  if (looksLikeLegacyMutationConfig(data) && config === undefined) {
    const normalizedConfig = normalizeLegacyConfig(data)
    return apiClient.put(url, normalizedConfig?.data, normalizedConfig)
  }

  return apiClient.put(url, data, normalizeLegacyConfig(config))
}

export function apiPatch(url, data, config) {
  if (looksLikeLegacyMutationConfig(data) && config === undefined) {
    const normalizedConfig = normalizeLegacyConfig(data)
    return apiClient.patch(url, normalizedConfig?.data, normalizedConfig)
  }

  return apiClient.patch(url, data, normalizeLegacyConfig(config))
}

export function apiDelete(url, config) {
  return apiClient.delete(url, normalizeLegacyConfig(config))
}

export function getJson(path, config) {
  return apiGet(path, config)
}

export default apiClient
