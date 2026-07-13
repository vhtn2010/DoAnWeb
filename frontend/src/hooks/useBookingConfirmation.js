import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  buildBookingConfirmationFromCheckoutHandoff,
  buildBookingConfirmationViewModel,
} from '../mappers/bookingMappers.js'
import { getActiveCart } from '../repositories/cartRepository.js'
import {
  downloadMyBookingSummary,
  getBookingByCode,
  getBookingConfirmation,
  getMyBookingInvoice,
  getMyBookingStatusHistory,
  requestBookingCancellation,
} from '../repositories/bookingRepository.js'
import {
  cancelCustomerRefundRequest,
  createCustomerRefundRequest,
  getCustomerPaymentProof,
  getCustomerRefundDetail,
  listCustomerBookingPayments,
  listCustomerBookingRefunds,
} from '../repositories/paymentRepository.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'
import {
  getSubmittedPaymentProof,
  hasSubmittedPaymentProof,
  isBookingAwaitingAdminReview,
  pickLatestPayment,
} from '../utils/paymentReviewStatus.js'

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

function createRefundDraftState() {
  return {
    amount: '',
    paymentId: '',
    reason: '',
  }
}

function createServiceFeedbackState() {
  return {
    message: '',
    tone: 'info',
  }
}

function extractPayments(response = {}) {
  if (Array.isArray(response.data)) {
    return response.data
  }

  if (Array.isArray(response.data?.payments)) {
    return response.data.payments
  }

  return []
}

function createPaymentReviewState() {
  return {
    isAwaitingAdminReview: false,
    latestPayment: null,
    proof: null,
  }
}

async function loadPaymentReviewState(booking = {}) {
  if (!booking.id || booking.booking_status !== 'pending_payment') {
    return createPaymentReviewState()
  }

  try {
    const paymentsResponse = await listCustomerBookingPayments(booking.id)
    const latestPayment = pickLatestPayment(extractPayments(paymentsResponse))

    if (!latestPayment?.id || hasSubmittedPaymentProof(latestPayment)) {
      const proof = getSubmittedPaymentProof(latestPayment)

      return {
        isAwaitingAdminReview: isBookingAwaitingAdminReview({
          ...booking,
          latest_payment: latestPayment,
          payment_proof: proof,
        }),
        latestPayment,
        proof,
      }
    }

    const proofResponse = await getCustomerPaymentProof(latestPayment.id).catch(() => ({
      data: {
        proof: null,
      },
    }))
    const proof = proofResponse.data?.proof ?? null

    return {
      isAwaitingAdminReview: isBookingAwaitingAdminReview({
        ...booking,
        latest_payment: latestPayment,
        payment_proof: proof,
      }),
      latestPayment,
      proof,
    }
  } catch {
    return createPaymentReviewState()
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
  const [statusHistory, setStatusHistory] = useState([])
  const [invoice, setInvoice] = useState(null)
  const [refunds, setRefunds] = useState([])
  const [selectedRefund, setSelectedRefund] = useState(null)
  const [extraLoading, setExtraLoading] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [cancellationLoading, setCancellationLoading] = useState(false)
  const [refundLoading, setRefundLoading] = useState(false)
  const [cancellationReason, setCancellationReason] = useState('')
  const [refundDraft, setRefundDraft] = useState(createRefundDraftState)
  const [serviceFeedback, setServiceFeedback] = useState(createServiceFeedbackState)
  const [paymentReview, setPaymentReview] = useState(createPaymentReviewState)
  const isCheckoutDraftConfirmation = !bookingCode && !location.state?.bookingId

  useEffect(() => {
    let isActive = true

    async function loadBookingConfirmation() {
      setLoading(true)
      setError('')
      setFeedback('')

      try {
        if (isCheckoutDraftConfirmation) {
          const cartResponse = await getActiveCart({ authState })
          const handoff = buildBookingConfirmationFromCheckoutHandoff({
            authState,
            cartSnapshot: cartResponse.data,
            selectedCartItemIds: location.state?.selectedCartItemIds,
            cartSummaryPayload: location.state?.cartSummaryPayload,
          })

          if (!isActive) {
            return
          }

          setBooking(normalizeBooking({
            ...handoff.booking,
            booking_code: 'CHO-XAC-NHAN',
            booking_status: 'draft',
            status: 'draft',
          }))
          setBookingItems(normalizeBookingItems(handoff.booking_items))
          setRefunds([])
          setPaymentReview(createPaymentReviewState())
          return
        }

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
          setStatusHistory([])
          setInvoice(null)
          setRefunds([])
          setSelectedRefund(null)
          setPaymentReview(createPaymentReviewState())
          setError(
            response.message ?? 'Không thể tải thông tin xác nhận đơn hàng lúc này.',
          )
          return
        }

        const nextBooking = normalizeBooking(response.data.booking)
        const nextPaymentReview = await loadPaymentReviewState(nextBooking)

        if (!isActive) {
          return
        }

        setBooking(nextBooking)
        setBookingItems(normalizeBookingItems(response.data.booking_items))
        setRefunds(Array.isArray(nextBooking.refunds) ? nextBooking.refunds : [])
        setPaymentReview(nextPaymentReview)

        if (nextPaymentReview.isAwaitingAdminReview) {
          setFeedback('Bill thanh toán đã được gửi. Đơn hàng đang chờ admin kiểm tra và duyệt.')
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setBooking(null)
        setBookingItems([])
        setStatusHistory([])
        setInvoice(null)
        setRefunds([])
        setSelectedRefund(null)
        setPaymentReview(createPaymentReviewState())
        setError(
          loadError?.message ?? 'Không thể tải thông tin xác nhận đơn hàng lúc này.',
        )
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
  }, [
    authState,
    bookingCode,
    isCheckoutDraftConfirmation,
    location.state?.bookingId,
    location.state?.cartSummaryPayload,
    location.state?.selectedCartItemIds,
    reloadToken,
  ])

  useEffect(() => {
    if (isCheckoutDraftConfirmation || authState !== 'customer' || !booking?.id) {
      setStatusHistory([])
      setInvoice(null)
      setSelectedRefund(null)
      return
    }

    let isActive = true

    async function loadSelfServiceData() {
      setExtraLoading(true)

      try {
        const [statusHistoryResponse, invoiceResponse, refundsResponse] = await Promise.all([
          getMyBookingStatusHistory(booking.id),
          getMyBookingInvoice(booking.id),
          listCustomerBookingRefunds(booking.id).catch(() => ({
            data: {
              refunds: Array.isArray(booking.refunds) ? booking.refunds : [],
            },
          })),
        ])

        if (!isActive) {
          return
        }

        setStatusHistory(
          Array.isArray(statusHistoryResponse.data) ? statusHistoryResponse.data : [],
        )
        setInvoice(invoiceResponse.data ?? null)
        setRefunds(
          Array.isArray(refundsResponse.data?.refunds)
            ? refundsResponse.data.refunds
            : Array.isArray(booking.refunds)
              ? booking.refunds
              : [],
        )
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setServiceFeedback({
          message:
            loadError?.message ||
            'Không thể đồng bộ các công cụ tự phục vụ của đơn hàng.',
          tone: 'error',
        })
      } finally {
        if (isActive) {
          setExtraLoading(false)
        }
      }
    }

    loadSelfServiceData()

    return () => {
      isActive = false
    }
  }, [authState, booking?.id, booking?.refunds, isCheckoutDraftConfirmation, reloadToken])

  const viewModel = useMemo(
    () =>
      buildBookingConfirmationViewModel({
        booking,
        bookingItems,
        paymentOptions: [],
      }),
    [booking, bookingItems],
  )

  const canContinueToPayment =
    (isCheckoutDraftConfirmation || booking?.booking_status === 'pending_payment') &&
    !paymentReview.isAwaitingAdminReview

  function retry() {
    setReloadToken((currentToken) => currentToken + 1)
  }

  function goBackToCart() {
    navigate(buildPublicAuthPath('/cart', isCustomer))
  }

  function editBookingItem(itemId) {
    if (isCheckoutDraftConfirmation) {
      navigate(buildPublicAuthPath('/cart', isCustomer), {
        state: {
          selectedCartItemIds: location.state?.selectedCartItemIds,
        },
      })
      return
    }

    setFeedback(
      `Đơn hàng ${booking?.booking_code ?? ''} đã được tạo trên hệ thống. Để thay đổi mục ${itemId}, vui lòng quay lại giỏ trước khi checkout hoặc liên hệ chăm sóc khách hàng.`,
    )
  }

  function removeBookingItem(itemId) {
    if (isCheckoutDraftConfirmation) {
      setFeedback('Vui lòng quay lại giỏ hàng để bỏ chọn hoặc xóa dịch vụ này.')
      return
    }

    setFeedback(
      `Hiện hệ thống chưa hỗ trợ xóa trực tiếp mục ${itemId} sau khi checkout. Bạn có thể mở hỗ trợ để được xử lý tiếp.`,
    )
  }

  function confirmBooking() {
    if (!booking) {
      return
    }

    if (isCheckoutDraftConfirmation) {
      navigate(buildPublicAuthPath('/checkout', isCustomer), {
        state: {
          cartSummaryPayload: location.state?.cartSummaryPayload,
          selectedCartItemIds: location.state?.selectedCartItemIds,
        },
      })
      return
    }

    if (paymentReview.isAwaitingAdminReview) {
      setFeedback('Bill thanh toán đã được gửi. Đơn hàng đang chờ admin kiểm tra và duyệt.')
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

  function reloadSelfService() {
    setServiceFeedback(createServiceFeedbackState())
    setReloadToken((currentToken) => currentToken + 1)
  }

  function handleCancellationReasonChange(event) {
    setCancellationReason(event.target.value)
    setServiceFeedback(createServiceFeedbackState())
  }

  function handleRefundDraftChange(event) {
    const { name, value } = event.target

    setRefundDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
    }))
    setServiceFeedback(createServiceFeedbackState())
  }

  async function submitCancellationRequest(event) {
    event.preventDefault()

    const reason = cancellationReason.trim()

    if (!booking?.id || !reason) {
      setServiceFeedback({
        message: 'Vui lòng nhập lý do trước khi gửi yêu cầu hủy đơn.',
        tone: 'error',
      })
      return
    }

    setCancellationLoading(true)

    try {
      const response = await requestBookingCancellation(booking.id, { reason })

      setCancellationReason('')
      setServiceFeedback({
        message: response?.message || 'Yêu cầu hủy đơn đã được gửi thành công.',
        tone: 'success',
      })
      setReloadToken((currentToken) => currentToken + 1)
    } catch (submitError) {
      setServiceFeedback({
        message: submitError?.message || 'Không thể gửi yêu cầu hủy đơn lúc này.',
        tone: 'error',
      })
    } finally {
      setCancellationLoading(false)
    }
  }

  async function submitRefundRequest(event) {
    event.preventDefault()

    if (!booking?.id) {
      return
    }

    const amount = Number(refundDraft.amount)
    const paymentId = String(refundDraft.paymentId ?? '').trim()
    const reason = refundDraft.reason.trim()

    if (!paymentId || !Number.isFinite(amount) || amount <= 0 || !reason) {
      setServiceFeedback({
        message: 'Vui lòng chọn thanh toán, nhập số tiền hoàn hợp lệ và lý do.',
        tone: 'error',
      })
      return
    }

    setRefundLoading(true)

    try {
      const response = await createCustomerRefundRequest(booking.id, {
        amount,
        payment_id: paymentId,
        reason,
      })

      setRefundDraft(createRefundDraftState())
      setServiceFeedback({
        message: response?.message || 'Yêu cầu hoàn tiền đã được ghi nhận.',
        tone: 'success',
      })
      setReloadToken((currentToken) => currentToken + 1)
    } catch (submitError) {
      setServiceFeedback({
        message:
          submitError?.message || 'Không thể tạo yêu cầu hoàn tiền lúc này.',
        tone: 'error',
      })
    } finally {
      setRefundLoading(false)
    }
  }

  async function openRefundDetail(refundId) {
    try {
      const response = await getCustomerRefundDetail(refundId)
      setSelectedRefund(response.data?.refund ?? response.data ?? null)
      setServiceFeedback({
        message: 'Đã tải chi tiết yêu cầu hoàn tiền.',
        tone: 'success',
      })
    } catch (detailError) {
      setServiceFeedback({
        message:
          detailError?.message || 'Không thể tải chi tiết yêu cầu hoàn tiền.',
        tone: 'error',
      })
    }
  }

  async function cancelRefundRequest(refundId) {
    try {
      const response = await cancelCustomerRefundRequest(refundId, {
        reason: 'Khách hàng chủ động hủy yêu cầu hoàn tiền.',
      })

      setSelectedRefund(response.data?.refund ?? null)
      setServiceFeedback({
        message: response?.message || 'Yêu cầu hoàn tiền đã được hủy.',
        tone: 'success',
      })
      setReloadToken((currentToken) => currentToken + 1)
    } catch (cancelError) {
      setServiceFeedback({
        message:
          cancelError?.message || 'Không thể hủy yêu cầu hoàn tiền lúc này.',
        tone: 'error',
      })
    }
  }

  async function handleDownloadBookingSummary() {
    if (!booking?.id) {
      return
    }

    setSummaryLoading(true)

    try {
      const downloadPayload = await downloadMyBookingSummary(booking.id)
      const objectUrl = URL.createObjectURL(downloadPayload.blob)
      const downloadLink = document.createElement('a')

      downloadLink.href = objectUrl
      downloadLink.download = downloadPayload.filename || 'booking-summary.pdf'
      document.body.appendChild(downloadLink)
      downloadLink.click()
      document.body.removeChild(downloadLink)
      URL.revokeObjectURL(objectUrl)

      setServiceFeedback({
        message: 'Đã chuẩn bị tệp tóm tắt đơn hàng để tải xuống.',
        tone: 'success',
      })
    } catch (downloadError) {
      setServiceFeedback({
        message:
          downloadError?.message || 'Không thể tải tóm tắt đơn hàng lúc này.',
        tone: 'error',
      })
    } finally {
      setSummaryLoading(false)
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
    selfService: {
      cancellationLoading,
      cancellationReason,
      extraLoading,
      feedback: serviceFeedback,
      invoice,
      refundDraft,
      refundLoading,
      refunds,
      selectedRefund,
      statusHistory,
      summaryLoading,
    },
    viewModel,
    actions: {
      canContinueToPayment,
      cancelRefundRequest,
      confirmBooking,
      copyBookingCode,
      downloadBookingSummary: handleDownloadBookingSummary,
      editBookingItem,
      goBackToCart,
      handleCancellationReasonChange,
      handleRefundDraftChange,
      openRefundDetail,
      reloadSelfService,
      removeBookingItem,
      retry,
      submitCancellationRequest,
      submitRefundRequest,
      isAwaitingAdminReview: paymentReview.isAwaitingAdminReview,
    },
  }
}
