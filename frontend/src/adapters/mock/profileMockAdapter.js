import { ROLES } from '../../constants/roles.js'
import { customerProfileFixture } from '../../fixtures/profile.fixtures.js'
import {
  buildProfileActionPayload,
  cloneProfileValue,
} from '../../mappers/profileMappers.js'

function getGuestEnvelope() {
  return {
    success: false,
    message: 'Vui lòng đăng nhập để xem tài khoản cá nhân.',
    data: null,
  }
}

function getCustomerEnvelope() {
  const fixture = cloneProfileValue(customerProfileFixture)

  return {
    success: true,
    message: 'OK',
    data: {
      profile: fixture.profile,
      favorite_destinations: fixture.favorite_destinations,
      upcoming_trip: fixture.upcoming_trip,
      booking_history: fixture.booking_history,
    },
  }
}

export async function getCustomerProfile(params = {}) {
  // TODO: replace mock profile with GET /me or GET /customers/me in API integration phase.
  return params.authState === ROLES.customer ? getCustomerEnvelope() : getGuestEnvelope()
}

export async function getFavoriteDestinations(params = {}) {
  // TODO: replace mock favorite destinations with customer favorites API in integration phase.
  const response = await getCustomerProfile(params)

  if (!response.success || !response.data) {
    return response
  }

  return {
    success: true,
    message: 'OK',
    data: {
      favorite_destinations: response.data.favorite_destinations,
    },
  }
}

export async function getUpcomingTrip(params = {}) {
  // TODO: replace mock upcoming trip with GET /bookings in API integration phase.
  const response = await getCustomerProfile(params)

  if (!response.success || !response.data) {
    return response
  }

  return {
    success: true,
    message: 'OK',
    data: {
      upcoming_trip: response.data.upcoming_trip,
    },
  }
}

export async function getBookingHistory(params = {}) {
  // TODO: replace mock booking history with GET /bookings in API integration phase.
  const response = await getCustomerProfile(params)

  if (!response.success || !response.data) {
    return response
  }

  return {
    success: true,
    message: 'OK',
    data: {
      booking_history: response.data.booking_history,
    },
  }
}

export async function buildProfileActionPayloadWithMock(action, target = {}) {
  return {
    success: true,
    message: 'Đã chuẩn bị hành động hồ sơ trong dữ liệu mock.',
    data: buildProfileActionPayload(action, target),
  }
}
