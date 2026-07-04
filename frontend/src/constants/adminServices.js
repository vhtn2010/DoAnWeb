import { ROLES } from './roles.js'
import { SERVICE_STATUSES } from './serviceStatuses.js'
import { SERVICE_TYPES } from './serviceTypes.js'

export const ADMIN_SERVICE_PAGE_SIZE = 4
export const ADMIN_SERVICE_SUMMARY_LIMIT = 200

export const ADMIN_SERVICE_SORT_OPTIONS = Object.freeze([
  { value: 'newest', label: 'Mới nhất' },
  { value: 'oldest', label: 'Cũ nhất' },
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
])

export const ADMIN_SERVICE_TYPE_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả' },
  { value: SERVICE_TYPES.tour, label: SERVICE_TYPES.tour },
  { value: SERVICE_TYPES.hotel, label: SERVICE_TYPES.hotel },
  { value: SERVICE_TYPES.room, label: SERVICE_TYPES.room },
  { value: SERVICE_TYPES.flight, label: SERVICE_TYPES.flight },
  { value: SERVICE_TYPES.train, label: SERVICE_TYPES.train },
  { value: SERVICE_TYPES.combo, label: SERVICE_TYPES.combo },
])

export const ADMIN_SERVICE_FORM_TYPE_OPTIONS = Object.freeze(
  ADMIN_SERVICE_TYPE_OPTIONS.filter((option) => option.value !== 'all'),
)

export const ADMIN_SERVICE_STATUS_OPTIONS = Object.freeze([
  { value: 'all', label: 'Tất cả' },
  { value: SERVICE_STATUSES.draft, label: SERVICE_STATUSES.draft },
  { value: SERVICE_STATUSES.pendingReview, label: SERVICE_STATUSES.pendingReview },
  { value: SERVICE_STATUSES.active, label: SERVICE_STATUSES.active },
  { value: SERVICE_STATUSES.hidden, label: SERVICE_STATUSES.hidden },
  { value: SERVICE_STATUSES.soldOut, label: SERVICE_STATUSES.soldOut },
  { value: SERVICE_STATUSES.expired, label: SERVICE_STATUSES.expired },
  { value: SERVICE_STATUSES.archived, label: SERVICE_STATUSES.archived },
  { value: SERVICE_STATUSES.deleted, label: SERVICE_STATUSES.deleted },
])

export const ADMIN_SERVICE_FORM_STATUS_OPTIONS = Object.freeze(
  ADMIN_SERVICE_STATUS_OPTIONS.filter((option) => option.value !== 'all'),
)

export const ADMIN_TRANSPORT_TYPE_OPTIONS = Object.freeze([
  { value: 'bus', label: 'bus' },
  { value: 'flight', label: 'flight' },
  { value: 'train', label: 'train' },
  { value: 'car', label: 'car' },
  { value: 'ship', label: 'ship' },
  { value: 'mixed', label: 'mixed' },
])

export const ADMIN_CABIN_CLASS_OPTIONS = Object.freeze([
  { value: 'economy', label: 'economy' },
  { value: 'premium_economy', label: 'premium_economy' },
  { value: 'business', label: 'business' },
  { value: 'first', label: 'first' },
])

export const ADMIN_SEAT_CLASS_OPTIONS = Object.freeze([
  { value: 'hard_seat', label: 'hard_seat' },
  { value: 'soft_seat', label: 'soft_seat' },
  { value: 'sleeper', label: 'sleeper' },
  { value: 'vip', label: 'vip' },
])

export const ADMIN_ROLE_DISPLAY_NAMES = Object.freeze({
  [ROLES.staff]: 'Nhân viên điều hành',
  [ROLES.admin]: 'Quản trị viên',
  [ROLES.systemAdmin]: 'System Admin',
})

export const ADMIN_SERVICE_TYPE_DISPLAY_NAMES = Object.freeze({
  [SERVICE_TYPES.tour]: 'Tour',
  [SERVICE_TYPES.hotel]: 'Khách sạn',
  [SERVICE_TYPES.room]: 'Phòng',
  [SERVICE_TYPES.flight]: 'Chuyến bay',
  [SERVICE_TYPES.train]: 'Tàu hỏa',
  [SERVICE_TYPES.combo]: 'Combo',
})

export const ADMIN_SERVICE_STATUS_DISPLAY_NAMES = Object.freeze({
  [SERVICE_STATUSES.draft]: 'Bản nháp',
  [SERVICE_STATUSES.pendingReview]: 'Chờ duyệt',
  [SERVICE_STATUSES.active]: 'Đang bán',
  [SERVICE_STATUSES.hidden]: 'Tạm ẩn',
  [SERVICE_STATUSES.soldOut]: 'Hết chỗ',
  [SERVICE_STATUSES.expired]: 'Hết hạn',
  [SERVICE_STATUSES.archived]: 'Lưu trữ',
  [SERVICE_STATUSES.deleted]: 'Đã xóa',
})

export const ADMIN_SERVICE_STATUS_META = Object.freeze({
  [SERVICE_STATUSES.draft]: { label: 'Bản nháp', tone: 'draft' },
  [SERVICE_STATUSES.pendingReview]: { label: 'Chờ duyệt', tone: 'pending' },
  [SERVICE_STATUSES.active]: { label: 'Đang bán', tone: 'active' },
  [SERVICE_STATUSES.hidden]: { label: 'Tạm ẩn', tone: 'hidden' },
  [SERVICE_STATUSES.soldOut]: { label: 'Hết chỗ', tone: 'sold-out' },
  [SERVICE_STATUSES.expired]: { label: 'Hết hạn', tone: 'expired' },
  [SERVICE_STATUSES.archived]: { label: 'Lưu trữ', tone: 'archived' },
  [SERVICE_STATUSES.deleted]: { label: 'Đã xóa', tone: 'deleted' },
})

export const ADMIN_SERVICE_ACTION_META = Object.freeze({
  view: { label: 'Xem', variant: 'ghost' },
  edit: { label: 'Sửa', variant: 'ghost' },
  submit_review: { label: 'Gửi duyệt', variant: 'primary' },
  approve: { label: 'Duyệt', variant: 'success' },
  reject: { label: 'Từ chối', variant: 'danger' },
  hide: { label: 'Ẩn', variant: 'warning' },
  restore: { label: 'Khôi phục', variant: 'secondary' },
  delete: { label: 'Xóa mềm', variant: 'danger' },
})

export const ADMIN_SERVICE_INITIAL_FEEDBACK = Object.freeze({
  tone: 'info',
  message:
    'Các thao tác trên màn hình này hiện là UI mock, sẵn sàng thay bằng tích hợp Admin Service API.',
})

export const ADMIN_SERVICE_SUMMARY_CARD_CONFIG = Object.freeze([
  {
    key: 'total',
    label: 'Tổng dịch vụ',
    tone: 'primary',
    helper: 'Toàn bộ dữ liệu mock sẵn sàng nối API',
  },
  {
    key: 'active',
    label: 'Đang hiển thị',
    tone: 'success',
    helper: 'Dịch vụ có thể hiển thị ở public /services',
  },
  {
    key: 'pending_review',
    label: 'Chờ duyệt',
    tone: 'warning',
    helper: 'Sẵn sàng cho action duyệt hoặc từ chối',
  },
  {
    key: 'limited',
    label: 'Tạm ẩn / hết chỗ',
    tone: 'neutral',
    helper: 'Theo dõi nhóm cần mở bán lại',
  },
])
