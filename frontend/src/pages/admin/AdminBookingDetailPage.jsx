import { useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  AdminButton,
  AdminCard,
  AdminErrorState,
  AdminPageHeader,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/admin/ui/index.js'
import { ADMIN_ROLE_LABELS, buildAdminPath } from '../../constants/adminRoutes.js'
import {
  ADMIN_BOOKING_LIST,
  ADMIN_BOOKING_STATUS_META,
  ADMIN_BOOKING_STATUSES,
} from '../../fixtures/adminBookings.fixtures.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')
const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} Đ`
}

function formatDate(value) {
  return dateFormatter.format(new Date(`${value}T00:00:00+07:00`))
}

function DetailField({ label, value }) {
  return (
    <div className="admin-booking-detail__field">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function DetailActionIcon({ name }) {
  return (
    <svg
      className="admin-booking-detail__action-icon"
      viewBox="0 0 24 24"
      fill="none"
      focusable="false"
      aria-hidden="true"
    >
      {name === 'check' ? (
        <path d="m5 12 4 4L19 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
      ) : (
        <>
          <path d="M18 6 6 18" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
          <path d="m6 6 12 12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" />
        </>
      )}
    </svg>
  )
}

function AdminBookingDetailPage() {
  const navigate = useNavigate()
  const { currentRole } = useOutletContext()
  const currentRoleLabel = ADMIN_ROLE_LABELS[currentRole] ?? currentRole
  const { bookingCode = '' } = useParams()
  const normalizedCode = bookingCode.replace(/^#/, '').toUpperCase()
  const bookingRecord = ADMIN_BOOKING_LIST.find((item) => item.bookingCode === normalizedCode)
  const [statusByBookingId, setStatusByBookingId] = useState({})
  const canWriteBookings = hasPermission(currentRole, ADMIN_PERMISSIONS.bookingsWrite)

  if (!bookingRecord) {
    return (
      <main className="admin-booking-detail">
        <AdminErrorState
          title="Không tìm thấy đơn hàng"
          description={`Không có dữ liệu mock cho mã đơn ${bookingCode}.`}
          action={
            <AdminButton
              variant="secondary"
              onClick={() => navigate(buildAdminPath('/admin/bookings', currentRole))}
            >
              Quay lại danh sách
            </AdminButton>
          }
        />
      </main>
    )
  }

  const booking = {
    ...bookingRecord,
    status: statusByBookingId[bookingRecord.id] ?? bookingRecord.status,
  }
  const statusMeta = ADMIN_BOOKING_STATUS_META[booking.status]
  const canReviewBooking = booking.status === ADMIN_BOOKING_STATUSES.pendingConfirmation

  function updateBookingStatus(nextStatus) {
    setStatusByBookingId((currentStatuses) => ({
      ...currentStatuses,
      [bookingRecord.id]: nextStatus,
    }))
  }

  return (
    <main className="admin-booking-detail">
      <AdminPageHeader
        eyebrow={currentRoleLabel}
        title="Chi tiết Đơn hàng"
        subtitle={`${booking.serviceTitle} · #${booking.bookingCode}`}
        actions={
          <Link
            className="admin-ui-button admin-ui-button--secondary admin-ui-button--md"
            to={buildAdminPath('/admin/bookings', currentRole)}
          >
            Quay lại
          </Link>
        }
      />

      <AdminCard className="admin-booking-detail__summary" padding="lg">
        <AdminSectionHeader
          eyebrow="Thông tin cơ bản"
          title={`#${booking.bookingCode}`}
          actions={
            <AdminStatusBadge tone={statusMeta?.tone ?? 'neutral'}>
              {statusMeta?.label ?? booking.status}
            </AdminStatusBadge>
          }
        />

        <div className="admin-booking-detail__hero">
          <img alt={booking.serviceTitle} src={booking.imageUrl} />
          <div className="admin-booking-detail__hero-copy">
            <span>#{booking.bookingCode}</span>
            <h2>{booking.serviceTitle}</h2>
            <p>{`${booking.destination} · ${booking.duration} · ${booking.transport}`}</p>
            <strong>{formatCurrency(booking.totalAmount)}</strong>
          </div>
        </div>

        <div className="admin-booking-detail__field-grid">
          <DetailField label="Mã đơn" value={`#${booking.bookingCode}`} />
          <DetailField label="Khách hàng" value={booking.customerName} />
          <DetailField label="SĐT" value={booking.customerPhone} />
          <DetailField label="Email" value={booking.customerEmail} />
          <DetailField label="Ngày đi" value={formatDate(booking.departureDate)} />
          <DetailField label="Ngày về" value={formatDate(booking.returnDate)} />
          <DetailField label="Điểm đến" value={booking.destination} />
          <DetailField label="Hành khách" value={booking.travelers} />
        </div>

        <p className="admin-booking-detail__note">
          <strong>Ghi chú:</strong> {booking.note}
        </p>
      </AdminCard>

      <AdminCard className="admin-booking-detail__services" padding="lg">
        <AdminSectionHeader
          title="Chi tiết dịch vụ"
          subtitle={`${booking.destination} · ${booking.duration} · ${booking.transport}`}
        />

        <div className="admin-booking-detail__line-items">
          {booking.serviceItems.map((item) => (
            <article className="admin-booking-detail__line-item" key={`${item.label}-${item.title}`}>
              <div>
                <span>{item.label}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <strong>{formatCurrency(item.price)}</strong>
            </article>
          ))}
        </div>

        <div className="admin-booking-detail__total">
          <span>Tổng cộng</span>
          <strong>{formatCurrency(booking.totalAmount)}</strong>
        </div>
      </AdminCard>

      {canReviewBooking ? (
        <footer className="admin-booking-detail__actions" aria-label="Xử lý đơn hàng">
          <button
            className="admin-booking-detail__action admin-booking-detail__action--reject"
            disabled={!canWriteBookings}
            type="button"
            onClick={() => updateBookingStatus(ADMIN_BOOKING_STATUSES.cancelled)}
          >
            <DetailActionIcon name="x" />
            Từ chối
          </button>
          <button
            className="admin-booking-detail__action admin-booking-detail__action--accept"
            disabled={!canWriteBookings}
            type="button"
            onClick={() => updateBookingStatus(ADMIN_BOOKING_STATUSES.inProgress)}
          >
            <DetailActionIcon name="check" />
            Chấp nhận
          </button>
        </footer>
      ) : null}
    </main>
  )
}

export default AdminBookingDetailPage
