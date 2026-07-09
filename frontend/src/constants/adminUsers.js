export const ADMIN_USER_PAGE_SIZE = 8

export const ADMIN_USER_STATUSES = Object.freeze({
  active: 'active',
  all: 'all',
  deleted: 'deleted',
  disabled: 'disabled',
  locked: 'locked',
  pendingVerification: 'pending_verification',
  suspended: 'suspended',
})

export const ADMIN_USER_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_USER_STATUSES.all, label: 'Tất cả Trạng thái' },
  { value: ADMIN_USER_STATUSES.active, label: 'Hoạt động' },
  { value: ADMIN_USER_STATUSES.pendingVerification, label: 'Chờ xác minh' },
  { value: ADMIN_USER_STATUSES.locked, label: 'Đã khóa' },
  { value: ADMIN_USER_STATUSES.suspended, label: 'Tạm ngưng' },
  { value: ADMIN_USER_STATUSES.disabled, label: 'Vô hiệu hóa' },
  { value: ADMIN_USER_STATUSES.deleted, label: 'Đã xóa' },
])

export const ADMIN_USER_ROLES = Object.freeze({
  admin: 'admin',
  all: 'all',
  customer: 'customer',
  staff: 'staff',
  systemAdmin: 'system_admin',
})

export const ADMIN_USER_ROLE_OPTIONS = Object.freeze([
  { value: ADMIN_USER_ROLES.all, label: 'Tất cả vai trò' },
  { value: ADMIN_USER_ROLES.customer, label: 'Khách hàng' },
  { value: ADMIN_USER_ROLES.staff, label: 'Nhân viên' },
  { value: ADMIN_USER_ROLES.admin, label: 'Admin' },
  { value: ADMIN_USER_ROLES.systemAdmin, label: 'System Admin' },
])

export const ADMIN_USER_SORT_OPTIONS = Object.freeze([
  { value: 'newest', label: 'Mới nhất' },
  { value: 'name', label: 'Tên A-Z' },
])

export const ADMIN_USER_STATUS_META = Object.freeze({
  [ADMIN_USER_STATUSES.active]: {
    className: 'active',
    label: 'Hoạt động',
    tone: 'success',
  },
  [ADMIN_USER_STATUSES.deleted]: {
    className: 'deleted',
    label: 'Đã xóa',
    tone: 'neutral',
  },
  [ADMIN_USER_STATUSES.disabled]: {
    className: 'disabled',
    label: 'Vô hiệu hóa',
    tone: 'neutral',
  },
  [ADMIN_USER_STATUSES.locked]: {
    className: 'locked',
    label: 'Đã khóa',
    tone: 'danger',
  },
  [ADMIN_USER_STATUSES.pendingVerification]: {
    className: 'pending',
    label: 'Chờ xác minh',
    tone: 'warning',
  },
  [ADMIN_USER_STATUSES.suspended]: {
    className: 'suspended',
    label: 'Tạm ngưng',
    tone: 'warning',
  },
})

export const ADMIN_USER_DEFAULT_LOCK_REASON = 'Khóa tài khoản từ màn quản trị người dùng.'
export const ADMIN_USER_DEFAULT_DELETE_REASON = 'Xóa mềm tài khoản từ màn quản trị người dùng.'
