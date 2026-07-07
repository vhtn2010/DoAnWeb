import {
  buildProfileActionPayloadWithMock,
  getBookingHistory as getBookingHistoryWithMockAdapter,
  getCustomerProfile as getCustomerProfileWithMockAdapter,
  getFavoriteDestinations as getFavoriteDestinationsWithMockAdapter,
  getUpcomingTrip as getUpcomingTripWithMockAdapter,
} from '../adapters/mock/profileMockAdapter.js'

const profileAdapter = {
  buildProfileActionPayload: buildProfileActionPayloadWithMock,
  getBookingHistory: getBookingHistoryWithMockAdapter,
  getCustomerProfile: getCustomerProfileWithMockAdapter,
  getFavoriteDestinations: getFavoriteDestinationsWithMockAdapter,
  getUpcomingTrip: getUpcomingTripWithMockAdapter,
}

export function getCustomerProfile(params) {
  return profileAdapter.getCustomerProfile(params)
}

export function getFavoriteDestinations(params) {
  return profileAdapter.getFavoriteDestinations(params)
}

export function getUpcomingTrip(params) {
  return profileAdapter.getUpcomingTrip(params)
}

export function getBookingHistory(params) {
  return profileAdapter.getBookingHistory(params)
}

export function buildProfileActionPayload(action, target) {
  return profileAdapter.buildProfileActionPayload(action, target)
}
