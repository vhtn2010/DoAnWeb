import {
  ADMIN_DASHBOARD_COMPARISON_COPY,
  ADMIN_DASHBOARD_DEFAULT_RANGE,
  ADMIN_DASHBOARD_INITIAL_FEEDBACK,
  ADMIN_DASHBOARD_PERIOD_LABELS,
  ADMIN_DASHBOARD_SUMMARY_CARD_CONFIG,
  ADMIN_DASHBOARD_TIME_RANGE_OPTIONS,
} from '../constants/adminDashboard.js'
import { ROLES } from '../constants/roles.js'
import { getAdminRoleLabel } from './adminServiceMappers.js'

const numberFormatter = new Intl.NumberFormat('vi-VN')

function getDashboardRangeLabel(range) {
  return ADMIN_DASHBOARD_PERIOD_LABELS[range] ?? ADMIN_DASHBOARD_PERIOD_LABELS[ADMIN_DASHBOARD_DEFAULT_RANGE]
}

function getComparisonLabel(range, comparisonKey) {
  return (
    ADMIN_DASHBOARD_COMPARISON_COPY[range]?.[comparisonKey] ??
    ADMIN_DASHBOARD_COMPARISON_COPY[ADMIN_DASHBOARD_DEFAULT_RANGE]?.[comparisonKey] ??
    ''
  )
}

function getMetricGrowthValue(metricKey, overview = {}) {
  const growthByMetricKey = {
    total_revenue: overview.revenue_growth_rate,
    total_bookings: overview.booking_growth_rate,
    new_customers: overview.customer_growth_rate,
    active_services: overview.service_growth_rate,
  }

  return growthByMetricKey[metricKey] ?? 0
}

function calculatePercentage(value, total) {
  if (!total) {
    return 0
  }

  return Math.round((value / total) * 100)
}

function sumRevenueAmount(items = []) {
  return items.reduce((total, item) => total + (item.revenue_amount ?? 0), 0)
}

export function formatAdminDashboardCurrency(amount, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatAdminDashboardShortCurrency(amount) {
  const formatShortNumber = (value, maximumFractionDigits = 1) =>
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(value)

  if (amount >= 1000000000) {
    return `${formatShortNumber(amount / 1000000000, amount >= 10000000000 ? 0 : 1)} tỷ`
  }

  return `${formatShortNumber(amount / 1000000, amount >= 100000000 ? 0 : 1)} tr`
}

export function formatAdminDashboardDateTime(value) {
  if (!value) {
  return 'Chưa cập nhật'
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function createAdminDashboardFeedback(tone = 'info', message = '') {
  if (!message) {
    return {
      tone: ADMIN_DASHBOARD_INITIAL_FEEDBACK.tone,
      message: ADMIN_DASHBOARD_INITIAL_FEEDBACK.message,
    }
  }

  return { tone, message }
}

export function createAdminDashboardAccessState(currentRole) {
  const currentRoleLabel = getAdminRoleLabel(currentRole)

  if (currentRole === ROLES.staff) {
    return {
      canViewDashboard: false,
      currentRoleLabel,
      message: `Vai trò ${currentRoleLabel} không dùng màn hình tổng quan hệ thống trong luồng thực tế. Staff sẽ thao tác qua các module được phân quyền như quản lý dịch vụ, đơn hàng, giao dịch và hỗ trợ khách hàng.`,
    }
  }

  return {
    canViewDashboard: true,
    currentRoleLabel,
    message: '',
  }
}

export function getAdminDashboardTimeRangeOptions() {
  return ADMIN_DASHBOARD_TIME_RANGE_OPTIONS
}

export function getAdminDashboardDefaultRange() {
  return ADMIN_DASHBOARD_DEFAULT_RANGE
}

export function mapAdminDashboardData(payload, { range = ADMIN_DASHBOARD_DEFAULT_RANGE } = {}) {
  const dashboardOverview = payload?.dashboard_overview ?? {}
  const revenueChartSource = Array.isArray(payload?.revenue_chart) ? payload.revenue_chart : []
  const bookingStatusBreakdownSource = Array.isArray(payload?.booking_status_breakdown)
    ? payload.booking_status_breakdown
    : []
  const recentBookingsSource = Array.isArray(payload?.recent_bookings) ? payload.recent_bookings : []
  const topServicesSource = Array.isArray(payload?.top_services) ? payload.top_services : []
  const totalTopServicesRevenue = sumRevenueAmount(topServicesSource)

  return {
    dashboardOverview,
    periodLabel: getDashboardRangeLabel(range),
    metricCards: ADMIN_DASHBOARD_SUMMARY_CARD_CONFIG.map((card) => {
      const value = dashboardOverview[card.key] ?? 0
      const changePercent = getMetricGrowthValue(card.key, dashboardOverview)

      return {
        key: card.key,
        label: card.label,
        icon: card.icon,
        trend: changePercent < 0 ? 'down' : 'up',
        changePercent,
        comparisonLabel: getComparisonLabel(range, card.comparisonKey),
        value:
          card.valueType === 'currency'
            ? formatAdminDashboardCurrency(value)
            : numberFormatter.format(value),
      }
    }),
    revenueChart: {
      total_amount: revenueChartSource.reduce((total, point) => total + (point.revenue_amount ?? 0), 0),
      currency: 'VND',
      compare_percent: dashboardOverview.revenue_growth_rate ?? 0,
      compare_label: getComparisonLabel(range, 'revenue'),
      legend: [{ label: 'Doanh thu', color: '#d62828' }],
      series: revenueChartSource.map((point) => ({
        period: point.period,
        label: point.label,
        value: point.revenue_amount ?? 0,
        booking_count: point.booking_count ?? 0,
      })),
    },
    bookingStatusBreakdown: bookingStatusBreakdownSource.map((item) => ({
      ...item,
      share_percent: item.percentage ?? 0,
    })),
    recentBookings: recentBookingsSource.map((booking) => ({
      ...booking,
      currency: 'VND',
    })),
    topServices: topServicesSource.map((service) => ({
      ...service,
      service_title: service.title,
      share_percent: calculatePercentage(service.revenue_amount ?? 0, totalTopServicesRevenue),
    })),
  }
}

export function createLegacyMockDashboardData(source) {
  const ranges = Object.entries(source?.ranges ?? {}).reduce((result, [range, payload]) => {
    const mappedData = mapAdminDashboardData(payload, { range })
    const dashboardOverview = mappedData.dashboardOverview

    result[range] = {
      period_label: mappedData.periodLabel,
      revenue_overview: {
        amount: dashboardOverview.total_revenue ?? 0,
        currency: 'VND',
        change_percent: dashboardOverview.revenue_growth_rate ?? 0,
        trend: (dashboardOverview.revenue_growth_rate ?? 0) < 0 ? 'down' : 'up',
        comparison_label: getComparisonLabel(range, 'revenue'),
      },
      booking_overview: {
        total: dashboardOverview.total_bookings ?? 0,
        change_percent: dashboardOverview.booking_growth_rate ?? 0,
        trend: (dashboardOverview.booking_growth_rate ?? 0) < 0 ? 'down' : 'up',
        comparison_label: getComparisonLabel(range, 'bookings'),
      },
      user_overview: {
        total: dashboardOverview.new_customers ?? 0,
        change_percent: dashboardOverview.customer_growth_rate ?? 0,
        trend: (dashboardOverview.customer_growth_rate ?? 0) < 0 ? 'down' : 'up',
        comparison_label: getComparisonLabel(range, 'customers'),
      },
      service_overview: {
        total: dashboardOverview.active_services ?? 0,
        change_percent: dashboardOverview.service_growth_rate ?? 0,
        trend: (dashboardOverview.service_growth_rate ?? 0) < 0 ? 'down' : 'up',
        comparison_label: getComparisonLabel(range, 'services'),
      },
      revenue_chart: mappedData.revenueChart,
      booking_status_breakdown: mappedData.bookingStatusBreakdown,
      top_services: mappedData.topServices,
      recent_bookings: mappedData.recentBookings,
    }

    return result
  }, {})

  return {
    default_range: source?.default_range ?? ADMIN_DASHBOARD_DEFAULT_RANGE,
    ranges,
  }
}
