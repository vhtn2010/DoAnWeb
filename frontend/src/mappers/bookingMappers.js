import {
  BOOKING_DEFAULT_CURRENCY,
  BOOKING_DEFAULT_PAYMENT_METHOD,
} from '../constants/bookings.js'
import { ROLES } from '../constants/roles.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import { calculateItemPricing } from '../utils/pricing.js'
import { resolvePreviewBookingCode } from '../utils/previewBooking.js'

function normalizeText(value = '') {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveNumber(...values) {
  const numericValue = values.find((value) => typeof value === 'number' && Number.isFinite(value))
  return numericValue ?? 0
}

function sumPricingAmounts(source = {}) {
  const values = [
    source.vat_amount,
    source.tax_amount,
    source.service_fee_amount,
    source.surcharge_amount,
    source.baggage_fee_amount,
  ]
    .filter((value) => typeof value === 'number' && Number.isFinite(value))

  if (values.length === 0) {
    return undefined
  }

  const vatAmount = resolveNumber(source.vat_amount, source.tax_amount)
  return (
    vatAmount +
    resolveNumber(source.service_fee_amount) +
    resolveNumber(source.surcharge_amount) +
    resolveNumber(source.baggage_fee_amount)
  )
}

function getNormalizedAuthState(authState = ROLES.guest) {
  return authState === ROLES.customer ? ROLES.customer : ROLES.guest
}

function getSelectedCartItems(cartSnapshot, selectedCartItemIds = []) {
  const cartItems = Array.isArray(cartSnapshot?.cart_items) ? cartSnapshot.cart_items : []

  if (!Array.isArray(selectedCartItemIds) || selectedCartItemIds.length === 0) {
    return cartItems.length > 0 ? [cartItems[0]] : []
  }

  const selectedItems = cartItems.filter((cartItem) => selectedCartItemIds.includes(cartItem.id))
  return selectedItems.length > 0 ? selectedItems : (cartItems[0] ? [cartItems[0]] : [])
}

function getDurationLabel(startAt, endAt) {
  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '2 ngày 1 đêm'
  }

  const diffMs = Math.max(endDate.getTime() - startDate.getTime(), 0)
  const diffDays = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1)

  if (diffDays <= 1) {
    return '1 ngày'
  }

  return `${diffDays} ngày ${Math.max(diffDays - 1, 1)} đêm`
}

export function cloneBookingValue(value) {
  return JSON.parse(JSON.stringify(value))
}

export function formatBookingDateRange(startAt, endAt) {
  if (!startAt || !endAt) {
    return '12 Th10 - 14 Th10, 2024'
  }

  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '12 Th10 - 14 Th10, 2024'
  }

  const startDay = String(startDate.getDate()).padStart(2, '0')
  const startMonth = String(startDate.getMonth() + 1).padStart(2, '0')
  const endDay = String(endDate.getDate()).padStart(2, '0')
  const endMonth = String(endDate.getMonth() + 1).padStart(2, '0')
  const year = endDate.getFullYear()

  return `${startDay} Th${startMonth} - ${endDay} Th${endMonth}, ${year}`
}

export function mapCartItemToBookingItem(cartItem, bookingId, index = 0) {
  return {
    id: `${bookingId}-item-${String(index + 1).padStart(3, '0')}`,
    booking_id: bookingId,
    service_id: cartItem.service_id ?? '',
    service_type: cartItem.service_type ?? SERVICE_TYPES.tour,
    service_title: cartItem.service?.title ?? 'Dịch vụ đang cập nhật',
    service_code: cartItem.service?.service_code ?? `SERVICE-${String(index + 1).padStart(3, '0')}`,
    image_url:
      cartItem.service?.image_url ?? '/assets/template/service/detail/ha-long-gallery-main.png',
    start_at: cartItem.start_at ?? '',
    end_at: cartItem.end_at ?? '',
    quantity: resolveNumber(cartItem.quantity, 1),
    unit_price_snapshot: resolveNumber(cartItem.unit_price_snapshot),
    total_amount: resolveNumber(
      calculateItemPricing(cartItem).subtotal_amount,
      resolveNumber(cartItem.unit_price_snapshot) * resolveNumber(cartItem.quantity, 1),
    ),
    options: {
      duration_label: getDurationLabel(cartItem.start_at, cartItem.end_at),
      schedule_label: formatBookingDateRange(cartItem.start_at, cartItem.end_at),
      location_text: cartItem.service?.location_text ?? '',
    },
  }
}

export function buildBookingConfirmationFromCheckoutHandoff({
  authState = ROLES.guest,
  baseBookingData,
  cartSnapshot,
  checkoutPayload,
  selectedCartItemIds,
  cartSummaryPayload,
} = {}) {
  const fallbackData = cloneBookingValue(baseBookingData ?? {})
  const fallbackBooking = fallbackData.booking ?? {}
  const selectedCartItems = getSelectedCartItems(
    cartSnapshot,
    checkoutPayload?.selected_cart_item_ids ?? selectedCartItemIds,
  )
  const bookingId = fallbackBooking.id ?? 'booking-preview-001'
  const bookingItems =
    selectedCartItems.length > 0
      ? selectedCartItems.map((cartItem, index) => mapCartItemToBookingItem(cartItem, bookingId, index))
      : (fallbackData.booking_items ?? [])

  const subtotalAmount = resolveNumber(
    checkoutPayload?.summary?.subtotal_amount,
    cartSummaryPayload?.summary?.subtotal_amount,
    bookingItems.reduce((totalAmount, item) => totalAmount + resolveNumber(item.total_amount), 0),
    fallbackBooking.subtotal_amount,
  )
  const discountAmount = resolveNumber(
    checkoutPayload?.summary?.discount_amount,
    cartSummaryPayload?.summary?.discount_amount,
    fallbackBooking.discount_amount,
  )
  const taxAndFeeAmount = resolveNumber(
    checkoutPayload?.summary?.tax_and_fee_amount,
    cartSummaryPayload?.summary?.tax_and_fee_amount,
    sumPricingAmounts(checkoutPayload?.summary),
    sumPricingAmounts(cartSummaryPayload?.summary),
    resolveNumber(fallbackBooking.tax_and_fee_amount),
    sumPricingAmounts(fallbackBooking),
  )
  const totalAmount = resolveNumber(
    checkoutPayload?.summary?.total_amount,
    cartSummaryPayload?.summary?.total_amount,
    subtotalAmount + taxAndFeeAmount - discountAmount,
    fallbackBooking.total_amount,
  )
  const normalizedAuthState = getNormalizedAuthState(authState)
  const bookingCode = resolvePreviewBookingCode(
    checkoutPayload?.preview_booking_code,
    cartSummaryPayload?.preview_booking_code,
    fallbackBooking.booking_code,
  )

  return {
    booking: {
      ...fallbackBooking,
      id: bookingId,
      booking_code: bookingCode,
      user_id:
        normalizedAuthState === ROLES.customer
          ? (fallbackBooking.user_id ?? 'customer-preview-001')
          : null,
      guest_session_id:
        normalizedAuthState === ROLES.customer
          ? null
          : (fallbackBooking.guest_session_id ?? 'guest-session-preview-001'),
      contact_name: normalizeText(checkoutPayload?.contact_name) || fallbackBooking.contact_name,
      contact_email: normalizeText(checkoutPayload?.contact_email) || fallbackBooking.contact_email,
      contact_phone: normalizeText(checkoutPayload?.contact_phone) || fallbackBooking.contact_phone,
      note: normalizeText(checkoutPayload?.note) || fallbackBooking.note,
      subtotal_amount: subtotalAmount,
      discount_amount: discountAmount,
      vat_amount: resolveNumber(
        checkoutPayload?.summary?.vat_amount,
        cartSummaryPayload?.summary?.vat_amount,
        fallbackBooking.vat_amount,
        fallbackBooking.tax_amount,
      ),
      service_fee_amount: resolveNumber(
        checkoutPayload?.summary?.service_fee_amount,
        cartSummaryPayload?.summary?.service_fee_amount,
        fallbackBooking.service_fee_amount,
      ),
      baggage_fee_amount: resolveNumber(
        checkoutPayload?.summary?.baggage_fee_amount,
        cartSummaryPayload?.summary?.baggage_fee_amount,
        fallbackBooking.baggage_fee_amount,
      ),
      surcharge_amount: resolveNumber(
        checkoutPayload?.summary?.surcharge_amount,
        cartSummaryPayload?.summary?.surcharge_amount,
        fallbackBooking.surcharge_amount,
      ),
      tax_and_fee_amount: taxAndFeeAmount,
      tax_amount: resolveNumber(
        checkoutPayload?.summary?.vat_amount,
        cartSummaryPayload?.summary?.vat_amount,
        fallbackBooking.tax_amount,
      ),
      total_amount: totalAmount,
      currency: checkoutPayload?.summary?.currency ?? fallbackBooking.currency ?? BOOKING_DEFAULT_CURRENCY,
      voucher_code:
        normalizeText(checkoutPayload?.voucher_code) ||
        normalizeText(cartSummaryPayload?.voucher_code) ||
        fallbackBooking.voucher_code,
    },
    booking_items: bookingItems,
    travellers:
      Array.isArray(checkoutPayload?.travellers) && checkoutPayload.travellers.length > 0
        ? checkoutPayload.travellers.map((traveller, index) => ({
            id: `${bookingId}-traveller-${String(index + 1).padStart(3, '0')}`,
            full_name:
              normalizeText(traveller.traveller_info?.full_name) ||
              normalizeText(checkoutPayload.contact_name) ||
              fallbackBooking.contact_name,
            phone:
              normalizeText(traveller.traveller_info?.phone) ||
              normalizeText(checkoutPayload.contact_phone) ||
              fallbackBooking.contact_phone,
            email:
              normalizeText(traveller.traveller_info?.email) ||
              normalizeText(checkoutPayload.contact_email) ||
              fallbackBooking.contact_email,
            passenger_type: 'adult',
            identity_number: null,
          }))
        : (fallbackData.travellers ?? []),
    payment_options: cloneBookingValue(fallbackData.payment_options ?? []),
  }
}

export function buildBookingConfirmationViewModel({
  booking,
  bookingItems = [],
  paymentOptions = [],
} = {}) {
  const taxAndFeeAmount =
    resolveNumber(
      booking?.tax_and_fee_amount,
      sumPricingAmounts(booking),
    )

  return {
    bookingCode: booking?.booking_code ?? '',
    contactName: booking?.contact_name ?? '',
    itemCountLabel: `${bookingItems.length} Mục`,
    paymentMethod: paymentOptions[0]?.label ?? '',
    summary: {
      subtotal_amount: formatCurrencyVND(resolveNumber(booking?.subtotal_amount)),
      tax_and_fee_amount: formatCurrencyVND(taxAndFeeAmount),
      discount_amount: formatCurrencyVND(resolveNumber(booking?.discount_amount)),
      total_amount: formatCurrencyVND(resolveNumber(booking?.total_amount)),
      currency: booking?.currency ?? BOOKING_DEFAULT_CURRENCY,
    },
    items: bookingItems.map((item) => ({
      ...item,
      duration_label: item.options?.duration_label ?? getDurationLabel(item.start_at, item.end_at),
      schedule_label:
        item.options?.schedule_label ?? formatBookingDateRange(item.start_at, item.end_at),
      total_amount_label: formatCurrencyVND(resolveNumber(item.total_amount)),
    })),
  }
}

export function buildPaymentRedirectPayload(booking, selectedPaymentMethod) {
  return {
    booking_id: booking?.id ?? '',
    booking_code: booking?.booking_code ?? '',
    total_amount: resolveNumber(booking?.total_amount),
    currency: booking?.currency ?? BOOKING_DEFAULT_CURRENCY,
    payment_method: selectedPaymentMethod ?? BOOKING_DEFAULT_PAYMENT_METHOD,
    next_route: '/payment-confirmation',
  }
}
