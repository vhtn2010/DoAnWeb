import {
  downloadMyBookingSummary as downloadMyBookingSummaryWithApiAdapter,
  getMyBookingDetail as getMyBookingDetailWithApiAdapter,
  getMyBookingItems as getMyBookingItemsWithApiAdapter,
  getMyBookingInvoice as getMyBookingInvoiceWithApiAdapter,
  getMyBookingStatusHistory as getMyBookingStatusHistoryWithApiAdapter,
  listMyBookings as listMyBookingsWithApiAdapter,
  requestBookingCancellation as requestBookingCancellationWithApiAdapter,
  updateMyBookingContact as updateMyBookingContactWithApiAdapter,
} from '../adapters/api/bookingApiAdapter.js'
import {
  buildPaymentRedirectPayloadWithMock,
  getBookingByCode as getBookingByCodeWithMockAdapter,
  getBookingConfirmation as getBookingConfirmationWithMockAdapter,
} from '../adapters/mock/bookingMockAdapter.js'
import {
  createCustomerAuthRequiredResponse,
  isCustomerApiRequested,
  shouldUseCustomerApi,
} from '../utils/customerApiSession.js'

const bookingAdapter = {
  buildPaymentRedirectPayload: buildPaymentRedirectPayloadWithMock,
  getBookingByCode: getBookingByCodeWithMockAdapter,
  getBookingConfirmation: getBookingConfirmationWithMockAdapter,
}

async function findBookingByCode(bookingCode) {
  const normalizedBookingCode = String(bookingCode ?? '').trim().toUpperCase()

  if (!normalizedBookingCode) {
    return null
  }

  let page = 1
  let hasNext = true

  while (hasNext && page <= 5) {
    const response = await listMyBookingsWithApiAdapter({
      limit: 50,
      page,
    })
    const booking = Array.isArray(response.data)
      ? response.data.find(
          (currentBooking) =>
            String(currentBooking.booking_code ?? '').trim().toUpperCase() === normalizedBookingCode,
        )
      : null

    if (booking) {
      return booking
    }

    hasNext = Boolean(response.meta?.has_next)
    page += 1
  }

  return null
}

export function getBookingConfirmation(params) {
  if (shouldUseCustomerApi(params?.authState) && params?.bookingId) {
    return Promise.all([
      getMyBookingDetailWithApiAdapter(params.bookingId),
      getMyBookingItemsWithApiAdapter(params.bookingId),
    ]).then(([detailResponse, itemsResponse]) => ({
      success: detailResponse.success && itemsResponse.success,
      message: detailResponse.message,
      data: {
        booking: detailResponse.data,
        booking_items: itemsResponse.data,
        payment_options: [],
      },
    }))
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return bookingAdapter.getBookingConfirmation(params)
}

export async function getBookingByCode(bookingCode, params) {
  if (shouldUseCustomerApi(params?.authState)) {
    const booking = await findBookingByCode(bookingCode)

    if (!booking) {
      return {
        success: false,
        message: 'Không tìm thấy đơn hàng phù hợp.',
        data: null,
      }
    }

    const [detailResponse, itemsResponse] = await Promise.all([
      getMyBookingDetailWithApiAdapter(booking.id),
      getMyBookingItemsWithApiAdapter(booking.id),
    ])

    return {
      success: detailResponse.success && itemsResponse.success,
      message: detailResponse.message,
      data: {
        booking: detailResponse.data,
        booking_items: itemsResponse.data,
        payment_options: [],
      },
    }
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return bookingAdapter.getBookingByCode(bookingCode, params)
}

export function buildPaymentRedirectPayload(booking, selectedPaymentMethod) {
  return bookingAdapter.buildPaymentRedirectPayload(booking, selectedPaymentMethod)
}

export function listMyBookings(params = {}) {
  return listMyBookingsWithApiAdapter(params)
}

export function getMyBookingDetail(bookingId) {
  return getMyBookingDetailWithApiAdapter(bookingId)
}

export function getMyBookingItems(bookingId) {
  return getMyBookingItemsWithApiAdapter(bookingId)
}

export function getMyBookingStatusHistory(bookingId) {
  return getMyBookingStatusHistoryWithApiAdapter(bookingId)
}

export function getMyBookingInvoice(bookingId) {
  return getMyBookingInvoiceWithApiAdapter(bookingId)
}

export function downloadMyBookingSummary(bookingId) {
  return downloadMyBookingSummaryWithApiAdapter(bookingId)
}

export function requestBookingCancellation(bookingId, payload = {}) {
  return requestBookingCancellationWithApiAdapter(bookingId, payload)
}

export function updateMyBookingContact(bookingId, payload = {}) {
  return updateMyBookingContactWithApiAdapter(bookingId, payload)
}
