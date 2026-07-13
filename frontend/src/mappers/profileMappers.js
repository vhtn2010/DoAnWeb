import {
  PROFILE_ACTIONS,
  PROFILE_BOOKING_STATUS_LABELS,
  PROFILE_HISTORY_FILTER_LABELS,
  PROFILE_HISTORY_FILTERS,
} from '../constants/profile.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

export function cloneProfileValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function normalizeText(value = '') {
  return typeof value === 'string' ? value.trim() : ''
}

function resolveHistoryStatusTone(item) {
  if (normalizeText(item.status_tone)) {
    return item.status_tone
  }

  switch (item.history_group) {
    case PROFILE_HISTORY_FILTERS.pending_confirmation:
      return 'warning'
    case PROFILE_HISTORY_FILTERS.upcoming:
      return 'info'
    case PROFILE_HISTORY_FILTERS.cancelled:
      return item.status === 'refunded' ? 'neutral' : 'danger'
    case PROFILE_HISTORY_FILTERS.booking_history:
    default:
      return 'success'
  }
}

function buildHistoryFilterOptions(items) {
  const filters = [
    PROFILE_HISTORY_FILTERS.all,
    PROFILE_HISTORY_FILTERS.pending_confirmation,
    PROFILE_HISTORY_FILTERS.upcoming,
    PROFILE_HISTORY_FILTERS.booking_history,
    PROFILE_HISTORY_FILTERS.cancelled,
  ]

  return filters.map((filterId) => ({
    id: filterId,
    label: PROFILE_HISTORY_FILTER_LABELS[filterId],
    count:
      filterId === PROFILE_HISTORY_FILTERS.all
        ? items.length
        : items.filter((item) => item.history_group === filterId).length,
  }))
}

function filterBookingHistory(items, selectedFilter) {
  if (selectedFilter === PROFILE_HISTORY_FILTERS.all) {
    return items
  }

  return items.filter((item) => item.history_group === selectedFilter)
}

export function buildProfileViewModel({
  profile,
  favoriteDestinations = [],
  upcomingTrip,
  bookingHistory = [],
  selectedBookingHistoryFilter = null,
  travelUtilities = [],
  supportLinks = [],
} = {}) {
  const normalizedBookingHistory = bookingHistory.map((item) => ({
    ...item,
    service_label: normalizeText(item.service_label),
    title: normalizeText(item.title),
    description: normalizeText(item.description),
    travel_date_label: normalizeText(item.travel_date_label),
    route_label: normalizeText(item.route_label),
    detail_summary: normalizeText(item.detail_summary),
    support_note: normalizeText(item.support_note),
    action_label: normalizeText(item.action_label) || 'Xem chi tiết',
    image_url: normalizeText(item.image_url) || null,
    price_label: formatCurrencyVND(item.price_amount),
    status_label:
      normalizeText(item.status_label) ||
      PROFILE_BOOKING_STATUS_LABELS[item.status] ||
      'HOÀN THÀNH',
    history_group:
      normalizeText(item.history_group) || PROFILE_HISTORY_FILTERS.booking_history,
    status_tone: resolveHistoryStatusTone(item),
  }))

  const filteredBookingHistory = filterBookingHistory(
    normalizedBookingHistory,
    selectedBookingHistoryFilter,
  )

  const normalizedTravelUtilities = travelUtilities.map((item) => ({
    ...item,
    title: normalizeText(item.title),
    description: normalizeText(item.description),
    action_label: normalizeText(item.action_label) || 'Khám phá',
    icon: normalizeText(item.icon) || 'guide',
  }))

  const normalizedSupportLinks = supportLinks.map((item) => ({
    ...item,
    title: normalizeText(item.title),
    description: normalizeText(item.description),
    action_label: normalizeText(item.action_label) || 'Xem thêm',
    icon: normalizeText(item.icon) || 'help',
  }))

  const hasSelectedBookingHistoryFilter = Boolean(selectedBookingHistoryFilter)

  return {
    greeting: {
      title: `Xin chào, ${profile?.greeting_name ?? profile?.full_name ?? 'bạn'}`,
      subtitle: 'Quản lý đơn hàng, tiện ích và hỗ trợ cho mọi hành trình của bạn tại Nét Việt.',
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
    bookingHistory: normalizedBookingHistory,
    bookingHistoryFilter: selectedBookingHistoryFilter,
    bookingHistoryFilters: buildHistoryFilterOptions(normalizedBookingHistory),
    filteredBookingHistory: hasSelectedBookingHistoryFilter ? filteredBookingHistory : [],
    bookingHistoryResultsLabel: hasSelectedBookingHistoryFilter
      ? `${filteredBookingHistory.length} đơn hàng`
      : '',
    hasSelectedBookingHistoryFilter,
    travelUtilities: normalizedTravelUtilities,
    supportLinks: normalizedSupportLinks,
  }
}

export function buildProfileActionPayload(action, target = {}) {
  const route =
    action === PROFILE_ACTIONS.upcoming_trip_secondary
      ? target?.secondary_path ?? target?.detail_path ?? null
      : target?.detail_path ?? target?.secondary_path ?? null

  return {
    action,
    route_state: target?.route_state ?? null,
    target_id: target?.id ?? null,
    target_slug: target?.slug ?? null,
    route,
  }
}
