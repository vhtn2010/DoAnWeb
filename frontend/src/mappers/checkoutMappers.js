import { ROLES } from '../constants/roles.js'
import {
  BOOKING_DEFAULT_CURRENCY,
  BOOKING_DEFAULT_PAYMENT_METHOD,
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
} from '../constants/bookings.js'
import {
  CHECKOUT_BAGGAGE_FEE_BY_ROUTE,
  CHECKOUT_DEFAULT_CURRENCY,
  CHECKOUT_DEFAULT_SERVICE_FEE_AMOUNT,
  CHECKOUT_SPECIAL_REQUEST_TEMPLATE,
} from '../constants/checkout.js'
import { SERVICE_STATUSES } from '../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'
import { resolvePreviewBookingCode } from '../utils/previewBooking.js'
import {
  VAT_RATE,
  calculateItemPricing,
  calculatePricingSummary,
  roundMoney,
} from '../utils/pricing.js'

function normalizeAuthState(authState = ROLES.guest) {
  return authState === ROLES.customer ? ROLES.customer : ROLES.guest
}

function resolveNumber(...values) {
  const numericValue = values.find((value) => typeof value === 'number' && Number.isFinite(value))
  return numericValue ?? 0
}

function normalizeText(value = '') {
  return typeof value === 'string' ? value.trim() : ''
}

function hasResolvableNumber(...values) {
  return values.some((value) => {
    if (typeof value === 'number') {
      return Number.isFinite(value)
    }

    return typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))
  })
}

export function normalizeCheckoutSpecialRequests(specialRequests = {}) {
  return {
    ...cloneCheckoutValue(CHECKOUT_SPECIAL_REQUEST_TEMPLATE),
    ...(specialRequests ?? {}),
  }
}

export function getCheckoutBaggageSelections(specialRequests = {}) {
  const normalizedSpecialRequests = normalizeCheckoutSpecialRequests(specialRequests)

  return Object.entries(normalizedSpecialRequests)
    .filter(([, isEnabled]) => Boolean(isEnabled))
    .map(([requestKey]) => requestKey)
}

function getCheckoutBaggageLabelByKey(requestKey) {
  if (requestKey === 'baggage_departure') {
    return 'Chiều đi'
  }

  if (requestKey === 'baggage_return') {
    return 'Chiều về'
  }

  return ''
}

export function buildCheckoutBaggageLabel(specialRequests = {}) {
  const baggageLabels = getCheckoutBaggageSelections(specialRequests)
    .map((requestKey) => getCheckoutBaggageLabelByKey(requestKey))
    .filter(Boolean)

  return baggageLabels.join(', ')
}

export function getCheckoutBaggageFeeAmount(specialRequests = {}) {
  return getCheckoutBaggageSelections(specialRequests).reduce(
    (totalAmount, requestKey) => totalAmount + resolveNumber(CHECKOUT_BAGGAGE_FEE_BY_ROUTE[requestKey]),
    0,
  )
}

export function buildCheckoutOrderNote({ note = '', specialRequests = {} } = {}) {
  const normalizedNote = normalizeText(note)
  const baggageLabel = buildCheckoutBaggageLabel(specialRequests)
  const baggageNote = baggageLabel
    ? `Nhu cầu hành lý ký gửi: ${baggageLabel}.`
    : ''

  return [baggageNote, normalizedNote].filter(Boolean).join('\n')
}

function buildBadgeText(serviceType) {
  if (serviceType === SERVICE_TYPES.room || serviceType === SERVICE_TYPES.hotel) {
    return 'LƯU TRÚ'
  }

  if (serviceType === SERVICE_TYPES.flight) {
    return 'CHUYẾN BAY'
  }

  if (serviceType === SERVICE_TYPES.train) {
    return 'TÀU HỎA'
  }

  if (serviceType === SERVICE_TYPES.combo) {
    return 'COMBO'
  }

  return 'TOUR'
}

function formatDurationText(cartItem) {
  if (cartItem.service_type === SERVICE_TYPES.room) {
    const nights = Number(cartItem.options?.nights) || 1
    return `${nights} Đêm`
  }

  const startDate = new Date(cartItem.start_at)
  const endDate = new Date(cartItem.end_at)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return '1 Ngày'
  }

  const diffMs = Math.max(endDate.getTime() - startDate.getTime(), 0)
  const diffDays = Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 1)

  return `${diffDays} Ngày`
}

function buildSummaryServiceOptions(cartItem) {
  const adults = resolveNumber(
    cartItem.options?.adult_count,
    cartItem.options?.guest_count,
    cartItem.quantity,
    1,
  )
  const children = resolveNumber(cartItem.options?.child_count, 0)

  return {
    adults,
    children,
    duration_text: formatDurationText(cartItem),
    badge_text: buildBadgeText(cartItem.service_type),
  }
}

function createEmptySummaryService() {
  return {
    service_id: '',
    service_code: '',
    service_type: SERVICE_TYPES.tour,
    title: '',
    slug: '',
    short_description: '',
    location_text: '',
    image_url: '',
    status: SERVICE_STATUSES.active,
    start_at: '',
    end_at: '',
    quantity: 0,
    options: buildSummaryServiceOptions({
      service_type: SERVICE_TYPES.tour,
      quantity: 1,
      options: {},
      start_at: '',
      end_at: '',
    }),
  }
}

export function cloneCheckoutValue(value) {
  return JSON.parse(JSON.stringify(value))
}

export function calculateCheckoutSummary(payload = {}) {
  const subtotalAmount = resolveNumber(
    payload.subtotal_amount,
    payload.subtotalAmount,
  )
  const serviceFeeAmount = resolveNumber(
    payload.service_fee_amount,
    payload.serviceFeeAmount,
  )
  const baggageFeeAmount = resolveNumber(
    payload.baggage_fee_amount,
    payload.baggageFeeAmount,
    getCheckoutBaggageFeeAmount(payload.special_requests ?? payload.specialRequests),
  )
  const surchargeAmount = hasResolvableNumber(payload.surcharge_amount, payload.surchargeAmount)
    ? resolveNumber(payload.surcharge_amount, payload.surchargeAmount)
    : 0
  const discountAmount = Math.min(
    Math.max(resolveNumber(payload.discount_amount, payload.discountAmount), 0),
    subtotalAmount,
  )
  // VAT luôn tính trên (tạm tính − giảm giá) giống giỏ hàng, không tin VAT truyền vào,
  // để khi áp voucher tại checkout thuế được tính lại đúng trên phần đã giảm.
  const vatAmount = roundMoney(Math.max(subtotalAmount - discountAmount, 0) * VAT_RATE)
  const taxAndFeeAmount = vatAmount + serviceFeeAmount + surchargeAmount + baggageFeeAmount

  return {
    subtotal_amount: subtotalAmount,
    vat_amount: vatAmount,
    service_fee_amount: serviceFeeAmount,
    baggage_fee_amount: baggageFeeAmount,
    surcharge_amount: surchargeAmount,
    tax_and_fee_amount: taxAndFeeAmount,
    discount_amount: discountAmount,
    total_amount: Math.max(subtotalAmount + taxAndFeeAmount - discountAmount, 0),
    currency: CHECKOUT_DEFAULT_CURRENCY,
  }
}

export function buildSummaryServiceSnapshot(cartItem) {
  if (!cartItem) {
    return createEmptySummaryService()
  }

  return {
    service_id: cartItem.service_id,
    service_code: cartItem.service?.service_code ?? '',
    service_type: cartItem.service_type,
    title: cartItem.service?.title ?? '',
    slug: cartItem.service?.slug ?? '',
    short_description: cartItem.service?.short_description ?? '',
    location_text: cartItem.service?.location_text ?? '',
    image_url: cartItem.service?.image_url ?? '',
    status: cartItem.service?.status ?? SERVICE_STATUSES.active,
    start_at: cartItem.start_at,
    end_at: cartItem.end_at,
    quantity: cartItem.quantity,
    options: buildSummaryServiceOptions(cartItem),
  }
}

function buildTravellerEntry(cartItemId, contactValues) {
  return {
    cart_item_id: cartItemId,
    traveller_info: {
      full_name: contactValues.contact_name,
      phone: contactValues.contact_phone,
      email: contactValues.contact_email,
    },
  }
}

export function syncCheckoutDraftTravellers(checkoutDraft) {
  const contactValues = {
    contact_name: checkoutDraft.contact_name,
    contact_phone: checkoutDraft.contact_phone,
    contact_email: checkoutDraft.contact_email,
  }

  return {
    ...checkoutDraft,
    travellers: checkoutDraft.travellers.map((traveller) =>
      buildTravellerEntry(traveller.cart_item_id, contactValues),
    ),
  }
}

function normalizeSelectedCartItemIds(selectedCartItemIds = [], cartItems = []) {
  const availableItemIds = cartItems.map((cartItem) => cartItem.id)

  if (Array.isArray(selectedCartItemIds) && selectedCartItemIds.length > 0) {
    const normalizedSelectedIds = selectedCartItemIds.filter((itemId, index) =>
      availableItemIds.includes(itemId) && selectedCartItemIds.indexOf(itemId) === index,
    )

    if (normalizedSelectedIds.length > 0) {
      return normalizedSelectedIds
    }
  }

  return availableItemIds.length > 0 ? [availableItemIds[0]] : []
}

function calculateSubtotalFromItems(selectedCartItems = []) {
  return selectedCartItems.reduce(
    (totalAmount, cartItem) =>
      totalAmount +
      resolveNumber(
        calculateItemPricing(cartItem).subtotal_amount,
        resolveNumber(cartItem.unit_price_snapshot) * resolveNumber(cartItem.quantity, 1),
      ),
    0,
  )
}

export function buildCheckoutDraftFromCartSnapshot(
  cartSnapshot,
  {
    authState = ROLES.guest,
    selectedCartItemIds = [],
    cartSummaryPayload,
  } = {},
) {
  const cart = cartSnapshot?.cart ?? null
  const cartItems = Array.isArray(cartSnapshot?.cart_items) ? cartSnapshot.cart_items : []
  const normalizedSelectedIds = normalizeSelectedCartItemIds(selectedCartItemIds, cartItems)
  const selectedCartItems = cartItems.filter((cartItem) =>
    normalizedSelectedIds.includes(cartItem.id),
  )
  const primaryCartItem = selectedCartItems[0] ?? cartItems[0] ?? null
  const cartPricingSummary = calculatePricingSummary(selectedCartItems)

  const subtotalAmount = resolveNumber(
    cartSummaryPayload?.summary?.subtotal_amount,
    cartPricingSummary.subtotal_amount,
    calculateSubtotalFromItems(selectedCartItems),
  )
  const serviceFeeAmount = resolveNumber(
    cartSummaryPayload?.summary?.service_fee_amount,
    cartPricingSummary.service_fee_amount,
  )
  const vatAmount = resolveNumber(
    cartSummaryPayload?.summary?.vat_amount,
    cartPricingSummary.vat_amount,
  )
  const surchargeAmount = resolveNumber(
    cartSummaryPayload?.summary?.surcharge_amount,
    cartPricingSummary.surcharge_amount,
  )
  const taxAndFeeAmount = resolveNumber(
    cartSummaryPayload?.summary?.tax_and_fee_amount,
    cartPricingSummary.tax_and_fee_amount,
    vatAmount + serviceFeeAmount + surchargeAmount,
    CHECKOUT_DEFAULT_SERVICE_FEE_AMOUNT,
  )
  const discountAmount = resolveNumber(
    cartSummaryPayload?.summary?.discount_amount,
    cartPricingSummary.discount_amount,
    0,
  )

  const emptyContactValues = {
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  }

  return {
    auth_state: normalizeAuthState(authState),
    cart_id: cartSummaryPayload?.cart_id ?? cart?.id ?? '',
    preview_booking_code: resolvePreviewBookingCode(cartSummaryPayload?.preview_booking_code),
    selected_cart_item_ids: normalizedSelectedIds,
    contact_name: emptyContactValues.contact_name,
    contact_email: emptyContactValues.contact_email,
    contact_phone: emptyContactValues.contact_phone,
    voucher_code: cartSummaryPayload?.voucher_code ?? '',
    note: '',
    accepted_terms: false,
    travellers: normalizedSelectedIds.map((cartItemId) =>
      buildTravellerEntry(cartItemId, emptyContactValues),
    ),
    special_requests: cloneCheckoutValue(CHECKOUT_SPECIAL_REQUEST_TEMPLATE),
    summary: calculateCheckoutSummary({
      subtotal_amount: subtotalAmount,
      vat_amount: vatAmount,
      service_fee_amount: serviceFeeAmount,
      surcharge_amount: surchargeAmount,
      tax_and_fee_amount: taxAndFeeAmount,
      discount_amount: discountAmount,
    }),
    summary_service: buildSummaryServiceSnapshot(primaryCartItem),
  }
}

export function validateCheckoutForm(formValues = {}) {
  const errors = {}
  const normalizedEmail = normalizeText(formValues.contact_email)
  const normalizedPhone = String(formValues.contact_phone ?? '').replace(/\D/g, '')

  if (!normalizeText(formValues.contact_name)) {
    errors.contact_name = 'Vui lòng nhập họ và tên.'
  }

  if (!normalizeText(formValues.contact_phone)) {
    errors.contact_phone = 'Vui lòng nhập số điện thoại.'
  } else if (normalizedPhone.length < 9) {
    errors.contact_phone = 'Số điện thoại cần có ít nhất 9 số.'
  }

  if (!normalizedEmail) {
    errors.contact_email = 'Vui lòng nhập email.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    errors.contact_email = 'Email chưa đúng định dạng.'
  }

  if (!formValues.accepted_terms) {
    errors.accepted_terms = 'Bạn cần đồng ý với điều khoản để tiếp tục.'
  }

  return errors
}

export function buildCheckoutPayload(formValues = {}) {
  const specialRequests = normalizeCheckoutSpecialRequests(formValues.special_requests)
  const customerNote = normalizeText(formValues.note)

  return {
    cart_id: formValues.cart_id ?? '',
    preview_booking_code: normalizeText(formValues.preview_booking_code).toUpperCase(),
    selected_cart_item_ids: Array.isArray(formValues.selected_cart_item_ids)
      ? [...formValues.selected_cart_item_ids]
      : [],
    contact_name: normalizeText(formValues.contact_name),
    contact_email: normalizeText(formValues.contact_email),
    contact_phone: normalizeText(formValues.contact_phone),
    voucher_code: normalizeText(formValues.voucher_code).toUpperCase(),
    customer_note: customerNote,
    note: buildCheckoutOrderNote({
      note: customerNote,
      specialRequests,
    }),
    travellers: Array.isArray(formValues.travellers)
      ? formValues.travellers.map((traveller) => ({
          cart_item_id: traveller.cart_item_id,
          traveller_info: {
            full_name: normalizeText(traveller.traveller_info?.full_name),
            phone: normalizeText(traveller.traveller_info?.phone),
            email: normalizeText(traveller.traveller_info?.email),
          },
        }))
      : [],
    special_requests: specialRequests,
    summary: {
      ...calculateCheckoutSummary({
        ...(formValues.summary ?? {}),
        special_requests: specialRequests,
      }),
      currency: formValues.summary?.currency ?? CHECKOUT_DEFAULT_CURRENCY,
    },
  }
}

export function buildPaymentConfirmationHandoff(checkoutPayload = {}) {
  const summary = checkoutPayload.summary ?? {}
  const bookingCode = resolvePreviewBookingCode(checkoutPayload.preview_booking_code)
  const bookingId = 'booking-preview-checkout-001'
  const totalAmount = resolveNumber(summary.total_amount)

  return {
    booking_handoff: {
      id: bookingId,
      booking_id: bookingId,
      booking_code: bookingCode,
      contact_name: normalizeText(checkoutPayload.contact_name),
      contact_email: normalizeText(checkoutPayload.contact_email),
      contact_phone: normalizeText(checkoutPayload.contact_phone),
      customer_note: normalizeText(checkoutPayload.customer_note),
      note: normalizeText(checkoutPayload.note),
      booking_status: BOOKING_STATUSES.pending_payment,
      payment_status: PAYMENT_STATUSES.initiated,
      subtotal_amount: resolveNumber(summary.subtotal_amount),
      discount_amount: resolveNumber(summary.discount_amount),
      tax_amount: resolveNumber(summary.vat_amount),
      service_fee_amount: resolveNumber(summary.service_fee_amount),
      baggage_fee_amount: resolveNumber(summary.baggage_fee_amount),
      surcharge_amount: resolveNumber(summary.surcharge_amount),
      tax_and_fee_amount: resolveNumber(summary.tax_and_fee_amount),
      total_amount: totalAmount,
      currency: summary.currency ?? BOOKING_DEFAULT_CURRENCY,
      voucher_code: normalizeText(checkoutPayload.voucher_code).toUpperCase(),
    },
    payment_redirect_payload: {
      booking_id: bookingId,
      booking_code: bookingCode,
      total_amount: totalAmount,
      currency: summary.currency ?? BOOKING_DEFAULT_CURRENCY,
      payment_method: BOOKING_DEFAULT_PAYMENT_METHOD,
      next_route: '/payment-confirmation',
    },
  }
}
