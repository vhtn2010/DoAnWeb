import apiClient, { apiGet, apiPost } from '../../services/apiClient.js'

const REPORT_FILE_PATH = '/admin/reports/files/'

function getRuntimeOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }

  return 'http://localhost'
}

function isSafeReportFilePath(pathname) {
  return pathname.includes(REPORT_FILE_PATH)
}

function stripApiBasePath(pathname) {
  const basePath = new URL(apiClient.defaults.baseURL || '/api', getRuntimeOrigin())
    .pathname
    .replace(/\/+$/, '')

  if (basePath && basePath !== '/' && pathname.startsWith(`${basePath}${REPORT_FILE_PATH}`)) {
    return pathname.slice(basePath.length)
  }

  return pathname
}

function normalizeReportFileUrl(fileUrl) {
  const value = String(fileUrl ?? '').trim()

  if (!value) {
    throw new Error('Report file URL is required.')
  }

  if (/^https?:\/\//i.test(value)) {
    const baseUrl = new URL(apiClient.defaults.baseURL || '/api', getRuntimeOrigin())
    const parsedUrl = new URL(value)

    if (parsedUrl.origin !== baseUrl.origin && parsedUrl.origin !== getRuntimeOrigin()) {
      throw new Error('Report file URL must use the configured API origin.')
    }

    if (!isSafeReportFilePath(parsedUrl.pathname)) {
      throw new Error('Report file URL must point to the protected report files endpoint.')
    }

    return parsedUrl.toString()
  }

  const parsedPath = new URL(value.startsWith('/') ? value : `/${value}`, getRuntimeOrigin())

  if (!isSafeReportFilePath(parsedPath.pathname)) {
    throw new Error('Report file URL must point to the protected report files endpoint.')
  }

  return `${stripApiBasePath(parsedPath.pathname)}${parsedPath.search}${parsedPath.hash}`
}

export function getRevenueReport(params = {}) {
  return apiGet('/admin/reports/revenue', {
    params,
  })
}

export function exportRevenueReport({
  format,
  from,
  groupBy,
  to,
} = {}) {
  return apiPost('/admin/reports/export', {
    filters: {
      group_by: groupBy,
    },
    format,
    from,
    report_type: 'revenue',
    to,
  })
}

export function downloadRevenueReportFile(fileUrl) {
  return apiClient.get(normalizeReportFileUrl(fileUrl), {
    responseType: 'blob',
  })
}
