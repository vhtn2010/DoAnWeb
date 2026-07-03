import { SERVICE_TYPES } from '../constants/serviceTypes.js'

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function formatDatePart(date) {
  return `${padNumber(date.getDate())} Th${padNumber(date.getMonth() + 1)}`
}

function formatTimePart(date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`
}

function formatCartScheduleLabel(startAt, endAt) {
  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  if (Number.isNaN(startDate.getTime())) {
    return ''
  }

  if (Number.isNaN(endDate.getTime())) {
    return `${formatDatePart(startDate)}, ${startDate.getFullYear()}`
  }

  if (startDate.toDateString() === endDate.toDateString()) {
    return `${formatDatePart(startDate)}, ${formatTimePart(startDate)}`
  }

  return `${formatDatePart(startDate)} - ${formatDatePart(endDate)}, ${endDate.getFullYear()}`
}

function pluralizeVietnamese(count, singularLabel) {
  return `${count} ${singularLabel}`
}

function buildOptionSummary(item) {
  const { options = {}, service_type: serviceType } = item

  if (serviceType === SERVICE_TYPES.room) {
    const roomName = options.room_name ?? 'Phòng'
    const nights = Number(options.nights) || 0
    return `${roomName} • ${pluralizeVietnamese(nights, 'Đêm')}`
  }

  if (serviceType === SERVICE_TYPES.tour) {
    const packageName = options.package_name ?? 'Gói tour'
    const adultCount = Number(options.adult_count) || item.quantity || 1
    return `${packageName} • ${pluralizeVietnamese(adultCount, 'Người lớn')}`
  }

  if (serviceType === SERVICE_TYPES.hotel) {
    return options.rate_name ?? item.service?.title ?? 'Khách sạn'
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return options.cabin_class ?? 'Chuyến bay'
  }

  if (serviceType === SERVICE_TYPES.train) {
    return options.seat_class ?? 'Tàu hoả'
  }

  if (serviceType === SERVICE_TYPES.combo) {
    return options.package_name ?? 'Combo du lịch'
  }

  return item.service?.title ?? 'Dịch vụ du lịch'
}

export function mapCartItemToView(item) {
  return {
    ...item,
    options: {
      ...item.options,
      option_summary: buildOptionSummary(item),
      schedule_label: formatCartScheduleLabel(item.start_at, item.end_at),
    },
  }
}

export function mapCartResponseToView(cartResponse = {}) {
  return {
    cart: cartResponse.cart ?? null,
    cart_items: Array.isArray(cartResponse.cart_items)
      ? cartResponse.cart_items.map((item) => mapCartItemToView(item))
      : [],
  }
}

export function createCartSummaryFromItems(cartItems = [], selectedItemIds = []) {
  const selectedItems = cartItems.filter((item) => selectedItemIds.includes(item.id))
  const subtotalAmount = selectedItems.reduce(
    (totalAmount, item) => totalAmount + item.unit_price_snapshot * item.quantity,
    0,
  )

  return {
    subtotal_amount: subtotalAmount,
    discount_amount: 0,
    total_amount: subtotalAmount,
    currency: 'VND',
    selected_item_count: selectedItems.length,
  }
}

export function createCartSummaryPayload(cart, summary, selectedItemIds = []) {
  return {
    cart_id: cart?.id ?? '',
    cart_item_ids: selectedItemIds,
    summary,
  }
}
