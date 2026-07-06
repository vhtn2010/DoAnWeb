import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '../../services/apiClient.js'

function normalizeListParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

function formatDateParam(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDefaultReportParams() {
  const today = new Date()
  const from = new Date(today.getFullYear(), today.getMonth(), 1)

  return {
    from: formatDateParam(from),
    group_by: 'week',
    to: formatDateParam(today),
  }
}

export function listAdminAuditLogs(params = {}) {
  return apiGet('/admin/audit-logs', {
    params: normalizeListParams(params),
  })
}

export function listAdminEmailLogs(params = {}) {
  return apiGet('/admin/email-logs', {
    params: normalizeListParams(params),
  })
}

export function resendAdminEmailLog(emailLogId) {
  return apiPost(`/admin/email-logs/${emailLogId}/resend`)
}

export function listAdminNotifications(params = {}) {
  return apiGet('/admin/notifications', {
    params: normalizeListParams(params),
  })
}

export function updateAdminNotificationStatus(notificationId, payload = {}) {
  return apiPatch(`/admin/notifications/${notificationId}/status`, payload)
}

export function getAdminUploadUsage() {
  return apiGet('/admin/uploads/usage')
}

export async function getAdminReportsOverview(params = {}) {
  const reportParams = {
    ...getDefaultReportParams(),
    ...normalizeListParams(params),
  }
  const [
    revenueResponse,
    bookingResponse,
    serviceResponse,
    paymentResponse,
  ] = await Promise.all([
    apiGet('/admin/reports/revenue', { params: reportParams }),
    apiGet('/admin/reports/bookings', { params: reportParams }),
    apiGet('/admin/reports/services', { params: reportParams }),
    apiGet('/admin/reports/payments', { params: reportParams }),
  ])

  return {
    data: {
      bookings: bookingResponse.data,
      payments: paymentResponse.data,
      revenue: revenueResponse.data,
      services: serviceResponse.data,
    },
    message: 'Admin reports overview retrieved successfully',
    success: Boolean(
      revenueResponse.success &&
      bookingResponse.success &&
      serviceResponse.success &&
      paymentResponse.success
    ),
  }
}

export function listAdminVouchers(params = {}) {
  return apiGet('/admin/vouchers', {
    params: normalizeListParams(params),
  })
}

export function changeAdminVoucherStatus(voucherId, payload = {}) {
  return apiPatch(`/admin/vouchers/${voucherId}/status`, payload)
}

export function duplicateAdminVoucher(voucherId, payload = {}) {
  return apiPost(`/admin/vouchers/${voucherId}/duplicate`, payload)
}

export function deleteAdminVoucher(voucherId, payload = {}) {
  return apiDelete(`/admin/vouchers/${voucherId}`, {
    data: payload,
  })
}
