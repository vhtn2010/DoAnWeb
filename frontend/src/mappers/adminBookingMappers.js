import {
  ADMIN_BOOKING_PAGE_SIZE,
  ADMIN_BOOKING_STATUSES,
  ADMIN_BOOKING_STATUS_META,
} from '../constants/adminBookings.js'

const fallbackImageUrl = '/assets/template/service/list/tour-ha-long.png'

const serviceTypeLabels = Object.freeze({
  flight: 'Chuyến bay',
  hotel: 'Khách sạn',
  room: 'Khách sạn',
  tour: 'Tour',
  train: 'Tàu hỏa',
  transportation: 'Di chuyển',
  transport: 'Di chuyển',
})

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

function toDate(value) {
  const dateValue = value ? new Date(value) : null

  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return null
  }

  return dateValue
}

function formatDate(value) {
  const dateValue = toDate(value)

  return dateValue ? dateFormatter.format(dateValue) : 'Chưa có dữ liệu'
}

function formatDateTime(value) {
  const dateValue = toDate(value)

  return dateValue ? dateTimeFormatter.format(dateValue) : ''
}

function formatRelativeTime(value) {
  const dateValue = toDate(value)

  if (!dateValue) {
    return 'Chưa cập nhật'
  }

  const diffMs = Date.now() - dateValue.getTime()

  if (diffMs <= 0) {
    return 'Vừa cập nhật'
  }

  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 60) {
    return `${Math.max(minutes, 1)} phút trước`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} giờ trước`
  }

  const days = Math.floor(hours / 24)

  if (days === 1) {
    return 'Hôm qua'
  }

  return `${days} ngày trước`
}

function getServiceTypeLabel(serviceType) {
  return serviceTypeLabels[serviceType] ?? 'Dịch vụ'
}

function getBookingItems(detail) {
  return Array.isArray(detail?.items) ? detail.items : []
}

function getPrimaryItem(items) {
  return items[0] ?? null
}

function getFirstItemByType(items, acceptedTypes) {
  return items.find((item) => acceptedTypes.includes(item.service_type)) ?? null
}

function getTotalQuantity(items, fallbackCount = 0) {
  const totalQuantity = items.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0,
  )

  return totalQuantity || Number(fallbackCount || 0)
}

function getItemDateBounds(items) {
  const sortedStartDates = items
    .map((item) => toDate(item.start_at))
    .filter(Boolean)
    .sort((left, right) => left.getTime() - right.getTime())
  const sortedEndDates = items
    .map((item) => toDate(item.end_at))
    .filter(Boolean)
    .sort((left, right) => right.getTime() - left.getTime())

  return {
    endDate: sortedEndDates[0] ?? null,
    startDate: sortedStartDates[0] ?? null,
  }
}

function getDurationLabel(startDate, endDate, itemCount) {
  if (!startDate || !endDate) {
    return `${itemCount} dịch vụ`
  }

  const diffDays = Math.max(
    1,
    Math.ceil((endDate.getTime() - startDate.getTime()) / 86400000) + 1,
  )

  return `${diffDays} ngày`
}

function getBookingNote(summary, detail) {
  if (detail?.note) {
    return detail.note
  }

  if (summary.expires_at) {
    return `Hạn giữ đơn: ${formatDateTime(summary.expires_at)}`
  }

  return 'Không có ghi chú ở danh sách đơn hàng.'
}

function mapStatusLabel(status) {
  return ADMIN_BOOKING_STATUS_META[status]?.label ?? status
}

function mapStatusTone(status) {
  return ADMIN_BOOKING_STATUS_META[status]?.tone ?? 'neutral'
}

function getPaymentProof(payment = {}) {
  return payment.proof_summary ?? payment.proof ?? null
}

function isPendingPaymentProof(payment = {}) {
  const proof = getPaymentProof(payment)

  return (
    payment.status === 'pending' &&
    (Boolean(payment.has_proof) || Boolean(proof?.proof_image_url))
  )
}

function normalizeReviewPayment(payment = null) {
  if (!payment) {
    return null
  }

  return {
    amount: Number(payment.amount || 0),
    currency: payment.currency || 'VND',
    id: payment.id,
    paidAt: payment.paid_at || null,
    paymentCode: payment.payment_code || payment.id,
    paymentMethod: payment.payment_method || '',
    proof: getPaymentProof(payment),
    provider: payment.provider || '',
    status: payment.status || '',
    submittedAt: getPaymentProof(payment)?.submitted_at || null,
  }
}

function getReviewPayment(summary = {}, detail = null) {
  if (isPendingPaymentProof(summary.latest_payment)) {
    return normalizeReviewPayment(summary.latest_payment)
  }

  const payments = Array.isArray(detail?.payments) ? detail.payments : []
  const pendingPaymentWithProof = payments.find((payment) => isPendingPaymentProof(payment))

  return normalizeReviewPayment(pendingPaymentWithProof)
}

function getSummaryServiceTitle(summary, primaryItem, itemCount) {
  return (
    summary.service_title ||
    summary.primary_service_title ||
    summary.service?.title ||
    primaryItem?.title ||
    `${itemCount || 1} dịch vụ trong đơn`
  )
}

export function getAdminBookingListParams({
  currentPage,
  statusFilter,
} = {}) {
  return {
    limit: ADMIN_BOOKING_PAGE_SIZE,
    page: currentPage,
    status: statusFilter === ADMIN_BOOKING_STATUSES.all ? undefined : statusFilter,
  }
}

export function mapAdminBookingSummary(summary = {}, detail = null) {
  const items = getBookingItems(detail)
  const primaryItem = getPrimaryItem(items)
  const hotelItem = getFirstItemByType(items, ['hotel', 'room'])
  const transportItem = getFirstItemByType(items, ['flight', 'train', 'transportation', 'transport'])
  const itemCount = Number(summary.item_count || items.length || 0)
  const totalQuantity = getTotalQuantity(items, itemCount)
  const { startDate, endDate } = getItemDateBounds(items)
  const serviceTitle = getSummaryServiceTitle(summary, primaryItem, itemCount)
  const reviewPayment = getReviewPayment(summary, detail)
  const statusLabel = reviewPayment ? 'Chờ duyệt' : mapStatusLabel(summary.status)
  const statusTone = reviewPayment ? 'review' : mapStatusTone(summary.status)

  return {
    bookingCode: summary.booking_code,
    createdLabel: formatRelativeTime(summary.created_at),
    customerEmail:
      summary.contact_email ||
      summary.customer?.email ||
      'Chưa có email',
    customerName:
      summary.contact_name ||
      summary.customer?.full_name ||
      'Khách hàng chưa đặt tên',
    customerPhone:
      summary.contact_phone ||
      summary.customer?.phone ||
      'Chưa có số điện thoại',
    departureLabel: formatDate(startDate ?? primaryItem?.start_at),
    destination: primaryItem
      ? getServiceTypeLabel(primaryItem.service_type)
      : 'Theo chi tiết đơn hàng',
    duration: getDurationLabel(startDate, endDate, itemCount || 1),
    hotelName: hotelItem?.title || 'Chưa có dịch vụ lưu trú',
    id: summary.id,
    imageUrl: fallbackImageUrl,
    itemCount,
    note: getBookingNote(summary, detail),
    returnLabel: formatDate(endDate ?? primaryItem?.end_at),
    reviewPayment,
    serviceTitle,
    status: summary.status,
    statusLabel,
    statusTone,
    totalAmount: Number(summary.total_amount || 0),
    transport: transportItem?.title || 'Theo từng dịch vụ',
    travelers: `${totalQuantity} lượt dịch vụ`,
  }
}

export function mapAdminBookingDetail(detail = {}) {
  const mappedSummary = mapAdminBookingSummary(detail, detail)
  const serviceItems = getBookingItems(detail).map((item) => ({
    description: [
      item.start_at ? `Bắt đầu: ${formatDateTime(item.start_at)}` : '',
      item.end_at ? `Kết thúc: ${formatDateTime(item.end_at)}` : '',
      `${Number(item.quantity || 0)} lượt`,
    ].filter(Boolean).join(' · '),
    label: getServiceTypeLabel(item.service_type),
    price: Number(item.total_amount || 0),
    title: item.title || getServiceTypeLabel(item.service_type),
  }))

  return {
    ...mappedSummary,
    discountAmount: Number(detail.discount_amount || 0),
    payments: Array.isArray(detail.payments) ? detail.payments : [],
    refunds: Array.isArray(detail.refunds) ? detail.refunds : [],
    serviceItems,
    subtotalAmount: Number(detail.subtotal_amount || 0),
    voucherId: detail.voucher_id || null,
  }
}

export function mapAdminBookingPaginationMeta(meta = {}) {
  return {
    currentPage: Number(meta.page || 1),
    hasNext: Boolean(meta.has_next),
    total: Number(meta.total || 0),
    totalPages: Math.max(1, Number(meta.total_pages || 0)),
  }
}

export function getAdminBookingActionConfig(status) {
  if (status === ADMIN_BOOKING_STATUSES.paid) {
    return [
      {
        action: 'cancel',
        icon: 'x',
        label: 'Từ chối',
        tone: 'reject',
      },
      {
        action: 'confirm',
        icon: 'check',
        label: 'Xác nhận',
        tone: 'confirm',
      },
    ]
  }

  if (status === ADMIN_BOOKING_STATUSES.pendingPayment) {
    return []
  }

  if (status === ADMIN_BOOKING_STATUSES.confirmed) {
    return [
      {
        action: 'start',
        icon: 'check',
        label: 'Bắt đầu',
        tone: 'progress',
      },
    ]
  }

  if (status === ADMIN_BOOKING_STATUSES.inProgress) {
    return [
      {
        action: 'complete',
        icon: 'check',
        label: 'Hoàn thành',
        tone: 'complete',
      },
    ]
  }

  if (status === ADMIN_BOOKING_STATUSES.cancelRequested) {
    return [
      {
        action: 'cancel',
        icon: 'x',
        label: 'Xác nhận huỷ',
        tone: 'reject',
      },
    ]
  }

  return []
}
