import { ROLES } from './roles.js'
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLE_GROUPS,
  canAccessResource,
  normalizeAdminRole,
} from '../utils/rolePermissions.js'

export { ADMIN_ROLE_VALUES, normalizeAdminRole } from '../utils/rolePermissions.js'

export const ADMIN_ROLE_LABELS = Object.freeze({
  [ROLES.staff]: 'Staff',
  [ROLES.admin]: 'Admin',
  [ROLES.systemAdmin]: 'System Admin',
})

export const ADMIN_ROLE_PROFILE_NAMES = Object.freeze({
  [ROLES.staff]: 'Nguyễn Văn A',
  [ROLES.admin]: 'Lê Hùng',
  [ROLES.systemAdmin]: 'Văn Quang',
})

export const ADMIN_ROLE_SYSTEM_LABELS = Object.freeze({
  [ROLES.staff]: 'Hệ thống nhân viên',
  [ROLES.admin]: 'Hệ thống quản lý (Admin)',
  [ROLES.systemAdmin]: 'Hệ thống quản trị',
})

export const ADMIN_DEFAULT_ROUTE_BY_ROLE = Object.freeze({
  [ROLES.staff]: '/admin/services',
  [ROLES.admin]: '/admin/revenue',
  [ROLES.systemAdmin]: '/admin',
})

export const ADMIN_ROUTES = Object.freeze({
  dashboard: {
    path: '/admin',
    label: 'Tổng quan',
    title: 'Tổng quan hệ thống',
    subtitle: 'Theo dõi các chỉ số quan trọng và hoạt động vận hành.',
    permission: ADMIN_PERMISSIONS.dashboardRead,
    allowedRoles: ADMIN_ROLE_GROUPS.system,
  },
  revenue: {
    path: '/admin/revenue',
    label: 'Báo cáo Doanh thu',
    title: 'Báo cáo Doanh thu',
    subtitle: 'Phân tích doanh thu, đơn hàng mới và hiệu quả tài chính theo thời gian.',
    permission: ADMIN_PERMISSIONS.revenueRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  reports: {
    path: '/admin/reports',
    label: 'Báo cáo',
    title: 'Báo cáo quản trị',
    subtitle: 'Tổng hợp báo cáo doanh thu, đơn hàng, dịch vụ, thanh toán và xuất file.',
    permission: ADMIN_PERMISSIONS.reportsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  bookings: {
    path: '/admin/bookings',
    label: 'Quản lý Đơn hàng',
    title: 'Quản lý Đơn hàng',
    subtitle: 'Quản lý, theo dõi và xử lý các đơn hàng trên hệ thống.',
    permission: ADMIN_PERMISSIONS.bookingsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  bookingDetail: {
    path: '/admin/bookings/:bookingCode',
    label: 'Chi tiết Đơn hàng',
    title: 'Chi tiết Đơn hàng',
    subtitle: 'Xem thông tin khách hàng, lịch trình, dịch vụ và tổng thanh toán của đơn hàng.',
    permission: ADMIN_PERMISSIONS.bookingsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  inventory: {
    path: '/admin/inventory',
    label: 'Tồn kho dịch vụ',
    title: 'Tồn kho và khả dụng',
    subtitle: 'Theo dõi slot tour, phòng, ghế máy bay, ghế tàu và trạng thái khả dụng.',
    permission: ADMIN_PERMISSIONS.inventoryManage,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  services: {
    path: '/admin/services',
    label: 'Quản lý Dịch vụ',
    title: 'Quản lý Dịch vụ',
    subtitle: 'Quản lý các tour, khách sạn và dịch vụ vận chuyển trong hệ thống.',
    permission: ADMIN_PERMISSIONS.servicesRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  serviceCreate: {
    path: '/admin/services/new',
    label: 'Thêm dịch vụ mới',
    title: 'Thêm Dịch vụ Mới',
    subtitle: 'Nhập thông tin cơ bản, hình ảnh, giá và chi tiết vận hành của dịch vụ.',
    permission: ADMIN_PERMISSIONS.servicesCreate,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  serviceReview: {
    path: '/admin/services/review',
    label: 'Phê duyệt Dịch vụ',
    title: 'Phê duyệt Dịch vụ',
    subtitle: 'Duyệt, từ chối hoặc gửi phản hồi cho các dịch vụ đang chờ xét duyệt.',
    anyPermissions: [
      ADMIN_PERMISSIONS.servicesApprove,
      ADMIN_PERMISSIONS.servicesReject,
    ],
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  payments: {
    path: '/admin/payments',
    label: 'Lịch sử giao dịch',
    title: 'Lịch sử Giao dịch & Hoàn tiền',
    subtitle: 'Theo dõi dòng tiền và xử lý các yêu cầu hoàn trả dịch vụ từ khách hàng.',
    permission: ADMIN_PERMISSIONS.paymentsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  refunds: {
    path: '/admin/refunds',
    label: 'Yêu cầu Hoàn tiền',
    title: 'Yêu cầu Hoàn tiền',
    subtitle: 'Quản lý và xử lý các yêu cầu hoàn tiền từ khách hàng.',
    permission: ADMIN_PERMISSIONS.refundsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  promotions: {
    path: '/admin/promotions',
    label: 'Quản lý khuyến mãi',
    title: 'Quản lý Khuyến mãi',
    subtitle: 'Quản lý các chương trình khuyến mãi hiện hành và đã lên lịch.',
    permission: ADMIN_PERMISSIONS.promotionsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  vouchers: {
    path: '/admin/vouchers',
    label: 'Voucher',
    title: 'Quản lý voucher',
    subtitle: 'Tạo, lọc, nhân bản và cập nhật trạng thái voucher.',
    permission: ADMIN_PERMISSIONS.vouchersRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  support: {
    path: '/admin/support',
    label: 'Hỗ trợ khách hàng',
    title: 'Hỗ trợ khách hàng',
    subtitle: 'Tiếp nhận, phân loại và phản hồi các yêu cầu từ du khách.',
    permission: ADMIN_PERMISSIONS.supportRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  emailLogs: {
    path: '/admin/email-logs',
    label: 'Lịch sử email',
    title: 'Lịch sử email',
    subtitle: 'Theo dõi email hệ thống đã gửi, template, trạng thái delivery và thao tác gửi lại.',
    permission: ADMIN_PERMISSIONS.emailLogsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  users: {
    path: '/admin/users',
    label: 'Quản lý Người dùng',
    title: 'Quản lý Người dùng',
    subtitle: 'Quản lý tài khoản khách hàng, nhân viên và quyền truy cập cơ bản.',
    permission: ADMIN_PERMISSIONS.usersRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  notifications: {
    path: '/admin/notifications',
    label: 'Thông báo',
    title: 'Thông báo hệ thống',
    subtitle: 'Quản lý thông báo hệ thống, broadcast và lịch sử gửi cho người dùng.',
    permission: ADMIN_PERMISSIONS.notificationsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  accessControl: {
    path: '/admin/access-control',
    label: 'Phân quyền truy cập',
    title: 'Phân quyền truy cập',
    subtitle: 'Quản lý và phân bổ quyền hạn cho Admin và Staff trong hệ thống.',
    permission: ADMIN_PERMISSIONS.accessControlManage,
    allowedRoles: ADMIN_ROLE_GROUPS.system,
  },
  roles: {
    path: '/admin/roles',
    label: 'Vai trò',
    title: 'Quản lý vai trò',
    subtitle: 'Xem danh sách role, cấp bậc role và các ràng buộc role hệ thống.',
    permission: ADMIN_PERMISSIONS.rolesRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  permissions: {
    path: '/admin/permissions',
    label: 'Danh sách permission',
    title: 'Danh sách permission',
    subtitle: 'Tra cứu permission theo module, resource và chuẩn bị ma trận phân quyền.',
    permission: ADMIN_PERMISSIONS.permissionsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  auditLogs: {
    path: '/admin/audit-logs',
    label: 'Audit logs',
    title: 'Audit logs',
    subtitle: 'Theo dõi lịch sử thao tác, user logs và các sự kiện quản trị quan trọng.',
    permission: ADMIN_PERMISSIONS.auditLogsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  uploads: {
    path: '/admin/uploads',
    label: 'Uploads',
    title: 'Quản lý uploads',
    subtitle: 'Theo dõi dung lượng upload, Cloudinary usage và các tài nguyên media.',
    permission: ADMIN_PERMISSIONS.uploadsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  infrastructure: {
    path: '/admin/infrastructure',
    label: 'Hạ tầng hệ thống',
    title: 'Hạ tầng hệ thống',
    subtitle: 'Giám sát tài nguyên, trạng thái dịch vụ và log hệ thống.',
    permission: ADMIN_PERMISSIONS.infrastructureRead,
    allowedRoles: ADMIN_ROLE_GROUPS.system,
  },
  settings: {
    path: '/admin/settings',
    label: 'Cấu hình hệ thống',
    title: 'Cấu hình hệ thống',
    subtitle: 'Quản lý thông tin công ty, khu vực, thanh toán và trạng thái hệ thống.',
    permission: ADMIN_PERMISSIONS.settingsRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
})

const SHARED_OPERATION_ROUTES = Object.freeze([
  'bookings',
  'services',
  'payments',
  'refunds',
  'promotions',
  'support',
])

export const ADMIN_NAV_SECTIONS_BY_ROLE = Object.freeze({
  [ROLES.staff]: Object.freeze([
    {
      heading: '',
      routeIds: SHARED_OPERATION_ROUTES,
    },
  ]),
  [ROLES.admin]: Object.freeze([
    {
      heading: '',
      routeIds: [
        'revenue',
        'bookings',
        'services',
        'payments',
        'refunds',
        'promotions',
        'users',
        'serviceReview',
        'support',
      ],
    },
  ]),
  [ROLES.systemAdmin]: Object.freeze([
    {
      heading: '',
      routeIds: [
        'dashboard',
        'revenue',
        'bookings',
        'services',
        'payments',
        'refunds',
        'promotions',
        'users',
        'serviceReview',
        'accessControl',
        'infrastructure',
        'settings',
        'support',
      ],
    },
  ]),
})

export const ADMIN_NAV_SECTIONS = ADMIN_NAV_SECTIONS_BY_ROLE[ROLES.systemAdmin]

export function canViewAdminRoute(currentRole, route) {
  return canAccessResource(currentRole, route)
}

export function buildAdminPath(path, currentRole) {
  return `${path}?role=${normalizeAdminRole(currentRole)}`
}

export function getAdminDefaultPath(currentRole) {
  const normalizedRole = normalizeAdminRole(currentRole)
  return buildAdminPath(ADMIN_DEFAULT_ROUTE_BY_ROLE[normalizedRole], normalizedRole)
}

export function getAdminNavSections(currentRole) {
  const normalizedRole = normalizeAdminRole(currentRole)
  return ADMIN_NAV_SECTIONS_BY_ROLE[normalizedRole] ?? ADMIN_NAV_SECTIONS
}

export function getAdminRouteMetaByPath(pathname) {
  if (pathname.startsWith('/admin/bookings/')) {
    return ADMIN_ROUTES.bookingDetail
  }

  if (pathname.startsWith('/admin/services/new')) {
    return ADMIN_ROUTES.serviceCreate
  }

  return Object.values(ADMIN_ROUTES).find((route) => route.path === pathname) ?? ADMIN_ROUTES.dashboard
}
