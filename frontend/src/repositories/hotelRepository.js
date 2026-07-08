import {
  getHotelDetailBySlug as getHotelDetailBySlugWithApiAdapter,
  getHotelRooms as getHotelRoomsWithApiAdapter,
  listHotels as listHotelsWithApiAdapter,
} from '../adapters/api/hotelApiAdapter.js'

const hotelAdapter = {
  listHotels: listHotelsWithApiAdapter,
  getHotelDetailBySlug: getHotelDetailBySlugWithApiAdapter,
  getHotelRooms: getHotelRoomsWithApiAdapter,
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
