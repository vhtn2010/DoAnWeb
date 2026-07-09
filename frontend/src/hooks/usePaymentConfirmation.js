import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { PAYMENT_STATUSES } from '../constants/bookings.js'
import {
  PAYMENT_DEFAULT_CARD_NUMBER,
  PAYMENT_METHOD_CODES,
} from '../constants/payments.js'
import {
  buildPaymentConfirmationViewModel,
  buildPaymentContactForm,
  buildMockQrPayload,
  buildPaymentSummary,
  clonePaymentValue,
  normalizePhoneDisplay,
  validatePaymentConfirmationForm,
} from '../mappers/paymentMappers.js'
import {
  applyPaymentVoucher,
  buildPaymentResultPayload,
  confirmPaymentMock,
  getPaymentByBookingCode,
  getPaymentByCode,
  getPaymentConfirmation,
} from '../repositories/paymentRepository.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

function getUpdatedBookingSummary(booking, paymentSummary) {
  return {
    ...booking,
    subtotal_amount: paymentSummary.subtotal_amount,
    discount_amount: paymentSummary.discount_amount,
    total_amount: paymentSummary.total_amount,
  }
}

export default function usePaymentConfirmation() {
  const location = useLocation()
  const navigate = useNavigate()
  const { paymentCode } = useParams()
  const { authState, isCustomer } = usePublicSession()

  const bookingState = useMemo(
    () => (location.state?.booking ? clonePaymentValue(location.state.booking) : undefined),
    [location.state?.booking],
  )
  const bookingItemsState = useMemo(
    () =>
      Array.isArray(location.state?.bookingItems)
        ? clonePaymentValue(location.state.bookingItems)
        : undefined,
    [location.state?.bookingItems],
  )
  const paymentRedirectPayload = useMemo(
    () =>
      location.state?.paymentRedirectPayload
        ? clonePaymentValue(location.state.paymentRedirectPayload)
        : undefined,
    [location.state?.paymentRedirectPayload],
  )

  const [payment, setPayment] = useState(null)
  const [booking, setBooking] = useState(null)
  const [bookingItems, setBookingItems] = useState([])
  const [paymentMethods, setPaymentMethods] = useState([])
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(PAYMENT_METHOD_CODES.card)
  const [voucherCode, setVoucherCode] = useState('')
  const [paymentSummary, setPaymentSummary] = useState(null)
  const [contactForm, setContactForm] = useState({
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  })
  const [cardNumber, setCardNumber] = useState(PAYMENT_DEFAULT_CARD_NUMBER)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [isPaid, setIsPaid] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadPaymentConfirmation() {
      setLoading(true)
      setError('')
      setFeedback('')
      setFieldErrors({})

      try {
        const sharedParams = {
          authState,
          booking: bookingState,
          bookingItems: bookingItemsState,
          paymentRedirectPayload,
        }
        const response = paymentCode
          ? await getPaymentByCode(paymentCode, sharedParams)
          : paymentRedirectPayload?.booking_code
            ? await getPaymentByBookingCode(paymentRedirectPayload.booking_code, sharedParams)
            : await getPaymentConfirmation(sharedParams)

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          setPayment(null)
          setBooking(null)
          setBookingItems([])
          setPaymentMethods([])
          setPaymentSummary(null)
          setError(response.message ?? 'Không thể tải thông tin thanh toán lúc này.')
          return
        }

        const nextPayment = response.data.payment ?? null
        const nextBooking = response.data.booking ?? null
        const nextBookingItems = Array.isArray(response.data.booking_items)
          ? response.data.booking_items
          : []
        const nextPaymentMethods = Array.isArray(response.data.payment_methods)
          ? response.data.payment_methods
          : []
        const nextPaymentSummary = buildPaymentSummary(response.data.payment_summary ?? {})

        setPayment(nextPayment)
        setBooking(nextBooking)
        setBookingItems(nextBookingItems)
        setPaymentMethods(nextPaymentMethods)
        setSelectedPaymentMethod(
          nextPayment?.payment_method ??
            nextPaymentMethods[0]?.code ??
            PAYMENT_METHOD_CODES.card,
        )
        setVoucherCode(nextPaymentSummary.voucher_code ?? '')
        setPaymentSummary(nextPaymentSummary)
        setContactForm(buildPaymentContactForm(nextBooking))
        setCardNumber(
          nextPayment?.metadata?.preset_card_number ?? PAYMENT_DEFAULT_CARD_NUMBER,
        )
        setIsPaid(nextPayment?.payment_status === PAYMENT_STATUSES.success)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setPayment(null)
        setBooking(null)
        setBookingItems([])
        setPaymentMethods([])
        setPaymentSummary(null)
        setError(loadError?.message ?? 'Không thể tải thông tin thanh toán lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadPaymentConfirmation()

    return () => {
      isActive = false
    }
  }, [authState, bookingItemsState, bookingState, paymentCode, paymentRedirectPayload, reloadToken])

  const viewModel = useMemo(
    () =>
      buildPaymentConfirmationViewModel({
        bookingItems,
        paymentSummary,
      }),
    [bookingItems, paymentSummary],
  )

  const qrPayload = useMemo(
    () =>
      buildMockQrPayload({
        amount: paymentSummary?.total_amount,
        bookingCode: booking?.booking_code,
        currency: paymentSummary?.currency,
        paymentCode: payment?.payment_code,
      }),
    [
      booking?.booking_code,
      payment?.payment_code,
      paymentSummary?.currency,
      paymentSummary?.total_amount,
    ],
  )

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  function selectPaymentMethod(methodCode) {
    setSelectedPaymentMethod(methodCode)
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.selected_payment_method
      return nextErrors
    })
    setFeedback('')
  }

  function updateVoucherCode(event) {
    setVoucherCode(event.target.value)
    setFeedback('')
  }

  function updateContactField(event) {
    const { name, value } = event.target

    setContactForm((currentForm) => ({
      ...currentForm,
      [name]: name === 'contact_phone' ? normalizePhoneDisplay(value) : value,
    }))
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[name]
      return nextErrors
    })
  }

  function updateCardNumber(event) {
    setCardNumber(event.target.value)
    setFieldErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors.card_number
      return nextErrors
    })
  }

  function goBackToBookingConfirmation() {
    const nextRoute = booking?.booking_code
      ? `/booking-confirmation/${booking.booking_code}`
      : '/booking-confirmation'

    navigate(buildPublicAuthPath(nextRoute, isCustomer))
  }

  function goHome() {
    navigate(buildPublicAuthPath('/', isCustomer))
  }

  function removePaymentItemMock(itemId) {
    const nextBookingItems = bookingItems.filter((item) => item.id !== itemId)
    const nextSubtotalAmount = nextBookingItems.reduce(
      (totalAmount, item) => totalAmount + Number(item.total_amount ?? 0),
      0,
    )
    const nextPaymentSummary = buildPaymentSummary({
      ...paymentSummary,
      subtotal_amount: nextSubtotalAmount,
      total_amount:
        nextSubtotalAmount +
        Number(paymentSummary?.tax_and_fee_amount ?? 0) -
        Number(paymentSummary?.discount_amount ?? 0),
    })

    setBookingItems(nextBookingItems)
    setPaymentSummary(nextPaymentSummary)
    setBooking((currentBooking) =>
      currentBooking ? getUpdatedBookingSummary(currentBooking, nextPaymentSummary) : currentBooking,
    )
    setFeedback('Đã xóa mục khỏi dữ liệu thanh toán mock.')
  }

  async function applyVoucherMock() {
    if (!paymentSummary) {
      return
    }

    try {
      const response = await applyPaymentVoucher(voucherCode, paymentSummary)

      if (!response.success || !response.data) {
        setFeedback(response.message ?? 'Không thể áp dụng mã ưu đãi lúc này.')
        return
      }

      setVoucherCode(response.data.voucher_code)
      setPaymentSummary(buildPaymentSummary(response.data.payment_summary))
      setBooking((currentBooking) =>
        currentBooking
          ? {
              ...currentBooking,
              discount_amount: response.data.discount_amount,
              total_amount: response.data.payment_summary.total_amount,
            }
          : currentBooking,
      )
      setFeedback(response.message)
    } catch (applyError) {
      setFeedback(applyError?.message ?? 'Không thể áp dụng mã ưu đãi lúc này.')
    }
  }

  async function confirmPaymentActionMock() {
    const nextErrors = validatePaymentConfirmationForm({
      contactForm,
      cardNumber,
      selectedPaymentMethod,
    })

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setFeedback('Vui lòng hoàn thiện thông tin thanh toán mock trước khi tiếp tục.')
      return
    }

    setFieldErrors({})

    try {
      const response = await confirmPaymentMock({
        payment_id: payment?.id,
        payment_code: payment?.payment_code,
        booking_id: booking?.id ?? booking?.booking_id,
        booking_code: booking?.booking_code,
        selected_payment_method: selectedPaymentMethod,
        payment_summary: paymentSummary,
        contact_form: contactForm,
        card_number: cardNumber,
      })

      if (!response.success || !response.data) {
        setFeedback(response.message ?? 'Không thể ghi nhận thanh toán lúc này.')
        return
      }

      const nextPayment = {
        ...payment,
        payment_method: selectedPaymentMethod,
        payment_status: response.data.payment_status,
        paid_at: response.data.paid_at,
        amount: paymentSummary?.total_amount ?? payment?.amount ?? 0,
        metadata: {
          ...(payment?.metadata ?? {}),
          preset_card_number: cardNumber,
        },
      }

      const nextBooking = booking
        ? {
            ...booking,
            contact_name: contactForm.contact_name,
            contact_email: contactForm.contact_email,
            contact_phone: contactForm.contact_phone,
            booking_status: response.data.booking_status,
            payment_status: response.data.payment_status,
            total_amount: paymentSummary?.total_amount ?? booking.total_amount,
            discount_amount: paymentSummary?.discount_amount ?? booking.discount_amount,
          }
        : booking

      setPayment(nextPayment)
      setBooking(nextBooking)
      setIsPaid(true)

      const resultPayload = await buildPaymentResultPayload(nextPayment)
      navigate(buildPublicAuthPath('/payment-success', isCustomer), {
        state: {
          booking: nextBooking,
          bookingItems,
          payment: nextPayment,
          paymentResultPayload: resultPayload.data,
        },
      })
    } catch (confirmError) {
      setFeedback(confirmError?.message ?? 'Không thể ghi nhận thanh toán lúc này.')
    }
  }

  return {
    authState,
    booking,
    bookingItems,
    cardNumber,
    contactForm,
    error,
    feedback,
    fieldErrors,
    isPaid,
    loading,
    payment,
    paymentMethods,
    paymentSummary,
    qrPayload,
    preserveAuthQuery: (pathname) => buildPublicAuthPath(pathname, isCustomer),
    selectedPaymentMethod,
    viewModel,
    voucherCode,
    actions: {
      applyVoucherMock,
      confirmPaymentMock: confirmPaymentActionMock,
      goBackToBookingConfirmation,
      goHome,
      removePaymentItemMock,
      retry,
      selectPaymentMethod,
      updateCardNumber,
      updateContactField,
      updateVoucherCode,
    },
  }
}
