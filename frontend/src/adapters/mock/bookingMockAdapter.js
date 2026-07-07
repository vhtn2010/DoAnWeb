import { BOOKING_DEFAULT_PAYMENT_METHOD } from '../../constants/bookings.js'
import { ROLES } from '../../constants/roles.js'
import {
  bookingConfirmationFixtures,
  customerBookingConfirmationFixture,
  guestBookingConfirmationFixture,
} from '../../fixtures/bookings.fixtures.js'
import {
  buildBookingConfirmationFromCheckoutHandoff,
  buildPaymentRedirectPayload,
  cloneBookingValue,
} from '../../mappers/bookingMappers.js'
import { getCartSnapshotByAuthState as getMockCartSnapshotByAuthState } from './cartMockAdapter.js'

function getBaseFixtureByAuthState(authState = ROLES.guest) {
  return authState === ROLES.customer
    ? customerBookingConfirmationFixture
    : guestBookingConfirmationFixture
}

function getBookingConfirmationData(params = {}) {
  const baseBookingData = getBaseFixtureByAuthState(params.authState)
  const hasCheckoutHandoff = Boolean(params.checkoutPayload)

  if (!hasCheckoutHandoff) {
    return cloneBookingValue(baseBookingData)
  }

  return buildBookingConfirmationFromCheckoutHandoff({
    ...params,
    baseBookingData,
    cartSnapshot: getMockCartSnapshotByAuthState(params.authState),
  })
}

export async function getBookingConfirmation(params = {}) {
  // TODO: replace mock booking confirmation with GET /bookings/{booking_code} in API integration phase.
  return {
    success: true,
    message: 'OK',
    data: getBookingConfirmationData(params),
  }
}

export async function getBookingByCode(bookingCode, params = {}) {
  // TODO: replace mock booking confirmation with GET /bookings/{booking_code} in API integration phase.
  const normalizedBookingCode = String(bookingCode ?? '').trim().toUpperCase()
  const handoffData = getBookingConfirmationData(params)

  if (handoffData.booking?.booking_code?.toUpperCase() === normalizedBookingCode) {
    return {
      success: true,
      message: 'OK',
      data: handoffData,
    }
  }

  const matchingFixtures = bookingConfirmationFixtures.filter(
    (fixture) => fixture.booking.booking_code.toUpperCase() === normalizedBookingCode,
  )
  const authMatchedFixture =
    params.authState === ROLES.customer
      ? matchingFixtures.find((fixture) => fixture.booking.user_id)
      : matchingFixtures.find((fixture) => fixture.booking.guest_session_id)
  const selectedFixture = authMatchedFixture ?? matchingFixtures[0]

  if (!selectedFixture) {
    return {
      success: false,
      message: 'Không tìm thấy đơn hàng.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: cloneBookingValue(selectedFixture),
  }
}

export async function buildPaymentRedirectPayloadWithMock(booking, selectedPaymentMethod) {
  // TODO: replace mock payment redirect payload with POST /payments/initiate in integration phase.
  return {
    success: true,
    message: 'Đã chuẩn bị dữ liệu thanh toán.',
    data: buildPaymentRedirectPayload(
      cloneBookingValue(booking),
      selectedPaymentMethod ?? BOOKING_DEFAULT_PAYMENT_METHOD,
    ),
  }
}
