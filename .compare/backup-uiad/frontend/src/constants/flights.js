export const DEFAULT_FLIGHT_PAGE_SIZE = 3
export const DEFAULT_FLIGHT_SORT = 'price_asc'
export const DEFAULT_FLIGHT_TRIP_TYPE = 'one_way'
export const DEFAULT_FLIGHT_CABIN_CLASS = ''

export const FLIGHT_TRIP_TYPE_OPTIONS = Object.freeze([
  { value: 'one_way', label: 'Một chiều' },
  { value: 'round_trip', label: 'Khứ hồi' },
])

export const FLIGHT_CABIN_CLASS_OPTIONS = Object.freeze([
  { value: '', label: 'Tất cả hạng vé' },
  { value: 'economy', label: 'Phổ thông' },
  { value: 'premium_economy', label: 'Phổ thông đặc biệt' },
  { value: 'business', label: 'Thương gia' },
  { value: 'first', label: 'Hạng nhất' },
])

export const DEFAULT_FLIGHT_PASSENGERS = Object.freeze({
  adults: 1,
  children: 0,
  infants: 0,
})

export const DEFAULT_FLIGHT_SEARCH_STATE = Object.freeze({
  trip_type: DEFAULT_FLIGHT_TRIP_TYPE,
  from_location: '',
  to_location: '',
  departure_date: '',
  return_date: '',
  cabin_class: DEFAULT_FLIGHT_CABIN_CLASS,
})

export const FLIGHT_SORT_OPTIONS = Object.freeze([
  { value: 'recommended', label: 'Phù hợp nhất' },
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
  { value: 'departure_time_asc', label: 'Giờ khởi hành sớm' },
  { value: 'duration_asc', label: 'Thời lượng ngắn nhất' },
])

export const FLIGHT_PRICE_FILTER_OPTIONS = Object.freeze([
  { value: 'under-2m', label: 'Dưới 2 triệu' },
  { value: '2-5m', label: '2 - 5 triệu' },
  { value: 'over-5m', label: 'Trên 5 triệu' },
])

export const FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS = Object.freeze([
  { value: 'early_morning', label: 'Sáng sớm (00:00-06:00)' },
  { value: 'morning', label: 'Buổi sáng (06:00-12:00)' },
  { value: 'afternoon', label: 'Buổi chiều (12:00-18:00)' },
  { value: 'evening', label: 'Buổi tối (18:00-24:00)' },
])

export const FLIGHT_STOP_FILTER_OPTIONS = Object.freeze([
  { value: 'direct', label: 'Bay thẳng' },
  { value: 'one_stop', label: '1 điểm dừng' },
])
