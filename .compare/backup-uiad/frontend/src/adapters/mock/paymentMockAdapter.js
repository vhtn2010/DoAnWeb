import { BOOKING_STATUSES, PAYMENT_STATUSES } from '../../constants/bookings.js'
import {
  PAYMENT_METHOD_CODES,
  PAYMENT_VALID_VOUCHERS,
} from '../../constants/payments.js'
import { ROLES } from '../../constants/roles.js'
import {
  customerPaymentConfirmationFixture,
  guestPaymentConfirmationFixture,
  paymentConfirmationFixtures,
  customerPaymentSuccessFixture,
  guestPaymentSuccessFixture,
  paymentSuccessFixtures,
} from '../../fixtures/payments.fixtures.js'
import {
  buildAppliedVoucherSummary,
  buildPaymentConfirmationFromBookingHandoff,
  buildInvoiceDownloadPayload,
  buildPaymentSuccessData,
  buildPaymentResultPayload,
  clonePaymentValue,
  normalizePhoneDisplay,
} from '../../mappers/paymentMappers.js'

function getBaseFixtureByAuthState(authState = ROLES.guest) {
  return authState === ROLES.customer
    ? customerPaymentConfirmationFixture
    : guestPaymentConfirmationFixture
}

function getBaseSuccessFixtureByAuthState(authState = ROLES.guest) {
  return authState === ROLES.customer
    ? customerPaymentSuccessFixture
    : guestPaymentSuccessFixture
}

function getPaymentConfirmationData(params = {}) {
  const basePaymentData = getBaseFixtureByAuthState(params.authState)
  const hasBookingHandoff =
    Boolean(params.paymentRedirectPayload) ||
    Boolean(params.booking) ||
    (Array.isArray(params.bookingItems) && params.bookingItems.length > 0)

  if (!hasBookingHandoff) {
    return clonePaymentValue(basePaymentData)
  }

  return buildPaymentConfirmationFromBookingHandoff({
    basePaymentData,
    booking: params.booking,
    bookingItems: params.bookingItems,
    paymentRedirectPayload: params.paymentRedirectPayload,
  })
}

function getPaymentSuccessData(params = {}) {
  const basePaymentSuccessData = getBaseSuccessFixtureByAuthState(params.authState)
  const hasPaymentHandoff =
    Boolean(params.payment) ||
    Boolean(params.booking) ||
    Boolean(params.paymentResultPayload) ||
    (Array.isArray(params.bookingItems) && params.bookingItems.length > 0)

  if (!hasPaymentHandoff) {
    return clonePaymentValue(basePaymentSuccessData)
  }

  return {
    payment_success: buildPaymentSuccessData({
      basePaymentSuccessData,
      payment: params.payment,
      booking: params.booking,
      bookingItems: params.bookingItems,
      paymentResultPayload: params.paymentResultPayload,
    }),
  }
}

export async function getPaymentConfirmation(params = {}) {
  // TODO: replace mock payment confirmation with GET /payments/{payment_code} in API integration phase.
  return {
    success: true,
    message: 'OK',
    data: getPaymentConfirmationData(params),
  }
}

export async function getPaymentByCode(paymentCode, params = {}) {
  // TODO: replace mock payment confirmation with GET /payments/{payment_code} in API integration phase.
  const normalizedPaymentCode = String(paymentCode ?? '').trim().toUpperCase()
  const handoffData = getPaymentConfirmationData(params)

  if (handoffData.payment?.payment_code?.toUpperCase() === normalizedPaymentCode) {
    return {
      success: true,
      message: 'OK',
      data: handoffData,
    }
  }

  const matchingFixture = paymentConfirmationFixtures.find(
    (fixture) => fixture.payment.payment_code.toUpperCase() === normalizedPaymentCode,
  )

  if (!matchingFixture) {
    return {
      success: false,
      message: 'Không tìm thấy giao dịch thanh toán.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: clonePaymentValue(matchingFixture),
  }
}

export async function getPaymentByBookingCode(bookingCode, params = {}) {
  // TODO: replace mock payment by booking code with GET /payments?booking_code=... in integration phase.
  const normalizedBookingCode = String(bookingCode ?? '').trim().toUpperCase()
  const handoffData = getPaymentConfirmationData(params)

  if (handoffData.booking?.booking_code?.toUpperCase() === normalizedBookingCode) {
    return {
      success: true,
      message: 'OK',
      data: handoffData,
    }
  }

  const matchingFixture = paymentConfirmationFixtures.find(
    (fixture) => fixture.booking.booking_code.toUpperCase() === normalizedBookingCode,
  )

  if (!matchingFixture) {
    return {
      success: false,
      message: 'Không tìm thấy giao dịch thanh toán.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: clonePaymentValue(matchingFixture),
  }
}

export async function getPaymentSuccess(params = {}) {
  // TODO: replace mock payment success with GET /payments/{payment_code} or GET /bookings/{booking_code}/payment-result in API integration phase.
  return {
    success: true,
    message: 'OK',
    data: getPaymentSuccessData(params),
  }
}

export async function getPaymentSuccessByCode(paymentCode, params = {}) {
  // TODO: replace mock payment success with GET /payments/{payment_code} or GET /bookings/{booking_code}/payment-result in API integration phase.
  const normalizedPaymentCode = String(paymentCode ?? '').trim().toUpperCase()
  const handoffData = getPaymentSuccessData(params)

  if (handoffData.payment_success?.payment_code?.toUpperCase() === normalizedPaymentCode) {
    return {
      success: true,
      message: 'OK',
      data: handoffData,
    }
  }

  const matchingFixture = paymentSuccessFixtures.find(
    (fixture) => fixture.payment_success.payment_code.toUpperCase() === normalizedPaymentCode,
  )

  if (!matchingFixture) {
    return {
      success: false,
      message: 'Không tìm thấy thông tin thanh toán thành công.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: clonePaymentValue(matchingFixture),
  }
}

export async function applyPaymentVoucher(code, currentSummary = {}) {
  // TODO: replace mock voucher apply with POST /cart/apply-voucher or payment promotion API in integration phase.
  const normalizedCode = String(code ?? '').trim().toUpperCase()

  if (!normalizedCode) {
    return {
      success: false,
      message: 'Vui lòng nhập mã ưu đãi.',
      data: null,
    }
  }

  const matchedVoucher =
    PAYMENT_VALID_VOUCHERS.find((voucher) => voucher.code === normalizedCode) ?? null

  if (!matchedVoucher) {
    return {
      success: false,
      message: 'Mã ưu đãi chưa hợp lệ trong dữ liệu mock.',
      data: null,
    }
  }

  const appliedSummary = buildAppliedVoucherSummary(matchedVoucher.code, currentSummary)

  return {
    success: true,
    message: 'Áp dụng mã ưu đãi thành công.',
    data: appliedSummary,
  }
}

export async function confirmPaymentMock(payload = {}) {
  // TODO: replace confirm payment mock with payment gateway callback/reconciliation flow in integration phase.
  if (!payload.selected_payment_method) {
    return {
      success: false,
      message: 'Vui lòng chọn phương thức thanh toán.',
      data: null,
    }
  }

  const paidAt = new Date().toISOString()

  return {
    success: true,
    message: 'Thanh toán đã được ghi nhận trong dữ liệu mock.',
    data: {
      payment_status: PAYMENT_STATUSES.success,
      booking_status: BOOKING_STATUSES.paid,
      paid_at: paidAt,
      selected_payment_method:
        payload.selected_payment_method ?? PAYMENT_METHOD_CODES.card,
      contact_form: {
        contact_name: payload.contact_form?.contact_name ?? '',
        contact_email: payload.contact_form?.contact_email ?? '',
        contact_phone: normalizePhoneDisplay(payload.contact_form?.contact_phone ?? ''),
      },
    },
  }
}

export async function buildPaymentResultPayloadWithMock(payment = {}) {
  return {
    success: true,
    message: 'OK',
    data: buildPaymentResultPayload(clonePaymentValue(payment)),
  }
}

export async function buildInvoiceDownloadPayloadWithMock(paymentSuccess = {}) {
  // TODO: replace mock invoice download with invoice API in integration phase.
  return {
    success: true,
    message: 'Hóa đơn điện tử đã sẵn sàng trong dữ liệu mock.',
    data: buildInvoiceDownloadPayload(clonePaymentValue(paymentSuccess)),
  }
}
