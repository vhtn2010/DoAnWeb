import { listHotels as listHotelsWithMockAdapter } from '../adapters/mock/hotelMockAdapter.js'

const hotelAdapter = {
  listHotels: listHotelsWithMockAdapter,
}

export function listHotels(params) {
  return hotelAdapter.listHotels(params)
}
