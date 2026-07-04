import { ADMIN_DASHBOARD_TIME_RANGE_OPTIONS } from '../constants/adminDashboard.js'
import { adminDashboardFixtures } from '../fixtures/adminDashboard.fixtures.js'
import { createLegacyMockDashboardData } from '../mappers/adminDashboardMappers.js'

export const dashboardTimeRangeOptions = ADMIN_DASHBOARD_TIME_RANGE_OPTIONS

export const mockDashboardData = createLegacyMockDashboardData(adminDashboardFixtures)
