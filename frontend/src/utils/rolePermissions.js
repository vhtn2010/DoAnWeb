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
  paymentsProcess: 'admin.payments.process',
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
  reportsExport: 'admin.reports.export',
  notificationsRead: 'admin.notifications.read',
  notificationsSend: 'admin.notifications.send',
  emailLogsRead: 'admin.email_logs.read',
  emailLogsResend: 'admin.email_logs.resend',
  uploadsRead: 'admin.uploads.read',
  auditLogsRead: 'admin.audit_logs.read',
  accessControlManage: 'admin.access_control.manage',
  infrastructureRead: 'admin.infrastructure.read',
  settingsRead: 'admin.settings.read',
  settingsWrite: 'admin.settings.write',
})

const BACKEND_PERMISSION_ALIASES = Object.freeze({
  [ADMIN_PERMISSIONS.accessControlManage]: ['role_permission.update'],
  [ADMIN_PERMISSIONS.auditLogsRead]: ['audit.read'],
  [ADMIN_PERMISSIONS.bookingsRead]: ['booking.read_all'],
  [ADMIN_PERMISSIONS.bookingsWrite]: [
    'booking.cancel',
    'booking.update_status',
  ],
  [ADMIN_PERMISSIONS.dashboardRead]: ['dashboard.read'],
  [ADMIN_PERMISSIONS.emailLogsRead]: ['email_log.read'],
  [ADMIN_PERMISSIONS.emailLogsResend]: ['email.resend'],
  [ADMIN_PERMISSIONS.infrastructureRead]: ['dashboard.read'],
  [ADMIN_PERMISSIONS.inventoryManage]: ['service.inventory_update'],
  [ADMIN_PERMISSIONS.notificationsRead]: ['notification.manage'],
  [ADMIN_PERMISSIONS.notificationsSend]: ['notification.broadcast'],
  [ADMIN_PERMISSIONS.paymentsRead]: ['payment.read_all'],
  [ADMIN_PERMISSIONS.paymentsProcess]: ['payment.confirm'],
  [ADMIN_PERMISSIONS.permissionsRead]: ['permission.read'],
  [ADMIN_PERMISSIONS.promotionsRead]: ['promotion.read'],
  [ADMIN_PERMISSIONS.promotionsWrite]: [
    'promotion.change_status',
    'promotion.create',
    'promotion.delete',
    'promotion.update',
  ],
  [ADMIN_PERMISSIONS.refundsRead]: ['refund.read_all'],
  [ADMIN_PERMISSIONS.refundsReview]: [
    'refund.approve',
    'refund.process',
    'refund.reject',
  ],
  [ADMIN_PERMISSIONS.reportsRead]: ['report.read'],
  [ADMIN_PERMISSIONS.reportsExport]: ['report.export'],
  [ADMIN_PERMISSIONS.revenueRead]: ['report.read'],
  [ADMIN_PERMISSIONS.rolesRead]: ['role.read'],
  [ADMIN_PERMISSIONS.servicesApprove]: ['service.approve'],
  [ADMIN_PERMISSIONS.servicesCreate]: ['service.create'],
  [ADMIN_PERMISSIONS.servicesDelete]: ['service.delete'],
  [ADMIN_PERMISSIONS.servicesHide]: ['service.hide'],
  [ADMIN_PERMISSIONS.servicesRead]: ['service.read_all'],
  [ADMIN_PERMISSIONS.servicesReject]: ['service.approve'],
  [ADMIN_PERMISSIONS.servicesRestore]: ['service.hide'],
  [ADMIN_PERMISSIONS.servicesSubmitReview]: ['service.update'],
  [ADMIN_PERMISSIONS.servicesUpdate]: ['service.update'],
  [ADMIN_PERMISSIONS.settingsRead]: ['settings.read'],
  [ADMIN_PERMISSIONS.settingsWrite]: ['settings.update'],
  [ADMIN_PERMISSIONS.supportRead]: ['support.read_all'],
  [ADMIN_PERMISSIONS.supportReply]: ['support.reply'],
  [ADMIN_PERMISSIONS.uploadsRead]: ['dashboard.read'],
  [ADMIN_PERMISSIONS.usersManage]: [
    'user.change_role',
    'user.change_status',
    'user.create',
    'user.delete',
    'user.update',
  ],
  [ADMIN_PERMISSIONS.usersRead]: ['user.read_all'],
  [ADMIN_PERMISSIONS.vouchersRead]: ['voucher.read_all'],
  [ADMIN_PERMISSIONS.vouchersWrite]: [
    'voucher.create',
    'voucher.delete',
    'voucher.update',
  ],
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
  ADMIN_PERMISSIONS.paymentsProcess,
  ADMIN_PERMISSIONS.refundsRead,
  ADMIN_PERMISSIONS.promotionsRead,
  ADMIN_PERMISSIONS.promotionsWrite,
  ADMIN_PERMISSIONS.vouchersRead,
  ADMIN_PERMISSIONS.vouchersWrite,
  ADMIN_PERMISSIONS.supportRead,
  ADMIN_PERMISSIONS.supportReply,
  ADMIN_PERMISSIONS.emailLogsRead,
  ADMIN_PERMISSIONS.emailLogsResend,
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
  ADMIN_PERMISSIONS.reportsExport,
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

function getEquivalentPermissionCodes(permission) {
  return [
    permission,
    ...(BACKEND_PERMISSION_ALIASES[permission] ?? []),
  ]
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

export function hasPermission(currentRole, permission, sessionPermissions) {
  if (!permission) {
    return false
  }

  if (sessionPermissions !== undefined) {
    const permissionSet = new Set(normalizePermissionList(sessionPermissions))

    return getEquivalentPermissionCodes(permission).some((code) =>
      permissionSet.has(code),
    )
  }

  return getPermissionsForRole(currentRole).includes(permission)
}

export function hasAnyPermission(currentRole, permissions = [], sessionPermissions) {
  const permissionList = normalizePermissionList(permissions)
  return permissionList.some((permission) =>
    hasPermission(currentRole, permission, sessionPermissions),
  )
}

export function hasAllPermissions(currentRole, permissions = [], sessionPermissions) {
  const permissionList = normalizePermissionList(permissions)
  return (
    permissionList.length > 0 &&
    permissionList.every((permission) =>
      hasPermission(currentRole, permission, sessionPermissions),
    )
  )
}

export function canAccessResource(currentRole, resource = {}, sessionPermissions) {
  if (resource.allowedRoles && !hasRole(currentRole, resource.allowedRoles)) {
    return false
  }

  if (resource.permission) {
    return hasPermission(currentRole, resource.permission, sessionPermissions)
  }

  if (resource.anyPermissions) {
    return hasAnyPermission(currentRole, resource.anyPermissions, sessionPermissions)
  }

  if (resource.permissions) {
    return hasAllPermissions(currentRole, resource.permissions, sessionPermissions)
  }

  if (resource.allowedRoles) {
    return true
  }

  return false
}
