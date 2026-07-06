export const ADMIN_PAYMENT_PAGE_SIZE = 8

export const ADMIN_PAYMENT_STATUSES = Object.freeze({
  all: 'all',
  cancelled: 'cancelled',
  expired: 'expired',
  failed: 'failed',
  initiated: 'initiated',
  partiallyRefunded: 'partially_refunded',
  pending: 'pending',
  processing: 'processing',
  reconciled: 'reconciled',
  refunded: 'refunded',
  success: 'success',
})

export const ADMIN_PAYMENT_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_PAYMENT_STATUSES.all, label: 'Tất cả' },
  { value: ADMIN_PAYMENT_STATUSES.pending, label: 'Chờ thanh toán' },
  { value: ADMIN_PAYMENT_STATUSES.processing, label: 'Đang xử lý' },
  { value: ADMIN_PAYMENT_STATUSES.success, label: 'Thành công' },
  { value: ADMIN_PAYMENT_STATUSES.reconciled, label: 'Đã đối soát' },
  { value: ADMIN_PAYMENT_STATUSES.refunded, label: 'Đã hoàn' },
  { value: ADMIN_PAYMENT_STATUSES.failed, label: 'Thất bại' },
  { value: ADMIN_PAYMENT_STATUSES.expired, label: 'Hết hạn' },
])

export const ADMIN_PAYMENT_STATUS_META = Object.freeze({
  [ADMIN_PAYMENT_STATUSES.cancelled]: { label: 'Đã hủy', tone: 'neutral' },
  [ADMIN_PAYMENT_STATUSES.expired]: { label: 'Hết hạn', tone: 'neutral' },
  [ADMIN_PAYMENT_STATUSES.failed]: { label: 'Thất bại', tone: 'danger' },
  [ADMIN_PAYMENT_STATUSES.initiated]: { label: 'Khởi tạo', tone: 'info' },
  [ADMIN_PAYMENT_STATUSES.partiallyRefunded]: {
    label: 'Hoàn một phần',
    tone: 'warning',
  },
  [ADMIN_PAYMENT_STATUSES.pending]: { label: 'Chờ thanh toán', tone: 'warning' },
  [ADMIN_PAYMENT_STATUSES.processing]: { label: 'Đang xử lý', tone: 'info' },
  [ADMIN_PAYMENT_STATUSES.reconciled]: { label: 'Đã đối soát', tone: 'success' },
  [ADMIN_PAYMENT_STATUSES.refunded]: { label: 'Đã hoàn', tone: 'success' },
  [ADMIN_PAYMENT_STATUSES.success]: { label: 'Thành công', tone: 'success' },
})
