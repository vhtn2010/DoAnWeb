import { SERVICE_TYPES } from '../constants/serviceTypes.js'

const DEFAULT_CURRENCY = 'VND'
export const VAT_RATE = 0.08
const HOTEL_SERVICE_FEE_RATE = 0.05
const TOUR_SERVICE_FEE_PER_BOOKING = 100000
const FLIGHT_SERVICE_FEE_PER_TICKET = 50000
const TRAIN_SERVICE_FEE_PER_TICKET = 20000

export function roundMoney(value) {
  return Number(Number(value || 0).toFixed(2))
}

function toNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value)
    }
  }

  return 0
}

function positiveNumber(...values) {
  return Math.max(toNumber(...values), 0)
}

function positiveInteger(...values) {
  const parsedValue = Math.floor(positiveNumber(...values))

  return parsedValue > 0 ? parsedValue : 0
}

function getOptions(item = {}) {
  return item.options && typeof item.options === 'object' && !Array.isArray(item.options)
    ? item.options
    : {}
}

function getPassengerQuantity(item = {}, options = getOptions(item)) {
  return Math.max(
    positiveInteger(options.passenger_quantity, options.passenger_count, options.ticket_quantity),
    positiveInteger(item.quantity),
    positiveInteger(options.adult_count, options.adults) +
      positiveInteger(options.child_count, options.children) +
      positiveInteger(options.infant_count, options.infants),
    1,
  )
}

function calculateHotelItemPricing(item = {}, options = getOptions(item)) {
  const nights = Math.max(positiveInteger(options.nights, options.night_count), 1)
  const roomQuantity = Math.max(positiveInteger(options.room_quantity, item.quantity), 1)
  const roomPrice = positiveNumber(
    options.room_price,
    options.room_base_price,
    item.unit_price_snapshot ? Number(item.unit_price_snapshot) / nights : null,
    item.unit_price,
  )
  const subtotalAmount = roundMoney(roomPrice * roomQuantity * nights)

  return {
    airport_fee_amount: 0,
    airline_surcharge_amount: 0,
    base_amount: subtotalAmount,
    security_fee_amount: 0,
    service_fee_amount: roundMoney(subtotalAmount * HOTEL_SERVICE_FEE_RATE),
    subtotal_amount: subtotalAmount,
    surcharge_amount: 0,
    vat_base_amount: subtotalAmount,
  }
}

function calculateTourItemPricing(item = {}, options = getOptions(item)) {
  const quantity = positiveInteger(item.quantity)
  const children = positiveInteger(options.child_count, options.children)
  const infants = positiveInteger(options.infant_count, options.infants)
  const adults = Math.max(
    positiveInteger(options.adult_count, options.adults),
    Math.max(quantity - children - infants, 0),
  )
  const adultPrice = positiveNumber(options.adult_price, item.unit_price_snapshot, item.unit_price)
  const childPrice = positiveNumber(options.child_price, adultPrice * 0.7)
  const infantPrice = positiveNumber(options.infant_price, 0)
  const subtotalAmount = roundMoney(
    (adultPrice * adults) + (childPrice * children) + (infantPrice * infants),
  )

  return {
    airport_fee_amount: 0,
    airline_surcharge_amount: 0,
    base_amount: subtotalAmount,
    security_fee_amount: 0,
    service_fee_amount: TOUR_SERVICE_FEE_PER_BOOKING,
    subtotal_amount: subtotalAmount,
    surcharge_amount: positiveNumber(options.surcharge_amount, options.surcharge),
    vat_base_amount: subtotalAmount,
  }
}

function calculateFlightItemPricing(item = {}, options = getOptions(item)) {
  const passengerQuantity = getPassengerQuantity(item, options)
  const ticketQuantity = Math.max(positiveInteger(options.ticket_quantity), passengerQuantity)
  const baseFare = roundMoney(
    positiveNumber(options.base_fare, item.unit_price_snapshot, item.unit_price) * passengerQuantity,
  )
  // Phụ thu = đúng thuế + phụ thu của hạng vé mà khách đã thấy khi chọn vé, nhân theo số khách,
  // thay vì bộ phí cố định tự tính (khiến tổng lệch với giá niêm yết trên trang chi tiết vé).
  const taxAmount = positiveNumber(options.taxes) * passengerQuantity
  const addOnAmount = positiveNumber(options.add_ons) * passengerQuantity
  const surchargeAmount = roundMoney(taxAmount + addOnAmount)

  return {
    airport_fee_amount: 0,
    airline_surcharge_amount: 0,
    base_amount: baseFare,
    security_fee_amount: 0,
    service_fee_amount: FLIGHT_SERVICE_FEE_PER_TICKET * ticketQuantity,
    subtotal_amount: baseFare,
    surcharge_amount: surchargeAmount,
    vat_base_amount: baseFare,
  }
}

function calculateTrainItemPricing(item = {}, options = getOptions(item)) {
  const passengerQuantity = getPassengerQuantity(item, options)
  const ticketQuantity = Math.max(positiveInteger(options.ticket_quantity), passengerQuantity)
  const ticketPrice = positiveNumber(options.ticket_price, item.unit_price_snapshot, item.unit_price)
  // Khi chọn nhiều ghế khác giá, selected_seat_price là tổng đúng của mọi ghế;
  // chỉ nhân ticketPrice × số ghế khi không có tổng ghế (mọi ghế cùng giá).
  const seatTotalPrice = positiveNumber(options.selected_seat_price)
  const subtotalAmount = roundMoney(
    seatTotalPrice > 0 ? seatTotalPrice : ticketPrice * passengerQuantity,
  )

  return {
    airport_fee_amount: 0,
    airline_surcharge_amount: 0,
    base_amount: subtotalAmount,
    security_fee_amount: 0,
    service_fee_amount: TRAIN_SERVICE_FEE_PER_TICKET * ticketQuantity,
    subtotal_amount: subtotalAmount,
    surcharge_amount: 0,
    vat_base_amount: subtotalAmount,
  }
}

function calculateGenericItemPricing(item = {}) {
  const quantity = Math.max(positiveInteger(item.quantity), 1)
  const subtotalAmount = roundMoney(
    positiveNumber(item.total_amount, positiveNumber(item.unit_price_snapshot, item.unit_price) * quantity),
  )

  return {
    airport_fee_amount: 0,
    airline_surcharge_amount: 0,
    base_amount: subtotalAmount,
    security_fee_amount: 0,
    service_fee_amount: 0,
    subtotal_amount: subtotalAmount,
    surcharge_amount: 0,
    vat_base_amount: subtotalAmount,
  }
}

export function calculateItemPricing(item = {}) {
  const serviceType = item.service_type
  const options = getOptions(item)

  if (serviceType === SERVICE_TYPES.hotel || serviceType === SERVICE_TYPES.room) {
    return calculateHotelItemPricing(item, options)
  }

  if (serviceType === SERVICE_TYPES.tour) {
    return calculateTourItemPricing(item, options)
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return calculateFlightItemPricing(item, options)
  }

  if (serviceType === SERVICE_TYPES.train) {
    return calculateTrainItemPricing(item, options)
  }

  return calculateGenericItemPricing(item)
}

export function calculatePricingSummary(
  items = [],
  {
    cartId = null,
    currency = DEFAULT_CURRENCY,
    discountAmount = 0,
    voucher = null,
  } = {},
) {
  const itemBreakdowns = items.map((item) => ({
    cart_item_id: item.id || item.cart_item_id || null,
    service_type: item.service_type || null,
    ...calculateItemPricing(item),
  }))
  const subtotalAmount = roundMoney(
    itemBreakdowns.reduce((total, item) => total + item.subtotal_amount, 0),
  )
  const safeDiscountAmount = roundMoney(
    Math.min(Math.max(Number(discountAmount) || 0, 0), subtotalAmount),
  )
  const vatAmount = roundMoney(Math.max(subtotalAmount - safeDiscountAmount, 0) * VAT_RATE)
  const serviceFeeAmount = roundMoney(
    itemBreakdowns.reduce((total, item) => total + item.service_fee_amount, 0),
  )
  const surchargeAmount = roundMoney(
    itemBreakdowns.reduce((total, item) => total + item.surcharge_amount, 0),
  )

  return {
    cart_id: cartId,
    currency,
    discount_amount: safeDiscountAmount,
    item_count: items.length,
    pricing_breakdown: {
      items: itemBreakdowns,
      vat_rate: VAT_RATE,
    },
    quantity_total: items.reduce((total, item) => total + positiveInteger(item.quantity), 0),
    service_fee_amount: serviceFeeAmount,
    subtotal_amount: subtotalAmount,
    surcharge_amount: surchargeAmount,
    tax_and_fee_amount: roundMoney(vatAmount + serviceFeeAmount + surchargeAmount),
    total_amount: roundMoney(
      Math.max(subtotalAmount - safeDiscountAmount + vatAmount + serviceFeeAmount + surchargeAmount, 0),
    ),
    vat_amount: vatAmount,
    voucher,
  }
}
