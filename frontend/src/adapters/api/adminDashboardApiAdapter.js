import { ADMIN_DASHBOARD_DEFAULT_RANGE } from '../../constants/adminDashboard.js'
import { apiGet } from '../../services/apiClient.js'

function formatDateParam(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function addDays(date, dayCount) {
  const nextDate = new Date(date)

  nextDate.setDate(nextDate.getDate() + dayCount)

  return nextDate
}

function getDateRangeParams(range = ADMIN_DASHBOARD_DEFAULT_RANGE) {
  const today = new Date()
  let from = addDays(today, -29)

  if (range === 'today') {
    from = today
  } else if (range === '7_days') {
    from = addDays(today, -6)
  } else if (range === 'year_to_date') {
    from = new Date(today.getFullYear(), 0, 1)
  }

  return {
    from: formatDateParam(from),
    to: formatDateParam(today),
  }
}

function createEmptyResponse(data) {
  return {
    data,
    message: 'Skipped optional dashboard request.',
    success: true,
  }
}

function canUseOptionalFallback(error) {
  return error?.status === 403 || error?.status === 404
}

async function getOptionalApiResponse(url, config, fallbackData) {
  try {
    return await apiGet(url, config)
  } catch (error) {
    if (!canUseOptionalFallback(error)) {
      throw error
    }

    return createEmptyResponse(fallbackData)
  }
}

function getMetaTotal(response) {
  return Number(response?.meta?.total ?? 0)
}

function mapBookingStatusBreakdown(breakdown = {}) {
  const total = Object.values(breakdown).reduce(
    (sum, value) => sum + Number(value || 0),
    0,
  )

  return Object.entries(breakdown).map(([status, count]) => ({
    count: Number(count || 0),
    label: status,
    percentage: total > 0 ? Math.round((Number(count || 0) / total) * 100) : 0,
    status,
  }))
}

function mapRevenueChartPoint(point = {}) {
  return {
    booking_count: Number(point.payment_count || 0),
    label: point.period,
    period: point.period,
    revenue_amount: Number(point.net_revenue ?? point.gross_revenue ?? 0),
  }
}

function mapRecentBooking(booking = {}) {
  return {
    booking_code: booking.booking_code,
    created_at: booking.created_at,
    customer_name:
      booking.customer?.full_name ||
      booking.contact_name ||
      booking.contact_email ||
      'Khach hang',
    id: booking.id,
    service_title: booking.booking_code || `${Number(booking.item_count || 0)} dich vu`,
    status: booking.status,
    total_amount: Number(booking.total_amount || 0),
  }
}

function mapOverview({
  activeStaffAdminTotal,
  staffAdminCapacity,
  totalUsers,
  overviewResponse,
}) {
  const kpis = overviewResponse?.data?.kpis ?? {}

  return {
    active_services: Number(kpis.active_services || 0),
    booking_growth_rate: 0,
    customer_growth_rate: 0,
    new_customers: Number(kpis.new_users || 0),
    pending_payments: Number(kpis.pending_payments || 0),
    refund_requests: Number(kpis.refund_requests || 0),
    revenue_growth_rate: 0,
    service_growth_rate: 0,
    staff_admin_active: activeStaffAdminTotal,
    staff_admin_capacity: staffAdminCapacity,
    total_bookings: Number(kpis.total_bookings || 0),
    total_revenue: Number(kpis.total_revenue || 0),
    total_users: totalUsers,
  }
}

async function getAdminUserCounters() {
  try {
    const [
      totalUsersResponse,
      activeStaffResponse,
      activeAdminResponse,
      totalStaffResponse,
      totalAdminResponse,
    ] = await Promise.all([
      getOptionalApiResponse('/admin/users', {
        params: {
          limit: 1,
          page: 1,
        },
      }, []),
      getOptionalApiResponse('/admin/users', {
        params: {
          limit: 1,
          page: 1,
          role: 'staff',
          status: 'active',
        },
      }, []),
      getOptionalApiResponse('/admin/users', {
        params: {
          limit: 1,
          page: 1,
          role: 'admin',
          status: 'active',
        },
      }, []),
      getOptionalApiResponse('/admin/users', {
        params: {
          limit: 1,
          page: 1,
          role: 'staff',
        },
      }, []),
      getOptionalApiResponse('/admin/users', {
        params: {
          limit: 1,
          page: 1,
          role: 'admin',
        },
      }, []),
    ])

    return {
      activeStaffAdminTotal:
        getMetaTotal(activeStaffResponse) + getMetaTotal(activeAdminResponse),
      staffAdminCapacity:
        getMetaTotal(totalStaffResponse) + getMetaTotal(totalAdminResponse),
      totalUsers: getMetaTotal(totalUsersResponse),
    }
  } catch {
    return {
      activeStaffAdminTotal: 0,
      staffAdminCapacity: 0,
      totalUsers: 0,
    }
  }
}

export async function getDashboardOverview(params = {}) {
  const rangeParams = getDateRangeParams(params.range)

  return apiGet('/admin/dashboard/overview', {
    params: rangeParams,
  })
}

export async function getRevenueChart(params = {}) {
  const rangeParams = getDateRangeParams(params.range)

  return apiGet('/admin/dashboard/charts/revenue', {
    params: {
      ...rangeParams,
      group_by: 'day',
    },
  })
}

export async function getBookingStatusBreakdown(params = {}) {
  const response = await getDashboardOverview(params)

  return {
    ...response,
    data: mapBookingStatusBreakdown(response.data?.booking_status_breakdown),
  }
}

export async function getRecentBookings(params = {}) {
  const rangeParams = getDateRangeParams(params.range)

  return getOptionalApiResponse('/admin/bookings', {
    params: {
      ...rangeParams,
      limit: 4,
      page: 1,
    },
  }, [])
}

export async function getTopServices() {
  return createEmptyResponse([])
}

export async function getAdminDashboard(params = {}) {
  const rangeParams = getDateRangeParams(params.range)
  const [
    overviewResponse,
    revenueChartResponse,
    bookingChartResponse,
    recentBookingsResponse,
    userCounters,
  ] = await Promise.all([
    apiGet('/admin/dashboard/overview', {
      params: rangeParams,
    }),
    apiGet('/admin/dashboard/charts/revenue', {
      params: {
        ...rangeParams,
        group_by: 'day',
      },
    }),
    apiGet('/admin/dashboard/charts/bookings', {
      params: {
        ...rangeParams,
        group_by: 'day',
      },
    }),
    getRecentBookings(params),
    getAdminUserCounters(),
  ])

  const bookingCharts = Array.isArray(bookingChartResponse.data?.charts)
    ? bookingChartResponse.data.charts
    : []

  return {
    success: true,
    message: 'Dashboard retrieved successfully',
    data: {
      booking_chart: bookingCharts,
      booking_status_breakdown: mapBookingStatusBreakdown(
        overviewResponse.data?.booking_status_breakdown,
      ),
      dashboard_overview: mapOverview({
        ...userCounters,
        overviewResponse,
      }),
      recent_bookings: Array.isArray(recentBookingsResponse.data)
        ? recentBookingsResponse.data.map((booking) => mapRecentBooking(booking))
        : [],
      revenue_chart: Array.isArray(revenueChartResponse.data?.charts)
        ? revenueChartResponse.data.charts.map((point) => mapRevenueChartPoint(point))
        : [],
      top_services: [],
    },
  }
}
