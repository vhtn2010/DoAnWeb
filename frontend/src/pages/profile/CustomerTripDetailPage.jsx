import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  downloadMyBookingSummary,
  getBookingByCode,
  getMyBookingStatusHistory,
} from '../../repositories/bookingRepository.js'
import usePublicSession from '../../hooks/usePublicSession.js'
import { normalizeTourService } from '../../mappers/serviceMappers.js'
import { buildPublicAuthPath } from '../../utils/publicNavigation.js'
import { formatCurrencyVND } from '../../utils/formatCurrency.js'
import './customerTripDetailPage.css'

const FALLBACK_TRIP_IMAGE = '/assets/template/service/detail/ha-long-gallery-main.png'

const STATUS_COPY = Object.freeze({
  confirmed: {
    label: 'Đã xác nhận',
    tone: 'confirmed',
    title: 'Hành trình đã sẵn sàng',
    description:
      'Đơn của bạn đã được xác nhận. Hãy kiểm tra lại lịch khởi hành, thông tin liên hệ và chuẩn bị giấy tờ trước ngày đi.',
  },
  paid: {
    label: 'Đã xác nhận',
    tone: 'confirmed',
    title: 'Hành trình đã sẵn sàng',
    description:
      'Thanh toán đã được ghi nhận. Bộ phận vận hành sẽ phục vụ chuyến đi theo đúng lịch trình đã xác nhận.',
  },
  in_progress: {
    label: 'Đang diễn ra',
    tone: 'active',
    title: 'Chuyến đi đang diễn ra',
    description:
      'Bạn đang trong thời gian sử dụng dịch vụ. Nếu cần hỗ trợ gấp, hãy liên hệ đội chăm sóc khách hàng.',
  },
  completed: {
    label: 'Đã hoàn thành',
    tone: 'done',
    title: 'Hành trình đã hoàn thành',
    description:
      'Cảm ơn bạn đã đồng hành cùng Nét Việt. Thông tin đơn vẫn được lưu để bạn tra cứu khi cần.',
  },
})

const REFUND_REQUESTABLE_STATUSES = new Set([
  'paid',
  'confirmed',
  'in_progress',
  'completed',
  'partially_refunded',
])

const PAYMENT_SUCCESS_STATUSES = new Set(['success', 'reconciled', 'paid'])

const BOOKING_TIMELINE_COPY = Object.freeze({
  cancelled: {
    description: 'Đơn hàng đã được hủy theo yêu cầu hoặc do quá hạn xử lý.',
    label: 'Đơn đã hủy',
    tone: 'danger',
  },
  completed: {
    description: 'Dịch vụ đã hoàn tất. Thông tin đơn vẫn được lưu để bạn tra cứu khi cần.',
    label: 'Chuyến đi đã hoàn thành',
    tone: 'success',
  },
  confirmed: {
    description: 'Nét Việt đã xác nhận đơn và đồng bộ thông tin vận hành cho chuyến đi.',
    label: 'Đơn đã được xác nhận',
    tone: 'success',
  },
  expired: {
    description: 'Đơn đã quá hạn thanh toán hoặc quá hạn xử lý.',
    label: 'Đơn đã hết hạn',
    tone: 'danger',
  },
  in_progress: {
    description: 'Bạn đang trong thời gian sử dụng dịch vụ đã đặt.',
    label: 'Chuyến đi đang diễn ra',
    tone: 'info',
  },
  paid: {
    description: 'Thanh toán đã được ghi nhận và đơn đã sẵn sàng để xác nhận vận hành.',
    label: 'Thanh toán đã xác thực',
    tone: 'success',
  },
  partially_refunded: {
    description: 'Một phần giá trị đơn đã được hoàn theo chính sách.',
    label: 'Đã hoàn tiền một phần',
    tone: 'warning',
  },
  payment_processing: {
    description: 'Hệ thống đã nhận chứng từ và đang chờ đối soát thanh toán.',
    label: 'Đang xác thực thanh toán',
    tone: 'warning',
  },
  pending_payment: {
    description: 'Yêu cầu thanh toán đã được tạo. Vui lòng hoàn tất thanh toán theo hướng dẫn.',
    label: 'Đã gửi yêu cầu thanh toán',
    tone: 'warning',
  },
  refunded: {
    description: 'Đơn đã được hoàn tiền thành công.',
    label: 'Đã hoàn tiền',
    tone: 'success',
  },
})

const PAYMENT_METHOD_LABELS = Object.freeze({
  bank_transfer: 'chuyển khoản ngân hàng',
  cash_at_office: 'thanh toán trực tiếp tại văn phòng',
  manual_bank_transfer: 'chuyển khoản ngân hàng',
  qr: 'quét mã QR',
  staff_collect: 'nhân viên hỗ trợ thu tiền',
})

const HIDDEN_TIMELINE_STATUSES = new Set(['created', 'draft', 'pending'])

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

function normalizeText(value = '') {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
}

function splitTextList(value) {
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => splitTextList(item))
      .map((item) => item.trim())
      .filter(Boolean)
  }

  return String(value ?? '')
    .split(/\r?\n|;|\|/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function parseDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function formatDate(value) {
  const date = parseDate(value)
  return date ? dateFormatter.format(date) : 'Đang cập nhật'
}

function formatDateTime(value) {
  const date = parseDate(value)
  return date ? dateTimeFormatter.format(date) : 'Đang cập nhật'
}

function getEventTime(value) {
  const date = parseDate(value)
  return date ? date.getTime() : 0
}

function formatDateRange(startAt, endAt) {
  const startDate = parseDate(startAt)
  const endDate = parseDate(endAt)

  if (!startDate && !endDate) {
    return 'Lịch trình đang cập nhật'
  }

  if (!startDate) {
    return dateFormatter.format(endDate)
  }

  if (!endDate || startDate?.toDateString() === endDate.toDateString()) {
    return formatDate(startAt)
  }

  return `${dateFormatter.format(startDate)} - ${dateFormatter.format(endDate)}`
}

function getDurationLabel(startAt, endAt) {
  const startDate = parseDate(startAt)
  const endDate = parseDate(endAt)

  if (!startDate || !endDate) {
    return 'Thời lượng đang cập nhật'
  }

  const diffDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1,
  )

  return diffDays === 1 ? '1 ngày' : `${diffDays} ngày`
}

function getPrimaryImage(item = {}) {
  const safeItem = normalizeObject(item)
  const snapshot = normalizeObject(safeItem.service_snapshot)

  return (
    normalizeText(safeItem.image_url) ||
    normalizeText(snapshot.image_url) ||
    normalizeText(snapshot.primary_image) ||
    normalizeText(snapshot.cover_image_url) ||
    normalizeText(snapshot.hero_image_url) ||
    normalizeText(snapshot.thumbnail_url) ||
    FALLBACK_TRIP_IMAGE
  )
}

function getSnapshotDetails(snapshot = {}) {
  const safeSnapshot = normalizeObject(snapshot)
  const details = normalizeObject(safeSnapshot.details)
  const flight = normalizeObject(safeSnapshot.flight)
  const roomType = normalizeObject(safeSnapshot.room_type)
  const train = normalizeObject(safeSnapshot.train)

  return {
    ...safeSnapshot,
    ...roomType,
    ...flight,
    ...train,
    ...details,
  }
}

function normalizeItinerary(itinerary = []) {
  if (!Array.isArray(itinerary)) {
    return []
  }

  return itinerary
    .map((day, index) => {
      if (typeof day === 'string') {
        const summary = day.trim()

        return {
          dayNumber: index + 1,
          highlights: summary ? [summary] : [],
          summary,
          title: `Ngày ${index + 1}`,
        }
      }

      const dayNumber = Number(day?.day_number ?? day?.day ?? index + 1)
      const highlights = Array.isArray(day?.highlights)
        ? splitTextList(day.highlights)
        : Array.isArray(day?.activities)
          ? splitTextList(day.activities)
          : splitTextList(day?.highlights ?? day?.activities)
      const summary =
        normalizeText(day?.summary) ||
        normalizeText(day?.description) ||
        highlights.join('. ')

      return {
        dayNumber: Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : index + 1,
        highlights,
        summary,
        title: normalizeText(day?.title) || `Ngày ${index + 1}`,
      }
    })
    .filter((day) => day.title || day.summary || day.highlights.length)
}

function getTransportLabel(value = '') {
  const labels = {
    bus: 'Xe du lịch cao cấp',
    car: 'Xe riêng',
    flight: 'Máy bay',
    train: 'Tàu hỏa',
    boat: 'Tàu/du thuyền',
  }

  return labels[value] ?? value ?? 'Đang cập nhật'
}

function getServiceTypeLabel(type = '') {
  const labels = {
    flight: 'Vé máy bay',
    hotel: 'Khách sạn',
    room: 'Phòng lưu trú',
    tour: 'Tour',
    train: 'Vé tàu',
  }

  return labels[type] ?? 'Dịch vụ'
}

function getReadableStatus(status = '') {
  return String(status || '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function getPaymentMethodLabel(method = '') {
  return PAYMENT_METHOD_LABELS[method] ?? (getReadableStatus(method) || 'phương thức đã chọn')
}

function getTimelineStatusCopy(status = '') {
  return BOOKING_TIMELINE_COPY[status] ?? {
    description: 'Hệ thống đã cập nhật trạng thái mới cho đơn hàng.',
    label: getReadableStatus(status) || 'Cập nhật trạng thái',
    tone: 'neutral',
  }
}

function pushTimelineEvent(events, event = {}) {
  if (!event.time) {
    return
  }

  const key = event.key ?? `${event.label}-${event.time}`

  if (events.some((item) => item.key === key)) {
    return
  }

  events.push({
    description: event.description ?? '',
    id: key,
    key,
    label: event.label,
    sortTime: getEventTime(event.time),
    time: formatDateTime(event.time),
    tone: event.tone ?? 'neutral',
  })
}

function buildTimelineEvents(booking = {}, statusHistory = []) {
  const events = []
  const safeBooking = normalizeObject(booking)
  const payments = Array.isArray(safeBooking.payments) ? safeBooking.payments : []
  const sortedPayments = [...payments].sort(
    (left, right) => getEventTime(left.created_at) - getEventTime(right.created_at),
  )
  const latestPayment = sortedPayments[sortedPayments.length - 1]
  const verifiedPayment =
    sortedPayments.find((payment) => PAYMENT_SUCCESS_STATUSES.has(payment.status)) ?? latestPayment

  pushTimelineEvent(events, {
    description: 'Hệ thống đã ghi nhận lựa chọn dịch vụ và thông tin liên hệ của bạn.',
    key: 'booking-created',
    label: 'Đã tạo đơn hàng',
    time: safeBooking.created_at,
    tone: 'info',
  })

  if (latestPayment?.created_at) {
    pushTimelineEvent(events, {
      description: `Mã giao dịch ${latestPayment.payment_code || 'đang tạo'} qua ${getPaymentMethodLabel(latestPayment.payment_method)}.`,
      key: `payment-request-${latestPayment.id ?? latestPayment.payment_code}`,
      label: 'Đã gửi yêu cầu thanh toán',
      time: latestPayment.created_at,
      tone: 'warning',
    })
  }

  statusHistory.forEach((entry) => {
    if (HIDDEN_TIMELINE_STATUSES.has(entry.status) || !BOOKING_TIMELINE_COPY[entry.status]) {
      return
    }

    const copy = getTimelineStatusCopy(entry.status)
    const time = entry.changed_at ?? entry.created_at

    pushTimelineEvent(events, {
      description: copy.description,
      key: `status-${entry.status}-${time}`,
      label: copy.label,
      time,
      tone: copy.tone,
    })
  })

  const currentStatus = safeBooking.booking_status ?? safeBooking.status
  const currentCopy = getTimelineStatusCopy(currentStatus)
  const hasCurrentStatus = events.some((event) => event.label === currentCopy.label)

  if (currentStatus && !hasCurrentStatus) {
    pushTimelineEvent(events, {
      description: currentCopy.description,
      key: `current-status-${currentStatus}`,
      label: currentCopy.label,
      time: safeBooking.updated_at || verifiedPayment?.paid_at || latestPayment?.created_at || safeBooking.created_at,
      tone: currentCopy.tone,
    })
  }

  return events.sort((left, right) => left.sortTime - right.sortTime)
}

function getPositiveCount(...values) {
  for (const value of values) {
    const parsed = Number(value)

    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed
    }
  }

  return 0
}

function buildPassengerSummary(item = {}, snapshot = {}) {
  const safeItem = normalizeObject(item)
  const passengerCounts = normalizeObject(snapshot.passenger_counts)
  const totalQuantity = getPositiveCount(passengerCounts.total_count, safeItem.quantity)
  const childCount = getPositiveCount(
    passengerCounts.child_count,
    safeItem.options?.child_count,
    safeItem.options?.children_count,
    safeItem.options?.children,
  )
  const infantCount = getPositiveCount(
    passengerCounts.infant_count,
    safeItem.options?.infant_count,
    safeItem.options?.infants,
  )
  const adultCount = getPositiveCount(
    passengerCounts.adult_count,
    safeItem.options?.adult_count,
    safeItem.options?.adults,
    totalQuantity - childCount - infantCount,
    totalQuantity,
  )
  const parts = []

  if (adultCount > 0) {
    parts.push(`${adultCount} ng\u01b0\u1eddi l\u1edbn`)
  }

  if (childCount > 0) {
    parts.push(`${childCount} tr\u1ebb em`)
  }

  if (infantCount > 0) {
    parts.push(`${infantCount} em b\u00e9`)
  }

  return parts.length ? parts.join(' \u00b7 ') : `${Math.max(totalQuantity, 1)} ng\u01b0\u1eddi l\u1edbn`
}

function getNormalizedTourSnapshot(item = {}) {
  const safeItem = normalizeObject(item)
  const snapshot = normalizeObject(safeItem.service_snapshot)
  const serviceType = safeItem.service_type ?? snapshot.service_type

  if (serviceType !== 'tour') {
    return null
  }

  return normalizeTourService({
    ...snapshot,
    details: getSnapshotDetails(snapshot),
  })
}

function buildServiceItems(items = []) {
  return items.map((item, index) => {
    const safeItem = normalizeObject(item)
    const snapshot = normalizeObject(safeItem.service_snapshot)
    const startAt = safeItem.start_at ?? safeItem.options?.start_at
    const endAt = safeItem.end_at ?? safeItem.options?.end_at
    const serviceType = safeItem.service_type ?? snapshot.service_type

    return {
      id: safeItem.id ?? `${safeItem.booking_id ?? 'booking'}-${index}`,
      imageUrl: getPrimaryImage(safeItem),
      label: getServiceTypeLabel(serviceType),
      location: normalizeText(snapshot.location_text) || 'Điểm đến đang cập nhật',
      passengersLabel: buildPassengerSummary(safeItem, snapshot),
      price: formatCurrencyVND(Number(safeItem.total_amount ?? 0)),
      quantity: Number(safeItem.quantity ?? 0) || 1,
      schedule: formatDateRange(startAt, endAt),
      startLabel: formatDateTime(startAt),
      type: serviceType ?? 'service',
      title:
        normalizeText(snapshot.title) ||
        normalizeText(safeItem.title_snapshot) ||
        normalizeText(safeItem.service_title) ||
        'Dịch vụ đang cập nhật',
    }
  })
}

function buildJourneyPlan(rawItem = {}, serviceItems = []) {
  const safeItem = normalizeObject(rawItem)
  const snapshot = normalizeObject(safeItem.service_snapshot)
  const normalizedTour = getNormalizedTourSnapshot(safeItem)
  const details = getSnapshotDetails(snapshot)
  const serviceType = safeItem.service_type ?? snapshot.service_type ?? 'tour'
  const resolvedDetails = normalizedTour?.details ?? details
  const itinerary =
    serviceType === 'tour'
      ? Array.isArray(resolvedDetails.itinerary)
        ? resolvedDetails.itinerary
        : []
      : normalizeItinerary(details.itinerary)
  const includedServices =
    serviceType === 'tour'
      ? Array.isArray(resolvedDetails.included_services)
        ? resolvedDetails.included_services
        : []
      : splitTextList(details.included_services)
  const excludedServices =
    serviceType === 'tour'
      ? Array.isArray(resolvedDetails.excluded_services)
        ? resolvedDetails.excluded_services
        : []
      : splitTextList(details.excluded_services)
  const durationDays = Number(resolvedDetails.duration_days)
  const durationNights = Number(resolvedDetails.duration_nights)
  const durationLabel =
    normalizedTour?.duration_text ||
    (Number.isFinite(durationDays) && durationDays > 0
      ? `${durationDays} ngày ${Math.max(Number(durationNights) || durationDays - 1, 0)} đêm`
      : getDurationLabel(safeItem.start_at, safeItem.end_at))
  const locationLabel =
    normalizeText(resolvedDetails.destination_location) ||
    normalizeText(snapshot.location_text) ||
    'Đang cập nhật'

  if (serviceType === 'tour') {
    return {
      detailCards: [
        ['Thời gian', durationLabel],
        ['Phương tiện', normalizedTour?.transport_text || getTransportLabel(resolvedDetails.transport_type)],
        ['Loại tour', normalizeText(normalizedTour?.tour_type) || normalizeText(snapshot.provider_name) || 'Net Viet Travel'],
      ],
      excludedServices,
      includedServices,
      itinerary,
      kind: 'tour',
      title: 'Lịch trình chi tiết',
    }
  }

  if (serviceType === 'hotel' || serviceType === 'room') {
    return {
      detailCards: [
        ['Nhận phòng', formatDateTime(safeItem.start_at)],
        ['Trả phòng', formatDateTime(safeItem.end_at)],
        ['Lưu trú', durationLabel],
      ],
      infoRows: [
        ['Khách sạn', normalizeText(snapshot.title) || serviceItems[0]?.title || 'Đang cập nhật'],
        ['Địa điểm', locationLabel],
        ['Số phòng', `${Number(safeItem.quantity ?? 1) || 1} phòng/dịch vụ`],
      ],
      kind: 'stay',
      title: 'Thông tin lưu trú',
    }
  }

  if (serviceType === 'flight') {
    return {
      detailCards: [
        ['Khởi hành', formatDateTime(safeItem.start_at)],
        ['Hạ cánh', formatDateTime(safeItem.end_at)],
        ['Hành lý', normalizeText(details.baggage_allowance) || 'Theo hạng vé đã đặt'],
      ],
      infoRows: [
        ['Chặng bay', normalizeText(details.route_text) || locationLabel],
        ['Hãng bay', normalizeText(details.airline_name) || normalizeText(details.airline) || 'Đang cập nhật'],
        ['Mã chuyến bay', normalizeText(details.flight_number) || 'Đang cập nhật'],
      ],
      kind: 'ticket',
      title: 'Thông tin chuyến bay',
    }
  }

  if (serviceType === 'train') {
    const schedule = Array.isArray(details.schedule) ? details.schedule : []

    return {
      detailCards: [
        ['Khởi hành', formatDateTime(safeItem.start_at)],
        ['Đến nơi', formatDateTime(safeItem.end_at)],
        ['Toa/ghế', normalizeText(details.seat_label) || 'Theo vé đã đặt'],
      ],
      infoRows: [
        ['Tuyến tàu', normalizeText(details.route_text) || locationLabel],
        ['Ga đi', normalizeText(details.departure_station) || 'Đang cập nhật'],
        ['Ga đến', normalizeText(details.arrival_station) || 'Đang cập nhật'],
      ],
      itinerary: schedule.map((stop, index) => ({
        dayNumber: index + 1,
        highlights: [normalizeText(stop.note)].filter(Boolean),
        summary: normalizeText(stop.city),
        title: `${normalizeText(stop.time) || 'Đang cập nhật'} · ${normalizeText(stop.station_name) || 'Điểm dừng'}`,
      })),
      kind: 'ticket',
      title: 'Thông tin vé tàu',
    }
  }

  return {
    detailCards: [
      ['Bắt đầu', formatDateTime(safeItem.start_at)],
      ['Kết thúc', formatDateTime(safeItem.end_at)],
      ['Địa điểm', locationLabel],
    ],
    infoRows: serviceItems.map((item) => [item.label, item.title]),
    kind: 'service',
    title: 'Thông tin dịch vụ',
  }
}

function buildTripViewModel(booking, items = [], statusHistory = []) {
  const serviceItems = buildServiceItems(items)
  const primaryItem = serviceItems[0] ?? {}
  const rawPrimaryItem = normalizeObject(items[0])
  const primarySnapshot = normalizeObject(rawPrimaryItem.service_snapshot)
  const normalizedTour = getNormalizedTourSnapshot(rawPrimaryItem)
  const primaryDetails = normalizedTour?.details ?? getSnapshotDetails(primarySnapshot)
  const journeyPlans = items
    .map((item, index) => {
      const serviceItem = serviceItems[index]
      const plan = buildJourneyPlan(item, serviceItems)

      return plan
        ? {
            ...plan,
            id: serviceItem?.id ?? `journey-plan-${index}`,
            serviceLabel: serviceItem?.label ?? getServiceTypeLabel(item?.service_type),
            serviceTitle: serviceItem?.title ?? '',
          }
        : null
    })
    .filter(Boolean)
  const journeyPlan = journeyPlans[0] ?? buildJourneyPlan(rawPrimaryItem, serviceItems)
  const status = booking?.booking_status ?? booking?.status ?? 'confirmed'
  const statusCopy = STATUS_COPY[status] ?? {
    label: String(status).replace(/_/g, ' ').toUpperCase(),
    tone: 'neutral',
    title: 'Thông tin hành trình',
    description: 'Thông tin đặt chỗ của bạn đang được hệ thống cập nhật.',
  }

  return {
    bookingCode: booking?.booking_code ?? '',
    contactEmail: booking?.contact_email ?? 'Đang cập nhật',
    contactName: booking?.contact_name ?? 'Đang cập nhật',
    contactPhone: booking?.contact_phone ?? 'Đang cập nhật',
    destination:
      normalizeText(primaryDetails.destination_location) ||
      normalizeText(primarySnapshot.location_text) ||
      primaryItem.location ||
      'Điểm đến đang cập nhật',
    duration: normalizedTour?.duration_text || getDurationLabel(rawPrimaryItem.start_at, rawPrimaryItem.end_at),
    endDate: formatDate(rawPrimaryItem.end_at),
    heroImage: primaryItem.imageUrl ?? FALLBACK_TRIP_IMAGE,
    journeyPlan,
    journeyPlans,
    passengersLabel: primaryItem.passengersLabel ?? '',
    reminders: [
      'Kiểm tra căn cước, hộ chiếu hoặc giấy tờ tùy thân theo yêu cầu của từng dịch vụ.',
      'Có mặt sớm hơn giờ hẹn để làm thủ tục, nhận vé hoặc gặp hướng dẫn viên.',
      'Giữ điện thoại mở chuông trong ngày khởi hành để đội vận hành có thể liên hệ nhanh.',
    ],
    serviceItems,
    startDate: formatDate(rawPrimaryItem.start_at),
    statusCopy,
    statusHistory: buildTimelineEvents(booking, statusHistory),
    title: primaryItem.title ?? booking?.booking_code ?? 'Hành trình của bạn',
    totalAmount: formatCurrencyVND(Number(booking?.total_amount ?? 0)),
  }
}

function TripIcon({ name }) {
  const commonProps = {
    'aria-hidden': true,
    fill: 'none',
    focusable: 'false',
    stroke: 'currentColor',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    strokeWidth: 1.8,
    viewBox: '0 0 24 24',
  }

  if (name === 'calendar') {
    return (
      <svg {...commonProps}>
        <path d="M8 2.5v4" />
        <path d="M16 2.5v4" />
        <path d="M3.5 10h17" />
        <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      </svg>
    )
  }

  if (name === 'clock') {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }

  if (name === 'transport') {
    return (
      <svg {...commonProps}>
        <path d="M6 17h12l1-6H5l1 6Z" />
        <path d="M7 11l2-4h6l2 4" />
        <path d="M8 17v2" />
        <path d="M16 17v2" />
      </svg>
    )
  }

  if (name === 'box') {
    return (
      <svg {...commonProps}>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <path d="M8 9h8" />
        <path d="M8 13h5" />
      </svg>
    )
  }

  if (name === 'phone') {
    return (
      <svg {...commonProps}>
        <path d="M22 16.92v2a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.12 3.18 2 2 0 0 1 4.11 1h2a2 2 0 0 1 2 1.72c.12.9.32 1.77.59 2.61a2 2 0 0 1-.45 2.11L7.4 8.29a16 16 0 0 0 6.31 6.31l.85-.85a2 2 0 0 1 2.11-.45c.84.27 1.71.47 2.61.59A2 2 0 0 1 22 16.92Z" />
      </svg>
    )
  }

  if (name === 'headset') {
    return (
      <svg {...commonProps}>
        <path d="M4 13a8 8 0 0 1 16 0" />
        <path d="M4 13v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2Z" />
        <path d="M20 13v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z" />
        <path d="M17 18a4 4 0 0 1-4 3h-2" />
      </svg>
    )
  }

  if (name === 'download') {
    return (
      <svg {...commonProps}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
        <path d="M5 21h14" />
      </svg>
    )
  }

  return (
    <svg {...commonProps}>
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function JourneyInfoStrip({ items = [] }) {
  if (!items.length) {
    return null
  }

  const icons = ['clock', 'transport', 'box']

  return (
    <div className="customer-trip-info-strip">
      {items.map(([label, value], index) => (
        <article key={label}>
          <TripIcon name={icons[index] ?? 'box'} />
          <span>{label}</span>
          <strong>{value || 'Đang cập nhật'}</strong>
        </article>
      ))}
    </div>
  )
}

function JourneyTimeline({ itinerary = [] }) {
  if (!itinerary.length) {
    return (
      <p className="customer-trip-empty">
        Lịch trình chi tiết đang được đội vận hành cập nhật cho đơn này.
      </p>
    )
  }

  return (
    <div className="customer-trip-itinerary">
      {itinerary.map((day) => (
        <article className="customer-trip-itinerary__day" key={`${day.dayNumber}-${day.title}`}>
          <span className="customer-trip-itinerary__marker">{day.dayNumber}</span>
          <div>
            <h3>{day.title}</h3>
            {day.summary ? <p>{day.summary}</p> : null}
            {day.highlights.length ? (
              <ul>
                {day.highlights.map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}

function InclusionCard({ items = [], tone, title }) {
  return (
    <article className={`customer-trip-inclusion customer-trip-inclusion--${tone}`}>
      <h3>
        <span aria-hidden="true">{tone === 'included' ? '✓' : '×'}</span>
        {title}
      </h3>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>Thông tin đang được cập nhật.</p>
      )}
    </article>
  )
}

function JourneyDetailRows({ rows = [] }) {
  if (!rows.length) {
    return null
  }

  return (
    <div className="customer-trip-detail-rows">
      {rows.map(([label, value]) => (
        <article key={label}>
          <span>{label}</span>
          <strong>{value || 'Đang cập nhật'}</strong>
        </article>
      ))}
    </div>
  )
}

function JourneyPlanSection({ plan }) {
  if (!plan) {
    return null
  }

  return (
    <section className={`customer-trip-plan customer-trip-plan--${plan.kind}`}>
      <div className="customer-trip-section-head">
        <p>Lịch trình và dịch vụ</p>
        <h2>{plan.title}</h2>
      </div>

      {plan.serviceTitle ? (
        <div className="customer-trip-plan__service">
          <span>{plan.serviceLabel}</span>
          <strong>{plan.serviceTitle}</strong>
        </div>
      ) : null}

      <JourneyInfoStrip items={plan.detailCards} />

      {plan.kind === 'tour' ? (
        <>
          <JourneyTimeline itinerary={plan.itinerary} />
          <div className="customer-trip-inclusions">
            <InclusionCard items={plan.includedServices} title="Bao gồm" tone="included" />
            <InclusionCard items={plan.excludedServices} title="Không bao gồm" tone="excluded" />
          </div>
        </>
      ) : (
        <>
          <JourneyDetailRows rows={plan.infoRows} />
          {plan.itinerary?.length ? <JourneyTimeline itinerary={plan.itinerary} /> : null}
        </>
      )}
    </section>
  )
}

function CustomerTripDetailPage() {
  const { bookingCode } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { authState, isCustomer } = usePublicSession()
  const [booking, setBooking] = useState(location.state?.booking ?? null)
  const [bookingItems, setBookingItems] = useState(location.state?.bookingItems ?? [])
  const [statusHistory, setStatusHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [downloadLoading, setDownloadLoading] = useState(false)
  const [selectedJourneyPlanId, setSelectedJourneyPlanId] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadTrip() {
      setLoading(true)
      setError('')

      try {
        const response = await getBookingByCode(bookingCode, { authState })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data?.booking) {
          throw new Error(response.message || 'Không thể tải chi tiết chuyến đi lúc này.')
        }

        const nextBooking = response.data.booking
        const nextItems = Array.isArray(response.data.booking_items)
          ? response.data.booking_items
          : []

        setBooking(nextBooking)
        setBookingItems(nextItems)

        if (nextBooking.id) {
          const historyResponse = await getMyBookingStatusHistory(nextBooking.id).catch(() => ({
            data: [],
          }))

          if (isActive) {
            setStatusHistory(Array.isArray(historyResponse.data) ? historyResponse.data : [])
          }
        }
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setError(loadError?.message ?? 'Không thể tải chi tiết chuyến đi lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadTrip()

    return () => {
      isActive = false
    }
  }, [authState, bookingCode])

  const viewModel = useMemo(
    () => buildTripViewModel(booking, bookingItems, statusHistory),
    [booking, bookingItems, statusHistory],
  )
  const canRequestRefund = REFUND_REQUESTABLE_STATUSES.has(
    booking?.booking_status ?? booking?.status,
  )
  const selectedJourneyPlan =
    viewModel.journeyPlans.find((plan) => plan.id === selectedJourneyPlanId) ??
    viewModel.journeyPlans[0] ??
    viewModel.journeyPlan

  useEffect(() => {
    if (!viewModel.journeyPlans.length) {
      return
    }

    const hasSelectedPlan = viewModel.journeyPlans.some((plan) => plan.id === selectedJourneyPlanId)

    if (!hasSelectedPlan) {
      setSelectedJourneyPlanId(viewModel.journeyPlans[0].id)
    }
  }, [selectedJourneyPlanId, viewModel.journeyPlans])

  function goBackToOrders() {
    navigate(buildPublicAuthPath('/profile/orders', isCustomer))
  }

  function goSupport() {
    navigate(buildPublicAuthPath('/customer-care', isCustomer), {
      state: {
        bookingCode: viewModel.bookingCode,
      },
    })
  }

  function goTravelHandbook() {
    navigate(buildPublicAuthPath('/travel-handbook', isCustomer))
  }

  function goRefundRequest() {
    navigate(buildPublicAuthPath(`/profile/trips/${bookingCode}/refund-request`, isCustomer))
  }

  async function downloadSummary() {
    if (!booking?.id) {
      return
    }

    setDownloadLoading(true)
    setFeedback('')

    try {
      const payload = await downloadMyBookingSummary(booking.id)
      const objectUrl = URL.createObjectURL(payload.blob)
      const link = document.createElement('a')

      link.href = objectUrl
      link.download = payload.filename || `${viewModel.bookingCode}-tom-tat.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(objectUrl)
      setFeedback('Đã chuẩn bị tệp tóm tắt chuyến đi để tải xuống.')
    } catch (downloadError) {
      setFeedback(downloadError?.message || 'Không thể tải tóm tắt chuyến đi lúc này.')
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <div className="profile-page customer-trip-page">
      <main className="profile-shell customer-trip-shell">
        <button className="customer-trip-back" type="button" onClick={goBackToOrders}>
          <span aria-hidden="true">‹</span>
          <span>Quay lại lịch sử đơn hàng</span>
        </button>

        {loading ? (
          <section className="customer-trip-state" role="status">
            <strong>Đang chuẩn bị chi tiết chuyến đi</strong>
            <p>Hệ thống đang đồng bộ lịch trình, dịch vụ và thông tin đặt chỗ của bạn.</p>
          </section>
        ) : null}

        {!loading && error ? (
          <section className="customer-trip-state customer-trip-state--error" role="alert">
            <strong>Không thể mở chi tiết chuyến đi</strong>
            <p>{error}</p>
            <button type="button" onClick={goBackToOrders}>
              Về lịch sử đơn hàng
            </button>
          </section>
        ) : null}

        {!loading && !error && booking ? (
          <>
            <section className="customer-trip-hero">
              <div className="customer-trip-hero__media">
                <img alt={viewModel.title} src={viewModel.heroImage} />
              </div>

              <div className="customer-trip-hero__content">
                <span className={`customer-trip-status customer-trip-status--${viewModel.statusCopy.tone}`}>
                  {viewModel.statusCopy.label}
                </span>
                <p className="customer-trip-hero__eyebrow">Hành trình đã đặt</p>
                <h1>{viewModel.title}</h1>
                <p>{viewModel.statusCopy.description}</p>

                <div className="customer-trip-hero__facts">
                  <span>{viewModel.startDate}</span>
                  <span>{viewModel.duration}</span>
                  <span>{viewModel.destination}</span>
                  {viewModel.passengersLabel ? <span>{viewModel.passengersLabel}</span> : null}
                </div>

                <div className="customer-trip-hero__actions">
                  <button type="button" onClick={downloadSummary} disabled={downloadLoading}>
                    <TripIcon name="download" />
                    {downloadLoading ? 'Đang tải...' : 'Tải tóm tắt'}
                  </button>
                  <button type="button" onClick={goSupport}>
                    <TripIcon name="phone" />
                    Cần hỗ trợ
                  </button>
                </div>

                {feedback ? (
                  <p className="customer-trip-feedback" role="status">
                    {feedback}
                  </p>
                ) : null}

                {canRequestRefund ? (
                  <div className="customer-trip-hero__refund-slot">
                    <button
                      className="customer-trip-hero__refund-button"
                      type="button"
                      onClick={goRefundRequest}
                    >
                      Yêu cầu hoàn tiền
                    </button>
                  </div>
                ) : null}
              </div>
            </section>

            <section className="customer-trip-overview" aria-label="Thông tin chuyến đi">
              <article>
                <span>Mã đơn</span>
                <strong>{viewModel.bookingCode}</strong>
              </article>
              <article>
                <span>Ngày khởi hành</span>
                <strong>{viewModel.startDate}</strong>
              </article>
              <article>
                <span>Ngày kết thúc</span>
                <strong>{viewModel.endDate}</strong>
              </article>
              <article>
                <span>Tổng thanh toán</span>
                <strong>{viewModel.totalAmount}</strong>
              </article>
            </section>

            <div className="customer-trip-layout">
              <section className="customer-trip-card customer-trip-card--wide">
                <JourneyPlanSection plan={selectedJourneyPlan} />

                <div className="customer-trip-section-head customer-trip-section-head--compact">
                  <p>Dịch vụ trong đơn</p>
                  <h2>Thông tin đã đặt</h2>
                </div>

                <div className="customer-trip-service-list">
                  {viewModel.serviceItems.length ? (
                    viewModel.serviceItems.map((item) => (
                      <button
                        aria-pressed={selectedJourneyPlan?.id === item.id}
                        className={`customer-trip-service${
                          selectedJourneyPlan?.id === item.id ? ' customer-trip-service--selected' : ''
                        }`}
                        key={item.id}
                        type="button"
                        onClick={() => setSelectedJourneyPlanId(item.id)}
                      >
                        <img alt={item.title} src={item.imageUrl} />
                        <div>
                          <span>{item.label}</span>
                          <h3>{item.title}</h3>
                          <p>{item.location}</p>
                          <small>{item.schedule} • {item.passengersLabel}</small>
                        </div>
                        <strong>{item.price}</strong>
                      </button>
                    ))
                  ) : (
                    <p className="customer-trip-empty">
                      Dịch vụ trong đơn đang được đồng bộ. Vui lòng quay lại sau ít phút hoặc liên hệ hỗ trợ.
                    </p>
                  )}
                </div>
              </section>

              <aside className="customer-trip-side">
                <section className="customer-trip-card">
                  <div className="customer-trip-section-head">
                    <p>Thông tin liên hệ</p>
                    <h2>Người đại diện</h2>
                  </div>
                  <dl className="customer-trip-contact">
                    <div>
                      <dt>Khách hàng</dt>
                      <dd>{viewModel.contactName}</dd>
                    </div>
                    <div>
                      <dt>Email</dt>
                      <dd>{viewModel.contactEmail}</dd>
                    </div>
                    <div>
                      <dt>SĐT</dt>
                      <dd>{viewModel.contactPhone}</dd>
                    </div>
                  </dl>
                </section>

                <section className="customer-trip-card customer-trip-card--note">
                  <div className="customer-trip-section-head">
                    <p>Nhắc nhở</p>
                    <h2>Trước ngày đi</h2>
                  </div>
                  <ul className="customer-trip-reminders">
                    {viewModel.reminders.map((reminder) => (
                      <li key={reminder}>
                        <TripIcon name="check" />
                        <span>{reminder}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              </aside>
            </div>

            <section className="customer-trip-card customer-trip-timeline">
              <div className="customer-trip-section-head">
                <p>Theo dõi trạng thái</p>
                <h2>Cập nhật gần đây</h2>
              </div>

              {viewModel.statusHistory.length ? (
                <div className="customer-trip-timeline__list">
                  {viewModel.statusHistory.map((item) => (
                    <article className={`customer-trip-timeline__event customer-trip-timeline__event--${item.tone}`} key={item.id}>
                      <span aria-hidden="true" />
                      <div>
                        <time>{item.time}</time>
                        <strong>{item.label}</strong>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="customer-trip-timeline__empty">
                  Trạng thái mới nhất của đơn sẽ được cập nhật tại đây khi hệ thống có thay đổi.
                </p>
              )}
            </section>

            <section className="customer-trip-shortcuts" aria-label="Tiện ích chuyến đi">
              <div className="customer-trip-shortcuts__stack">
                <button className="customer-trip-shortcut-card" type="button" onClick={goTravelHandbook}>
                  <span className="customer-trip-shortcut-card__icon">
                    <TripIcon name="box" />
                  </span>
                  <span className="customer-trip-shortcut-card__copy">
                    <span className="customer-trip-shortcut-card__eyebrow">Cẩm nang du lịch</span>
                    <span>Xem checklist hành lý, giấy tờ và mẹo đi tour.</span>
                  </span>
                </button>

                <button
                  className="customer-trip-shortcut-card customer-trip-shortcut-card--support"
                  type="button"
                  onClick={goSupport}
                >
                  <span className="customer-trip-shortcut-card__icon">
                    <TripIcon name="headset" />
                  </span>
                  <span className="customer-trip-shortcut-card__copy">
                    <span className="customer-trip-shortcut-card__eyebrow">Liên hệ hỗ trợ</span>
                    <span>Kết nối nhanh với đội chăm sóc khách hàng của Nét Việt.</span>
                  </span>
                </button>
              </div>
            </section>
          </>
        ) : null}
      </main>
    </div>
  )
}

export default CustomerTripDetailPage
