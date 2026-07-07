const DEFAULT_API_BASE_URL = '/api'

function getApiBaseUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_URL?.trim()

  if (!configuredBaseUrl) {
    return DEFAULT_API_BASE_URL
  }

  return configuredBaseUrl.replace(/\/+$/, '')
}

function buildRequestUrl(path, query = {}) {
  const baseUrl = getApiBaseUrl()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const searchParams = new URLSearchParams()

  Object.entries(query).forEach(([key, value]) => {
    if (value == null || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()
  const requestPath = `${baseUrl}${normalizedPath}`

  if (!queryString) {
    return requestPath
  }

  const separator = requestPath.includes('?') ? '&' : '?'
  return `${requestPath}${separator}${queryString}`
}

async function parseJsonSafely(response) {
  const contentType = response.headers.get('content-type') || ''

  if (!contentType.includes('application/json')) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

async function requestJson(path, { method = 'GET', query } = {}) {
  const response = await fetch(buildRequestUrl(path, query), {
    method,
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await parseJsonSafely(response)

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.message ?? 'Khong the ket noi den he thong.')
    error.code = payload?.error?.code ?? 'API_ERROR'
    error.details = Array.isArray(payload?.error?.details) ? payload.error.details : []
    error.status = response.status
    throw error
  }

  return payload
}

export function apiGet(path, options) {
  return requestJson(path, options)
}

export function getJson(path) {
  return requestJson(path)
}
