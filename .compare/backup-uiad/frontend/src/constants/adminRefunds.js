export const ADMIN_REFUND_PAGE_SIZE = 8

export const ADMIN_REFUND_STATUSES = Object.freeze({
  all: 'all',
  approved: 'approved',
  cancelled: 'cancelled',
  failed: 'failed',
  processing: 'processing',
  rejected: 'rejected',
  requested: 'requested',
  success: 'success',
})

export const ADMIN_REFUND_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_REFUND_STATUSES.all, label: 'Tất cả' },
  { value: ADMIN_REFUND_STATUSES.success, label: 'Đã hoàn tiền' },
  { value: ADMIN_REFUND_STATUSES.requested, label: 'Chờ xử lý' },
  { value: ADMIN_REFUND_STATUSES.rejected, label: 'Đã từ chối' },
])

export const ADMIN_REFUND_STATUS_META = Object.freeze({
  [ADMIN_REFUND_STATUSES.approved]: { label: 'Đã duyệt', tone: 'info' },
  [ADMIN_REFUND_STATUSES.cancelled]: { label: 'Đã hủy', tone: 'neutral' },
  [ADMIN_REFUND_STATUSES.failed]: { label: 'Thất bại', tone: 'danger' },
  [ADMIN_REFUND_STATUSES.processing]: { label: 'Đang xử lý', tone: 'warning' },
  [ADMIN_REFUND_STATUSES.rejected]: { label: 'Đã từ chối', tone: 'danger' },
  [ADMIN_REFUND_STATUSES.requested]: { label: 'Chờ xử lý', tone: 'warning' },
  [ADMIN_REFUND_STATUSES.success]: { label: 'Đã hoàn tiền', tone: 'success' },
})
