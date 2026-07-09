import { ROLES } from '../../constants/roles.js'
import {
  CHECKOUT_DEFAULT_SERVICE_FEE_AMOUNT,
} from '../../constants/checkout.js'
import { getCartSnapshotByAuthState as getMockCartSnapshotByAuthState } from './cartMockAdapter.js'
import { checkoutVoucherFixtures } from '../../fixtures/checkout.fixtures.js'
import {
  buildCheckoutDraftFromCartSnapshot,
  buildCheckoutPayload,
  calculateCheckoutSummary,
  cloneCheckoutValue,
  validateCheckoutForm,
} from '../../mappers/checkoutMappers.js'

function getCartSnapshotByAuthState(authState = ROLES.guest) {
  return getMockCartSnapshotByAuthState(authState)
}

function resolveNumber(...values) {
  const numericValue = values.find((value) => typeof value === 'number' && Number.isFinite(value))
  return numericValue ?? 0
}

function buildPaymentConfirmationHandoff(checkoutPayload = {}) {
  const summary = checkoutPayload.summary ?? {}
  const bookingCode = 'NVBT20241012001'
  const bookingId = 'booking-preview-checkout-001'
  const totalAmount = resolveNumber(summary.total_amount)

  return {
    booking_handoff: {
      id: bookingId,
      booking_id: bookingId,
      booking_code: bookingCode,
      contact_name: String(checkoutPayload.contact_name ?? '').trim(),
      contact_email: String(checkoutPayload.contact_email ?? '').trim(),
      contact_phone: String(checkoutPayload.contact_phone ?? '').trim(),
      note: String(checkoutPayload.note ?? '').trim(),
      booking_status: 'pending_payment',
      payment_status: 'initiated',
      subtotal_amount: resolveNumber(summary.subtotal_amount),
      discount_amount: resolveNumber(summary.discount_amount),
      tax_amount: 0,
      service_fee_amount: resolveNumber(summary.service_fee_amount),
      total_amount,
      currency: summary.currency ?? 'VND',
      voucher_code: String(checkoutPayload.voucher_code ?? '').trim().toUpperCase(),
    },
    payment_redirect_payload: {
      booking_id: bookingId,
      booking_code: bookingCode,
      total_amount,
      currency: summary.currency ?? 'VND',
      payment_method: 'bank_transfer',
      next_route: '/payment-confirmation',
    },
  }
}

export async function getCheckoutDraft({
  authState = ROLES.guest,
  selectedCartItemIds = [],
  cartSummaryPayload,
} = {}) {
  return {
    success: true,
    message: 'OK',
    data: buildCheckoutDraftFromCartSnapshot(getCartSnapshotByAuthState(authState), {
      authState,
      selectedCartItemIds,
      cartSummaryPayload,
    }),
  }
}

export function calculateCheckoutSummaryWithMock(payload = {}) {
  return calculateCheckoutSummary(payload)
}

export async function applyVoucher(code, currentSummary = {}) {
  // TODO: replace mock voucher validation with /cart/apply-voucher or /cart/validate in API integration phase.
  const normalizedVoucherCode = String(code ?? '').trim().toUpperCase()
  const voucher = checkoutVoucherFixtures.find(
    (currentVoucher) => currentVoucher.code === normalizedVoucherCode,
  )

  if (!voucher) {
    return {
      success: false,
      message: 'Mã ưu đãi không hợp lệ trong dữ liệu mock.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'Áp dụng mã ưu đãi thành công.',
    data: {
      voucher_code: voucher.code,
      discount_amount: voucher.discount_amount,
      summary: calculateCheckoutSummary({
        subtotal_amount: currentSummary.subtotal_amount,
        service_fee_amount:
          currentSummary.service_fee_amount ?? CHECKOUT_DEFAULT_SERVICE_FEE_AMOUNT,
        discount_amount: voucher.discount_amount,
      }),
    },
  }
}

export function validateCheckoutFormWithMock(formState = {}) {
  return validateCheckoutForm(formState)
}

export function buildCheckoutPayloadWithMock(formState = {}) {
  return buildCheckoutPayload(formState)
}

export async function submitCheckout(payload = {}) {
  // TODO: replace mock checkout submit with POST /bookings/checkout in API integration phase.
  // TODO: map traveller_info to booking_items.traveller_info during checkout API integration.
  const checkoutPayload = cloneCheckoutValue(payload)
  const paymentConfirmationHandoff = buildPaymentConfirmationHandoff(checkoutPayload)

  return {
    success: true,
    message: 'Thông tin đặt đơn đã sẵn sàng.',
    data: {
      checkout_payload: checkoutPayload,
      next_route: '/payment-confirmation',
      ...paymentConfirmationHandoff,
    },
  }
}
