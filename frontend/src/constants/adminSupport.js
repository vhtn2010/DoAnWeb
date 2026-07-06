export const ADMIN_SUPPORT_PAGE_SIZE = 10

export const ADMIN_SUPPORT_STATUSES = Object.freeze({
  all: 'all',
  assigned: 'assigned',
  closed: 'closed',
  open: 'open',
  resolved: 'resolved',
  spam: 'spam',
  waitingCustomer: 'waiting_customer',
  waitingStaff: 'waiting_staff',
})

export const ADMIN_SUPPORT_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_SUPPORT_STATUSES.all, label: 'Tất cả' },
  { value: ADMIN_SUPPORT_STATUSES.open, label: 'Mới' },
  { value: ADMIN_SUPPORT_STATUSES.assigned, label: 'Đã nhận' },
  { value: ADMIN_SUPPORT_STATUSES.waitingStaff, label: 'Chờ xử lý' },
  { value: ADMIN_SUPPORT_STATUSES.waitingCustomer, label: 'Chờ khách' },
  { value: ADMIN_SUPPORT_STATUSES.resolved, label: 'Đã xử lý' },
  { value: ADMIN_SUPPORT_STATUSES.closed, label: 'Đã đóng' },
])

export const ADMIN_SUPPORT_STATUS_META = Object.freeze({
  [ADMIN_SUPPORT_STATUSES.assigned]: {
    label: 'Đã nhận',
    tone: 'info',
  },
  [ADMIN_SUPPORT_STATUSES.closed]: {
    label: 'Đã đóng',
    tone: 'neutral',
  },
  [ADMIN_SUPPORT_STATUSES.open]: {
    label: 'Đang chờ',
    tone: 'warning',
  },
  [ADMIN_SUPPORT_STATUSES.resolved]: {
    label: 'Đã xử lý',
    tone: 'success',
  },
  [ADMIN_SUPPORT_STATUSES.spam]: {
    label: 'Spam',
    tone: 'danger',
  },
  [ADMIN_SUPPORT_STATUSES.waitingCustomer]: {
    label: 'Chờ khách',
    tone: 'success',
  },
  [ADMIN_SUPPORT_STATUSES.waitingStaff]: {
    label: 'Chờ nhân viên',
    tone: 'warning',
  },
})

export const ADMIN_SUPPORT_PRIORITIES = Object.freeze({
  high: 'high',
  low: 'low',
  normal: 'normal',
  urgent: 'urgent',
})

export const ADMIN_SUPPORT_PRIORITY_META = Object.freeze({
  [ADMIN_SUPPORT_PRIORITIES.high]: {
    label: 'Ưu tiên cao',
    tone: 'danger',
  },
  [ADMIN_SUPPORT_PRIORITIES.low]: {
    label: 'Thấp',
    tone: 'neutral',
  },
  [ADMIN_SUPPORT_PRIORITIES.normal]: {
    label: 'Bình thường',
    tone: 'warning',
  },
  [ADMIN_SUPPORT_PRIORITIES.urgent]: {
    label: 'Khẩn cấp',
    tone: 'danger',
  },
})

export const ADMIN_SUPPORT_CLOSE_REASON = 'Đã xử lý xong yêu cầu hỗ trợ từ khách hàng.'
export const ADMIN_SUPPORT_REOPEN_REASON = 'Mở lại ticket để tiếp tục xử lý yêu cầu hỗ trợ.'
export const ADMIN_SUPPORT_SPAM_REASON = 'Ticket không hợp lệ hoặc có dấu hiệu spam.'
