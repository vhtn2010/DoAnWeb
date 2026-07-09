import {
  getAdminDashboard as getAdminDashboardWithApiAdapter,
  getBookingStatusBreakdown as getBookingStatusBreakdownWithApiAdapter,
  getDashboardOverview as getDashboardOverviewWithApiAdapter,
  getRecentBookings as getRecentBookingsWithApiAdapter,
  getRevenueChart as getRevenueChartWithApiAdapter,
  getTopServices as getTopServicesWithApiAdapter,
} from '../adapters/api/adminDashboardApiAdapter.js'

const adminDashboardAdapter = {
  getDashboardOverview: getDashboardOverviewWithApiAdapter,
  getRevenueChart: getRevenueChartWithApiAdapter,
  getBookingStatusBreakdown: getBookingStatusBreakdownWithApiAdapter,
  getRecentBookings: getRecentBookingsWithApiAdapter,
  getTopServices: getTopServicesWithApiAdapter,
  getAdminDashboard: getAdminDashboardWithApiAdapter,
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
  return adminDashboardAdapter.getAdminDashboard(params)
}
