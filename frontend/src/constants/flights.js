export const DEFAULT_FLIGHT_PAGE_SIZE = 4
export const DEFAULT_FLIGHT_SORT = 'recommended'
export const DEFAULT_FLIGHT_TRIP_TYPE = 'one_way'
export const DEFAULT_FLIGHT_CABIN_CLASS = 'economy'

export const FLIGHT_TRIP_TYPE_OPTIONS = Object.freeze([
  { value: 'one_way', label: 'Một chiều' },
  { value: 'round_trip', label: 'Khứ hồi' },
])

export const FLIGHT_CABIN_CLASS_OPTIONS = Object.freeze([
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
  from_location: 'SGN',
  to_location: 'HAN',
  departure_date: '2026-10-15',
  return_date: '2026-10-18',
  cabin_class: DEFAULT_FLIGHT_CABIN_CLASS,
})

export const FLIGHT_SORT_OPTIONS = Object.freeze([
  { value: 'recommended', label: 'Đề xuất' },
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
  { value: 'departure_time_asc', label: 'Giờ khởi hành sớm' },
  { value: 'duration_asc', label: 'Thời lượng ngắn nhất' },
])

export const FLIGHT_PRICE_FILTER_OPTIONS = Object.freeze([
  { value: 'under-2m', label: 'Dưới 2 triệu' },
  { value: '2-4m', label: '2 - 4 triệu' },
  { value: 'over-4m', label: 'Trên 4 triệu' },
])

export const FLIGHT_DEPARTURE_TIME_FILTER_OPTIONS = Object.freeze([
  { value: 'early_morning', label: '00:00 - 05:59' },
  { value: 'morning', label: '06:00 - 11:59' },
  { value: 'afternoon', label: '12:00 - 17:59' },
  { value: 'evening', label: '18:00 - 23:59' },
])
