export const DEFAULT_TOUR_SORT = 'popular'
export const DEFAULT_TOUR_LIMIT = 6

export const TOUR_PRICE_FILTER_OPTIONS = Object.freeze([
  { value: 'under-2m', label: 'Dưới 2 triệu' },
  { value: '2-5m', label: '2 - 5 triệu' },
  { value: 'over-5m', label: 'Trên 5 triệu' },
])

export const TOUR_DURATION_FILTER_OPTIONS = Object.freeze([
  { value: '1-3', label: '1 - 3 ngày' },
  { value: '4-7', label: '4 - 7 ngày' },
  { value: 'other', label: 'Trên 7 ngày' },
])

export const TOUR_CATEGORY_FILTER_OPTIONS = Object.freeze([
  'Văn hóa',
  'Nghỉ dưỡng',
  'Khám phá',
])

export const TOUR_SORT_OPTIONS = Object.freeze([
  { value: 'popular', label: 'Đề xuất' },
  { value: 'price_asc', label: 'Giá thấp nhất' },
  { value: 'price_desc', label: 'Giá cao nhất' },
  { value: 'newest', label: 'Mới nhất' },
])
