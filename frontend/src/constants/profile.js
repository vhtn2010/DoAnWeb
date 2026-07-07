export const PROFILE_ACTIONS = Object.freeze({
  favorite_destination: 'favorite_destination',
  upcoming_trip_primary: 'upcoming_trip_primary',
  upcoming_trip_secondary: 'upcoming_trip_secondary',
  booking_history: 'booking_history',
  quick_link: 'quick_link',
})

export const PROFILE_HISTORY_FILTERS = Object.freeze({
  all: 'all',
  pending_confirmation: 'pending_confirmation',
  upcoming: 'upcoming',
  booking_history: 'booking_history',
  cancelled: 'cancelled',
})

export const PROFILE_HISTORY_FILTER_LABELS = Object.freeze({
  [PROFILE_HISTORY_FILTERS.all]: 'Tất cả',
  [PROFILE_HISTORY_FILTERS.pending_confirmation]: 'Chờ xác nhận',
  [PROFILE_HISTORY_FILTERS.upcoming]: 'Chuyến đi sắp tới',
  [PROFILE_HISTORY_FILTERS.booking_history]: 'Lịch sử đặt chỗ',
  [PROFILE_HISTORY_FILTERS.cancelled]: 'Đã hủy',
})

export const PROFILE_HISTORY_ICON_TYPES = Object.freeze({
  hotel: 'hotel',
  flight: 'flight',
  train: 'train',
  tour: 'tour',
})

export const PROFILE_BOOKING_STATUS_LABELS = Object.freeze({
  completed: 'HOÀN THÀNH',
  confirmed: 'ĐÃ XÁC NHẬN',
  paid: 'ĐÃ THANH TOÁN',
  cancelled: 'ĐÃ HỦY',
  refunded: 'ĐÃ HOÀN TIỀN',
  pending_payment: 'CHỜ THANH TOÁN',
  pending_cancellation: 'CHỜ XÁC NHẬN HỦY',
})
