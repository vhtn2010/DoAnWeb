import { SERVICE_TYPES } from '../constants/serviceTypes.js'
import { calculateItemPricing, calculatePricingSummary } from '../utils/pricing.js'

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

function buildTourPassengerSummary(item) {
  const options = item.options ?? {}
  const adultCount = Number(options.adult_count) || item.quantity || 1
  const childCount = Math.max(Number(options.child_count) || 0, 0)
  const passengerLabels = [pluralizeVietnamese(adultCount, 'Người lớn')]

  if (childCount > 0) {
    passengerLabels.push(pluralizeVietnamese(childCount, 'Trẻ em'))
  }

  return passengerLabels.join(' • ')
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
    return `${packageName} • ${buildTourPassengerSummary(item)}`
  }

  if (serviceType === SERVICE_TYPES.hotel) {
    return options.rate_name ?? item.service?.title ?? 'Khách sạn'
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return options.cabin_class ?? 'Chuyến bay'
  }

  if (serviceType === SERVICE_TYPES.train) {
    return options.seat_class ?? 'Tàu hỏa'
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
      passenger_summary:
        item.service_type === SERVICE_TYPES.tour ? buildTourPassengerSummary(item) : '',
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

export function resolveCartItemLineAmount(item = {}) {
  return calculateItemPricing(item).subtotal_amount
}

export function createCartSummaryFromItems(cartItems = [], selectedItemIds = []) {
  const selectedItems = cartItems.filter((item) => selectedItemIds.includes(item.id))
  const summary = calculatePricingSummary(selectedItems)

  return {
    ...summary,
    selected_item_count: selectedItems.length,
  }
}

export function createCartSummaryPayload(cart, summary, selectedItemIds = [], voucherCode = '') {
  return {
    cart_id: cart?.id ?? '',
    cart_item_ids: selectedItemIds,
    summary,
    voucher_code: voucherCode,
  }
}
