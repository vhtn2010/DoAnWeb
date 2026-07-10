import { vietnamProvinceOptions } from '../data/vietnamProvinces.js'

export const HOME_SEARCH_FIELD_OPTIONS = Object.freeze([
  {
    key: 'from',
    label: 'điểm khởi hành',
    icon: 'departure',
    options: vietnamProvinceOptions,
  },
  {
    key: 'to',
    label: 'điểm đến',
    icon: 'destination',
    options: vietnamProvinceOptions,
  },
])

export const HOME_WEEKDAY_LABELS = Object.freeze([
  'Thứ 2',
  'Thứ 3',
  'Thứ 4',
  'Thứ 5',
  'Thứ 6',
  'Thứ 7',
  'CN',
])

export const HOME_FILTER_GROUPS = Object.freeze([
  {
    key: 'airline',
    label: 'Hãng hàng không',
    options: ['Vietnam Airlines', 'Vietjet Air', 'Bamboo Airways'],
  },
  {
    key: 'tour',
    label: 'Tour',
    options: ['Tour miền Bắc', 'Tour miền Trung', 'Tour miền Nam'],
  },
  {
    key: 'hotel',
    label: 'Khách sạn',
    options: ['3 sao', '4 sao', '5 sao'],
  },
  {
    key: 'train',
    label: 'Vé tàu',
    options: ['Ghế cứng', 'Ghế mềm', 'Giường nằm', 'Khoang VIP'],
  },
])

export const HOME_SORT_OPTIONS = Object.freeze([
  'Giá rẻ nhất',
  'Giá cao nhất',
  'Mới nhất',
  'Phổ biến nhất',
])

export const HOME_SORT_QUERY_MAP = Object.freeze({
  'Giá rẻ nhất': 'price_asc',
  'Giá cao nhất': 'price_desc',
  'Mới nhất': 'newest',
  'Phổ biến nhất': 'popular',
})
