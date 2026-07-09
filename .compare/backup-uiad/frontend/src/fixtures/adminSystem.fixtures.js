export const ADMIN_USERS = Object.freeze([
  {
    id: 'ND-8492',
    email: 'yennhi.nguyen@email.com',
    joinedAt: '2025-05-12',
    name: 'Nguyễn Trần Yến Nhi',
    phone: '+84 987 654 321',
    status: 'active',
    tier: 'VIP',
  },
  {
    id: 'ND-7731',
    email: 'tvhai.business@email.com',
    joinedAt: '2024-11-03',
    name: 'Trần Văn Hải',
    phone: '+84 901 234 567',
    status: 'active',
    tier: 'Thường',
  },
  {
    id: 'ND-9102',
    email: 'nam.lh99@email.com',
    joinedAt: '2024-01-22',
    name: 'Lê Hoàng Nam',
    phone: '+84 933 445 566',
    status: 'locked',
    tier: 'Thường',
  },
])

export const ADMIN_USER_STATUS_META = Object.freeze({
  active: { label: 'Hoạt động', tone: 'success' },
  locked: { label: 'Đã khóa', tone: 'danger' },
})

export const ADMIN_ACCESS_ROLES = Object.freeze([
  {
    id: 'staff',
    name: 'Staff',
    description: 'Xử lý vận hành hằng ngày: đơn hàng, dịch vụ, hoàn tiền, hỗ trợ.',
    members: 12,
    permissions: ['Đơn hàng', 'Dịch vụ', 'Hoàn tiền', 'Khuyến mãi', 'Hỗ trợ'],
  },
  {
    id: 'admin',
    name: 'Admin',
    description: 'Quản lý vận hành, doanh thu, người dùng và phê duyệt dịch vụ.',
    members: 4,
    permissions: ['Dashboard', 'Doanh thu', 'Người dùng', 'Phê duyệt', 'Báo cáo'],
  },
  {
    id: 'system_admin',
    name: 'System Admin',
    description: 'Toàn quyền hệ thống, phân quyền, hạ tầng, audit và cấu hình.',
    members: 2,
    permissions: ['Phân quyền', 'Hạ tầng', 'Cấu hình', 'Audit logs', 'Uploads'],
  },
])

export const ADMIN_PERMISSION_MATRIX = Object.freeze([
  { module: 'Đơn hàng', staff: true, admin: true, system_admin: true },
  { module: 'Dịch vụ', staff: true, admin: true, system_admin: true },
  { module: 'Hoàn tiền', staff: false, admin: true, system_admin: true },
  { module: 'Người dùng', staff: false, admin: true, system_admin: true },
  { module: 'Phân quyền', staff: false, admin: false, system_admin: true },
  { module: 'Hạ tầng', staff: false, admin: false, system_admin: true },
  { module: 'Cấu hình', staff: false, admin: true, system_admin: true },
])

export const ADMIN_INFRASTRUCTURE_SERVICES = Object.freeze([
  {
    id: 'api',
    name: 'Express API',
    description: 'REST API backend và middleware xác thực',
    latency: '82ms',
    status: 'healthy',
    usage: '41%',
  },
  {
    id: 'database',
    name: 'Supabase Database',
    description: 'Postgres schema, migrations và seed markers',
    latency: '128ms',
    status: 'healthy',
    usage: '64%',
  },
  {
    id: 'storage',
    name: 'Cloudinary Media',
    description: 'Ảnh dịch vụ, upload và CDN delivery',
    latency: '214ms',
    status: 'warning',
    usage: '78%',
  },
  {
    id: 'email',
    name: 'Email Delivery',
    description: 'Xác nhận đơn, reset password, thông báo hệ thống',
    latency: '340ms',
    status: 'healthy',
    usage: '37%',
  },
])

export const ADMIN_INFRA_STATUS_META = Object.freeze({
  healthy: { label: 'Ổn định', tone: 'success' },
  warning: { label: 'Cần theo dõi', tone: 'warning' },
})

export const ADMIN_SETTINGS_GROUPS = Object.freeze([
  {
    id: 'company',
    title: 'Thông tin công ty',
    description: 'Tên thương hiệu, hotline, email hỗ trợ và địa chỉ liên hệ.',
    fields: [
      { name: 'brandName', label: 'Tên thương hiệu', value: 'Net Viet Travel' },
      { name: 'supportEmail', label: 'Email hỗ trợ', value: 'support@netviettravel.vn' },
      { name: 'hotline', label: 'Hotline', value: '+84 1900 2686' },
    ],
  },
  {
    id: 'payment',
    title: 'Thanh toán',
    description: 'Cấu hình cổng thanh toán, thời hạn giữ chỗ và phí huỷ dịch vụ.',
    fields: [
      { name: 'paymentProvider', label: 'Cổng thanh toán', value: 'VNPay, Momo, Visa/Master' },
      { name: 'holdMinutes', label: 'Thời hạn giữ chỗ', value: '30 phút' },
      { name: 'cancelFee', label: 'Phí huỷ mặc định', value: '10%' },
    ],
  },
  {
    id: 'system',
    title: 'Trạng thái hệ thống',
    description: 'Bật tắt bảo trì, kiểm soát email tự động và cảnh báo vận hành.',
    fields: [
      { name: 'maintenance', label: 'Chế độ bảo trì', value: 'Tắt' },
      { name: 'emailAutomation', label: 'Email tự động', value: 'Bật' },
      { name: 'opsAlert', label: 'Cảnh báo vận hành', value: 'Bật' },
    ],
  },
])
