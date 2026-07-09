import { useEffect, useState } from 'react'
import { Link, useNavigate, useOutletContext, useParams } from 'react-router-dom'
import {
  AdminButton,
  AdminCard,
  AdminErrorState,
  AdminLoadingBlock,
  AdminPageHeader,
  AdminSectionHeader,
  AdminStatusBadge,
} from '../../components/admin/ui/index.js'
import { ADMIN_ROLE_LABELS, buildAdminPath } from '../../constants/adminRoutes.js'
import { ADMIN_BOOKING_STATUSES, ADMIN_BOOKING_STATUS_META } from '../../constants/adminBookings.js'
import {
  getAdminBookingActionConfig,
  mapAdminBookingDetail,
} from '../../mappers/adminBookingMappers.js'
import {
  cancelAdminBooking,
  completeAdminBooking,
  confirmAdminBooking,
  getAdminBookingDetail,
  updateAdminBookingStatus,
} from '../../repositories/adminBookingRepository.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const currencyFormatter = new Intl.NumberFormat('vi-VN')

function formatCurrency(value) {
  return `${currencyFormatter.format(value)} Đ`
}

function getActionReason(action) {
  if (action === 'confirm') {
    return 'Admin xác nhận đơn hàng từ trang Chi tiết Đơn hàng.'
  }

  if (action === 'cancel') {
    return 'Admin huỷ đơn hàng từ trang Chi tiết Đơn hàng.'
  }

  if (action === 'complete') {
    return 'Admin đánh dấu đơn hàng hoàn thành từ trang Chi tiết Đơn hàng.'
  }

  return 'Admin cập nhật trạng thái đơn hàng từ trang Chi tiết Đơn hàng.'
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
  const { currentPermissions, currentRole } = useOutletContext()
  const currentRoleLabel = ADMIN_ROLE_LABELS[currentRole] ?? currentRole
  const { bookingCode: bookingId = '' } = useParams()
  const [booking, setBooking] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [actionState, setActionState] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const canWriteBookings = hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.bookingsWrite,
    currentPermissions,
  )

  useEffect(() => {
    let isActive = true

    async function loadBookingDetail() {
      setLoading(true)
      setError('')

      try {
        const response = await getAdminBookingDetail(bookingId)

        if (!isActive) {
          return
        }

        if (!response.success || !response.data) {
          throw new Error(response.message || 'Không thể tải chi tiết đơn hàng lúc này.')
        }

        setBooking(mapAdminBookingDetail(response.data))
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setBooking(null)
        setError(loadError?.message ?? 'Không thể tải chi tiết đơn hàng lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadBookingDetail()

    return () => {
      isActive = false
    }
  }, [bookingId, reloadKey])

  async function updateBookingAction(action) {
    if (!booking) {
      return
    }

    const reason = getActionReason(action)

    setActionState(action)
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
      setActionState('')
    }
  }

  if (loading && !booking) {
    return (
      <main className="admin-booking-detail">
        <AdminLoadingBlock rows={4} />
      </main>
    )
  }

  if (error && !booking) {
    return (
      <main className="admin-booking-detail">
        <AdminErrorState
          title="Không tìm thấy đơn hàng"
          description={error}
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

  if (!booking) {
    return null
  }

  const statusMeta = ADMIN_BOOKING_STATUS_META[booking.status]
  const bookingActions = getAdminBookingActionConfig(booking.status)

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

      {feedback ? (
        <p className="admin-bookings-page__feedback" role="status">
          {feedback}
        </p>
      ) : null}

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
          <DetailField label="Ngày đi" value={booking.departureLabel} />
          <DetailField label="Ngày về" value={booking.returnLabel} />
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
          subtitle={`${booking.itemCount} mục dịch vụ trong đơn`}
        />

        <div className="admin-booking-detail__line-items">
          {booking.serviceItems.length > 0 ? (
            booking.serviceItems.map((item) => (
              <article className="admin-booking-detail__line-item" key={`${item.label}-${item.title}`}>
                <div>
                  <span>{item.label}</span>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
                <strong>{formatCurrency(item.price)}</strong>
              </article>
            ))
          ) : (
            <p>Backend chưa trả chi tiết dịch vụ cho đơn hàng này.</p>
          )}
        </div>

        <div className="admin-booking-detail__total">
          <span>Tổng cộng</span>
          <strong>{formatCurrency(booking.totalAmount)}</strong>
        </div>
      </AdminCard>

      {bookingActions.length > 0 ? (
        <footer className="admin-booking-detail__actions" aria-label="Xử lý đơn hàng">
          {bookingActions.map((action) => (
            <button
              className={`admin-booking-detail__action admin-booking-detail__action--${action.tone === 'reject' ? 'reject' : 'accept'}`}
              disabled={!canWriteBookings || actionState === action.action}
              key={action.action}
              type="button"
              aria-busy={actionState === action.action || undefined}
              onClick={() => updateBookingAction(action.action)}
            >
              <DetailActionIcon name={action.icon} />
              {actionState === action.action ? 'Đang xử lý...' : action.label}
            </button>
          ))}
        </footer>
      ) : null}
    </main>
  )
}

export default AdminBookingDetailPage
