export const ADMIN_REFUND_STATUSES = Object.freeze({
  all: 'all',
  completed: 'completed',
  pending: 'pending',
  processing: 'processing',
})

export const ADMIN_REFUND_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_REFUND_STATUSES.all, label: 'Tất cả' },
  { value: ADMIN_REFUND_STATUSES.completed, label: 'Đã hoàn tiền' },
  { value: ADMIN_REFUND_STATUSES.pending, label: 'Chờ xử lý' },
  { value: ADMIN_REFUND_STATUSES.processing, label: 'Đang xử lý' },
])

export const ADMIN_REFUND_STATUS_META = Object.freeze({
  [ADMIN_REFUND_STATUSES.completed]: { label: 'Đã hoàn tiền', tone: 'success' },
  [ADMIN_REFUND_STATUSES.pending]: { label: 'Chờ xử lý', tone: 'warning' },
  [ADMIN_REFUND_STATUSES.processing]: { label: 'Đang xử lý', tone: 'info' },
})

export const ADMIN_REFUND_REQUESTS = Object.freeze([
  {
    id: 'refund-8273',
    bookingCode: 'DH-8273',
    customerEmail: 'thang.tran@email.com',
    customerName: 'Trần Hữu Thắng',
    detailNote: 'Gia đình khách có việc đột xuất, yêu cầu hoàn theo chính sách hủy trước 48h.',
    originalAmount: 5400000,
    reason: 'Hủy tour do bận việc gia đình đột xuất',
    refundAmount: 4860000,
    requestedAt: '2023-10-24',
    serviceName: 'Tour Vịnh Hạ Long 3N2Đ',
    status: ADMIN_REFUND_STATUSES.pending,
  },
  {
    id: 'refund-8271',
    bookingCode: 'NV-8271',
    customerEmail: 'maianh.ng@email.com',
    customerName: 'Mai Anh',
    detailNote: 'Khách hàng hủy dịch vụ sau khi đổi lịch công tác. Đề xuất hoàn 90%.',
    originalAmount: 12000000,
    reason: 'Thay đổi lịch trình công tác',
    refundAmount: 10800000,
    requestedAt: '2023-10-23',
    serviceName: 'Hotel Vinpearl',
    status: ADMIN_REFUND_STATUSES.processing,
  },
  {
    id: 'refund-8265',
    bookingCode: 'DH-8265',
    customerEmail: 'duc.le@email.com',
    customerName: 'Lê Đức',
    detailNote: 'Đã hoàn tiền sau khi xác minh phản hồi về phòng khách sạn.',
    originalAmount: 2500000,
    reason: 'Không hài lòng với dịch vụ khách sạn',
    refundAmount: 2500000,
    requestedAt: '2023-10-21',
    serviceName: 'Queen Sea Hotel',
    status: ADMIN_REFUND_STATUSES.completed,
  },
])

export const ADMIN_PAYMENT_STATUSES = Object.freeze({
  all: 'all',
  failed: 'failed',
  refundRequested: 'refund_requested',
  success: 'success',
})

export const ADMIN_PAYMENT_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_PAYMENT_STATUSES.all, label: 'Tất cả' },
  { value: ADMIN_PAYMENT_STATUSES.success, label: 'Thành công' },
  { value: ADMIN_PAYMENT_STATUSES.refundRequested, label: 'Chờ xử lý' },
  { value: ADMIN_PAYMENT_STATUSES.failed, label: 'Thất bại' },
])

export const ADMIN_PAYMENT_STATUS_META = Object.freeze({
  [ADMIN_PAYMENT_STATUSES.failed]: { label: 'Thất bại', tone: 'danger' },
  [ADMIN_PAYMENT_STATUSES.refundRequested]: { label: 'Yêu cầu hoàn', tone: 'warning' },
  [ADMIN_PAYMENT_STATUSES.success]: { label: 'Thành công', tone: 'success' },
})

export const ADMIN_PAYMENT_TRANSACTIONS = Object.freeze([
  {
    id: 'payment-8821',
    actionLabel: 'Chi tiết',
    amount: 12500000,
    code: 'GD-8821',
    customerName: 'Trần Anh Khoa',
    method: 'VNPay',
    serviceName: 'Tour Di sản Miền Trung',
    status: ADMIN_PAYMENT_STATUSES.success,
    timestamp: '2026-05-18T09:20:00+07:00',
  },
  {
    id: 'payment-7742',
    actionLabel: 'Chi tiết',
    amount: 4200000,
    code: 'GD-7742',
    customerName: 'Lê Thị Mỹ Hạnh',
    method: 'Visa/Master',
    serviceName: 'Hotel Vinpearl Nha Trang',
    status: ADMIN_PAYMENT_STATUSES.refundRequested,
    timestamp: '2026-05-17T16:05:00+07:00',
  },
  {
    id: 'payment-5509',
    actionLabel: 'Kiểm tra',
    amount: 1850000,
    code: 'GD-5509',
    customerName: 'Phạm Minh Tuấn',
    method: 'Momo',
    serviceName: 'Tour ẩm thực Sài Gòn',
    status: ADMIN_PAYMENT_STATUSES.failed,
    timestamp: '2026-05-16T21:42:00+07:00',
  },
])

export const ADMIN_PROMOTION_STATUSES = Object.freeze({
  active: 'active',
  ended: 'ended',
  scheduled: 'scheduled',
})

export const ADMIN_PROMOTION_STATUS_META = Object.freeze({
  [ADMIN_PROMOTION_STATUSES.active]: { label: 'Đang hoạt động', tone: 'success' },
  [ADMIN_PROMOTION_STATUSES.ended]: { label: 'Đã kết thúc', tone: 'neutral' },
  [ADMIN_PROMOTION_STATUSES.scheduled]: { label: 'Sắp tới', tone: 'info' },
})

export const ADMIN_PROMOTIONS = Object.freeze([
  {
    id: 'promo-kids26',
    code: 'KIDS26',
    description: 'Miễn phí vé cho 01 trẻ em dưới 6 tuổi',
    endDate: '2026-06-10',
    name: 'Vui Tết Thiếu Nhi',
    startDate: '2026-06-01',
    status: ADMIN_PROMOTION_STATUSES.ended,
  },
  {
    id: 'promo-summer24',
    code: 'SUMMER24',
    description: 'Giảm 30% cho nhóm từ 4 khách trở lên.',
    endDate: '2026-08-31',
    name: 'Hè Rực Rỡ',
    startDate: '2026-06-01',
    status: ADMIN_PROMOTION_STATUSES.active,
  },
  {
    id: 'promo-autumn10',
    code: 'AUTUMN10',
    description: 'Tặng vé tham quan một di tích nổi tiếng tại Hà Nội.',
    endDate: '2026-11-30',
    name: 'Thu Vàng Hà Nội',
    startDate: '2026-09-01',
    status: ADMIN_PROMOTION_STATUSES.scheduled,
  },
])

export const ADMIN_SUPPORT_STATUSES = Object.freeze({
  all: 'all',
  open: 'open',
  processing: 'processing',
  resolved: 'resolved',
})

export const ADMIN_SUPPORT_STATUS_OPTIONS = Object.freeze([
  { value: ADMIN_SUPPORT_STATUSES.all, label: 'Tất cả' },
  { value: ADMIN_SUPPORT_STATUSES.open, label: 'Đang chờ' },
  { value: ADMIN_SUPPORT_STATUSES.processing, label: 'Đang xử lý' },
  { value: ADMIN_SUPPORT_STATUSES.resolved, label: 'Đã xử lý' },
])

export const ADMIN_SUPPORT_STATUS_META = Object.freeze({
  [ADMIN_SUPPORT_STATUSES.open]: { label: 'Đang chờ', tone: 'warning' },
  [ADMIN_SUPPORT_STATUSES.processing]: { label: 'Đang xử lý', tone: 'info' },
  [ADMIN_SUPPORT_STATUSES.resolved]: { label: 'Đã xử lý', tone: 'success' },
})

export const ADMIN_SUPPORT_PRIORITY_META = Object.freeze({
  high: { label: 'Ưu tiên cao', tone: 'danger' },
  low: { label: 'Thấp', tone: 'neutral' },
  medium: { label: 'Trung bình', tone: 'warning' },
})

export const ADMIN_SUPPORT_REQUESTS = Object.freeze([
  {
    id: 'REQ-8492',
    bookingCode: 'HL-99821',
    createdLabel: '10 phút trước',
    customerName: 'Trần Quang Hiếu',
    customerPhone: '+84 901 234 567',
    customerTier: 'Khách hàng hạng Vàng',
    message:
      'Chào các bạn, do tình hình thời tiết bão sắp tới, gia đình tôi không thể tham gia tour Vịnh Hạ Long 3N2Đ dự kiến khởi hành vào thứ 6 tuần này. Xin vui lòng hướng dẫn thủ tục hủy tour và chính sách hoàn tiền trong trường hợp bất khả kháng này.',
    priority: 'high',
    status: ADMIN_SUPPORT_STATUSES.open,
    subject: 'Hủy vé: Tour Vịnh Hạ Long 3N2Đ - Yêu cầu hoàn tiền do bão.',
    systemNote:
      'Booking #HL-99821 nằm trong chính sách hoàn hủy miễn phí do điều kiện thời tiết.',
  },
  {
    id: 'REQ-8491',
    bookingCode: 'VN-2026',
    createdLabel: '1 giờ trước',
    customerName: 'Nguyễn Mai Phương',
    customerPhone: '+84 918 221 432',
    customerTier: 'Khách hàng thân thiết',
    message: 'Tôi muốn đổi ngày chuyến bay VN Airlines tuyến SGN-HAN sang tuần sau.',
    priority: 'medium',
    status: ADMIN_SUPPORT_STATUSES.processing,
    subject: 'Đổi ngày: Chuyến bay VN Airlines (SGN-HAN)',
    systemNote: 'Vé còn trong thời hạn đổi ngày, cần xác nhận phí chênh lệch.',
  },
  {
    id: 'REQ-8488',
    bookingCode: 'SP-0926',
    createdLabel: 'Hôm qua',
    customerName: 'Lê Đức Anh',
    customerPhone: '+84 936 778 900',
    customerTier: 'Khách hàng mới',
    message: 'Tôi cần tư vấn tour Sapa mùa lúa chín tháng 9 cho nhóm 6 người.',
    priority: 'low',
    status: ADMIN_SUPPORT_STATUSES.resolved,
    subject: 'Tư vấn Tour: Du lịch Sapa mùa lúa chín tháng 9',
    systemNote: 'Nhân viên đã gửi 3 lịch trình gợi ý và mã ưu đãi nhóm.',
  },
])
