import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AdminSearchInput,
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingBlock,
  AdminPagination,
} from '../../components/admin/ui/index.js'
import {
  ADMIN_BOOKING_STATUSES,
  ADMIN_BOOKING_STATUS_OPTIONS,
} from '../../constants/adminBookings.js'
import useAdminBookings from '../../hooks/useAdminBookings.js'
import { mapAdminBookingDetail } from '../../mappers/adminBookingMappers.js'
import { getAdminBookingDetail } from '../../repositories/adminBookingRepository.js'
import { getAdminVoucherDetail } from '../../repositories/adminUtilityRepository.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} Đ`
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

function BookingMetaItem({ icon, children }) {
  return (
    <span className="admin-booking-card__meta-item">
      <BookingIcon name={icon} />
      {children}
    </span>
  )
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

  if (tone === 'success' || tone === 'brand') {
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

function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase()
}

const VISIBLE_BOOKING_STATUS_VALUES = new Set([
  ADMIN_BOOKING_STATUSES.all,
  ADMIN_BOOKING_STATUSES.paid,
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
    setVoucherDetail(null)
    setActiveBooking(booking)
  }

  function handleOpenZoneKeyDown(event, booking) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      openBookingDetail(booking)
    }
  }

  const modalBooking = detailBooking ?? activeBooking
  const modalBookingAmounts = getBookingAmounts(modalBooking)
  const modalBookingDiscount = getBookingDiscountContent(modalBooking, voucherDetail)
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
                          <span className="admin-booking-card__time">
                            {booking.createdLabel}
                          </span>
                        </div>

                        <div className="admin-booking-card__meta">
                          <BookingMetaItem icon="location">{booking.destination}</BookingMetaItem>
                          <BookingMetaItem icon="users">{booking.travelers}</BookingMetaItem>
                          <BookingMetaItem icon="clock">{booking.duration}</BookingMetaItem>
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
              <div className="admin-booking-detail-modal__state" role="status">
                Đang tải chi tiết đơn hàng...
              </div>
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

                <p className="admin-booking-detail-modal__note">
                  <strong>Ghi chú:</strong> {modalBooking.note}
                </p>

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
