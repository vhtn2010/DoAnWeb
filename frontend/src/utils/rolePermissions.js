import { ROLES, ROLE_VALUES } from '../constants/roles.js'

export const ADMIN_ROLE_VALUES = Object.freeze([
  ROLES.staff,
  ROLES.admin,
  ROLES.systemAdmin,
])

export const ADMIN_ROLE_GROUPS = Object.freeze({
  all: ADMIN_ROLE_VALUES,
  elevated: Object.freeze([ROLES.admin, ROLES.systemAdmin]),
  system: Object.freeze([ROLES.systemAdmin]),
})

export const ADMIN_PERMISSIONS = Object.freeze({
  dashboardRead: 'admin.dashboard.read',
  revenueRead: 'admin.revenue.read',
  bookingsRead: 'admin.bookings.read',
  bookingsWrite: 'admin.bookings.write',
  inventoryManage: 'admin.inventory.manage',
  servicesRead: 'admin.services.read',
  servicesCreate: 'admin.services.create',
  servicesUpdate: 'admin.services.update',
  servicesSubmitReview: 'admin.services.submit_review',
  servicesApprove: 'admin.services.approve',
  servicesReject: 'admin.services.reject',
  servicesHide: 'admin.services.hide',
  servicesRestore: 'admin.services.restore',
  servicesDelete: 'admin.services.delete',
  paymentsRead: 'admin.payments.read',
  refundsRead: 'admin.refunds.read',
  refundsReview: 'admin.refunds.review',
  promotionsRead: 'admin.promotions.read',
  promotionsWrite: 'admin.promotions.write',
  vouchersRead: 'admin.vouchers.read',
  vouchersWrite: 'admin.vouchers.write',
  supportRead: 'admin.support.read',
  supportReply: 'admin.support.reply',
  usersRead: 'admin.users.read',
  usersManage: 'admin.users.manage',
  rolesRead: 'admin.roles.read',
  permissionsRead: 'admin.permissions.read',
  reportsRead: 'admin.reports.read',
  notificationsRead: 'admin.notifications.read',
  notificationsSend: 'admin.notifications.send',
  emailLogsRead: 'admin.email_logs.read',
  uploadsRead: 'admin.uploads.read',
  auditLogsRead: 'admin.audit_logs.read',
  accessControlManage: 'admin.access_control.manage',
  infrastructureRead: 'admin.infrastructure.read',
  settingsRead: 'admin.settings.read',
  settingsWrite: 'admin.settings.write',
})

const STAFF_PERMISSIONS = Object.freeze([
  ADMIN_PERMISSIONS.bookingsRead,
  ADMIN_PERMISSIONS.bookingsWrite,
  ADMIN_PERMISSIONS.inventoryManage,
  ADMIN_PERMISSIONS.servicesRead,
  ADMIN_PERMISSIONS.servicesCreate,
  ADMIN_PERMISSIONS.servicesUpdate,
  ADMIN_PERMISSIONS.servicesSubmitReview,
  ADMIN_PERMISSIONS.paymentsRead,
  ADMIN_PERMISSIONS.refundsRead,
  ADMIN_PERMISSIONS.promotionsRead,
  ADMIN_PERMISSIONS.promotionsWrite,
  ADMIN_PERMISSIONS.vouchersRead,
  ADMIN_PERMISSIONS.vouchersWrite,
  ADMIN_PERMISSIONS.supportRead,
  ADMIN_PERMISSIONS.supportReply,
  ADMIN_PERMISSIONS.emailLogsRead,
])

const ADMIN_PERMISSIONS_LIST = Object.freeze([
  ...STAFF_PERMISSIONS,
  ADMIN_PERMISSIONS.dashboardRead,
  ADMIN_PERMISSIONS.revenueRead,
  ADMIN_PERMISSIONS.servicesApprove,
  ADMIN_PERMISSIONS.servicesReject,
  ADMIN_PERMISSIONS.servicesHide,
  ADMIN_PERMISSIONS.servicesRestore,
  ADMIN_PERMISSIONS.servicesDelete,
  ADMIN_PERMISSIONS.refundsReview,
  ADMIN_PERMISSIONS.usersRead,
  ADMIN_PERMISSIONS.usersManage,
  ADMIN_PERMISSIONS.rolesRead,
  ADMIN_PERMISSIONS.permissionsRead,
  ADMIN_PERMISSIONS.reportsRead,
  ADMIN_PERMISSIONS.notificationsRead,
  ADMIN_PERMISSIONS.notificationsSend,
  ADMIN_PERMISSIONS.uploadsRead,
  ADMIN_PERMISSIONS.auditLogsRead,
  ADMIN_PERMISSIONS.settingsRead,
  ADMIN_PERMISSIONS.settingsWrite,
])

const SYSTEM_ADMIN_PERMISSIONS = Object.freeze([
  ...ADMIN_PERMISSIONS_LIST,
  ADMIN_PERMISSIONS.accessControlManage,
  ADMIN_PERMISSIONS.infrastructureRead,
])

export const ROLE_PERMISSION_MAP = Object.freeze({
  [ROLES.staff]: STAFF_PERMISSIONS,
  [ROLES.admin]: ADMIN_PERMISSIONS_LIST,
  [ROLES.systemAdmin]: SYSTEM_ADMIN_PERMISSIONS,
})

function normalizeRoleValue(value) {
  return typeof value === 'string' ? value.trim() : value
}

function normalizePermissionList(permissions = []) {
  if (Array.isArray(permissions)) {
    return permissions.filter(Boolean)
  }

  return permissions ? [permissions] : []
}

export function normalizeRole(value, fallback = ROLES.guest) {
  const role = normalizeRoleValue(value)
  return ROLE_VALUES.includes(role) ? role : fallback
}

export function normalizeAdminRole(value, fallback = ROLES.systemAdmin) {
  const role = normalizeRoleValue(value)
  return ADMIN_ROLE_VALUES.includes(role) ? role : fallback
}

export function isAdminRole(value) {
  return ADMIN_ROLE_VALUES.includes(normalizeRoleValue(value))
}

export function hasRole(currentRole, allowedRoles = []) {
  return normalizePermissionList(allowedRoles).includes(normalizeRoleValue(currentRole))
}

export function getPermissionsForRole(currentRole) {
  const role = normalizeRole(currentRole, null)
  return ROLE_PERMISSION_MAP[role] ?? []
}

export function hasPermission(currentRole, permission) {
  if (!permission) {
    return false
  }

  return getPermissionsForRole(currentRole).includes(permission)
}

export function hasAnyPermission(currentRole, permissions = []) {
  const permissionList = normalizePermissionList(permissions)
  return permissionList.some((permission) => hasPermission(currentRole, permission))
}

export function hasAllPermissions(currentRole, permissions = []) {
  const permissionList = normalizePermissionList(permissions)
  return (
    permissionList.length > 0 &&
    permissionList.every((permission) => hasPermission(currentRole, permission))
  )
}

export function canAccessResource(currentRole, resource = {}) {
  if (resource.allowedRoles && !hasRole(currentRole, resource.allowedRoles)) {
    return false
  }

  if (resource.permission) {
    return hasPermission(currentRole, resource.permission)
  }

  if (resource.anyPermissions) {
    return hasAnyPermission(currentRole, resource.anyPermissions)
  }

  if (resource.permissions) {
    return hasAllPermissions(currentRole, resource.permissions)
  }

  if (resource.allowedRoles) {
    return true
  }

  return false
}
