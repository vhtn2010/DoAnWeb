import {
  buildProfileActionPayloadWithMock,
  getBookingHistory as getBookingHistoryWithMockAdapter,
  getCustomerProfile as getCustomerProfileWithMockAdapter,
  getFavoriteDestinations as getFavoriteDestinationsWithMockAdapter,
  getUpcomingTrip as getUpcomingTripWithMockAdapter,
} from '../adapters/mock/profileMockAdapter.js'
import {
  getCustomerProfile as getCustomerProfileDashboardWithApiAdapter,
} from '../adapters/api/profileDashboardApiAdapter.js'
import {
  getCurrentProfileLogs as getCurrentProfileLogsWithApiAdapter,
  getCurrentProfile as getCurrentProfileWithApiAdapter,
  getCurrentUserVouchers as getCurrentUserVouchersWithApiAdapter,
  requestAccountDeactivation as requestAccountDeactivationWithApiAdapter,
  updateCurrentAvatar as updateCurrentAvatarWithApiAdapter,
  updateCurrentPassword as updateCurrentPasswordWithApiAdapter,
  updateCurrentProfile as updateCurrentProfileWithApiAdapter,
} from '../adapters/api/profileApiAdapter.js'
import {
  createCustomerAuthRequiredResponse,
  isCustomerApiRequested,
  shouldUseCustomerApi,
} from '../utils/customerApiSession.js'

const profileAdapter = {
  buildProfileActionPayload: buildProfileActionPayloadWithMock,
  getBookingHistory: getBookingHistoryWithMockAdapter,
  getCustomerProfile: getCustomerProfileWithMockAdapter,
  getCurrentProfileLogs: getCurrentProfileLogsWithApiAdapter,
  getCurrentProfile: getCurrentProfileWithApiAdapter,
  getCurrentUserVouchers: getCurrentUserVouchersWithApiAdapter,
  getFavoriteDestinations: getFavoriteDestinationsWithMockAdapter,
  getUpcomingTrip: getUpcomingTripWithMockAdapter,
  requestAccountDeactivation: requestAccountDeactivationWithApiAdapter,
  updateCurrentAvatar: updateCurrentAvatarWithApiAdapter,
  updateCurrentPassword: updateCurrentPasswordWithApiAdapter,
  updateCurrentProfile: updateCurrentProfileWithApiAdapter,
}

export function getCustomerProfile(params) {
  if (shouldUseCustomerApi(params?.authState)) {
    return getCustomerProfileDashboardWithApiAdapter(params)
  }

  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return profileAdapter.getCustomerProfile(params)
}

export function getFavoriteDestinations(params) {
  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return profileAdapter.getFavoriteDestinations(params)
}

export function getUpcomingTrip(params) {
  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return profileAdapter.getUpcomingTrip(params)
}

export function getBookingHistory(params) {
  if (isCustomerApiRequested(params?.authState)) {
    return createCustomerAuthRequiredResponse()
  }

  return profileAdapter.getBookingHistory(params)
}

export function buildProfileActionPayload(action, target) {
  return profileAdapter.buildProfileActionPayload(action, target)
}

export function getCurrentProfile() {
  return profileAdapter.getCurrentProfile()
}

export function updateCurrentProfile(payload = {}) {
  return profileAdapter.updateCurrentProfile(payload)
}

export function updateCurrentAvatar(payload = {}) {
  return profileAdapter.updateCurrentAvatar(payload)
}

export function updateCurrentPassword(payload = {}) {
  return profileAdapter.updateCurrentPassword(payload)
}

export function getCurrentProfileLogs(params = {}) {
  return profileAdapter.getCurrentProfileLogs(params)
}

export function getCurrentUserVouchers() {
  return profileAdapter.getCurrentUserVouchers()
}

export function requestAccountDeactivation(payload = {}) {
  return profileAdapter.requestAccountDeactivation(payload)
}
