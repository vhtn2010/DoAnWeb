import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { BOOKING_DEFAULT_PAYMENT_METHOD } from '../constants/bookings.js'
import { ROLES } from '../constants/roles.js'
import { buildBookingConfirmationViewModel } from '../mappers/bookingMappers.js'
import {
  buildPaymentRedirectPayload,
  getBookingByCode,
  getBookingConfirmation,
} from '../repositories/bookingRepository.js'

function preserveAuthPath(pathname, authState) {
  if (authState !== ROLES.customer) {
    return pathname
  }

  return pathname.includes('?') ? `${pathname}&auth=customer` : `${pathname}?auth=customer`
}

function getTaxAndFeeAmount(booking) {
  return Number(booking?.tax_amount ?? 0) + Number(booking?.service_fee_amount ?? 0)
}

export default function useBookingConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { bookingCode } = useParams()
  const [searchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest

  const checkoutPayload = useMemo(
    () => (location.state?.checkoutPayload ? { ...location.state.checkoutPayload } : undefined),
    [location.state?.checkoutPayload],
  )
  const selectedCartItemIds = useMemo(
    () =>
      Array.isArray(location.state?.selectedCartItemIds)
        ? [...location.state.selectedCartItemIds]
        : undefined,
    [location.state?.selectedCartItemIds],
  )
  const cartSummaryPayload = useMemo(
    () => (location.state?.cartSummaryPayload ? { ...location.state.cartSummaryPayload } : undefined),
    [location.state?.cartSummaryPayload],
  )

  const [booking, setBooking] = useState(null)
  const [bookingItems, setBookingItems] = useState([])
  const [travellers, setTravellers] = useState([])
  const [paymentOptions, setPaymentOptions] = useState([])
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
              cartSummaryPayload,
              checkoutPayload,
              selectedCartItemIds,
            })
          : await getBookingConfirmation({
              authState,
              cartSummaryPayload,
              checkoutPayload,
              selectedCartItemIds,
            })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          setBooking(null)
          setBookingItems([])
          setTravellers([])
          setPaymentOptions([])
          setError(response.message ?? 'Không thể tải thông tin xác nhận đơn hàng lúc này.')
          return
        }

        setBooking(response.data.booking ?? null)
        setBookingItems(Array.isArray(response.data.booking_items) ? response.data.booking_items : [])
        setTravellers(Array.isArray(response.data.travellers) ? response.data.travellers : [])
        setPaymentOptions(
          Array.isArray(response.data.payment_options) ? response.data.payment_options : [],
        )
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setBooking(null)
        setBookingItems([])
        setTravellers([])
        setPaymentOptions([])
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
  }, [authState, bookingCode, cartSummaryPayload, checkoutPayload, reloadToken, selectedCartItemIds])

  const viewModel = useMemo(
    () =>
      buildBookingConfirmationViewModel({
        booking,
        bookingItems,
        paymentOptions,
      }),
    [booking, bookingItems, paymentOptions],
  )

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  function goBackToCheckout() {
    navigate(preserveAuthPath('/checkout', authState), {
      state: {
        cartSummaryPayload,
        checkoutPayload,
        selectedCartItemIds,
      },
    })
  }

  function editBookingItemMock(itemId) {
    setFeedback(`Đang quay lại checkout để chỉnh sửa mục ${itemId}.`)
    goBackToCheckout()
  }

  function removeBookingItemMock(itemId) {
    const nextBookingItems = bookingItems.filter((item) => item.id !== itemId)

    setBookingItems(nextBookingItems)
    setTravellers((currentTravellers) =>
      currentTravellers.filter((traveller, index) => index < nextBookingItems.length),
    )
    setBooking((currentBooking) => {
      if (!currentBooking) {
        return currentBooking
      }

      const nextSubtotalAmount = nextBookingItems.reduce(
        (totalAmount, item) => totalAmount + Number(item.total_amount ?? 0),
        0,
      )
      const taxAndFeeAmount = getTaxAndFeeAmount(currentBooking)
      const discountAmount =
        nextBookingItems.length > 0 ? Number(currentBooking.discount_amount ?? 0) : 0

      return {
        ...currentBooking,
        subtotal_amount: nextSubtotalAmount,
        discount_amount: discountAmount,
        total_amount: Math.max(nextSubtotalAmount + taxAndFeeAmount - discountAmount, 0),
      }
    })
    setFeedback('Đã xóa mục khỏi đơn hàng mock.')
  }

  async function confirmBookingMock() {
    if (!booking) {
      return
    }

    if (bookingItems.length === 0) {
      setFeedback('Đơn hàng hiện chưa có dịch vụ để xác nhận.')
      return
    }

    try {
      const selectedPaymentMethod =
        paymentOptions[0]?.code ?? BOOKING_DEFAULT_PAYMENT_METHOD
      const response = await buildPaymentRedirectPayload(booking, selectedPaymentMethod)

      if (!response.success || !response.data) {
        setFeedback(response.message ?? 'Không thể chuẩn bị thanh toán lúc này.')
        return
      }

      navigate(preserveAuthPath(response.data.next_route, authState), {
        state: {
          booking,
          bookingItems,
          paymentRedirectPayload: response.data,
        },
      })
    } catch (confirmError) {
      setFeedback(confirmError?.message ?? 'Không thể chuẩn bị thanh toán lúc này.')
    }
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
    paymentOptions,
    preserveAuthQuery: (pathname) => preserveAuthPath(pathname, authState),
    travellers,
    viewModel,
    actions: {
      confirmBookingMock,
      copyBookingCode,
      editBookingItemMock,
      goBackToCheckout,
      removeBookingItemMock,
      retry,
    },
  }
}
