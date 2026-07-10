export const ADMIN_BOOKING_PAGE_SIZE = 3

export const ADMIN_BOOKING_STATUSES = Object.freeze({
  all: 'all',
  cancelRequested: 'cancel_requested',
  cancelled: 'cancelled',
  completed: 'completed',
  confirmed: 'confirmed',
  expired: 'expired',
  failed: 'failed',
  inProgress: 'in_progress',
  paid: 'paid',
  partiallyRefunded: 'partially_refunded',
  paymentProcessing: 'payment_processing',
  pendingPayment: 'pending_payment',
  refundPending: 'refund_pending',
  refunded: 'refunded',
})

export const ADMIN_BOOKING_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_BOOKING_STATUSES.all, label: 'Tất cả' },
  { value: ADMIN_BOOKING_STATUSES.paid, label: 'Chờ xác nhận' },
  { value: ADMIN_BOOKING_STATUSES.pendingPayment, label: 'Chờ thanh toán' },
  { value: ADMIN_BOOKING_STATUSES.confirmed, label: 'Đã xác nhận' },
  { value: ADMIN_BOOKING_STATUSES.inProgress, label: 'Đang thực hiện' },
  { value: ADMIN_BOOKING_STATUSES.completed, label: 'Đã hoàn thành' },
  { value: ADMIN_BOOKING_STATUSES.cancelRequested, label: 'Yêu cầu huỷ' },
  { value: ADMIN_BOOKING_STATUSES.cancelled, label: 'Đã huỷ' },
  { value: ADMIN_BOOKING_STATUSES.refundPending, label: 'Chờ hoàn tiền' },
  { value: ADMIN_BOOKING_STATUSES.partiallyRefunded, label: 'Hoàn một phần' },
  { value: ADMIN_BOOKING_STATUSES.refunded, label: 'Đã hoàn tiền' },
  { value: ADMIN_BOOKING_STATUSES.failed, label: 'Thất bại' },
  { value: ADMIN_BOOKING_STATUSES.expired, label: 'Hết hạn' },
])

export const ADMIN_BOOKING_STATUS_META = Object.freeze({
  [ADMIN_BOOKING_STATUSES.pendingPayment]: {
    label: 'Chờ thanh toán',
    tone: 'info',
  },
  [ADMIN_BOOKING_STATUSES.paymentProcessing]: {
    label: 'Đang thanh toán',
    tone: 'info',
  },
  [ADMIN_BOOKING_STATUSES.paid]: {
    label: 'Chờ xác nhận',
    tone: 'warning',
  },
  [ADMIN_BOOKING_STATUSES.confirmed]: {
    label: 'Đã xác nhận',
    tone: 'brand',
  },
  [ADMIN_BOOKING_STATUSES.inProgress]: {
    label: 'Đang thực hiện',
    tone: 'brand',
  },
  [ADMIN_BOOKING_STATUSES.completed]: {
    label: 'Đã hoàn thành',
    tone: 'success',
  },
  [ADMIN_BOOKING_STATUSES.cancelRequested]: {
    label: 'Yêu cầu huỷ',
    tone: 'warning',
  },
  [ADMIN_BOOKING_STATUSES.cancelled]: {
    label: 'Đã huỷ',
    tone: 'danger',
  },
  [ADMIN_BOOKING_STATUSES.refundPending]: {
    label: 'Chờ hoàn tiền',
    tone: 'warning',
  },
  [ADMIN_BOOKING_STATUSES.partiallyRefunded]: {
    label: 'Hoàn một phần',
    tone: 'warning',
  },
  [ADMIN_BOOKING_STATUSES.refunded]: {
    label: 'Đã hoàn tiền',
    tone: 'success',
  },
  [ADMIN_BOOKING_STATUSES.failed]: {
    label: 'Thất bại',
    tone: 'danger',
  },
  [ADMIN_BOOKING_STATUSES.expired]: {
    label: 'Hết hạn',
    tone: 'neutral',
  },
})
