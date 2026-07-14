import { getCurrentProfile } from './profileApiAdapter.js'
import { getMyBookingItems, listMyBookings } from './bookingApiAdapter.js'
import {
  getCustomerPaymentProof,
  listCustomerBookingPayments,
} from './paymentApiAdapter.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { customerProfileFixture } from '../../fixtures/profile.fixtures.js'
import {
  getSubmittedPaymentProof,
  hasSubmittedPaymentProof,
  isBookingAwaitingAdminReview,
  pickLatestPayment,
} from '../../utils/paymentReviewStatus.js'

const UPCOMING_BOOKING_STATUSES = new Set([
  'pending_confirmation',
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

const FALLBACK_PROFILE_IMAGE_BY_TYPE = Object.freeze({
  flight: '/assets/template/home/v39_1669.png',
  hotel: '/assets/template/home/v39_1693.png',
  room: '/assets/template/home/v39_1693.png',
  tour: '/assets/template/service/list/tour-mien-trung.png',
  train: '/assets/template/service/detail/recommendation-mien-trung.png',
})

function normalizeMediaUrl(value) {
  if (value && typeof value === 'object') {
    return normalizeMediaUrl(value.image_url ?? value.url ?? value.src)
  }

  const url = String(value ?? '').trim()
  return url || null
}

function pickMediaFromImages(images = []) {
  if (!Array.isArray(images)) {
    return null
  }

  const primaryImage = images.find((image) => image?.is_primary)
  return normalizeMediaUrl(primaryImage?.image_url ?? primaryImage?.url) ??
    normalizeMediaUrl(images[0]?.image_url ?? images[0]?.url)
}

function resolveProfileServiceImage(item = {}, serviceSnapshot = {}) {
  const serviceType = item.service_type ?? serviceSnapshot.service_type ?? SERVICE_TYPES.tour

  return (
    normalizeMediaUrl(item.image_url) ??
    normalizeMediaUrl(item.service?.image_url) ??
    normalizeMediaUrl(item.service?.primary_image) ??
    normalizeMediaUrl(serviceSnapshot.image_url) ??
    normalizeMediaUrl(serviceSnapshot.primary_image) ??
    normalizeMediaUrl(serviceSnapshot.cover_image_url) ??
    normalizeMediaUrl(serviceSnapshot.cover_image) ??
    normalizeMediaUrl(serviceSnapshot.hero_image_url) ??
    normalizeMediaUrl(serviceSnapshot.main_image_url) ??
    normalizeMediaUrl(serviceSnapshot.thumbnail_url) ??
    normalizeMediaUrl(serviceSnapshot.gallery_images?.[0]) ??
    pickMediaFromImages(serviceSnapshot.images) ??
    FALLBACK_PROFILE_IMAGE_BY_TYPE[serviceType] ??
    FALLBACK_PROFILE_IMAGE_BY_TYPE.tour
  )
}

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
  if (status === 'pending_confirmation') {
    return 'pending_confirmation'
  }

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
  if (status === 'pending_confirmation') {
    return 'review'
  }

  if (
    status === 'pending_payment' ||
    status === 'payment_processing' ||
    status === 'cancel_requested'
  ) {
    return 'warning'
  }

  if (status === 'paid' || status === 'confirmed') {
    return 'success'
  }

  if (status === 'in_progress') {
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
  const labels = {
    cancelled: 'ĐÃ HỦY',
    confirmed: 'ĐÃ XÁC NHẬN',
    expired: 'HẾT HẠN',
    failed: 'THẤT BẠI',
    in_progress: 'ĐANG DIỄN RA',
    paid: 'ĐÃ XÁC NHẬN',
    partially_refunded: 'HOÀN TIỀN MỘT PHẦN',
    payment_processing: 'ĐANG XỬ LÝ THANH TOÁN',
    pending_confirmation: 'CHỜ DUYỆT',
    pending_payment: 'CHỜ THANH TOÁN',
    refunded: 'ĐÃ HOÀN TIỀN',
  }

  if (labels[status]) {
    return labels[status]
  }

  return String(status ?? '')
    .replace(/_/g, ' ')
    .trim()
    .toUpperCase()
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

async function loadBookingPaymentReview(booking = {}) {
  const bookingStatus = String(booking.status ?? booking.booking_status ?? '').toLowerCase()

  if (
    !booking.id ||
    ![
      'pending_confirmation',
      'pending_payment',
      'payment_processing',
    ].includes(bookingStatus)
  ) {
    return {
      latest_payment: null,
      payment_proof: null,
    }
  }

  try {
    const paymentsResponse = await listCustomerBookingPayments(booking.id)
    const latestPayment = pickLatestPayment(extractPayments(paymentsResponse))

    if (!latestPayment?.id || hasSubmittedPaymentProof(latestPayment)) {
      return {
        latest_payment: latestPayment,
        payment_proof: getSubmittedPaymentProof(latestPayment),
      }
    }

    const proofResponse = await getCustomerPaymentProof(latestPayment.id).catch(() => ({
      data: {
        proof: null,
      },
    }))

    return {
      latest_payment: latestPayment,
      payment_proof: proofResponse.data?.proof ?? null,
    }
  } catch {
    return {
      latest_payment: null,
      payment_proof: null,
    }
  }
}

function getPaymentCode(payment = {}) {
  return String(payment?.payment_code ?? payment?.code ?? '').trim()
}

function buildPaymentSuccessPath(paymentCode = '') {
  const normalizedPaymentCode = String(paymentCode ?? '').trim()

  return normalizedPaymentCode
    ? `/payment-success/${encodeURIComponent(normalizedPaymentCode)}`
    : '/payment-success'
}

function buildCustomerTripPath(bookingCode = '') {
  const normalizedBookingCode = String(bookingCode ?? '').trim()

  return normalizedBookingCode
    ? `/profile/trips/${encodeURIComponent(normalizedBookingCode)}`
    : '/profile/orders'
}

function shouldOpenCustomerTrip(status) {
  return ['paid', 'confirmed', 'in_progress', 'completed'].includes(status)
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
  const displayStatus = isBookingAwaitingAdminReview(upcomingBooking)
    ? 'pending_confirmation'
    : upcomingBooking.status
  const paymentCode = String(upcomingBooking.latest_payment?.payment_code ?? '').trim()

  return {
    badge: upcomingBooking.status === 'pending_payment' ? 'CHỜ THANH TOÁN' : 'ĐANG THEO DÕI',
    booking_code: upcomingBooking.booking_code,
    code: upcomingBooking.booking_code,
    date_label: formatDateRange(firstItem.start_at, firstItem.end_at),
    detail_path:
      displayStatus === 'pending_confirmation'
        ? buildPaymentSuccessPath(paymentCode)
        : shouldOpenCustomerTrip(displayStatus)
          ? buildCustomerTripPath(upcomingBooking.booking_code)
          : `/booking-confirmation/${upcomingBooking.booking_code}`,
    primary_action_label: 'Xem lịch trình',
    route_state:
      displayStatus === 'pending_confirmation'
        ? {
            booking: upcomingBooking,
            bookingItems: upcomingBooking.items ?? [],
            payment: upcomingBooking.latest_payment ?? null,
            paymentResultPayload: upcomingBooking.latest_payment
              ? {
                  amount: upcomingBooking.latest_payment.amount ?? upcomingBooking.total_amount,
                  currency: upcomingBooking.latest_payment.currency ?? upcomingBooking.currency,
                  payment_code: upcomingBooking.latest_payment.payment_code,
                  payment_status: upcomingBooking.latest_payment.status,
                }
              : {
                  amount: upcomingBooking.total_amount,
                  currency: upcomingBooking.currency,
                  payment_status: 'pending',
                },
          }
        : null,
    id: upcomingBooking.id,
    image_url: resolveProfileServiceImage(firstItem, serviceSnapshot),
    location_label: serviceSnapshot.location_text ?? 'Hành trình đang được cập nhật',
    secondary_path: buildServiceRoute(serviceSnapshot, firstItem.service_type),
    secondary_action_label: 'Xem dịch vụ',
    service_id: firstItem.service_id ?? null,
    service_type: firstItem.service_type ?? SERVICE_TYPES.tour,
    ...(displayStatus === 'pending_confirmation'
      ? {
          badge: 'CHỜ DUYỆT',
        }
      : {}),
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
      image_url: resolveProfileServiceImage(item, snapshot),
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
    const isAwaitingAdminReview = isBookingAwaitingAdminReview(booking)
    const displayStatus = isAwaitingAdminReview ? 'pending_confirmation' : booking.status
    const paymentCode = getPaymentCode(booking.latest_payment)
    const statusDetailPath = buildPaymentSuccessPath(paymentCode)
    const statusRouteState = {
      booking,
      bookingItems: booking.items ?? [],
      payment: booking.latest_payment ?? null,
      paymentResultPayload: booking.latest_payment
        ? {
            amount: booking.latest_payment.amount ?? booking.total_amount,
            currency: booking.latest_payment.currency ?? booking.currency,
            payment_code: booking.latest_payment.payment_code,
            payment_status: booking.latest_payment.status,
          }
        : {
            amount: booking.total_amount,
            currency: booking.currency,
            payment_status: 'pending',
          },
    }

    return {
      action_label:
        booking.status === 'pending_payment' ? 'Tiếp tục thanh toán' : 'Xem chi tiết',
      booking_code: booking.booking_code,
      currency: booking.currency,
      description:
        booking.status === 'pending_payment'
          ? 'Đơn hàng đang chờ bạn hoàn tất bước thanh toán trực tiếp.'
          : `Đơn hàng hiện ở trạng thái ${String(booking.status ?? '').replace(/_/g, ' ')}.`,
      detail_path: shouldOpenCustomerTrip(displayStatus)
        ? buildCustomerTripPath(booking.booking_code)
        : `/booking-confirmation/${booking.booking_code}`,
      detail_summary: buildDurationSummary(booking.items),
      history_group: buildHistoryGroup(booking.status),
      id: booking.id,
      image_url: resolveProfileServiceImage(firstItem, serviceSnapshot),
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
      ...(isAwaitingAdminReview
        ? {
            action_label: 'Xem trạng thái',
            description: 'Bill thanh toán đã được gửi. Đơn hàng đang chờ kiểm tra và duyệt.',
            detail_path: statusDetailPath,
            route_state: statusRouteState,
            history_group: buildHistoryGroup(displayStatus),
            status: displayStatus,
            status_label: buildStatusLabel(displayStatus),
            status_tone: buildStatusTone(displayStatus),
            support_note:
              'Hệ thống đã nhận chứng từ. Vui lòng chờ đối soát, bạn không cần thanh toán lại.',
          }
        : {}),
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
      const [itemsResponse, paymentReview] = await Promise.all([
        getMyBookingItems(booking.id),
        loadBookingPaymentReview(booking),
      ])

      return {
        ...booking,
        items: Array.isArray(itemsResponse.data) ? itemsResponse.data : [],
        ...paymentReview,
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
