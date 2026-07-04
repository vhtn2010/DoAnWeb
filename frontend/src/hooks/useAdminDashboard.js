import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import {
  createAdminDashboardAccessState,
  createAdminDashboardFeedback,
  formatAdminDashboardCurrency,
  formatAdminDashboardDateTime,
  formatAdminDashboardShortCurrency,
  getAdminDashboardDefaultRange,
  getAdminDashboardTimeRangeOptions,
  mapAdminDashboardData,
} from '../mappers/adminDashboardMappers.js'
import { normalizeAdminPreviewRole } from '../mappers/adminServiceMappers.js'
import { getAdminDashboard } from '../repositories/adminDashboardRepository.js'

export default function useAdminDashboard() {
  const outletContext = useOutletContext()
  const currentRole = normalizeAdminPreviewRole(
    outletContext?.currentRole ?? ROLES.systemAdmin,
  )
  const accessState = useMemo(
    () => createAdminDashboardAccessState(currentRole),
    [currentRole],
  )
  const [selectedRange, setSelectedRange] = useState(getAdminDashboardDefaultRange())
  const [dashboardState, setDashboardState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createAdminDashboardFeedback())
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadDashboard() {
      if (!accessState.canViewDashboard) {
        if (isActive) {
          setLoading(false)
          setError('')
          setDashboardState(null)
          setFeedback(createAdminDashboardFeedback('info', accessState.message))
        }
        return
      }

      setLoading(true)
      setError('')

      try {
        const response = await getAdminDashboard({
          currentRole,
          range: selectedRange,
        })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Khong the tai du lieu dashboard luc nay.')
        }

        setDashboardState(mapAdminDashboardData(response.data, { range: selectedRange }))
        setFeedback(createAdminDashboardFeedback())
      } catch (loadError) {
        if (!isActive) {
          return
        }

        const nextMessage = loadError?.message ?? 'Khong the tai du lieu dashboard luc nay.'
        setError(nextMessage)
        setFeedback(createAdminDashboardFeedback('error', nextMessage))
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      isActive = false
    }
  }, [accessState, currentRole, reloadKey, selectedRange])

  return {
    accessState,
    bookingStatusBreakdown: dashboardState?.bookingStatusBreakdown ?? [],
    currentRole,
    currentRoleLabel: accessState.currentRoleLabel,
    dashboardOverview: dashboardState?.dashboardOverview ?? null,
    error,
    feedback,
    formatCurrency: formatAdminDashboardCurrency,
    formatDateTime: formatAdminDashboardDateTime,
    formatShortCurrency: formatAdminDashboardShortCurrency,
    hasDashboardData: Boolean(dashboardState),
    hasTopServices: (dashboardState?.topServices?.length ?? 0) > 0,
    loading,
    metricCards: dashboardState?.metricCards ?? [],
    periodLabel: dashboardState?.periodLabel ?? '',
    recentBookings: dashboardState?.recentBookings ?? [],
    reloadDashboard: () => setReloadKey((currentValue) => currentValue + 1),
    revenueChart: dashboardState?.revenueChart ?? null,
    selectedRange,
    setSelectedRange,
    timeRangeOptions: getAdminDashboardTimeRangeOptions(),
    topServices: dashboardState?.topServices ?? [],
  }
}
