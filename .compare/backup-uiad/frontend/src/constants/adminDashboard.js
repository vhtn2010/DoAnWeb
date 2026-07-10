export const ADMIN_DASHBOARD_DEFAULT_RANGE = '30_days'

export const ADMIN_DASHBOARD_TIME_RANGE_OPTIONS = Object.freeze([
  { id: 'today', label: 'Hôm nay' },
  { id: '7_days', label: '7 ngày' },
  { id: '30_days', label: '30 ngày' },
  { id: 'year_to_date', label: 'Năm nay' },
])

export const ADMIN_DASHBOARD_SUMMARY_CARD_CONFIG = Object.freeze([
  {
    key: 'total_revenue',
    label: 'Doanh thu',
    icon: 'revenue',
    valueType: 'currency',
    comparisonKey: 'revenue',
  },
  {
    key: 'total_bookings',
    label: 'Đơn đặt dịch vụ',
    icon: 'bookings',
    valueType: 'number',
    comparisonKey: 'bookings',
  },
  {
    key: 'new_customers',
    label: 'Khách hàng mới',
    icon: 'users',
    valueType: 'number',
    comparisonKey: 'customers',
  },
  {
    key: 'active_services',
    label: 'Dịch vụ đang bán',
    icon: 'services',
    valueType: 'number',
    comparisonKey: 'services',
  },
])

export const ADMIN_DASHBOARD_COMPARISON_COPY = Object.freeze({
  today: {
    revenue: 'so với hôm qua',
    bookings: 'đơn mới trong ngày',
    customers: 'khách đăng ký mới',
    services: 'dịch vụ đang mở bán',
  },
  '7_days': {
    revenue: 'so với 7 ngày trước',
    bookings: 'đơn đặt dịch vụ mới',
    customers: 'khách hàng mới',
    services: 'dịch vụ đang bán',
  },
  '30_days': {
    revenue: 'so với 30 ngày trước',
    bookings: 'đơn đặt dịch vụ mới',
    customers: 'khách hàng mới',
    services: 'dịch vụ đang bán',
  },
  year_to_date: {
    revenue: 'so với cùng kỳ năm trước',
    bookings: 'đơn đặt dịch vụ',
    customers: 'khách hàng mới',
    services: 'dịch vụ đang bán',
  },
})

export const ADMIN_DASHBOARD_PERIOD_LABELS = Object.freeze({
  today: 'Hôm nay',
  '7_days': '7 ngày gần nhất',
  '30_days': '30 ngày gần nhất',
  year_to_date: 'Từ đầu năm đến nay',
})

export const ADMIN_DASHBOARD_INITIAL_FEEDBACK = Object.freeze({
  tone: 'info',
  message: 'Dữ liệu đang được cung cấp bởi mock dashboard adapter theo pattern API-ready.',
})
