import {
  getAdminDashboard as getAdminDashboardWithMockAdapter,
  getBookingStatusBreakdown as getBookingStatusBreakdownWithMockAdapter,
  getDashboardOverview as getDashboardOverviewWithMockAdapter,
  getRecentBookings as getRecentBookingsWithMockAdapter,
  getRevenueChart as getRevenueChartWithMockAdapter,
  getTopServices as getTopServicesWithMockAdapter,
} from '../adapters/mock/adminDashboardMockAdapter.js'

const adminDashboardAdapter = {
  getDashboardOverview: getDashboardOverviewWithMockAdapter,
  getRevenueChart: getRevenueChartWithMockAdapter,
  getBookingStatusBreakdown: getBookingStatusBreakdownWithMockAdapter,
  getRecentBookings: getRecentBookingsWithMockAdapter,
  getTopServices: getTopServicesWithMockAdapter,
  getAdminDashboard: getAdminDashboardWithMockAdapter,
}

export function getDashboardOverview(params) {
  return adminDashboardAdapter.getDashboardOverview(params)
}

export function getRevenueChart(params) {
  return adminDashboardAdapter.getRevenueChart(params)
}

export function getBookingStatusBreakdown(params) {
  return adminDashboardAdapter.getBookingStatusBreakdown(params)
}

export function getRecentBookings(params) {
  return adminDashboardAdapter.getRecentBookings(params)
}

export function getTopServices(params) {
  return adminDashboardAdapter.getTopServices(params)
}

export function getAdminDashboard(params) {
  // TODO: replace mock dashboard data with admin/report API endpoints in integration phase.
  return adminDashboardAdapter.getAdminDashboard(params)
}
