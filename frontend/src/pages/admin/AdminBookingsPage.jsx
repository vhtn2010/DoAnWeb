import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AdminSearchInput,
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingBlock,
  AdminPagination,
  AdminTextarea,
} from '../../components/admin/ui/index.js'
import { LocalLoading } from '../../components/loading/Loading.jsx'
import {
  ADMIN_BOOKING_STATUSES,
  ADMIN_BOOKING_STATUS_OPTIONS,
} from '../../constants/adminBookings.js'
import useAdminBookings from '../../hooks/useAdminBookings.js'
import { mapAdminBookingDetail } from '../../mappers/adminBookingMappers.js'
import { getAdminBookingDetail } from '../../repositories/adminBookingRepository.js'
import {
  confirmAdminPayment,
  rejectAdminPayment,
} from '../../repositories/adminPaymentRepository.js'
import { getAdminVoucherDetail } from '../../repositories/adminUtilityRepository.js'
import { requestAdminConfirmation } from '../../utils/adminActionConfirmation.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')
const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} Đ`
}

function formatDisplayDateTime(value) {
  if (!value) {
    return 'Chưa có dữ liệu'
  }

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? 'Chưa có dữ liệu' : dateTimeFormatter.format(date)
}

function getPaymentActionErrorMessage(error, fallbackMessage) {
  const validationDetails = Array.isArray(error?.details) ? error.details : []
  const receivedAtError = validationDetails.find((detail) => detail?.field === 'received_at')

  if (receivedAtError) {
    return 'Không xác định được thời gian nhận tiền. Vui lòng tải lại đơn hàng và thử phê duyệt lại.'
  }

  const receivedAmountError = validationDetails.find(
    (detail) => detail?.field === 'received_amount',
  )

  if (receivedAmountError) {
    return 'Số tiền xác nhận không hợp lệ. Vui lòng kiểm tra lại giao dịch.'
  }

  if (error?.message === 'Validation failed') {
    return fallbackMessage
  }

  return error?.message || fallbackMessage
}

function BookingIcon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    className: 'admin-booking-icon',
    fill: 'none',
    focusable: 'false',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 2,
    viewBox: '0 0 24 24',
  }

  switch (name) {
    case 'calendar':
      return (
        <svg {...commonProps}>
          <path d="M8 2v4" />
          <path d="M16 2v4" />
          <path d="M3 10h18" />
          <rect x="3" y="5" width="18" height="16" rx="2" />
        </svg>
      )
    case 'check':
      return (
        <svg {...commonProps}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      )
    case 'chevron-left':
      return (
        <svg {...commonProps}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      )
    case 'chevron-right':
      return (
        <svg {...commonProps}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      )
    case 'clock':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      )
    case 'hotel':
      return (
        <svg {...commonProps}>
          <path d="M3 20V8" />
          <path d="M21 20V10" />
          <path d="M3 14h18" />
          <path d="M7 14v-3a3 3 0 0 1 6 0v3" />
          <path d="M3 20h18" />
        </svg>
      )
    case 'location':
      return (
        <svg {...commonProps}>
          <path d="M12 21s7-5.1 7-11a7 7 0 1 0-14 0c0 5.9 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.2" />
        </svg>
      )
    case 'mail':
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3 7 9 6 9-6" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...commonProps}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.4 2.1L8.1 9.5a16 16 0 0 0 6.4 6.4l1.2-1.2a2 2 0 0 1 2.1-.4c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z" />
        </svg>
      )
    case 'transport':
      return (
        <svg {...commonProps}>
          <path d="M2 16 22 8" />
          <path d="m15 5 5 3-5 3" />
          <path d="M8 13 5 5" />
          <path d="m12 12-3 8" />
        </svg>
      )
    case 'user':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      )
    case 'users':
      return (
        <svg {...commonProps}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
          <path d="M16 3.1a4 4 0 0 1 0 7.8" />
        </svg>
      )
    case 'x':
      return (
        <svg {...commonProps}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      )
    default:
      return null
  }
}

function BookingInfoItem({ icon, label, value }) {
  return (
    <p className="admin-booking-card__info-item">
      <BookingIcon name={icon} />
      <span>
        <strong>{label}:</strong> {value}
      </span>
    </p>
  )
}

function getStatusDisplayIcon(tone) {
  if (tone === 'danger') {
    return 'x'
  }

  if (tone === 'success' || tone === 'brand' || tone === 'confirmed') {
    return 'check'
  }

  return 'clock'
}

function DetailField({ label, value }) {
  return (
    <div className="admin-booking-detail-modal__field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function getBookingAmounts(booking) {
  const safeBooking = booking ?? {}
  const finalAmount = Number(safeBooking.totalAmount || 0)
  const rawSubtotalAmount = Number(safeBooking.subtotalAmount || 0)
  const rawDiscountAmount = Number(safeBooking.discountAmount || 0)
  const originalAmount = Math.max(rawSubtotalAmount, finalAmount + rawDiscountAmount, finalAmount)
  const discountAmount = Math.max(originalAmount - finalAmount, rawDiscountAmount, 0)
  const hasDiscount = discountAmount > 0 && originalAmount > finalAmount

  return {
    discountAmount,
    finalAmount,
    hasDiscount,
    originalAmount,
  }
}

function getVoucherDiscountLabel(voucher) {
  if (!voucher) {
    return ''
  }

  if (voucher.discount_type === 'percent') {
    const maxDiscountLabel = voucher.max_discount_amount
      ? `, tối đa ${formatCurrency(voucher.max_discount_amount)}`
      : ''

    return `${Number(voucher.discount_value || 0)}%${maxDiscountLabel}`
  }

  return formatCurrency(voucher.discount_value)
}

function getBookingDiscountContent(booking, voucherDetail) {
  const { hasDiscount } = getBookingAmounts(booking)

  if (!hasDiscount) {
    return null
  }

  if (voucherDetail) {
    const voucherCode = voucherDetail.code || 'voucher của đơn hàng'
    const promotionName = voucherDetail.promotion?.name
      ? `, thuộc chương trình ${voucherDetail.promotion.name}`
      : ''
    const voucherDiscountLabel = getVoucherDiscountLabel(voucherDetail)
    const valueLabel = voucherDiscountLabel ? ` (${voucherDiscountLabel})` : ''

    return {
      label: 'Đang được áp voucher:',
      value: `${voucherCode}${valueLabel}${promotionName}.`,
    }
  }

  if (booking?.voucherId) {
    return {
      label: 'Đang được áp voucher:',
      value: 'Voucher của đơn hàng này đã được áp dụng trước khi chốt thanh toán.',
    }
  }

  return {
    label: 'Đang hưởng ưu đãi:',
    value: 'Mức ưu đãi của đơn hàng đã được trừ trực tiếp vào tổng thanh toán.',
  }
}

function getBookingStatusGuidance(booking) {
  if (!booking) {
    return null
  }

  const reviewSubmittedAt = booking.reviewPayment?.submittedAt
  const defaultNote = booking.note || 'Chưa có ghi chú bổ sung.'
  const departureValue = booking.departureLabel || 'Chưa có dữ liệu'
  const returnValue = booking.returnLabel || 'Chưa có dữ liệu'

  if (booking.reviewPayment) {
    return {
      detailLabel: 'Thời gian gửi bill',
      detailValue: formatDisplayDateTime(reviewSubmittedAt),
      tone: 'review',
      title: 'Chờ duyệt chứng từ',
      description:
        'Khách đã gửi bill chuyển khoản. Vui lòng đối soát số tiền, nội dung chuyển khoản và ảnh chứng từ trước khi phê duyệt hoặc từ chối.',
    }
  }

  switch (booking.status) {
    case ADMIN_BOOKING_STATUSES.pendingPayment:
      return {
        detailLabel: 'Ghi chú',
        detailValue: defaultNote,
        tone: 'info',
        title: 'Chờ khách thanh toán',
        description:
          'Đơn chưa có chứng từ hợp lệ. Khách cần hoàn tất thanh toán hoặc gửi lại bill trước khi admin xử lý tiếp.',
      }
    case ADMIN_BOOKING_STATUSES.paid:
    case ADMIN_BOOKING_STATUSES.confirmed:
      return {
        detailLabel: 'Ngày khởi hành',
        detailValue: departureValue,
        tone: 'confirmed',
        title: 'Đơn đã xác nhận',
        description:
          'Thanh toán đã được ghi nhận. Hành trình đã sẵn sàng và sẽ được phục vụ theo lịch khởi hành.',
      }
    case ADMIN_BOOKING_STATUSES.inProgress:
      return {
        detailLabel: 'Ngày kết thúc dự kiến',
        detailValue: returnValue,
        tone: 'brand',
        title: 'Chuyến đang diễn ra',
        description:
          'Dịch vụ đang trong thời gian phục vụ. Chỉ đánh dấu hoàn thành khi hành trình hoặc dịch vụ đã kết thúc.',
      }
    case ADMIN_BOOKING_STATUSES.completed:
      return {
        detailLabel: 'Ngày hoàn tất',
        detailValue: returnValue,
        tone: 'success',
        title: 'Đơn đã hoàn thành',
        description:
          'Hành trình đã kết thúc và đơn được lưu vào lịch sử. Chỉ kiểm tra lại khi có yêu cầu hỗ trợ sau chuyến đi.',
      }
    case ADMIN_BOOKING_STATUSES.cancelRequested:
      return {
        detailLabel: 'Ghi chú',
        detailValue: defaultNote,
        tone: 'warning',
        title: 'Khách yêu cầu hủy',
        description:
          'Vui lòng kiểm tra điều kiện hủy, chính sách hoàn tiền và liên hệ khách trước khi xác nhận hủy đơn.',
      }
    case ADMIN_BOOKING_STATUSES.cancelled:
      return {
        detailLabel: 'Ghi chú',
        detailValue: defaultNote,
        tone: 'danger',
        title: 'Đơn đã hủy',
        description:
          'Đơn không còn hiệu lực. Thông tin được giữ lại để đối soát và hỗ trợ khi cần.',
      }
    default:
      return {
        detailLabel: 'Ghi chú',
        detailValue: defaultNote,
        tone: booking.statusTone || 'neutral',
        title: booking.statusLabel || 'Trạng thái đơn hàng',
        description:
          'Vui lòng kiểm tra thông tin đơn và xử lý theo đúng trạng thái hiện tại trên hệ thống.',
      }
  }
}

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase()
}

const VISIBLE_BOOKING_STATUS_VALUES = new Set([
  ADMIN_BOOKING_STATUSES.all,
  ADMIN_BOOKING_STATUSES.pendingPayment,
  ADMIN_BOOKING_STATUSES.confirmed,
  ADMIN_BOOKING_STATUSES.inProgress,
  ADMIN_BOOKING_STATUSES.completed,
  ADMIN_BOOKING_STATUSES.cancelRequested,
  ADMIN_BOOKING_STATUSES.cancelled,
])

function AdminBookingsPage() {
  const { currentPermissions, currentRole } = useOutletContext()
  const {
    bookings,
    currentPage,
    error,
    feedback,
    getBookingActions,
    isBookingActionLoading,
    loading,
    pageNumbers,
    paginationMeta,
    reloadBookings,
    setCurrentPage,
    statusFilter,
    updateBookingAction,
    updateStatusFilter,
  } = useAdminBookings()
  const canWriteBookings = hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.bookingsWrite,
    currentPermissions,
  )
  const canProcessPayments = hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.paymentsProcess,
    currentPermissions,
  )
  const canReadVouchers = hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.vouchersRead,
    currentPermissions,
  )
  const currentBookings = bookings
  const totalPages = paginationMeta.totalPages
  const [activeBooking, setActiveBooking] = useState(null)
  const [detailBooking, setDetailBooking] = useState(null)
  const [detailError, setDetailError] = useState('')
  const [detailLoading, setDetailLoading] = useState(false)
  const [paymentActionLoading, setPaymentActionLoading] = useState(false)
  const [paymentActionType, setPaymentActionType] = useState('')
  const [paymentFeedback, setPaymentFeedback] = useState('')
  const [paymentRejectReason, setPaymentRejectReason] = useState('')
  const [paymentRejectReasonError, setPaymentRejectReasonError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [voucherDetail, setVoucherDetail] = useState(null)

  useEffect(() => {
    if (!activeBooking) {
      return undefined
    }

    let isActive = true

    async function loadBookingDetail() {
      setDetailLoading(true)
      setDetailError('')
      setDetailBooking(null)
      setPaymentFeedback('')
      setPaymentRejectReason('')
      setPaymentRejectReasonError('')
      setVoucherDetail(null)

      try {
        const response = await getAdminBookingDetail(activeBooking.id)

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Không thể tải chi tiết đơn hàng lúc này.')
        }

        const mappedBooking = mapAdminBookingDetail(response.data)

        setDetailBooking(mappedBooking)

        if (canReadVouchers && mappedBooking.voucherId) {
          try {
            const voucherResponse = await getAdminVoucherDetail(mappedBooking.voucherId)

            if (!isActive) {
              return
            }

            if (voucherResponse?.success && voucherResponse.data) {
              setVoucherDetail(voucherResponse.data)
            }
          } catch {
            if (!isActive) {
              return
            }

            setVoucherDetail(null)
          }
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setDetailError(loadError?.message ?? 'Không thể tải chi tiết đơn hàng lúc này.')
      } finally {
        if (isActive) {
          setDetailLoading(false)
        }
      }
    }

    loadBookingDetail()

    return () => {
      isActive = false
    }
  }, [activeBooking, canReadVouchers])

  useEffect(() => {
    if (!activeBooking) {
      return undefined
    }

    function closeOnEscape(event) {
      if (event.key === 'Escape') {
        setActiveBooking(null)
      }
    }

    window.addEventListener('keydown', closeOnEscape)

    return () => {
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [activeBooking])

  function openBookingDetail(booking) {
    setDetailBooking(null)
    setDetailError('')
    setPaymentFeedback('')
    setPaymentRejectReason('')
    setPaymentRejectReasonError('')
    setVoucherDetail(null)
    setActiveBooking(booking)
  }

  function handleOpenZoneKeyDown(event, booking) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openBookingDetail(booking)
    }
  }

  async function handleApprovePayment(booking, reviewPayment) {
    if (!reviewPayment?.id) {
      setPaymentFeedback('Không tìm thấy giao dịch chuyển khoản của đơn này.')
      return
    }

    const receivedAmount = Number(reviewPayment.amount)

    if (!Number.isFinite(receivedAmount) || receivedAmount <= 0) {
      setPaymentFeedback('Số tiền thanh toán không hợp lệ, không thể phê duyệt.')
      return
    }

    if (!reviewPayment.proof?.proof_image_url) {
      setPaymentFeedback('Giao dịch chưa có ảnh bill để phê duyệt.')
      return
    }

    if (
      !requestAdminConfirmation(
        `Xác nhận đã đối soát bill và nhận ${formatCurrency(receivedAmount)} cho đơn ${booking.bookingCode}?`,
      )
    ) {
      return
    }

    setPaymentActionLoading(true)
    setPaymentActionType('approve')
    setPaymentFeedback('')
    setPaymentRejectReasonError('')

    try {
      const response = await confirmAdminPayment(reviewPayment.id, {
        collector_note: `Admin xác nhận đã nhận tiền cho đơn ${booking.bookingCode}.`,
        next_booking_status: ADMIN_BOOKING_STATUSES.confirmed,
        received_amount: receivedAmount,
        received_at: new Date().toISOString(),
      })

      if (!response.success) {
        throw new Error(response.message || 'Không thể phê duyệt thanh toán lúc này.')
      }

      setPaymentFeedback('Đã phê duyệt thanh toán. Đơn hàng đã chuyển sang trạng thái đã xác nhận.')
      setDetailBooking((currentBooking) =>
        currentBooking
          ? {
              ...currentBooking,
              reviewPayment: null,
              status: ADMIN_BOOKING_STATUSES.confirmed,
              statusLabel: 'Đã xác nhận',
              statusTone: 'confirmed',
            }
          : currentBooking,
      )
      reloadBookings()
      setActiveBooking(null)
    } catch (approveError) {
      setPaymentFeedback(
        getPaymentActionErrorMessage(
          approveError,
          'Không thể phê duyệt thanh toán lúc này.',
        ),
      )
    } finally {
      setPaymentActionLoading(false)
      setPaymentActionType('')
    }
  }

  async function handleRejectPayment(_booking, reviewPayment) {
    if (!reviewPayment?.id) {
      setPaymentFeedback('Không tìm thấy giao dịch chuyển khoản của đơn này.')
      return
    }

    const normalizedReason = paymentRejectReason.trim()

    if (!normalizedReason) {
      setPaymentRejectReasonError('Vui lòng nhập lý do từ chối bill trước khi tiếp tục.')
      setPaymentFeedback('')
      return
    }

    if (!requestAdminConfirmation('Xác nhận từ chối bill chuyển khoản này?')) {
      return
    }

    setPaymentActionLoading(true)
    setPaymentActionType('reject')
    setPaymentFeedback('')
    setPaymentRejectReasonError('')

    try {
      const response = await rejectAdminPayment(reviewPayment.id, {
        reason: normalizedReason,
      })

      if (!response.success) {
        throw new Error(response.message || 'Không thể từ chối bill chuyển khoản lúc này.')
      }

      setPaymentFeedback('Đã từ chối bill chuyển khoản và đưa đơn hàng về trạng thái chờ thanh toán.')
      setPaymentRejectReason('')
      setDetailBooking((currentBooking) =>
        currentBooking
          ? {
              ...currentBooking,
              note: currentBooking.note
                ? `${currentBooking.note} | Từ chối bill: ${normalizedReason}`
                : `Từ chối bill: ${normalizedReason}`,
              reviewPayment: null,
              status: ADMIN_BOOKING_STATUSES.pendingPayment,
              statusLabel: 'Chờ thanh toán',
              statusTone: 'info',
            }
          : currentBooking,
      )
      reloadBookings()
    } catch (rejectError) {
      setPaymentFeedback(
        getPaymentActionErrorMessage(
          rejectError,
          'Không thể từ chối bill chuyển khoản lúc này.',
        ),
      )
    } finally {
      setPaymentActionLoading(false)
      setPaymentActionType('')
    }
  }

  async function handleDetailBookingAction(booking, action) {
    const didUpdate = await updateBookingAction(booking, action)

    if (!didUpdate) {
      return
    }

    if (action === 'cancel') {
      setActiveBooking(null)
    }
  }

  const modalBooking = detailBooking ?? activeBooking
  const modalBookingAmounts = getBookingAmounts(modalBooking)
  const modalBookingDiscount = getBookingDiscountContent(modalBooking, voucherDetail)
  const modalReviewPayment = modalBooking?.reviewPayment ?? null
  const modalReviewProof = modalReviewPayment?.proof ?? null
  const modalBookingActions = modalReviewPayment ? [] : getBookingActions(modalBooking?.status)
  const modalStatusGuidance = getBookingStatusGuidance(modalBooking)
  const visibleStatusOptions = useMemo(
    () =>
      ADMIN_BOOKING_STATUS_OPTIONS.filter((option) =>
        VISIBLE_BOOKING_STATUS_VALUES.has(option.value),
      ),
    [],
  )
  const normalizedSearchQuery = normalizeSearchText(searchQuery)
  const filteredBookings = useMemo(() => {
    if (!normalizedSearchQuery) {
      return currentBookings
    }

    return currentBookings.filter((booking) =>
      normalizeSearchText(booking.bookingCode).includes(normalizedSearchQuery),
    )
  }, [currentBookings, normalizedSearchQuery])

  return (
    <main className="admin-bookings-page admin-bookings-page--figma">
      <header className="admin-bookings-page__hero">
        <h1>Quản lý Đơn hàng</h1>
        <p>Quản lý, theo dõi và xử lý các đơn hàng trên hệ thống.</p>
      </header>

      <nav className="admin-bookings-page__status-tabs" aria-label="Lọc trạng thái đơn hàng">
        {visibleStatusOptions.map((option) => (
          <button
            className={
              option.value === statusFilter
                ? 'admin-bookings-page__status-tab admin-bookings-page__status-tab--active'
                : 'admin-bookings-page__status-tab'
            }
            key={option.value}
            type="button"
            disabled={loading}
            aria-pressed={option.value === statusFilter}
            onClick={() => updateStatusFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      <form
        className="admin-bookings-page__toolbar"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <AdminSearchInput
          aria-label="Tìm kiếm theo mã đơn hàng"
          className="admin-bookings-page__search"
          placeholder="Tìm mã đơn, ví dụ DH7887"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </form>

      {feedback ? (
        <p className="admin-bookings-page__feedback" role="status">
          {feedback}
        </p>
      ) : null}

      {loading && currentBookings.length === 0 ? (
        <AdminLoadingBlock rows={4} />
      ) : null}

      {error && currentBookings.length === 0 ? (
        <AdminErrorState
          title="Không thể tải danh sách đơn hàng"
          description={error}
          action={
            <AdminButton variant="secondary" onClick={reloadBookings}>
              Thử lại
            </AdminButton>
          }
        />
      ) : null}

      {!loading && !error ? (
        <section className="admin-bookings-page__list" aria-label="Danh sách đơn hàng">
          {filteredBookings.length > 0 ? (
            filteredBookings.map((booking) => {
              const bookingActions = getBookingActions(booking.status)

              return (
                <article className="admin-booking-card" key={booking.id}>
                  <div
                    className="admin-booking-card__media admin-booking-card__open-zone"
                    role="button"
                    tabIndex={0}
                    aria-label={`Xem chi tiết đơn hàng ${booking.bookingCode}`}
                    onClick={() => openBookingDetail(booking)}
                    onKeyDown={(event) => handleOpenZoneKeyDown(event, booking)}
                  >
                    <img alt={booking.serviceTitle} src={booking.imageUrl} />
                  </div>

                  <div className="admin-booking-card__content">
                    <div
                      className="admin-booking-card__body-open-zone admin-booking-card__open-zone"
                      role="button"
                      tabIndex={0}
                      aria-label={`Xem chi tiết đơn hàng ${booking.bookingCode}`}
                      onClick={() => openBookingDetail(booking)}
                      onKeyDown={(event) => handleOpenZoneKeyDown(event, booking)}
                    >
                    <header className="admin-booking-card__header">
                      <div className="admin-booking-card__heading">
                        <h2 className="admin-booking-card__title">
                          {booking.serviceTitle.toUpperCase()}
                        </h2>

                        <div className="admin-booking-card__badges">
                          <span className="admin-booking-card__code">
                            Mã đơn #{booking.bookingCode}
                          </span>
                          <span
                            className={`admin-booking-card__status admin-booking-card__status--${booking.statusTone}`}
                          >
                            {booking.statusLabel}
                          </span>
                          <span className="admin-booking-card__time-detail">
                            Thời gian đặt: {booking.createdAtLabel}
                          </span>
                        </div>

                      </div>
                    </header>

                    <div className="admin-booking-card__info-grid">
                      <div className="admin-booking-card__info-column">
                        <BookingInfoItem
                          icon="user"
                          label="Khách hàng"
                          value={booking.customerName}
                        />
                        <BookingInfoItem icon="mail" label="Email" value={booking.customerEmail} />
                        <BookingInfoItem icon="phone" label="SĐT" value={booking.customerPhone} />
                      </div>

                      <div className="admin-booking-card__info-column">
                        <BookingInfoItem
                          icon="calendar"
                          label="Ngày đi"
                          value={booking.departureLabel}
                        />
                        <BookingInfoItem
                          icon="calendar"
                          label="Ngày về"
                          value={booking.returnLabel}
                        />
                        <BookingInfoItem
                          icon="transport"
                          label="Phương tiện"
                          value={booking.transport}
                        />
                        <BookingInfoItem icon="hotel" label="Khách sạn" value={booking.hotelName} />
                      </div>
                    </div>

                    <p className="admin-booking-card__total">
                      Tổng cộng: {formatCurrency(booking.totalAmount)}
                    </p>

                    </div>

                    <footer className="admin-booking-card__footer">
                      <div className="admin-booking-card__note">
                        <strong>Ghi chú:</strong>
                        <span>{booking.note}</span>
                      </div>

                      {bookingActions.length > 0 ? (
                        <div className="admin-booking-card__actions">
                          {bookingActions.map((action) => (
                            <button
                              className={`admin-booking-card__action admin-booking-card__action--${action.tone}`}
                              disabled={
                                !canWriteBookings ||
                                isBookingActionLoading(booking, action.action)
                              }
                              key={action.action}
                              type="button"
                              aria-busy={
                                isBookingActionLoading(booking, action.action) || undefined
                              }
                              onClick={() => updateBookingAction(booking, action.action)}
                            >
                              <BookingIcon name={action.icon} />
                              {isBookingActionLoading(booking, action.action)
                                ? 'Đang xử lý...'
                                : action.label}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="admin-booking-card__actions">
                          <span
                            className={`admin-booking-card__state-action admin-booking-card__state-action--${booking.statusTone}`}
                          >
                            <BookingIcon name={getStatusDisplayIcon(booking.statusTone)} />
                            {booking.statusLabel}
                          </span>
                        </div>
                      )}
                    </footer>
                  </div>
                </article>
              )
            })
          ) : (
            <AdminEmptyState
              title={
                normalizedSearchQuery
                  ? 'Không tìm thấy mã đơn phù hợp'
                  : 'Không có đơn hàng phù hợp'
              }
              description={
                normalizedSearchQuery
                  ? 'Thử nhập lại mã đơn hoặc xóa từ khóa để xem toàn bộ danh sách.'
                  : 'Thử đổi trạng thái để xem thêm đơn hàng.'
              }
              action={
                <button
                  className="admin-bookings-page__empty-action"
                  type="button"
                  onClick={() => {
                    if (normalizedSearchQuery) {
                      setSearchQuery('')
                      return
                    }

                    updateStatusFilter(ADMIN_BOOKING_STATUSES.all)
                  }}
                >
                  {normalizedSearchQuery ? 'Xóa từ khóa' : 'Xem tất cả'}
                </button>
              }
            />
          )}
        </section>
      ) : null}

      <footer className="admin-bookings-page__pagination-row">
        <p>
          {normalizedSearchQuery
            ? `Tìm thấy ${filteredBookings.length} đơn hàng khớp với mã "${searchQuery.trim()}"`
            : paginationMeta.total > 0
            ? `Hiển thị ${currentBookings.length} trong số ${paginationMeta.total} đơn hàng`
            : 'Hiện không có đơn hàng để hiển thị'}
        </p>

        <AdminPagination
          className="admin-bookings-page__pagination"
          currentPage={currentPage}
          disabled={loading}
          pages={pageNumbers}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </footer>

      {activeBooking ? (
        <div
          className="admin-booking-detail-modal"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveBooking(null)
            }
          }}
        >
          <section
            className="admin-booking-detail-modal__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-booking-detail-modal-title"
          >
            <header className="admin-booking-detail-modal__header">
              <div>
                <span>Đơn hàng #{modalBooking?.bookingCode}</span>
                <h2 id="admin-booking-detail-modal-title">{modalBooking?.serviceTitle}</h2>
              </div>
              <button
                className="admin-booking-detail-modal__close"
                type="button"
                aria-label="Đóng chi tiết đơn hàng"
                onClick={() => setActiveBooking(null)}
              >
                ×
              </button>
            </header>

            {detailLoading ? (
              <LocalLoading className="admin-booking-detail-modal__state" minHeight="180px" />
            ) : null}

            {detailError ? (
              <div className="admin-booking-detail-modal__state admin-booking-detail-modal__state--error">
                <p>{detailError}</p>
                <button type="button" onClick={() => setActiveBooking({ ...activeBooking })}>
                  Thử lại
                </button>
              </div>
            ) : null}

            {!detailLoading && !detailError && modalBooking ? (
              <div className="admin-booking-detail-modal__body">
                <div className="admin-booking-detail-modal__hero">
                  <img alt={modalBooking.serviceTitle} src={modalBooking.imageUrl} />
                  <div>
                    <span
                      className={`admin-booking-card__status admin-booking-card__status--${modalBooking.statusTone}`}
                    >
                      {modalBooking.statusLabel}
                    </span>
                    <h3>{modalBooking.serviceTitle}</h3>
                    <p>{`${modalBooking.destination} · ${modalBooking.duration} · ${modalBooking.transport}`}</p>
                    <div className="admin-booking-detail-modal__price-block">
                      {modalBookingAmounts.hasDiscount ? (
                        <>
                          <div className="admin-booking-detail-modal__price-original">
                            <span>Giá gốc</span>
                            <strong>{formatCurrency(modalBookingAmounts.originalAmount)}</strong>
                          </div>
                          <div className="admin-booking-detail-modal__price-final">
                            <span>Giá sau ưu đãi</span>
                            <strong>{formatCurrency(modalBookingAmounts.finalAmount)}</strong>
                          </div>
                        </>
                      ) : (
                        <div className="admin-booking-detail-modal__price-final admin-booking-detail-modal__price-final--single">
                          <span>Tổng thanh toán</span>
                          <strong>{formatCurrency(modalBookingAmounts.finalAmount)}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="admin-booking-detail-modal__field-grid">
                  <DetailField label="Khách hàng" value={modalBooking.customerName} />
                  <DetailField label="Email" value={modalBooking.customerEmail} />
                  <DetailField label="SĐT" value={modalBooking.customerPhone} />
                  <DetailField label="Ngày đi" value={modalBooking.departureLabel} />
                  <DetailField label="Ngày về" value={modalBooking.returnLabel} />
                  <DetailField label="Hành khách" value={modalBooking.travelers} />
                </div>

                {modalStatusGuidance ? (
                  <section
                    className={`admin-booking-detail-modal__status-guidance admin-booking-detail-modal__status-guidance--${modalStatusGuidance.tone}`}
                  >
                    <div>
                      <span>Trạng thái hiện tại</span>
                      <h4>{modalStatusGuidance.title}</h4>
                      <p>{modalStatusGuidance.description}</p>
                    </div>
                    <dl>
                      <dt>{modalStatusGuidance.detailLabel}</dt>
                      <dd>{modalStatusGuidance.detailValue}</dd>
                    </dl>
                  </section>
                ) : null}

                <div className="admin-booking-detail-modal__line-items">
                  {(modalBooking.serviceItems ?? []).length > 0 ? (
                    modalBooking.serviceItems.map((item) => (
                      <article
                        className="admin-booking-detail-modal__line-item"
                        key={`${item.label}-${item.title}`}
                      >
                        <div>
                          <span>{item.label}</span>
                          <h4>{item.title}</h4>
                          <p>{item.description}</p>
                        </div>
                        <strong>{formatCurrency(item.price)}</strong>
                      </article>
                    ))
                  ) : (
                    <p className="admin-booking-detail-modal__empty">
                      Backend chưa trả chi tiết dịch vụ cho đơn hàng này.
                    </p>
                  )}
                </div>

                {modalReviewPayment ? (
                  <section className="admin-booking-detail-modal__payment-review">
                    <div className="admin-booking-detail-modal__payment-review-copy">
                      <span>Chứng từ chuyển khoản</span>
                      <h4>Khách đã gửi bill, vui lòng đối soát trước khi phê duyệt.</h4>
                    </div>

                    <div className="admin-booking-detail-modal__payment-proof">
                      {modalReviewProof?.proof_image_url ? (
                        <a
                          className="admin-booking-detail-modal__proof-link"
                          href={modalReviewProof.proof_image_url}
                          rel="noreferrer"
                          target="_blank"
                        >
                          <img
                            alt={`Bill chuyển khoản của đơn ${modalBooking.bookingCode}`}
                            src={modalReviewProof.proof_image_url}
                          />
                        </a>
                      ) : (
                        <div className="admin-booking-detail-modal__proof-empty">
                          Chưa có ảnh bill trong giao dịch này.
                        </div>
                      )}

                      <div className="admin-booking-detail-modal__payment-grid">
                        <DetailField label="Mã thanh toán" value={modalReviewPayment.paymentCode} />
                        <DetailField
                          label="Số tiền đã chuyển"
                          value={formatCurrency(modalReviewPayment.amount)}
                        />
                        <DetailField
                          label="Mã giao dịch ngân hàng"
                          value={modalReviewProof?.bank_transaction_code || 'Chưa nhập'}
                        />
                        <DetailField
                          label="Thời gian gửi bill"
                          value={formatDisplayDateTime(modalReviewProof?.submitted_at)}
                        />
                        <DetailField
                          label="Nội dung chuyển khoản"
                          value={modalReviewProof?.transfer_note || 'Chưa có dữ liệu'}
                        />
                      </div>
                    </div>

                    {paymentFeedback ? (
                      <p className="admin-booking-detail-modal__payment-feedback" role="status">
                        {paymentFeedback}
                      </p>
                    ) : null}

                    <div className="admin-booking-detail-modal__payment-reject">
                      <label
                        className="admin-booking-detail-modal__payment-reject-label"
                        htmlFor="admin-payment-reject-reason"
                      >
                        Lý do từ chối bill nếu chứng từ không hợp lệ
                      </label>
                      <AdminTextarea
                        id="admin-payment-reject-reason"
                        className="admin-booking-detail-modal__payment-reject-input"
                        disabled={!canProcessPayments || paymentActionLoading}
                        invalid={Boolean(paymentRejectReasonError)}
                        placeholder="Ví dụ: Không khớp số tiền, bill chỉnh sửa, không tìm thấy giao dịch ngân hàng..."
                        rows={3}
                        value={paymentRejectReason}
                        onChange={(event) => {
                          setPaymentRejectReason(event.target.value)
                          if (paymentRejectReasonError) {
                            setPaymentRejectReasonError('')
                          }
                        }}
                      />
                      {paymentRejectReasonError ? (
                        <p
                          className="admin-booking-detail-modal__payment-reject-error"
                          role="alert"
                        >
                          {paymentRejectReasonError}
                        </p>
                      ) : null}
                    </div>

                    <div className="admin-booking-detail-modal__payment-actions">
                      {!canProcessPayments ? (
                        <span>Bạn chưa có quyền xử lý chứng từ thanh toán.</span>
                      ) : null}

                      <div className="admin-booking-detail-modal__payment-actions-group">
                        <button
                          className="admin-booking-card__action admin-booking-card__action--reject"
                          disabled={!canProcessPayments || paymentActionLoading}
                          type="button"
                          aria-busy={
                            (paymentActionLoading && paymentActionType === 'reject') || undefined
                          }
                          onClick={() => handleRejectPayment(modalBooking, modalReviewPayment)}
                        >
                          <BookingIcon name="x" />
                          {paymentActionLoading && paymentActionType === 'reject'
                            ? 'Đang từ chối...'
                            : 'Từ chối'}
                        </button>
                        <button
                          className="admin-booking-card__action admin-booking-card__action--confirm"
                          disabled={!canProcessPayments || paymentActionLoading}
                          type="button"
                          aria-busy={
                            (paymentActionLoading && paymentActionType === 'approve') || undefined
                          }
                          onClick={() => handleApprovePayment(modalBooking, modalReviewPayment)}
                        >
                          <BookingIcon name="check" />
                          {paymentActionLoading && paymentActionType === 'approve'
                            ? 'Đang phê duyệt...'
                            : 'Phê duyệt'}
                        </button>
                      </div>
                    </div>
                  </section>
                ) : null}

                {modalBookingActions.length > 0 ? (
                  <div className="admin-booking-detail-modal__actions">
                    {modalBookingActions.map((action) => (
                      <button
                        className={`admin-booking-card__action admin-booking-card__action--${action.tone}`}
                        disabled={
                          !canWriteBookings || isBookingActionLoading(modalBooking, action.action)
                        }
                        key={action.action}
                        type="button"
                        aria-busy={
                          isBookingActionLoading(modalBooking, action.action) || undefined
                        }
                        onClick={() => handleDetailBookingAction(modalBooking, action.action)}
                      >
                        <BookingIcon name={action.icon} />
                        {isBookingActionLoading(modalBooking, action.action)
                          ? 'Đang xử lý...'
                          : action.label}
                      </button>
                    ))}
                  </div>
                ) : null}

                {modalBookingDiscount ? (
                  <p className="admin-booking-detail-modal__discount-summary">
                    <strong>{modalBookingDiscount.label}</strong> {modalBookingDiscount.value}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default AdminBookingsPage
