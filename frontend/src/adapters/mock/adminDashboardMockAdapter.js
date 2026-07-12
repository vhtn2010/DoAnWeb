import { ADMIN_DASHBOARD_DEFAULT_RANGE } from '../../constants/adminDashboard.js'
import { adminDashboardFixtures } from '../../fixtures/adminDashboard.fixtures.js'

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function createInitialAdminDashboardState() {
  return cloneValue(adminDashboardFixtures)
}

function getRangePayload(range) {
  return (
    mockAdminDashboardState.ranges[range] ??
    mockAdminDashboardState.ranges[mockAdminDashboardState.default_range] ??
    null
  )
}

let mockAdminDashboardState = createInitialAdminDashboardState()

export async function getDashboardOverview({ range = ADMIN_DASHBOARD_DEFAULT_RANGE } = {}) {
  const payload = getRangePayload(range)

  return {
    success: Boolean(payload),
    message: payload ? 'OK' : 'Không tìm thấy dữ liệu tổng quan dashboard.',
    data: payload?.dashboard_overview ?? null,
  }
}

export async function getRevenueChart({ range = ADMIN_DASHBOARD_DEFAULT_RANGE } = {}) {
  const payload = getRangePayload(range)

  return {
    success: Boolean(payload),
    message: payload ? 'OK' : 'Không tìm thấy dữ liệu biểu đồ doanh thu.',
    data: payload?.revenue_chart ?? null,
  }
}

export async function getBookingStatusBreakdown({ range = ADMIN_DASHBOARD_DEFAULT_RANGE } = {}) {
  const payload = getRangePayload(range)

  return {
    success: Boolean(payload),
    message: payload ? 'OK' : 'Không tìm thấy dữ liệu phân bố trạng thái đơn hàng.',
    data: payload?.booking_status_breakdown ?? null,
  }
}

export async function getRecentBookings({ range = ADMIN_DASHBOARD_DEFAULT_RANGE } = {}) {
  const payload = getRangePayload(range)

  return {
    success: Boolean(payload),
    message: payload ? 'OK' : 'Không tìm thấy dữ liệu đơn đặt gần đây.',
    data: payload?.recent_bookings ?? null,
  }
}

export async function getTopServices({ range = ADMIN_DASHBOARD_DEFAULT_RANGE } = {}) {
  const payload = getRangePayload(range)

  return {
    success: Boolean(payload),
    message: payload ? 'OK' : 'Không tìm thấy dữ liệu top dịch vụ.',
    data: payload?.top_services ?? null,
  }
}

export async function getAdminDashboard({ range = ADMIN_DASHBOARD_DEFAULT_RANGE } = {}) {
  // TODO: replace mock dashboard data with admin/report API endpoints in integration phase.
  const payload = getRangePayload(range)

  if (!payload) {
    return {
      success: false,
      message: 'Không tìm thấy dữ liệu dashboard cho bộ lọc đã chọn.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: cloneValue({
      dashboard_overview: payload.dashboard_overview,
      revenue_chart: payload.revenue_chart,
      booking_status_breakdown: payload.booking_status_breakdown,
      recent_bookings: payload.recent_bookings,
      top_services: payload.top_services,
    }),
  }
}
