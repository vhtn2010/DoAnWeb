export const DEFAULT_HOTEL_PAGE_SIZE = 4
export const DEFAULT_HOTEL_SORT = 'recommended'

export const DEFAULT_HOTEL_SEARCH_VALUES = Object.freeze({
  location: 'TP. Hồ Chí Minh (SGN)',
  checkin: '15-10-2026',
  checkout: '17-10-2026',
})

export const HOTEL_SORT_OPTIONS = Object.freeze([
  { value: 'recommended', label: 'Đề xuất' },
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
  { value: 'rating_desc', label: 'Đánh giá cao' },
])

export const HOTEL_PRICE_FILTER_OPTIONS = Object.freeze([
  { value: 'under-2m', label: 'Dưới 2 triệu' },
  { value: '2-5m', label: '2 - 5 triệu' },
  { value: 'over-5m', label: 'Trên 5 triệu' },
])

export const HOTEL_STAR_FILTER_OPTIONS = Object.freeze([
  { value: '5', label: '5 sao' },
  { value: '4', label: '4 sao' },
  { value: '3', label: '3 sao' },
])
