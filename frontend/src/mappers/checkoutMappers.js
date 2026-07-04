import { ROLES } from '../constants/roles.js'
import {
  CHECKOUT_DEFAULT_CURRENCY,
  CHECKOUT_DEFAULT_SERVICE_FEE_AMOUNT,
  CHECKOUT_SPECIAL_REQUEST_TEMPLATE,
} from '../constants/checkout.js'
import { SERVICE_STATUSES } from '../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'

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
    CHECKOUT_DEFAULT_SERVICE_FEE_AMOUNT,
  )
  const discountAmount = resolveNumber(
    payload.discount_amount,
    payload.discountAmount,
  )

  return {
    subtotal_amount: subtotalAmount,
    service_fee_amount: serviceFeeAmount,
    discount_amount: discountAmount,
    total_amount: Math.max(subtotalAmount + serviceFeeAmount - discountAmount, 0),
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
    (totalAmount, cartItem) => totalAmount + cartItem.unit_price_snapshot * cartItem.quantity,
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

  const subtotalAmount = resolveNumber(
    cartSummaryPayload?.summary?.subtotal_amount,
    calculateSubtotalFromItems(selectedCartItems),
  )
  const serviceFeeAmount = resolveNumber(
    cartSummaryPayload?.summary?.service_fee_amount,
    CHECKOUT_DEFAULT_SERVICE_FEE_AMOUNT,
  )
  const discountAmount = resolveNumber(cartSummaryPayload?.summary?.discount_amount, 0)

  const emptyContactValues = {
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  }

  return {
    auth_state: normalizeAuthState(authState),
    cart_id: cartSummaryPayload?.cart_id ?? cart?.id ?? '',
    selected_cart_item_ids: normalizedSelectedIds,
    contact_name: emptyContactValues.contact_name,
    contact_email: emptyContactValues.contact_email,
    contact_phone: emptyContactValues.contact_phone,
    voucher_code: '',
    note: '',
    accepted_terms: false,
    travellers: normalizedSelectedIds.map((cartItemId) =>
      buildTravellerEntry(cartItemId, emptyContactValues),
    ),
    special_requests: cloneCheckoutValue(CHECKOUT_SPECIAL_REQUEST_TEMPLATE),
    summary: calculateCheckoutSummary({
      subtotal_amount: subtotalAmount,
      service_fee_amount: serviceFeeAmount,
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
  return {
    cart_id: formValues.cart_id ?? '',
    selected_cart_item_ids: Array.isArray(formValues.selected_cart_item_ids)
      ? [...formValues.selected_cart_item_ids]
      : [],
    contact_name: normalizeText(formValues.contact_name),
    contact_email: normalizeText(formValues.contact_email),
    contact_phone: normalizeText(formValues.contact_phone),
    voucher_code: normalizeText(formValues.voucher_code).toUpperCase(),
    note: normalizeText(formValues.note),
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
    special_requests: {
      ...(formValues.special_requests ?? {}),
    },
    summary: {
      ...(formValues.summary ?? {}),
      currency: formValues.summary?.currency ?? CHECKOUT_DEFAULT_CURRENCY,
    },
  }
}
