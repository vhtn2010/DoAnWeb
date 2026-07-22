import {
  cancelCustomerPayment as cancelCustomerPaymentWithApiAdapter,
  cancelCustomerRefundRequest as cancelCustomerRefundRequestWithApiAdapter,
  createCustomerDirectPayment as createCustomerDirectPaymentWithApiAdapter,
  createCustomerRefundRequest as createCustomerRefundRequestWithApiAdapter,
  getCustomerPaymentDetail as getCustomerPaymentDetailWithApiAdapter,
  getCustomerPaymentProof as getCustomerPaymentProofWithApiAdapter,
  getCustomerRefundDetail as getCustomerRefundDetailWithApiAdapter,
  getDirectPaymentMethods as getDirectPaymentMethodsWithApiAdapter,
  listCustomerBookingPayments as listCustomerBookingPaymentsWithApiAdapter,
  listCustomerBookingRefunds as listCustomerBookingRefundsWithApiAdapter,
  uploadCustomerPaymentProof as uploadCustomerPaymentProofWithApiAdapter,
} from '../adapters/api/paymentApiAdapter.js'
import {
  applyPaymentVoucher as applyPaymentVoucherWithMockAdapter,
  buildInvoiceDownloadPayloadWithMock,
  buildPaymentResultPayloadWithMock,
  confirmPaymentMock as confirmPaymentWithMockAdapter,
  getPaymentByBookingCode as getPaymentByBookingCodeWithMockAdapter,
  getPaymentByCode as getPaymentByCodeWithMockAdapter,
  getPaymentConfirmation as getPaymentConfirmationWithMockAdapter,
  getPaymentSuccess as getPaymentSuccessWithMockAdapter,
  getPaymentSuccessByCode as getPaymentSuccessByCodeWithMockAdapter,
} from '../adapters/mock/paymentMockAdapter.js'
import { ROLES } from '../constants/roles.js'
import {
  createCustomerAuthRequiredResponse,
  isCustomerApiRequested,
  shouldUseCustomerApi,
} from '../utils/customerApiSession.js'

const paymentAdapter = {
  applyPaymentVoucher: applyPaymentVoucherWithMockAdapter,
  buildInvoiceDownloadPayload: buildInvoiceDownloadPayloadWithMock,
  buildPaymentResultPayload: buildPaymentResultPayloadWithMock,
  confirmPaymentMock: confirmPaymentWithMockAdapter,
  getPaymentByBookingCode: getPaymentByBookingCodeWithMockAdapter,
  getPaymentByCode: getPaymentByCodeWithMockAdapter,
  getPaymentConfirmation: getPaymentConfirmationWithMockAdapter,
  getPaymentSuccess: getPaymentSuccessWithMockAdapter,
  getPaymentSuccessByCode: getPaymentSuccessByCodeWithMockAdapter,
}

async function findBookingByCodeFromSession(bookingCode) {
  const bookingRepository = await import('./bookingRepository.js')
  const bookingResponse = await bookingRepository.getBookingByCode(bookingCode, {
    authState: ROLES.customer,
  })

  return bookingResponse?.data ?? null
}

async function findPaymentByCode(paymentCode) {
  const bookingRepository = await import('./bookingRepository.js')
  let page = 1
  let hasNext = true

  while (hasNext && page <= 5) {
    const bookingsResponse = await bookingRepository.listMyBookings({
      limit: 50,
      page,
    })
    const bookings = Array.isArray(bookingsResponse.data) ? bookingsResponse.data : []

    for (const booking of bookings) {
      const paymentsResponse = await listCustomerBookingPaymentsWithApiAdapter(booking.id)
      const payment = Array.isArray(paymentsResponse.data)
        ? paymentsResponse.data.find(
            (currentPayment) =>
              String(currentPayment.payment_code ?? '').trim().toUpperCase() ===
              String(paymentCode ?? '').trim().toUpperCase(),
          )
        : null

      if (payment) {
        return {
          booking,
          payment,
        }
      }
    }

    hasNext = Boolean(bookingsResponse.meta?.has_next)
    page += 1
  }

  return null
}

export function getPaymentConfirmation(params) {
  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return paymentAdapter.getPaymentConfirmation(params)
}

export async function getPaymentByCode(paymentCode, params) {
  if (shouldUseCustomerApi(params?.authState)) {
    const result = await findPaymentByCode(paymentCode)

    if (!result) {
      return {
        success: false,
        message: 'Không tìm thấy giao dịch thanh toán phù hợp.',
        data: null,
      }
    }

    const bookingRepository = await import('./bookingRepository.js')
    const [detailResponse, proofResponse, methodsResponse, bookingItemsResponse] = await Promise.all([
      getCustomerPaymentDetailWithApiAdapter(result.payment.id),
      getCustomerPaymentProofWithApiAdapter(result.payment.id),
      getDirectPaymentMethodsWithApiAdapter(),
      bookingRepository.getMyBookingItems(result.booking.id),
    ])

    return {
      success: detailResponse.success && methodsResponse.success,
      message: detailResponse.message,
      data: {
        booking: params?.booking ?? result.booking,
        booking_id: result.booking.id,
        booking_items: bookingItemsResponse.data ?? params?.bookingItems ?? [],
        payment: detailResponse.data,
        payment_methods: methodsResponse.data?.methods ?? [],
        payment_proof: proofResponse.data?.proof ?? null,
      },
    }
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return paymentAdapter.getPaymentByCode(paymentCode, params)
}

export async function getPaymentByBookingCode(bookingCode, params) {
  if (shouldUseCustomerApi(params?.authState)) {
    const bookingPayload = await findBookingByCodeFromSession(bookingCode)
    const booking = bookingPayload?.booking ?? null

    if (!booking) {
      return {
        success: false,
        message: 'Không tìm thấy đơn hàng phù hợp để thanh toán.',
        data: null,
      }
    }

    const [paymentsResponse, methodsResponse] = await Promise.all([
      listCustomerBookingPaymentsWithApiAdapter(booking.id),
      getDirectPaymentMethodsWithApiAdapter(),
    ])
    const latestPayment =
      Array.isArray(paymentsResponse.data) && paymentsResponse.data.length > 0
        ? paymentsResponse.data[0]
        : null
    const proofResponse = latestPayment
      ? await getCustomerPaymentProofWithApiAdapter(latestPayment.id)
      : { data: { proof: null } }

    return {
      success: true,
      message: 'OK',
      data: {
        booking,
        booking_id: booking.id,
        booking_items: bookingPayload?.booking_items ?? params?.bookingItems ?? [],
        payment: latestPayment,
        payment_methods: methodsResponse.data?.methods ?? [],
        payment_proof: proofResponse.data?.proof ?? null,
      },
    }
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return paymentAdapter.getPaymentByBookingCode(bookingCode, params)
}

export function applyPaymentVoucher(code, currentSummary) {
  return paymentAdapter.applyPaymentVoucher(code, currentSummary)
}

export function confirmPaymentMock(payload) {
  return paymentAdapter.confirmPaymentMock(payload)
}

export function buildPaymentResultPayload(payment) {
  return paymentAdapter.buildPaymentResultPayload(payment)
}

export function getPaymentSuccess(params) {
  if (shouldUseCustomerApi(params?.authState)) {
    if (params?.payment?.payment_code) {
      return getPaymentByCode(params.payment.payment_code, params)
    }

    if (params?.booking?.booking_code) {
      return getPaymentByBookingCode(params.booking.booking_code, params)
    }
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return paymentAdapter.getPaymentSuccess(params)
}

export async function getPaymentSuccessByCode(paymentCode, params) {
  if (shouldUseCustomerApi(params?.authState)) {
    return getPaymentByCode(paymentCode, params)
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return paymentAdapter.getPaymentSuccessByCode(paymentCode, params)
}

export function buildInvoiceDownloadPayload(paymentSuccess) {
  return paymentAdapter.buildInvoiceDownloadPayload(paymentSuccess)
}

export function getDirectPaymentMethods() {
  return getDirectPaymentMethodsWithApiAdapter()
}

export function createCustomerDirectPayment(bookingId, payload = {}, options = {}) {
  return createCustomerDirectPaymentWithApiAdapter(bookingId, payload, options)
}

export function listCustomerBookingPayments(bookingId) {
  return listCustomerBookingPaymentsWithApiAdapter(bookingId)
}

export function getCustomerPaymentDetail(paymentId) {
  return getCustomerPaymentDetailWithApiAdapter(paymentId)
}

export function cancelCustomerPayment(paymentId, payload = {}) {
  return cancelCustomerPaymentWithApiAdapter(paymentId, payload)
}

export function createCustomerRefundRequest(bookingId, payload = {}, options = {}) {
  return createCustomerRefundRequestWithApiAdapter(bookingId, payload, options)
}

export function listCustomerBookingRefunds(bookingId) {
  return listCustomerBookingRefundsWithApiAdapter(bookingId)
}

export function getCustomerRefundDetail(refundId) {
  return getCustomerRefundDetailWithApiAdapter(refundId)
}

export function cancelCustomerRefundRequest(refundId, payload = {}) {
  return cancelCustomerRefundRequestWithApiAdapter(refundId, payload)
}

export function uploadCustomerPaymentProof(paymentId, payload = {}) {
  return uploadCustomerPaymentProofWithApiAdapter(paymentId, payload)
}

export function getCustomerPaymentProof(paymentId) {
  return getCustomerPaymentProofWithApiAdapter(paymentId)
}
