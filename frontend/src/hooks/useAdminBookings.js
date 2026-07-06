import { useEffect, useMemo, useState } from 'react'
import {
  ADMIN_BOOKING_PAGE_SIZE,
  ADMIN_BOOKING_STATUSES,
} from '../constants/adminBookings.js'
import {
  getAdminBookingActionConfig,
  getAdminBookingListParams,
  mapAdminBookingPaginationMeta,
  mapAdminBookingSummary,
} from '../mappers/adminBookingMappers.js'
import {
  cancelAdminBooking,
  completeAdminBooking,
  confirmAdminBooking,
  listAdminBookings,
  updateAdminBookingStatus,
} from '../repositories/adminBookingRepository.js'

function getActionReason(action) {
  if (action === 'confirm') {
    return 'Admin xác nhận đơn hàng từ trang Quản lý Đơn hàng.'
  }

  if (action === 'cancel') {
    return 'Admin huỷ đơn hàng từ trang Quản lý Đơn hàng.'
  }

  if (action === 'complete') {
    return 'Admin đánh dấu đơn hàng hoàn thành từ trang Quản lý Đơn hàng.'
  }

  return 'Admin cập nhật trạng thái đơn hàng từ trang Quản lý Đơn hàng.'
}

export default function useAdminBookings() {
  const [bookings, setBookings] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(ADMIN_BOOKING_STATUSES.all)
  const [paginationMeta, setPaginationMeta] = useState(() =>
    mapAdminBookingPaginationMeta({
      limit: ADMIN_BOOKING_PAGE_SIZE,
      page: 1,
      total: 0,
      total_pages: 0,
    }),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [actionState, setActionState] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const pageNumbers = useMemo(
    () => Array.from({ length: paginationMeta.totalPages }, (_, index) => index + 1),
    [paginationMeta.totalPages],
  )

  useEffect(() => {
    let isActive = true

    async function loadBookings() {
      setLoading(true)
      setError('')

      try {
        const response = await listAdminBookings(
          getAdminBookingListParams({
            currentPage,
            statusFilter,
          }),
        )

        if (!isActive) {
          return
        }

        if (!response.success || !Array.isArray(response.data)) {
          throw new Error(response.message || 'Không thể tải danh sách đơn hàng lúc này.')
        }

        setBookings(
          response.data.map((booking) => mapAdminBookingSummary(booking)),
        )
        setPaginationMeta(mapAdminBookingPaginationMeta(response.meta))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setBookings([])
        setError(loadError?.message ?? 'Không thể tải danh sách đơn hàng lúc này.')
        setPaginationMeta(
          mapAdminBookingPaginationMeta({
            limit: ADMIN_BOOKING_PAGE_SIZE,
            page: currentPage,
            total: 0,
            total_pages: 0,
          }),
        )
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadBookings()

    return () => {
      isActive = false
    }
  }, [currentPage, reloadKey, statusFilter])

  function updateStatusFilter(nextStatus) {
    setStatusFilter(nextStatus)
    setCurrentPage(1)
    setFeedback('')
  }

  async function handleBookingAction(booking, action) {
    const reason = getActionReason(action)

    setActionState({
      action,
      bookingId: booking.id,
    })
    setFeedback('')
    setError('')

    try {
      let response

      if (action === 'confirm') {
        response = await confirmAdminBooking(booking.id, { reason })
      } else if (action === 'cancel') {
        response = await cancelAdminBooking(booking.id, { reason })
      } else if (action === 'complete') {
        response = await completeAdminBooking(booking.id, { reason })
      } else {
        response = await updateAdminBookingStatus(booking.id, {
          reason,
          status: ADMIN_BOOKING_STATUSES.inProgress,
        })
      }

      setFeedback(response.message || 'Đã cập nhật trạng thái đơn hàng.')
      setReloadKey((currentValue) => currentValue + 1)
    } catch (actionError) {
      setFeedback(actionError?.message ?? 'Không thể cập nhật trạng thái đơn hàng lúc này.')
    } finally {
      setActionState(null)
    }
  }

  function isBookingActionLoading(booking, action) {
    return actionState?.bookingId === booking.id && actionState?.action === action
  }

  return {
    bookings,
    currentPage,
    error,
    feedback,
    getBookingActions: getAdminBookingActionConfig,
    isBookingActionLoading,
    loading,
    pageNumbers,
    paginationMeta,
    reloadBookings: () => setReloadKey((currentValue) => currentValue + 1),
    setCurrentPage,
    statusFilter,
    updateBookingAction: handleBookingAction,
    updateStatusFilter,
  }
}
