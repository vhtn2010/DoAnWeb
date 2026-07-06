export const ADMIN_PROMOTION_PAGE_SIZE = 8
export const ADMIN_PROMOTION_SUMMARY_LIMIT = 100

export const ADMIN_PROMOTION_STATUSES = Object.freeze({
  active: 'active',
  all: 'all',
  cancelled: 'cancelled',
  draft: 'draft',
  expired: 'expired',
  paused: 'paused',
})

export const ADMIN_PROMOTION_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_PROMOTION_STATUSES.all, label: 'Lọc' },
  { value: ADMIN_PROMOTION_STATUSES.active, label: 'Đang hoạt động' },
  { value: ADMIN_PROMOTION_STATUSES.draft, label: 'Bản nháp' },
  { value: ADMIN_PROMOTION_STATUSES.paused, label: 'Tạm dừng' },
  { value: ADMIN_PROMOTION_STATUSES.expired, label: 'Đã kết thúc' },
  { value: ADMIN_PROMOTION_STATUSES.cancelled, label: 'Đã hủy' },
])

export const ADMIN_PROMOTION_FORM_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_PROMOTION_STATUSES.draft, label: 'Bản nháp' },
  { value: ADMIN_PROMOTION_STATUSES.active, label: 'Đang hoạt động' },
  { value: ADMIN_PROMOTION_STATUSES.paused, label: 'Tạm dừng' },
])

export const ADMIN_PROMOTION_SORT_OPTIONS = Object.freeze([
  { value: 'default', label: 'Sắp xếp' },
  { value: 'newest', label: 'Mới nhất' },
  { value: 'ending', label: 'Sắp kết thúc' },
])

export const ADMIN_PROMOTION_TARGET_SERVICE_OPTIONS = Object.freeze([
  { value: '', label: 'Tất cả dịch vụ' },
  { value: 'tour', label: 'Tour du lịch' },
  { value: 'hotel', label: 'Khách sạn' },
  { value: 'room', label: 'Phòng' },
  { value: 'flight', label: 'Vé máy bay' },
  { value: 'train', label: 'Vé tàu' },
  { value: 'combo', label: 'Combo' },
])

export const ADMIN_PROMOTION_STATUS_META = Object.freeze({
  [ADMIN_PROMOTION_STATUSES.active]: {
    className: 'active',
    label: 'Đang hoạt động',
    tone: 'success',
  },
  [ADMIN_PROMOTION_STATUSES.cancelled]: {
    className: 'cancelled',
    label: 'Đã hủy',
    tone: 'neutral',
  },
  [ADMIN_PROMOTION_STATUSES.draft]: {
    className: 'draft',
    label: 'Bản nháp',
    tone: 'info',
  },
  [ADMIN_PROMOTION_STATUSES.expired]: {
    className: 'expired',
    label: 'Đã kết thúc',
    tone: 'neutral',
  },
  [ADMIN_PROMOTION_STATUSES.paused]: {
    className: 'paused',
    label: 'Tạm dừng',
    tone: 'warning',
  },
})

export const ADMIN_PROMOTION_INITIAL_FEEDBACK = Object.freeze({
  message: '',
  tone: 'info',
})
