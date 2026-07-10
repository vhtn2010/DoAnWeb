import {
  cancelAdminBooking as cancelAdminBookingWithApiAdapter,
  completeAdminBooking as completeAdminBookingWithApiAdapter,
  confirmAdminBooking as confirmAdminBookingWithApiAdapter,
  getAdminBookingDetail as getAdminBookingDetailWithApiAdapter,
  listAdminBookings as listAdminBookingsWithApiAdapter,
  updateAdminBookingStatus as updateAdminBookingStatusWithApiAdapter,
} from '../adapters/api/adminBookingApiAdapter.js'

const adminBookingAdapter = {
  cancelAdminBooking: cancelAdminBookingWithApiAdapter,
  completeAdminBooking: completeAdminBookingWithApiAdapter,
  confirmAdminBooking: confirmAdminBookingWithApiAdapter,
  getAdminBookingDetail: getAdminBookingDetailWithApiAdapter,
  listAdminBookings: listAdminBookingsWithApiAdapter,
  updateAdminBookingStatus: updateAdminBookingStatusWithApiAdapter,
}

export function listAdminBookings(params) {
  return adminBookingAdapter.listAdminBookings(params)
}

export function getAdminBookingDetail(bookingId) {
  return adminBookingAdapter.getAdminBookingDetail(bookingId)
}

export function updateAdminBookingStatus(bookingId, payload) {
  return adminBookingAdapter.updateAdminBookingStatus(bookingId, payload)
}

export function confirmAdminBooking(bookingId, payload) {
  return adminBookingAdapter.confirmAdminBooking(bookingId, payload)
}

export function completeAdminBooking(bookingId, payload) {
  return adminBookingAdapter.completeAdminBooking(bookingId, payload)
}

export function cancelAdminBooking(bookingId, payload) {
  return adminBookingAdapter.cancelAdminBooking(bookingId, payload)
}
