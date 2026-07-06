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

  return queryString ? `${requestPath}?${queryString}` : requestPath
}

export async function apiGet(path, { query } = {}) {
  const response = await fetch(buildRequestUrl(path, query), {
    headers: {
      Accept: 'application/json',
    },
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok || payload?.success !== true) {
    const error = new Error(payload?.message ?? 'Khong the ket noi den he thong.')
    error.code = payload?.error?.code ?? 'API_ERROR'
    error.details = Array.isArray(payload?.error?.details) ? payload.error.details : []
    error.status = response.status
    throw error
  }

  return payload
}
