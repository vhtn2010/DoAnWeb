import { useMemo, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { AdminEmptyState } from '../../components/admin/ui/index.js'
import { buildAdminPath } from '../../constants/adminRoutes.js'
import {
  ADMIN_BOOKING_LIST,
  ADMIN_BOOKING_STATUS_OPTIONS,
  ADMIN_BOOKING_STATUSES,
  ADMIN_BOOKING_TOTAL,
} from '../../fixtures/adminBookings.fixtures.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const pageSize = 3

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} Đ`
}

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T00:00:00+07:00`))
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

function AdminBookingsPage() {
  const { currentRole } = useOutletContext()
  const [bookings, setBookings] = useState(ADMIN_BOOKING_LIST)
  const [currentPage, setCurrentPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState(ADMIN_BOOKING_STATUSES.all)
  const canWriteBookings = hasPermission(currentRole, ADMIN_PERMISSIONS.bookingsWrite)

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      return statusFilter === ADMIN_BOOKING_STATUSES.all || booking.status === statusFilter
    })
  }, [bookings, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize))
  const pageNumbers = Array.from({ length: totalPages }, (_, index) => index + 1)
  const currentBookings = filteredBookings.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  )

  function updateStatusFilter(nextStatus) {
    setStatusFilter(nextStatus)
    setCurrentPage(1)
  }

  function updateBookingStatus(booking, nextStatus) {
    setBookings((currentBookingsValue) =>
      currentBookingsValue.map((currentBooking) =>
        currentBooking.id === booking.id
          ? { ...currentBooking, status: nextStatus }
          : currentBooking,
      ),
    )
  }

  return (
    <main className="admin-bookings-page admin-bookings-page--figma">
      <header className="admin-bookings-page__hero">
        <h1>Quản lý Đơn hàng</h1>
        <p>Quản lý, theo dõi và xử lý các đơn hàng trên hệ thống.</p>
      </header>

      <nav className="admin-bookings-page__status-tabs" aria-label="Lọc trạng thái đơn hàng">
        {ADMIN_BOOKING_STATUS_OPTIONS.map((option) => (
          <button
            className={
              option.value === statusFilter
                ? 'admin-bookings-page__status-tab admin-bookings-page__status-tab--active'
                : 'admin-bookings-page__status-tab'
            }
            key={option.value}
            type="button"
            aria-pressed={option.value === statusFilter}
            onClick={() => updateStatusFilter(option.value)}
          >
            {option.label}
          </button>
        ))}
      </nav>

      <section className="admin-bookings-page__list" aria-label="Danh sách đơn hàng">
        {currentBookings.length > 0 ? (
          currentBookings.map((booking) => (
            <article className="admin-booking-card" key={booking.id}>
              <div className="admin-booking-card__media">
                <img alt={booking.serviceTitle} src={booking.imageUrl} />
              </div>

              <div className="admin-booking-card__content">
                <header className="admin-booking-card__header">
                  <div className="admin-booking-card__heading">
                    <h2 className="admin-booking-card__title">
                      {booking.serviceTitle.toUpperCase()}
                    </h2>

                    <div className="admin-booking-card__badges">
                      <span className="admin-booking-card__code">
                        Mã đơn #{booking.bookingCode}
                      </span>
                      <span className="admin-booking-card__time">{booking.createdLabel}</span>
                      <Link
                        className="admin-booking-card__detail-link"
                        to={buildAdminPath(`/admin/bookings/${booking.bookingCode}`, currentRole)}
                      >
                        Xem chi tiết
                      </Link>
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
                      value={formatDate(booking.departureDate)}
                    />
                    <BookingInfoItem
                      icon="calendar"
                      label="Ngày về"
                      value={formatDate(booking.returnDate)}
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

                <footer className="admin-booking-card__footer">
                  <div className="admin-booking-card__note">
                    <strong>Ghi chú:</strong>
                    <span>{booking.note}</span>
                  </div>

                  {booking.status === ADMIN_BOOKING_STATUSES.pendingConfirmation ? (
                    <div className="admin-booking-card__actions">
                      <button
                        className="admin-booking-card__action admin-booking-card__action--reject"
                        disabled={!canWriteBookings}
                        type="button"
                        onClick={() =>
                          updateBookingStatus(booking, ADMIN_BOOKING_STATUSES.cancelled)
                        }
                      >
                        <BookingIcon name="x" />
                        Từ chối
                      </button>
                      <button
                        className="admin-booking-card__action admin-booking-card__action--confirm"
                        disabled={!canWriteBookings}
                        type="button"
                        onClick={() =>
                          updateBookingStatus(booking, ADMIN_BOOKING_STATUSES.inProgress)
                        }
                      >
                        <BookingIcon name="check" />
                        Xác nhận
                      </button>
                    </div>
                  ) : null}
                </footer>
              </div>
            </article>
          ))
        ) : (
          <AdminEmptyState
            title="Không có đơn hàng phù hợp"
            description="Thử đổi trạng thái để xem thêm đơn hàng."
            action={
              <button
                className="admin-bookings-page__empty-action"
                type="button"
                onClick={() => updateStatusFilter(ADMIN_BOOKING_STATUSES.all)}
              >
                Xem tất cả
              </button>
            }
          />
        )}
      </section>

      <footer className="admin-bookings-page__pagination-row">
        <p>
          {filteredBookings.length > 0
            ? `Hiển thị ${currentBookings.length} trong số ${ADMIN_BOOKING_TOTAL} đơn hàng`
            : 'Hiện không có đơn hàng để hiển thị'}
        </p>

        <nav className="admin-bookings-page__pagination" aria-label="Phân trang đơn hàng">
          <button
            className="admin-bookings-page__page-button admin-bookings-page__page-button--arrow"
            disabled={currentPage === 1}
            type="button"
            aria-label="Trang trước"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <BookingIcon name="chevron-left" />
          </button>

          {pageNumbers.map((pageNumber) => (
            <button
              className={
                pageNumber === currentPage
                  ? 'admin-bookings-page__page-button admin-bookings-page__page-button--active'
                  : 'admin-bookings-page__page-button'
              }
              key={pageNumber}
              type="button"
              aria-current={pageNumber === currentPage ? 'page' : undefined}
              onClick={() => setCurrentPage(pageNumber)}
            >
              {pageNumber}
            </button>
          ))}

          <button
            className="admin-bookings-page__page-button admin-bookings-page__page-button--arrow"
            disabled={currentPage === totalPages}
            type="button"
            aria-label="Trang sau"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            <BookingIcon name="chevron-right" />
          </button>
        </nav>
      </footer>
    </main>
  )
}

export default AdminBookingsPage
