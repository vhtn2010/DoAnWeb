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
  [ROLES.admin]: '/admin',
  [ROLES.systemAdmin]: '/admin',
})

export const ADMIN_ROUTES = Object.freeze({
  dashboard: {
    path: '/admin',
    label: 'Tổng quan',
    title: 'Tổng quan hệ thống',
    subtitle: 'Theo dõi các chỉ số quan trọng và hoạt động vận hành.',
    permission: ADMIN_PERMISSIONS.dashboardRead,
    allowedRoles: ADMIN_ROLE_GROUPS.elevated,
  },
  revenue: {
    path: '/admin/revenue',
    label: 'Báo cáo Doanh thu',
    title: 'Báo cáo Doanh thu',
    subtitle: 'Phân tích doanh thu, đơn hàng mới và hiệu quả tài chính theo thời gian.',
    permission: ADMIN_PERMISSIONS.revenueRead,
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
  support: {
    path: '/admin/support',
    label: 'Hỗ trợ khách hàng',
    title: 'Hỗ trợ khách hàng',
    subtitle: 'Tiếp nhận, phân loại và phản hồi các yêu cầu từ du khách.',
    permission: ADMIN_PERMISSIONS.supportRead,
    allowedRoles: ADMIN_ROLE_GROUPS.all,
  },
  profile: {
    path: '/admin/profile',
    label: 'Hồ sơ',
    title: 'Hồ sơ quản trị',
    subtitle: 'Xem và cập nhật thông tin cá nhân, bảo mật tài khoản và nhật ký hoạt động.',
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
  'emailLogs',
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
        'dashboard',
        'revenue',
        'bookings',
        'services',
        'payments',
        'refunds',
        'promotions',
        'users',
        'serviceReview',
        'support',
        'emailLogs',
        'settings',
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
        'support',
        'emailLogs',
        'accessControl',
        'infrastructure',
        'settings',
      ],
    },
  ]),
})

export const ADMIN_NAV_SECTIONS = ADMIN_NAV_SECTIONS_BY_ROLE[ROLES.systemAdmin]

export function canViewAdminRoute(currentRole, route, permissions) {
  return canAccessResource(currentRole, route, permissions)
}

export function buildAdminPath(path) {
  return path
}

export function getAdminDefaultPath(currentRole, permissions) {
  const normalizedRole = normalizeAdminRole(currentRole, null)

  if (!normalizedRole) {
    return '/'
  }

  const visibleRoute = getAdminNavSections(normalizedRole)
    .flatMap((section) => section.routeIds)
    .map((routeId) => ADMIN_ROUTES[routeId])
    .find((route) => canViewAdminRoute(normalizedRole, route, permissions))

  if (visibleRoute) {
    return buildAdminPath(visibleRoute.path)
  }

  return buildAdminPath(ADMIN_DEFAULT_ROUTE_BY_ROLE[normalizedRole])
}

export function getAdminNavSections(currentRole) {
  const normalizedRole = normalizeAdminRole(currentRole, null)
  return ADMIN_NAV_SECTIONS_BY_ROLE[normalizedRole] ?? []
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
