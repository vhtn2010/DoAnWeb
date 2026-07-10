export const ADMIN_REVENUE_METRICS = Object.freeze([
  {
    id: 'total-revenue',
    helper: '+12.5% so với kỳ trước',
    label: 'Tổng Doanh Thu',
    tone: 'success',
    value: '4.25B ₫',
  },
  {
    id: 'new-orders',
    helper: '+5.2% so với kỳ trước',
    label: 'Đơn Hàng Mới',
    tone: 'info',
    value: '1,245',
  },
  {
    id: 'net-profit',
    helper: '-2.1% cần theo dõi',
    label: 'Lợi Nhuận Ròng',
    tone: 'warning',
    value: '850M ₫',
  },
  {
    id: 'new-customers',
    helper: '+18.4% so với kỳ trước',
    label: 'Khách Hàng Mới',
    tone: 'brand',
    value: '30',
  },
])

export const ADMIN_REVENUE_SERIES = Object.freeze([
  { label: 'Tuần 1', value: 42 },
  { label: 'Tuần 2', value: 58 },
  { label: 'Tuần 3', value: 51 },
  { label: 'Tuần 4', value: 76 },
  { label: 'Tuần 5', value: 68 },
  { label: 'Tuần 6', value: 84 },
])

export const ADMIN_SERVICE_REVENUE_BREAKDOWN = Object.freeze([
  { color: '#c8102e', label: 'Tour Du lịch', value: 45 },
  { color: '#f59e0b', label: 'Khách sạn', value: 30 },
  { color: '#2563eb', label: 'Chuyến bay', value: 15 },
  { color: '#16a34a', label: 'Tàu hỏa', value: 10 },
])
