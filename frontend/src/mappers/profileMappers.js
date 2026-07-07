import { PROFILE_BOOKING_STATUS_LABELS } from '../constants/profile.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

export function cloneProfileValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeText(value = '') {
  return typeof value === 'string' ? value.trim() : ''
}

export function buildProfileViewModel({
  profile,
  favoriteDestinations = [],
  upcomingTrip,
  bookingHistory = [],
} = {}) {
  return {
    greeting: {
      title: `Xin chào, ${profile?.greeting_name ?? profile?.full_name ?? 'bạn'}`,
      subtitle: 'Chào mừng bạn quay lại với hành trình di sản Việt Nam.',
    },
    favoriteDestinations: favoriteDestinations.map((destination) => ({
      ...destination,
      name: normalizeText(destination.name),
      location: normalizeText(destination.location),
    })),
    upcomingTrip: upcomingTrip
      ? {
          ...upcomingTrip,
          title: normalizeText(upcomingTrip.title),
          subtitle: normalizeText(upcomingTrip.subtitle),
          badge: normalizeText(upcomingTrip.badge),
          code: normalizeText(upcomingTrip.code),
          date_label: normalizeText(upcomingTrip.date_label),
          location_label: normalizeText(upcomingTrip.location_label),
        }
      : null,
    bookingHistory: bookingHistory.map((item) => ({
      ...item,
      description: normalizeText(item.description),
      price_label: formatCurrencyVND(item.price_amount),
      status_label:
        normalizeText(item.status_label) ||
        PROFILE_BOOKING_STATUS_LABELS[item.status] ||
        'HOÀN THÀNH',
    })),
  }
}

export function buildProfileActionPayload(action, target = {}) {
  return {
    action,
    target_id: target?.id ?? null,
    target_slug: target?.slug ?? null,
    route: target?.detail_path ?? target?.secondary_path ?? null,
  }
}
