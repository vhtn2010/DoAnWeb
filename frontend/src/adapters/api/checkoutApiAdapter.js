import { getActiveCart } from './cartApiAdapter.js'
import { getCurrentProfile } from './profileApiAdapter.js'
import { apiPost } from '../../services/apiClient.js'
import { buildCheckoutDraftFromCartSnapshot, calculateCheckoutSummary } from '../../mappers/checkoutMappers.js'
import { submitCheckout as submitCheckoutWithBookingApiAdapter } from './bookingApiAdapter.js'

function prefillContactFields(draft = {}, profile = {}) {
  return {
    ...draft,
    contact_email: profile.email ?? draft.contact_email ?? '',
    contact_name: profile.full_name ?? draft.contact_name ?? '',
    contact_phone: profile.phone ?? draft.contact_phone ?? '',
  }
}

export async function getCheckoutDraft({
  cartSummaryPayload,
  selectedCartItemIds,
} = {}) {
  const [cartResponse, profileResponse] = await Promise.all([
    getActiveCart(),
    getCurrentProfile(),
  ])

  const draft = buildCheckoutDraftFromCartSnapshot(cartResponse.data, {
    authState: 'customer',
    cartSummaryPayload,
    selectedCartItemIds,
  })

  return {
    success: true,
    message: 'OK',
    data: prefillContactFields(draft, profileResponse.data),
  }
}

export async function applyVoucher(code, { cartId, currentSummary } = {}) {
  const response = await apiPost('/vouchers/validate', {
    cart_id: cartId,
    code,
  })

  if (!response.success || !response.data?.valid) {
    return response
  }

  return {
    ...response,
    data: {
      ...response.data,
      summary: calculateCheckoutSummary({
        discount_amount: response.data.discount_amount,
        baggage_fee_amount: currentSummary?.baggage_fee_amount ?? 0,
        service_fee_amount: currentSummary?.service_fee_amount ?? 0,
        surcharge_amount: currentSummary?.surcharge_amount ?? 0,
        subtotal_amount: response.data.subtotal_amount ?? currentSummary?.subtotal_amount ?? 0,
      }),
      voucher_code: response.data.code ?? code,
    },
  }
}

export function submitCheckout(payload = {}, options = {}) {
  return submitCheckoutWithBookingApiAdapter(payload, options)
}
