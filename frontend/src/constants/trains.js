export const DEFAULT_TRAIN_PAGE_SIZE = 3
export const DEFAULT_TRAIN_SORT = ''
export const DEFAULT_TRAIN_TRIP_TYPE = 'one_way'

export const DEFAULT_TRAIN_PASSENGERS = Object.freeze({
  adults: 0,
  children: 0,
  infants: 0,
})

export const DEFAULT_TRAIN_SEARCH_STATE = Object.freeze({
  trip_type: DEFAULT_TRAIN_TRIP_TYPE,
  from_station: '',
  to_station: '',
  departure_date: '',
  return_date: '',
})

export const TRAIN_TRIP_TYPE_OPTIONS = Object.freeze([
  { value: 'one_way', label: 'Một chiều' },
  { value: 'round_trip', label: 'Khứ hồi' },
])

export const TRAIN_SORT_OPTIONS = Object.freeze([
  { value: 'recommended', label: 'Phù hợp nhất' },
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
  { value: 'departure_time_asc', label: 'Giờ khởi hành sớm' },
  { value: 'duration_asc', label: 'Thời lượng ngắn nhất' },
])

export const TRAIN_TYPE_FILTER_OPTIONS = Object.freeze([
  { value: 'express', label: 'Tàu tốc hành' },
  { value: 'fast', label: 'Tàu nhanh' },
  { value: 'quality_fast', label: 'Tàu nhanh chất lượng' },
  { value: 'local', label: 'Tàu địa phương' },
])

export const TRAIN_DEPARTURE_TIME_FILTER_OPTIONS = Object.freeze([
  { value: 'early_morning', label: 'Sáng sớm (00:00-06:00)' },
  { value: 'morning', label: 'Buổi sáng (06:00-12:00)' },
  { value: 'afternoon', label: 'Buổi chiều (12:00-18:00)' },
  { value: 'evening', label: 'Buổi tối (18:00-24:00)' },
])

export const TRAIN_PRICE_FILTER_OPTIONS = Object.freeze([
  { value: 'under-2m', label: 'Dưới 2 triệu' },
  { value: '2-5m', label: '2 - 5 triệu' },
  { value: 'over-5m', label: 'Trên 5 triệu' },
])

export const VIETNAM_TRAIN_STATION_OPTIONS = Object.freeze([
  {
    code: 'HAN',
    label: 'Hà Nội (HAN)',
    city: 'Hà Nội',
    station_name: 'Ga Hà Nội',
    province: 'Hà Nội',
  },
  {
    code: 'PLY',
    label: 'Phủ Lý (PLY)',
    city: 'Phủ Lý',
    station_name: 'Ga Phủ Lý',
    province: 'Hà Nam',
  },
  {
    code: 'NDI',
    label: 'Nam Định (NDI)',
    city: 'Nam Định',
    station_name: 'Ga Nam Định',
    province: 'Nam Định',
  },
  {
    code: 'NBI',
    label: 'Ninh Bình (NBI)',
    city: 'Ninh Bình',
    station_name: 'Ga Ninh Bình',
    province: 'Ninh Bình',
  },
  {
    code: 'THH',
    label: 'Thanh Hóa (THH)',
    city: 'Thanh Hóa',
    station_name: 'Ga Thanh Hóa',
    province: 'Thanh Hóa',
  },
  {
    code: 'VIN',
    label: 'Vinh (VIN)',
    city: 'Vinh',
    station_name: 'Ga Vinh',
    province: 'Nghệ An',
  },
  {
    code: 'DBH',
    label: 'Đồng Hới (DBH)',
    city: 'Đồng Hới',
    station_name: 'Ga Đồng Hới',
    province: 'Quảng Bình',
  },
  {
    code: 'HUE',
    label: 'Huế (HUE)',
    city: 'Huế',
    station_name: 'Ga Huế',
    province: 'Thừa Thiên Huế',
  },
  {
    code: 'DNA',
    label: 'Đà Nẵng (DNA)',
    city: 'Đà Nẵng',
    station_name: 'Ga Đà Nẵng',
    province: 'Đà Nẵng',
  },
  {
    code: 'TAM',
    label: 'Tam Kỳ (TAM)',
    city: 'Tam Kỳ',
    station_name: 'Ga Tam Kỳ',
    province: 'Quảng Nam',
  },
  {
    code: 'QNG',
    label: 'Quảng Ngãi (QNG)',
    city: 'Quảng Ngãi',
    station_name: 'Ga Quảng Ngãi',
    province: 'Quảng Ngãi',
  },
  {
    code: 'DTR',
    label: 'Diêu Trì (DTR)',
    city: 'Quy Nhơn',
    station_name: 'Ga Diêu Trì',
    province: 'Bình Định',
  },
  {
    code: 'THY',
    label: 'Tuy Hòa (THY)',
    city: 'Tuy Hòa',
    station_name: 'Ga Tuy Hòa',
    province: 'Phú Yên',
  },
  {
    code: 'NTR',
    label: 'Nha Trang (NTR)',
    city: 'Nha Trang',
    station_name: 'Ga Nha Trang',
    province: 'Khánh Hòa',
  },
  {
    code: 'PCM',
    label: 'Tháp Chàm (PCM)',
    city: 'Phan Rang - Tháp Chàm',
    station_name: 'Ga Tháp Chàm',
    province: 'Ninh Thuận',
  },
  {
    code: 'PHT',
    label: 'Phan Thiết (PHT)',
    city: 'Phan Thiết',
    station_name: 'Ga Phan Thiết',
    province: 'Bình Thuận',
  },
  {
    code: 'SGN',
    label: 'TP. Hồ Chí Minh (SGN)',
    city: 'TP. Hồ Chí Minh',
    station_name: 'Ga Sài Gòn',
    province: 'TP. Hồ Chí Minh',
  },
])
