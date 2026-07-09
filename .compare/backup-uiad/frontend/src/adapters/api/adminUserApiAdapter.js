import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '../../services/apiClient.js'

function normalizeParams(params = {}) {
  return Object.entries(params).reduce((result, [key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return result
    }

    result[key] = value
    return result
  }, {})
}

export function listAdminUsers(params = {}) {
  return apiGet('/admin/users', {
    params: normalizeParams(params),
  })
}

export function createAdminUser(payload = {}) {
  return apiPost('/admin/users', {
    email: payload.email,
    full_name: payload.fullName,
    password: payload.password,
    phone: payload.phone || null,
    role_code: payload.roleCode,
  })
}

export function getAdminUserDetail(userId) {
  return apiGet(`/admin/users/${userId}`)
}

export function getAdminUserLogs(userId, params = {}) {
  return apiGet(`/admin/users/${userId}/logs`, {
    params: normalizeParams(params),
  })
}

export function updateAdminUser(userId, payload = {}) {
  return apiPatch(`/admin/users/${userId}`, {
    full_name: payload.fullName,
    phone: payload.phone || null,
  })
}

export function changeAdminUserRole(userId, payload = {}) {
  return apiPatch(`/admin/users/${userId}/role`, {
    role_code: payload.roleCode,
  })
}

export function changeAdminUserStatus(userId, payload = {}) {
  return apiPatch(`/admin/users/${userId}/status`, {
    reason: payload.reason,
    status: payload.status,
  })
}

export function deleteAdminUser(userId, payload = {}) {
  return apiDelete(`/admin/users/${userId}`, {
    data: {
      reason: payload.reason,
    },
  })
}

export function resendAdminUserVerificationEmail(userId) {
  return apiPost(`/admin/users/${userId}/resend-verification-email`)
}
