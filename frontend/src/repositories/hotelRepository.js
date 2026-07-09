import {
  getHotelDetailBySlug as getHotelDetailBySlugWithMockAdapter,
  getHotelRooms as getHotelRoomsWithMockAdapter,
  listHotels as listHotelsWithMockAdapter,
} from '../adapters/mock/hotelMockAdapter.js'

const hotelAdapter = {
  getHotelDetailBySlug: getHotelDetailBySlugWithMockAdapter,
  getHotelRooms: getHotelRoomsWithMockAdapter,
  listHotels: listHotelsWithMockAdapter,
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
