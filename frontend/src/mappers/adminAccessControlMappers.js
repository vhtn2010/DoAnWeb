export const ACCESS_CONTROL_ALL_VALUE = 'all'
export const ACCESS_CONTROL_PROTECTED_ROLE_CODES = Object.freeze(['system_admin'])

const ROLE_LABELS = Object.freeze({
  admin: 'Admin',
  customer: 'Khách hàng',
  staff: 'Staff',
  system_admin: 'System Admin',
})

const MODULE_LABELS = Object.freeze({
  audit: 'Nhật ký',
  booking: 'Đơn hàng',
  business: 'Cấu hình',
  email: 'Email',
  notification: 'Thông báo',
  payment: 'Thanh toán',
  permission: 'Permission',
  profile: 'Hồ sơ',
  promotion: 'Khuyến mãi',
  refund: 'Hoàn tiền',
  report: 'Báo cáo',
  role: 'Vai trò',
  service: 'Dịch vụ',
  support: 'Hỗ trợ',
  upload: 'Upload',
  user: 'Người dùng',
  voucher: 'Voucher',
})

function normalizeDate(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

export function getAccessControlRoleLabel(roleCode) {
  return ROLE_LABELS[roleCode] ?? roleCode ?? 'Chưa xác định'
}

export function getAccessControlModuleLabel(moduleCode) {
  return MODULE_LABELS[moduleCode] ?? moduleCode ?? 'Khác'
}

export function getAccessControlRoleInitials(role = {}) {
  const source = role.name || role.code || 'RB'
  const words = String(source)
    .split(/[\s._-]+/)
    .filter(Boolean)

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

export function mapAccessControlPermission(permission = {}) {
  return {
    action: permission.action || '',
    code: permission.code || '',
    createdAt: normalizeDate(permission.created_at),
    description: permission.description || '',
    id: permission.id,
    module: permission.module || 'other',
    moduleLabel: getAccessControlModuleLabel(permission.module || 'other'),
    resource: permission.resource || 'other',
  }
}

export function mapAccessControlRole(role = {}) {
  const permissions = Array.isArray(role.permissions)
    ? role.permissions.map(mapAccessControlPermission)
    : []

  return {
    code: role.code || '',
    createdAt: normalizeDate(role.created_at),
    description: role.description || '',
    id: role.id,
    initials: getAccessControlRoleInitials(role),
    isProtected: ACCESS_CONTROL_PROTECTED_ROLE_CODES.includes(role.code),
    isSystemRole: Boolean(role.is_system_role),
    level: Number(role.level) || 0,
    name: role.name || getAccessControlRoleLabel(role.code),
    permissions,
    permissionCodes: permissions.map((permission) => permission.code),
    raw: role,
    updatedAt: normalizeDate(role.updated_at),
  }
}

export function createAccessControlRoleOptions(roles = []) {
  return [
    { value: ACCESS_CONTROL_ALL_VALUE, label: 'Tất cả Vai trò' },
    ...roles.map((role) => ({
      value: role.code,
      label: role.name,
    })),
  ]
}

export function createAccessControlModuleOptions(permissions = []) {
  const modules = Array.from(
    new Set(permissions.map((permission) => permission.module).filter(Boolean)),
  ).sort((firstModule, secondModule) =>
    getAccessControlModuleLabel(firstModule).localeCompare(
      getAccessControlModuleLabel(secondModule),
      'vi',
    ),
  )

  return [
    { value: ACCESS_CONTROL_ALL_VALUE, label: 'Tất cả Module' },
    ...modules.map((moduleCode) => ({
      value: moduleCode,
      label: getAccessControlModuleLabel(moduleCode),
    })),
  ]
}

export function filterAccessControlRoles(roles = [], roleFilter = ACCESS_CONTROL_ALL_VALUE) {
  if (roleFilter === ACCESS_CONTROL_ALL_VALUE) {
    return roles
  }

  return roles.filter((role) => role.code === roleFilter)
}

export function filterAccessControlPermissions(
  permissions = [],
  moduleFilter = ACCESS_CONTROL_ALL_VALUE,
) {
  if (moduleFilter === ACCESS_CONTROL_ALL_VALUE) {
    return permissions
  }

  return permissions.filter((permission) => permission.module === moduleFilter)
}

export function groupAccessControlPermissions(permissions = []) {
  const groupedPermissions = permissions.reduce((groups, permission) => {
    const moduleKey = permission.module || 'other'
    const resourceKey = permission.resource || 'other'

    if (!groups[moduleKey]) {
      groups[moduleKey] = {
        label: permission.moduleLabel,
        module: moduleKey,
        resources: {},
      }
    }

    if (!groups[moduleKey].resources[resourceKey]) {
      groups[moduleKey].resources[resourceKey] = {
        permissions: [],
        resource: resourceKey,
      }
    }

    groups[moduleKey].resources[resourceKey].permissions.push(permission)
    return groups
  }, {})

  return Object.values(groupedPermissions)
    .sort((firstGroup, secondGroup) => firstGroup.label.localeCompare(secondGroup.label, 'vi'))
    .map((group) => ({
      ...group,
      resources: Object.values(group.resources)
        .sort((firstResource, secondResource) =>
          firstResource.resource.localeCompare(secondResource.resource, 'vi'),
        )
        .map((resource) => ({
          ...resource,
          permissions: [...resource.permissions].sort((firstPermission, secondPermission) =>
            firstPermission.code.localeCompare(secondPermission.code, 'vi'),
          ),
        })),
    }))
}

export function countRolePermissionsForModule(role, moduleFilter) {
  if (!role) {
    return 0
  }

  if (moduleFilter === ACCESS_CONTROL_ALL_VALUE) {
    return role.permissionCodes.length
  }

  return role.permissions.filter((permission) => permission.module === moduleFilter).length
}

export function arePermissionSetsEqual(firstCodes = [], secondCodes = []) {
  const firstSet = new Set(firstCodes)
  const secondSet = new Set(secondCodes)

  if (firstSet.size !== secondSet.size) {
    return false
  }

  return Array.from(firstSet).every((code) => secondSet.has(code))
}
