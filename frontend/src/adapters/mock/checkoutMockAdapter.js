import { ROLES } from '../../constants/roles.js'
import {
  CHECKOUT_DEFAULT_SERVICE_FEE_AMOUNT,
} from '../../constants/checkout.js'
import { getCartSnapshotByAuthState as getMockCartSnapshotByAuthState } from './cartMockAdapter.js'
import { checkoutVoucherFixtures } from '../../fixtures/checkout.fixtures.js'
import {
  buildCheckoutDraftFromCartSnapshot,
  buildCheckoutPayload,
  buildPaymentConfirmationHandoff,
  calculateCheckoutSummary,
  cloneCheckoutValue,
  validateCheckoutForm,
} from '../../mappers/checkoutMappers.js'

function getCartSnapshotByAuthState(authState = ROLES.guest) {
  return getMockCartSnapshotByAuthState(authState)
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
        surcharge_amount: currentSummary.surcharge_amount ?? 0,
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
