import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { buildBookingConfirmationViewModel } from '../mappers/bookingMappers.js'
import {
  getBookingByCode,
  getBookingConfirmation,
} from '../repositories/bookingRepository.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

const FALLBACK_SERVICE_IMAGE_URL = '/assets/template/service/detail/ha-long-gallery-main.png'

function normalizeBookingItems(items = []) {
  return items.map((item) => {
    const serviceSnapshot = item.service_snapshot ?? {}

    return {
      ...item,
      id: item.id,
      image_url: serviceSnapshot.image_url ?? FALLBACK_SERVICE_IMAGE_URL,
      options: {
        duration_label: item.options?.duration_label,
        location_text: serviceSnapshot.location_text ?? '',
        schedule_label: item.options?.schedule_label,
      },
      service_title:
        serviceSnapshot.title ??
        item.title_snapshot ??
        item.title ??
        'Dịch vụ đang được cập nhật',
      total_amount: Number(item.total_amount ?? 0),
    }
  })
}

function normalizeBooking(booking = {}) {
  return {
    ...booking,
    booking_status: booking.booking_status ?? booking.status,
    id: booking.id ?? booking.booking_id,
  }
}

export default function useBookingConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { bookingCode } = useParams()
  const { authState, isCustomer } = usePublicSession()

  const [booking, setBooking] = useState(null)
  const [bookingItems, setBookingItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadBookingConfirmation() {
      setLoading(true)
      setError('')
      setFeedback('')

      try {
        const response = bookingCode
          ? await getBookingByCode(bookingCode, {
              authState,
            })
          : await getBookingConfirmation({
              authState,
              bookingId: location.state?.bookingId,
            })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data?.booking) {
          setBooking(null)
          setBookingItems([])
          setError(response.message ?? 'Không thể tải thông tin xác nhận đơn hàng lúc này.')
          return
        }

        setBooking(normalizeBooking(response.data.booking))
        setBookingItems(normalizeBookingItems(response.data.booking_items))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setBooking(null)
        setBookingItems([])
        setError(loadError?.message ?? 'Không thể tải thông tin xác nhận đơn hàng lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadBookingConfirmation()

    return () => {
      isActive = false
    }
  }, [authState, bookingCode, location.state?.bookingId, reloadToken])

  const viewModel = useMemo(
    () =>
      buildBookingConfirmationViewModel({
        booking,
        bookingItems,
        paymentOptions: [],
      }),
    [booking, bookingItems],
  )

  const canContinueToPayment = booking?.booking_status === 'pending_payment'

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  function goBackToCart() {
    navigate(buildPublicAuthPath('/cart', isCustomer))
  }

  function editBookingItem(itemId) {
    setFeedback(
      `Đơn hàng ${booking?.booking_code ?? ''} đã được tạo trên hệ thống. Để thay đổi mục ${itemId}, vui lòng quay lại giỏ trước khi checkout hoặc liên hệ chăm sóc khách hàng.`,
    )
  }

  function removeBookingItem(itemId) {
    setFeedback(
      `Backend customer hiện chưa hỗ trợ xóa trực tiếp mục ${itemId} sau khi checkout. Bạn có thể mở hỗ trợ để được xử lý tiếp.`,
    )
  }

  function confirmBooking() {
    if (!booking) {
      return
    }

    if (!canContinueToPayment) {
      setFeedback('Đơn hàng này hiện không còn ở trạng thái chờ thanh toán.')
      return
    }

    navigate(buildPublicAuthPath('/payment-confirmation', isCustomer), {
      state: {
        booking,
        bookingCode: booking.booking_code,
        bookingId: booking.id,
        bookingItems,
      },
    })
  }

  async function copyBookingCode() {
    if (!booking?.booking_code) {
      setFeedback('Chưa có mã đơn hàng để sao chép.')
      return
    }

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(booking.booking_code)
        setFeedback('Đã sao chép mã đơn hàng.')
        return
      }

      setFeedback(`Mã đơn hàng của bạn: ${booking.booking_code}`)
    } catch (copyError) {
      setFeedback(copyError?.message ?? `Mã đơn hàng của bạn: ${booking.booking_code}`)
    }
  }

  return {
    authState,
    booking,
    bookingItems,
    error,
    feedback,
    loading,
    preserveAuthQuery: (pathname) => buildPublicAuthPath(pathname, isCustomer),
    viewModel,
    actions: {
      canContinueToPayment,
      confirmBooking,
      copyBookingCode,
      editBookingItem,
      goBackToCart,
      removeBookingItem,
      retry,
    },
  }
}
