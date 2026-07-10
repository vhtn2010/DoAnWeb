import { getCurrentProfile } from './profileApiAdapter.js'
import { getMyBookingItems, listMyBookings } from './bookingApiAdapter.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { customerProfileFixture } from '../../fixtures/profile.fixtures.js'

const UPCOMING_BOOKING_STATUSES = new Set([
  'pending_payment',
  'payment_processing',
  'paid',
  'confirmed',
  'in_progress',
])

const CANCELLED_BOOKING_STATUSES = new Set([
  'cancel_requested',
  'cancelled',
  'refund_pending',
  'partially_refunded',
  'refunded',
  'failed',
  'expired',
])

function formatDateRange(startAt, endAt) {
  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  if (Number.isNaN(startDate.getTime())) {
    return 'Lịch trình đang được cập nhật'
  }

  const formatter = new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  if (Number.isNaN(endDate.getTime())) {
    return formatter.format(startDate)
  }

  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`
}

function buildServiceRoute(serviceSnapshot = {}, serviceType = SERVICE_TYPES.tour) {
  const slug = serviceSnapshot?.slug

  if (!slug) {
    return '/services'
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return `/flights/${slug}`
  }

  if (serviceType === SERVICE_TYPES.train) {
    return `/trains/${slug}`
  }

  if (serviceType === SERVICE_TYPES.hotel || serviceType === SERVICE_TYPES.room) {
    return `/hotels/${slug}`
  }

  return `/services/${slug}`
}

function buildHistoryGroup(status) {
  if (CANCELLED_BOOKING_STATUSES.has(status)) {
    return 'cancelled'
  }

  if (UPCOMING_BOOKING_STATUSES.has(status)) {
    if (status === 'pending_payment' || status === 'payment_processing') {
      return 'pending_confirmation'
    }

    return 'upcoming'
  }

  return 'booking_history'
}

function buildStatusTone(status) {
  if (status === 'pending_payment' || status === 'payment_processing' || status === 'cancel_requested') {
    return 'warning'
  }

  if (status === 'paid' || status === 'confirmed' || status === 'in_progress') {
    return 'info'
  }

  if (status === 'cancelled' || status === 'failed' || status === 'expired') {
    return 'danger'
  }

  if (status === 'refunded' || status === 'partially_refunded') {
    return 'neutral'
  }

  return 'success'
}

function buildStatusLabel(status) {
  return String(status ?? '')
    .replace(/_/g, ' ')
    .trim()
    .toUpperCase()
}

function buildDurationSummary(items = []) {
  const itemCount = items.length
  const quantity = items.reduce((total, item) => total + Number(item.quantity ?? 0), 0)

  if (itemCount === 0) {
    return 'Đơn hàng đang được cập nhật'
  }

  return `${quantity || itemCount} khách • ${itemCount} dịch vụ`
}

function buildProfileName(profile = {}) {
  const fullName = String(profile.full_name ?? '').trim()

  if (!fullName) {
    return 'bạn'
  }

  const parts = fullName.split(/\s+/)
  return parts[parts.length - 1] || fullName
}

function buildUpcomingTrip(bookings = []) {
  const upcomingBooking = bookings.find((booking) => UPCOMING_BOOKING_STATUSES.has(booking.status))

  if (!upcomingBooking) {
    return null
  }

  const firstItem = upcomingBooking.items?.[0] ?? {}
  const serviceSnapshot = firstItem.service_snapshot ?? {}

  return {
    badge: upcomingBooking.status === 'pending_payment' ? 'CHỜ THANH TOÁN' : 'ĐANG THEO DÕI',
    booking_code: upcomingBooking.booking_code,
    code: upcomingBooking.booking_code,
    date_label: formatDateRange(firstItem.start_at, firstItem.end_at),
    detail_path: `/booking-confirmation/${upcomingBooking.booking_code}`,
    id: upcomingBooking.id,
    image_url: serviceSnapshot.image_url ?? null,
    location_label: serviceSnapshot.location_text ?? 'Hành trình đang được cập nhật',
    secondary_path: buildServiceRoute(serviceSnapshot, firstItem.service_type),
    service_id: firstItem.service_id ?? null,
    service_type: firstItem.service_type ?? SERVICE_TYPES.tour,
    subtitle: serviceSnapshot.location_text ?? 'Theo dõi hành trình sắp tới của bạn',
    title: firstItem.title_snapshot ?? 'Hành trình sắp tới',
  }
}

function buildFavoriteDestinations(bookings = []) {
  const seenLocations = new Set()

  return bookings.flatMap((booking) => booking.items ?? []).reduce((result, item) => {
    const snapshot = item.service_snapshot ?? {}
    const locationKey = snapshot.location_text?.trim()

    if (!locationKey || seenLocations.has(locationKey) || result.length >= 2) {
      return result
    }

    seenLocations.add(locationKey)
    result.push({
      detail_path: buildServiceRoute(snapshot, item.service_type),
      id: `${item.id}-favorite`,
      image_url: snapshot.image_url ?? null,
      location: snapshot.location_text,
      name: snapshot.title ?? item.title_snapshot ?? 'Điểm đến đang cập nhật',
      slug: snapshot.slug ?? null,
    })

    return result
  }, [])
}

function buildBookingHistory(bookings = []) {
  return bookings.map((booking) => {
    const firstItem = booking.items?.[0] ?? {}
    const serviceSnapshot = firstItem.service_snapshot ?? {}

    return {
      action_label:
        booking.status === 'pending_payment' ? 'Tiếp tục thanh toán' : 'Xem chi tiết',
      booking_code: booking.booking_code,
      currency: booking.currency,
      description:
        booking.status === 'pending_payment'
          ? 'Đơn hàng đang chờ bạn hoàn tất bước thanh toán trực tiếp.'
          : `Đơn hàng hiện ở trạng thái ${String(booking.status ?? '').replace(/_/g, ' ')}.`,
      detail_path: `/booking-confirmation/${booking.booking_code}`,
      detail_summary: buildDurationSummary(booking.items),
      history_group: buildHistoryGroup(booking.status),
      id: booking.id,
      image_url: serviceSnapshot.image_url ?? null,
      price_amount: Number(booking.total_amount ?? 0),
      route_label: serviceSnapshot.location_text ?? 'Hành trình đang được cập nhật',
      service_label: serviceSnapshot.service_type ?? firstItem.service_type ?? SERVICE_TYPES.tour,
      service_type: firstItem.service_type ?? SERVICE_TYPES.tour,
      status: booking.status,
      status_label: buildStatusLabel(booking.status),
      status_tone: buildStatusTone(booking.status),
      support_note:
        booking.status === 'pending_payment'
          ? 'Bạn có thể tạo thanh toán trực tiếp và gửi chứng từ ngay ở bước tiếp theo.'
          : 'Thông tin thanh toán và hỗ trợ sẽ được đồng bộ trong chi tiết đơn hàng.',
      title: firstItem.title_snapshot ?? booking.booking_code,
      travel_date_label: formatDateRange(firstItem.start_at, firstItem.end_at),
    }
  })
}

export async function getCustomerProfile() {
  const [profileResponse, bookingsResponse] = await Promise.all([
    getCurrentProfile(),
    listMyBookings({
      limit: 6,
      page: 1,
    }),
  ])

  const bookingSummaries = Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []
  const bookingItems = await Promise.all(
    bookingSummaries.map(async (booking) => {
      const itemsResponse = await getMyBookingItems(booking.id)

      return {
        ...booking,
        items: Array.isArray(itemsResponse.data) ? itemsResponse.data : [],
      }
    }),
  )

  return {
    success: true,
    message: 'OK',
    data: {
      booking_history: buildBookingHistory(bookingItems),
      favorite_destinations: buildFavoriteDestinations(bookingItems),
      profile: {
        ...profileResponse.data,
        greeting_name: buildProfileName(profileResponse.data),
      },
      support_links: customerProfileFixture.support_links,
      travel_utilities: customerProfileFixture.travel_utilities,
      upcoming_trip: buildUpcomingTrip(bookingItems),
    },
  }
}
