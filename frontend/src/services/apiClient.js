const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')

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

async function requestJson(path, { method = 'GET' } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
    },
  })
  const payload = await parseJsonSafely(response)

  if (!response.ok || payload?.success === false) {
    const error = new Error(
      payload?.message || `Request failed with status ${response.status}`,
    )

    error.code = payload?.error?.code
    error.details = payload?.error?.details
    error.status = response.status

    throw error
  }

  return payload
}

export function getJson(path) {
  return requestJson(path)
}
