import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
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

export function listAdminRoles() {
  return apiGet('/admin/roles')
}

export function getAdminRoleDetail(roleId) {
  return apiGet(`/admin/roles/${roleId}`)
}

export function createAdminRole(payload = {}) {
  return apiPost('/admin/roles', {
    code: payload.code,
    description: payload.description || null,
    level: payload.level,
    name: payload.name,
  })
}

export function updateAdminRole(roleId, payload = {}) {
  return apiPatch(`/admin/roles/${roleId}`, {
    description: payload.description,
    level: payload.level,
    name: payload.name,
  })
}

export function deleteAdminRole(roleId, payload = {}) {
  return apiDelete(`/admin/roles/${roleId}`, {
    data: {
      reason: payload.reason,
    },
  })
}

export function listAdminPermissions(params = {}) {
  return apiGet('/admin/permissions', {
    params: normalizeParams(params),
  })
}

export function replaceAdminRolePermissions(roleId, payload = {}) {
  return apiPut(`/admin/roles/${roleId}/permissions`, {
    permission_codes: Array.isArray(payload.permissionCodes)
      ? payload.permissionCodes
      : [],
  })
}
