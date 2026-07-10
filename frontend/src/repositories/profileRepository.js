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
  updateCurrentAvatar as updateCurrentAvatarWithApiAdapter,
  updateCurrentPassword as updateCurrentPasswordWithApiAdapter,
  updateCurrentProfile as updateCurrentProfileWithApiAdapter,
} from '../adapters/api/profileApiAdapter.js'
import { ROLES } from '../constants/roles.js'
import { getAuthSession } from '../services/authSession.js'

const profileAdapter = {
  buildProfileActionPayload: buildProfileActionPayloadWithMock,
  getBookingHistory: getBookingHistoryWithMockAdapter,
  getCustomerProfile: getCustomerProfileWithMockAdapter,
  getCurrentProfileLogs: getCurrentProfileLogsWithApiAdapter,
  getCurrentProfile: getCurrentProfileWithApiAdapter,
  getFavoriteDestinations: getFavoriteDestinationsWithMockAdapter,
  getUpcomingTrip: getUpcomingTripWithMockAdapter,
  updateCurrentAvatar: updateCurrentAvatarWithApiAdapter,
  updateCurrentPassword: updateCurrentPasswordWithApiAdapter,
  updateCurrentProfile: updateCurrentProfileWithApiAdapter,
}

function shouldUseApi(authState = ROLES.guest) {
  const session = getAuthSession()
  const role = session.user?.role ?? session.user?.role_code ?? ''

  return authState === ROLES.customer && role === ROLES.customer && Boolean(session.access_token)
}

export function getCustomerProfile(params) {
  if (shouldUseApi(params?.authState)) {
    return getCustomerProfileDashboardWithApiAdapter(params)
  }

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
