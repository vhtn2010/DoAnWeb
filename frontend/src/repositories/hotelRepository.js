import {
  buildHotelCartItemPayload as buildHotelCartItemPayloadWithMockAdapter,
  checkHotelAvailability as checkHotelAvailabilityWithMockAdapter,
  getHotelDetailBySlug as getHotelDetailBySlugWithMockAdapter,
  getHotelRooms as getHotelRoomsWithMockAdapter,
  listHotels as listHotelsWithMockAdapter,
} from '../adapters/mock/hotelMockAdapter.js'

const hotelAdapter = {
  listHotels: listHotelsWithMockAdapter,
  getHotelDetailBySlug: getHotelDetailBySlugWithMockAdapter,
  getHotelRooms: getHotelRoomsWithMockAdapter,
  checkHotelAvailability: checkHotelAvailabilityWithMockAdapter,
  buildHotelCartItemPayload: buildHotelCartItemPayloadWithMockAdapter,
}

export function listHotels(params) {
  return hotelAdapter.listHotels(params)
}

export function getHotelDetailBySlug(slug, params) {
  return hotelAdapter.getHotelDetailBySlug(slug, params)
}

export function getHotelRooms(hotelServiceId, params) {
  return hotelAdapter.getHotelRooms(hotelServiceId, params)
}

export function checkHotelAvailability(payload) {
  return hotelAdapter.checkHotelAvailability(payload)
}

export function buildHotelCartItemPayload(payload) {
  return hotelAdapter.buildHotelCartItemPayload(payload)
}
