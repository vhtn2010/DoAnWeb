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

export function listAdminVouchers(params = {}) {
  return apiGet('/admin/vouchers', {
    params: normalizeListParams(params),
  })
}

export function getAdminVoucherDetail(voucherId) {
  return apiGet(`/admin/vouchers/${voucherId}`)
}

export function createAdminVoucher(payload = {}) {
  return apiPost('/admin/vouchers', payload)
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
