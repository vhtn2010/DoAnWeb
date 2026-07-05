export const ADMIN_UTILITY_MODULES = Object.freeze({
  auditLogs: {
    actionLabel: 'Xem log',
    eyebrow: 'Giám sát',
    metrics: [
      { label: 'Sự kiện hôm nay', value: '186', helper: 'Bao gồm đăng nhập, cập nhật và xoá dữ liệu', tone: 'info' },
      { label: 'Cảnh báo', value: '4', helper: 'Cần rà soát trong ngày', tone: 'warning' },
      { label: 'Rủi ro cao', value: '1', helper: 'Thay đổi phân quyền nhạy cảm', tone: 'danger' },
    ],
    rows: [
      ['09:42', 'Admin Lê Hùng', 'Cập nhật trạng thái hoàn tiền #NV-8271', 'Thành công'],
      ['08:15', 'System Admin Văn Quang', 'Thay đổi quyền Staff', 'Cần rà soát'],
      ['07:50', 'Staff Nguyễn Văn A', 'Ẩn dịch vụ TOUR-DN-0301', 'Thành công'],
    ],
    subtitle: 'Theo dõi lịch sử thao tác, user logs và các sự kiện quản trị quan trọng.',
    title: 'Audit logs',
  },
  emailLogs: {
    actionLabel: 'Gửi lại',
    eyebrow: 'Giao tiếp',
    metrics: [
      { label: 'Đã gửi hôm nay', value: '1,284', helper: 'Email xác nhận và nhắc thanh toán', tone: 'success' },
      { label: 'Đang chờ', value: '23', helper: 'Đợi queue xử lý', tone: 'warning' },
      { label: 'Lỗi delivery', value: '7', helper: 'Cần kiểm tra địa chỉ nhận', tone: 'danger' },
    ],
    rows: [
      ['NVT-1201', 'booking-confirmation', 'delivered', '09:15'],
      ['NVT-1200', 'payment-reminder', 'queued', '08:40'],
      ['REQ-8492', 'support-reply', 'failed', '08:22'],
    ],
    subtitle: 'Theo dõi email hệ thống đã gửi, template, trạng thái delivery và thao tác gửi lại.',
    title: 'Lịch sử email',
  },
  inventory: {
    actionLabel: 'Cập nhật',
    eyebrow: 'Vận hành',
    metrics: [
      { label: 'Slot tour còn lại', value: '426', helper: 'Trong 30 ngày tới', tone: 'success' },
      { label: 'Phòng khả dụng', value: '184', helper: 'Theo khách sạn đang bán', tone: 'info' },
      { label: 'Cảnh báo hết chỗ', value: '9', helper: 'Cần xác nhận tồn kho', tone: 'warning' },
    ],
    rows: [
      ['TOUR-PQ-0715', 'Grand World - VinWonders', '18 slot', 'Ổn định'],
      ['HOTEL-QS-PT', 'Queen Sea Hotel', '4 phòng', 'Sắp hết'],
      ['FLIGHT-VJ157', 'HAN -> PQC', '12 ghế', 'Ổn định'],
    ],
    subtitle: 'Theo dõi slot tour, phòng, ghế máy bay, ghế tàu và trạng thái khả dụng.',
    title: 'Tồn kho và khả dụng',
  },
  notifications: {
    actionLabel: 'Xem',
    eyebrow: 'Thông báo',
    metrics: [
      { label: 'Broadcast', value: '12', helper: 'Đã gửi trong tháng', tone: 'brand' },
      { label: 'Đã lên lịch', value: '5', helper: 'Chờ gửi tự động', tone: 'info' },
      { label: 'Tỉ lệ mở', value: '48%', helper: 'Trung bình 7 ngày', tone: 'success' },
    ],
    rows: [
      ['Khuyến mãi hè', 'Người dùng VIP', 'Đã gửi', 'SUMMER24'],
      ['Nhắc thanh toán', 'Đơn chờ thanh toán', 'Đã lên lịch', '30 phút'],
      ['Bảo trì hệ thống', 'Tất cả Admin', 'Nháp', 'Hạ tầng'],
    ],
    subtitle: 'Quản lý thông báo hệ thống, broadcast và lịch sử gửi cho người dùng.',
    title: 'Thông báo hệ thống',
  },
  permissions: {
    actionLabel: 'Chi tiết',
    eyebrow: 'Phân quyền',
    metrics: [
      { label: 'Permission', value: '38', helper: 'Được khai báo trong helper role', tone: 'info' },
      { label: 'Module', value: '17', helper: 'Có kiểm soát truy cập', tone: 'brand' },
      { label: 'Nhạy cảm', value: '6', helper: 'Chỉ System Admin', tone: 'warning' },
    ],
    rows: [
      ['admin.bookings.read', 'Đơn hàng', 'Staff+', 'Đọc danh sách đơn hàng'],
      ['admin.access_control.manage', 'Phân quyền', 'System Admin', 'Quản lý quyền truy cập'],
      ['admin.infrastructure.read', 'Hạ tầng', 'System Admin', 'Giám sát hạ tầng'],
    ],
    subtitle: 'Tra cứu permission theo module, resource và chuẩn bị ma trận phân quyền.',
    title: 'Danh sách permission',
  },
  reports: {
    actionLabel: 'Tải file',
    eyebrow: 'Báo cáo',
    metrics: [
      { label: 'Báo cáo đã tạo', value: '42', helper: 'Trong tháng hiện tại', tone: 'success' },
      { label: 'Đang chờ', value: '6', helper: 'Đợi xuất file nền', tone: 'warning' },
      { label: 'Mẫu báo cáo', value: '9', helper: 'Doanh thu, đơn hàng, dịch vụ', tone: 'info' },
    ],
    rows: [
      ['Doanh thu tháng 05/2026', 'Excel', 'Sẵn sàng', 'Admin Lê Hùng'],
      ['Đơn hàng theo trạng thái', 'PDF', 'Đang tạo', 'System Admin Văn Quang'],
      ['Dịch vụ bán chạy', 'Excel', 'Sẵn sàng', 'Admin Lê Hùng'],
    ],
    subtitle: 'Tổng hợp báo cáo doanh thu, đơn hàng, dịch vụ, thanh toán và xuất file.',
    title: 'Báo cáo quản trị',
  },
  roles: {
    actionLabel: 'Xem role',
    eyebrow: 'Phân quyền',
    metrics: [
      { label: 'Role hệ thống', value: '3', helper: 'Staff, Admin, System Admin', tone: 'brand' },
      { label: 'Admin', value: '4', helper: 'Có quyền phê duyệt', tone: 'info' },
      { label: 'Staff', value: '12', helper: 'Vận hành tuyến đầu', tone: 'success' },
    ],
    rows: [
      ['Staff', 'Vận hành', '12 người', 'Không truy cập hệ thống nhạy cảm'],
      ['Admin', 'Quản lý', '4 người', 'Có doanh thu và người dùng'],
      ['System Admin', 'Hệ thống', '2 người', 'Toàn quyền cấu hình'],
    ],
    subtitle: 'Xem danh sách role, cấp bậc role và các ràng buộc role hệ thống.',
    title: 'Quản lý vai trò',
  },
  uploads: {
    actionLabel: 'Kiểm tra',
    eyebrow: 'Media',
    metrics: [
      { label: 'Dung lượng', value: '78%', helper: 'Cloudinary usage', tone: 'warning' },
      { label: 'Ảnh mới', value: '146', helper: 'Trong tuần', tone: 'info' },
      { label: 'Cần tối ưu', value: '12', helper: 'Ảnh trên 2MB', tone: 'danger' },
    ],
    rows: [
      ['tour-phu-quoc-cover.webp', '1.4MB', 'Đang dùng', 'Dịch vụ'],
      ['hotel-queen-sea.jpg', '2.8MB', 'Cần tối ưu', 'Khách sạn'],
      ['promotion-summer24.png', '860KB', 'Đang dùng', 'Khuyến mãi'],
    ],
    subtitle: 'Theo dõi dung lượng upload, Cloudinary usage và các tài nguyên media.',
    title: 'Quản lý uploads',
  },
  vouchers: {
    actionLabel: 'Sửa',
    eyebrow: 'Marketing',
    metrics: [
      { label: 'Voucher hoạt động', value: '18', helper: 'Có thể áp dụng ngay', tone: 'success' },
      { label: 'Đã dùng', value: '326', helper: 'Trong tháng này', tone: 'brand' },
      { label: 'Sắp hết hạn', value: '7', helper: 'Trong 7 ngày tới', tone: 'warning' },
    ],
    rows: [
      ['WELCOME10', 'Giảm 10%', 'Hoạt động', 'Khách mới'],
      ['VIP500K', 'Giảm 500.000đ', 'Hoạt động', 'VIP'],
      ['FAMILY15', 'Giảm 15%', 'Sắp hết hạn', 'Nhóm gia đình'],
    ],
    subtitle: 'Tạo, lọc, nhân bản và cập nhật trạng thái voucher.',
    title: 'Quản lý voucher',
  },
})
