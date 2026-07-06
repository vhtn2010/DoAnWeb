import { ROLES } from '../constants/roles.js'
import {
  ADMIN_USER_ROLE_OPTIONS,
  ADMIN_USER_ROLES,
  ADMIN_USER_STATUSES,
  ADMIN_USER_STATUS_META,
} from '../constants/adminUsers.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

function getDisplayValue(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== '') ?? ''
}

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

export function getAdminUserStatusMeta(status) {
  return ADMIN_USER_STATUS_META[status] ?? {
    className: 'disabled',
    label: status || 'Chưa cập nhật',
    tone: 'neutral',
  }
}

export function getAdminUserRoleLabel(roleCode) {
  return (
    ADMIN_USER_ROLE_OPTIONS.find((option) => option.value === roleCode)?.label ||
    roleCode ||
    'Chưa phân quyền'
  )
}

export function getAdminUserInitials(name = '', email = '') {
  const source = name.trim() || email.trim()

  if (!source) {
    return 'NV'
  }

  const words = source
    .split(/[\s.@_-]+/)
    .map((word) => word.trim())
    .filter(Boolean)

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
}

export function mapAdminUser(user = {}) {
  const roleCode = user.role?.code || user.role_code || ''
  const fullName = getDisplayValue(user.full_name, user.email, 'Người dùng chưa có tên')
  const statusMeta = getAdminUserStatusMeta(user.status)

  return {
    avatarUrl: user.avatar_url || '',
    createdAt: user.created_at || '',
    deletedAt: user.deleted_at || '',
    displayId: user.id ? String(user.id).slice(0, 8).toUpperCase() : 'N/A',
    email: user.email || '',
    emailVerifiedAt: user.email_verified_at || '',
    id: user.id,
    initials: getAdminUserInitials(fullName, user.email),
    joinedAt: user.created_at || '',
    lastLoginAt: user.last_login_at || '',
    name: fullName,
    phone: user.phone || 'Chưa cập nhật',
    raw: user,
    roleCode,
    roleLabel: user.role?.name || getAdminUserRoleLabel(roleCode),
    status: user.status || ADMIN_USER_STATUSES.pendingVerification,
    statusClassName: statusMeta.className,
    updatedAt: user.updated_at || '',
  }
}

export function createAdminUserPageNumbers(totalPages = 1) {
  return Array.from({ length: Math.max(Number(totalPages) || 1, 1) }, (_, index) => index + 1)
}

export function sortAdminUsers(users = [], sortOrder = 'newest') {
  const nextUsers = [...users]

  if (sortOrder === 'name') {
    nextUsers.sort((firstUser, secondUser) => firstUser.name.localeCompare(secondUser.name, 'vi'))
    return nextUsers
  }

  nextUsers.sort(
    (firstUser, secondUser) =>
      new Date(secondUser.joinedAt || secondUser.updatedAt) -
      new Date(firstUser.joinedAt || firstUser.updatedAt),
  )
  return nextUsers
}

export function matchesAdminUserSearch(user, query) {
  const normalizedQuery = normalizeText(query.trim())

  if (!normalizedQuery) {
    return true
  }

  return normalizeText(
    [
      user.displayId,
      user.email,
      user.name,
      user.phone,
      user.roleLabel,
    ].join(' '),
  ).includes(normalizedQuery)
}

export function getAdminUserRoleFilterOptions() {
  return ADMIN_USER_ROLE_OPTIONS
}

export function getAdminUserCreateRoleOptions(currentRole) {
  if (currentRole === ROLES.systemAdmin) {
    return [
      { value: ADMIN_USER_ROLES.staff, label: 'Nhân viên' },
      { value: ADMIN_USER_ROLES.admin, label: 'Admin' },
    ]
  }

  return [
    { value: ADMIN_USER_ROLES.staff, label: 'Nhân viên' },
  ]
}

export function getAdminUserEditRoleOptions(currentRole, currentRoleCode) {
  const editableOptions = [
    { value: ADMIN_USER_ROLES.staff, label: 'Nhân viên' },
    { value: ADMIN_USER_ROLES.admin, label: 'Admin' },
  ]

  if (currentRole === ROLES.systemAdmin) {
    if (editableOptions.some((option) => option.value === currentRoleCode)) {
      return editableOptions
    }

    return [
      {
        disabled: true,
        label: getAdminUserRoleLabel(currentRoleCode),
        value: currentRoleCode || ADMIN_USER_ROLES.customer,
      },
      ...editableOptions,
    ]
  }

  return [
    {
      value: currentRoleCode || ADMIN_USER_ROLES.customer,
      label: getAdminUserRoleLabel(currentRoleCode),
    },
  ]
}

export function createInitialAdminUserFormValues({
  currentRole = ROLES.admin,
  mode = 'create',
  user = null,
} = {}) {
  if (mode === 'edit' && user) {
    return {
      email: user.email || '',
      fullName: user.name || '',
      password: '',
      phone: user.raw?.phone || '',
      roleCode: user.roleCode || ADMIN_USER_ROLES.customer,
    }
  }

  return {
    email: '',
    fullName: '',
    password: '',
    phone: '',
    roleCode: getAdminUserCreateRoleOptions(currentRole)[0]?.value || ADMIN_USER_ROLES.staff,
  }
}

export function validateAdminUserForm(values, { mode = 'create' } = {}) {
  const errors = {}

  if (mode === 'create') {
    if (!values.email.trim()) {
      errors.email = 'Nhập email người dùng.'
    } else if (!EMAIL_PATTERN.test(values.email.trim())) {
      errors.email = 'Email không hợp lệ.'
    }

    if (!values.password) {
      errors.password = 'Nhập mật khẩu tạm thời.'
    } else if (values.password.length < MIN_PASSWORD_LENGTH) {
      errors.password = `Mật khẩu phải có ít nhất ${MIN_PASSWORD_LENGTH} ký tự.`
    }

    if (!values.roleCode) {
      errors.roleCode = 'Chọn vai trò.'
    }
  }

  if (!values.fullName.trim()) {
    errors.fullName = 'Nhập họ tên người dùng.'
  }

  if (values.phone.trim().length > 20) {
    errors.phone = 'Số điện thoại tối đa 20 ký tự.'
  }

  return errors
}

export function buildAdminUserCreatePayload(values) {
  return {
    email: values.email.trim().toLowerCase(),
    fullName: values.fullName.trim(),
    password: values.password,
    phone: values.phone.trim() || null,
    roleCode: values.roleCode,
  }
}

export function buildAdminUserUpdatePayload(values) {
  return {
    fullName: values.fullName.trim(),
    phone: values.phone.trim() || null,
  }
}

export function getAdminUserStatusAction(user) {
  if (!user) {
    return null
  }

  if (user.status === ADMIN_USER_STATUSES.active) {
    return {
      label: 'Khóa',
      nextStatus: ADMIN_USER_STATUSES.locked,
    }
  }

  if (
    user.status === ADMIN_USER_STATUSES.locked ||
    user.status === ADMIN_USER_STATUSES.suspended ||
    user.status === ADMIN_USER_STATUSES.disabled
  ) {
    return {
      label: 'Mở khóa',
      nextStatus: ADMIN_USER_STATUSES.active,
    }
  }

  return null
}

export function canResendAdminUserVerification(user) {
  return (
    user?.status === ADMIN_USER_STATUSES.pendingVerification &&
    !user.emailVerifiedAt
  )
}
