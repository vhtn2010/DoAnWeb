import {
  DEFAULT_TRAIN_PAGE_SIZE,
  DEFAULT_TRAIN_SORT,
  DEFAULT_TRAIN_TRIP_TYPE,
} from '../../constants/trains.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import {
  trainSearchDefaultsFixture,
  trainServiceFixtures,
} from '../../fixtures/trains.fixtures.js'

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function getDepartureHour(dateTimeValue) {
  const date = new Date(dateTimeValue)

  if (Number.isNaN(date.getTime())) {
    return -1
  }

  return date.getHours()
}

function getDepartureDateKey(dateTimeValue) {
  const date = new Date(dateTimeValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function matchesPriceRanges(train, priceRanges = []) {
  if (!priceRanges.length) {
    return true
  }

  return priceRanges.some((priceRange) => {
    if (priceRange === 'under-2m') {
      return train.sale_price < 2000000
    }

    if (priceRange === '2-5m') {
      return train.sale_price >= 2000000 && train.sale_price <= 5000000
    }

    if (priceRange === 'over-5m') {
      return train.sale_price > 5000000
    }

    return false
  })
}

function matchesTrainTypes(train, trainTypes = []) {
  if (!trainTypes.length) {
    return true
  }

  return trainTypes.includes(train.details?.train_type)
}

function matchesDepartureWindows(train, departureWindows = []) {
  if (!departureWindows.length) {
    return true
  }

  const departureHour = getDepartureHour(train.departure_at)

  return departureWindows.some((windowKey) => {
    if (windowKey === 'early_morning') {
      return departureHour >= 0 && departureHour < 6
    }

    if (windowKey === 'morning') {
      return departureHour >= 6 && departureHour < 12
    }

    if (windowKey === 'afternoon') {
      return departureHour >= 12 && departureHour < 18
    }

    if (windowKey === 'evening') {
      return departureHour >= 18 && departureHour < 24
    }

    return false
  })
}

function sortTrains(trains, sortValue) {
  const nextTrains = [...trains]

  if (sortValue === 'price_asc') {
    nextTrains.sort((first, second) => first.sale_price - second.sale_price)
    return nextTrains
  }

  if (sortValue === 'price_desc') {
    nextTrains.sort((first, second) => second.sale_price - first.sale_price)
    return nextTrains
  }

  if (sortValue === 'departure_time_asc') {
    nextTrains.sort(
      (first, second) =>
        new Date(first.departure_at).getTime() - new Date(second.departure_at).getTime(),
    )
    return nextTrains
  }

  if (sortValue === 'duration_asc') {
    nextTrains.sort((first, second) => first.duration_minutes - second.duration_minutes)
    return nextTrains
  }

  return nextTrains
}

function shouldUseFigmaDisplayTotal({
  departure_date = '',
  departure_windows = [],
  from_station = '',
  price_ranges = [],
  to_station = '',
  train_types = [],
}) {
  return (
    from_station === 'SGN' &&
    to_station === 'HAN' &&
    departure_date === '2026-10-12' &&
    !train_types.length &&
    !price_ranges.length &&
    !departure_windows.length
  )
}

export async function listTrains({
  trip_type = DEFAULT_TRAIN_TRIP_TYPE,
  from_station = '',
  to_station = '',
  departure_date = '',
  return_date = '',
  passengers = {},
  train_types = [],
  price_ranges = [],
  departure_windows = [],
  sort = DEFAULT_TRAIN_SORT,
  page = 1,
  limit = DEFAULT_TRAIN_PAGE_SIZE,
} = {}) {
  // TODO: replace mock train list with GET /services?service_type=train in API integration phase.
  const safeLimit = Math.max(Number(limit) || DEFAULT_TRAIN_PAGE_SIZE, 1)
  const requiredSeats = Math.max(
    Number(passengers.adults ?? 0) + Number(passengers.children ?? 0),
    1,
  )

  const filteredTrains = sortTrains(
    trainServiceFixtures.filter((train) => {
      if (
        train.service_type !== SERVICE_TYPES.train ||
        train.status !== SERVICE_STATUSES.active
      ) {
        return false
      }

      const matchesRoute =
        (!from_station || train.departure_station_code === from_station) &&
        (!to_station || train.arrival_station_code === to_station)
      const matchesDepartureDate =
        !departure_date || getDepartureDateKey(train.departure_at) === departure_date
      const hasEnoughSeats = train.available_seats >= requiredSeats

      return (
        matchesRoute &&
        matchesDepartureDate &&
        hasEnoughSeats &&
        matchesTrainTypes(train, train_types) &&
        matchesPriceRanges(train, price_ranges) &&
        matchesDepartureWindows(train, departure_windows)
      )
    }),
    sort,
  )

  const total = filteredTrains.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const startIndex = (safePage - 1) * safeLimit
  const paginatedTrains = filteredTrains.slice(startIndex, startIndex + safeLimit)
  const totalDisplay = shouldUseFigmaDisplayTotal({
    departure_date,
    departure_windows,
    from_station,
    price_ranges,
    to_station,
    train_types,
  })
    ? 35
    : total

  return {
    success: true,
    message: 'OK',
    data: cloneValue(paginatedTrains),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      total_display: totalDisplay,
      total_pages: totalPages,
      has_next: safePage < totalPages,
      trip_type,
      return_date,
    },
  }
}

export async function getTrainSearchDefaults() {
  // TODO: replace mock train search defaults with train metadata API in integration phase.
  return {
    success: true,
    message: 'OK',
    data: cloneValue(trainSearchDefaultsFixture),
  }
}

export function buildTrainSearchParams({
  auth = '',
  trip_type = DEFAULT_TRAIN_TRIP_TYPE,
  from_station = '',
  to_station = '',
  departure_date = '',
  return_date = '',
  adults = 1,
  children = 0,
  infants = 0,
  train_types = [],
  price_ranges = [],
  departure_windows = [],
  sort = DEFAULT_TRAIN_SORT,
  page = 1,
} = {}) {
  const searchParams = new URLSearchParams()

  if (auth) {
    searchParams.set('auth', auth)
  }

  if (trip_type && trip_type !== DEFAULT_TRAIN_TRIP_TYPE) {
    searchParams.set('trip_type', trip_type)
  }

  if (from_station) {
    searchParams.set('from', from_station)
  }

  if (to_station) {
    searchParams.set('to', to_station)
  }

  if (departure_date) {
    searchParams.set('departure_date', departure_date)
  }

  if (trip_type === 'round_trip' && return_date) {
    searchParams.set('return_date', return_date)
  }

  if (Number(adults) > 0) {
    searchParams.set('adults', String(adults))
  }

  if (Number(children) > 0) {
    searchParams.set('children', String(children))
  }

  if (Number(infants) > 0) {
    searchParams.set('infants', String(infants))
  }

  if (train_types.length) {
    searchParams.set('types', train_types.join(','))
  }

  if (price_ranges.length) {
    searchParams.set('prices', price_ranges.join(','))
  }

  if (departure_windows.length) {
    searchParams.set('departure_windows', departure_windows.join(','))
  }

  if (sort && sort !== DEFAULT_TRAIN_SORT) {
    searchParams.set('sort', sort)
  }

  if (Number(page) > 1) {
    searchParams.set('page', String(page))
  }

  return searchParams
}

export async function buildTrainSelectionPayload(train, searchState = {}) {
  // TODO: replace mock train selection payload with POST /cart/items in API integration phase.
  if (!train || train.service_type !== SERVICE_TYPES.train) {
    return {
      success: false,
      message: 'Không thể chuẩn bị dữ liệu chuyến tàu.',
      data: null,
    }
  }

  if (train.status !== SERVICE_STATUSES.active || Number(train.available_seats ?? 0) < 1) {
    return {
      success: false,
      message: 'Chuyến tàu hiện không còn đủ chỗ trong dữ liệu mock.',
      data: null,
    }
  }

  const adultCount = Math.max(Number(searchState.passengers?.adults ?? 1), 1)
  const childCount = Math.max(Number(searchState.passengers?.children ?? 0), 0)
  const infantCount = Math.max(Number(searchState.passengers?.infants ?? 0), 0)
  const payingPassengers = Math.max(adultCount + childCount, 1)

  return {
    success: true,
    message: 'Đã chuẩn bị dữ liệu chuyến tàu.',
    data: {
      service_id: train.id,
      service_type: SERVICE_TYPES.train,
      reference_id: train.train_number,
      start_at: train.departure_at,
      end_at: train.arrival_at,
      quantity: payingPassengers,
      unit_price_snapshot: Math.max(Number(train.sale_price ?? 0), 0),
      options: {
        trip_type: searchState.trip_type ?? DEFAULT_TRAIN_TRIP_TYPE,
        route_label: `${train.departure_city} - ${train.arrival_city}`,
        seat_class: train.seat_class,
        carriage_type: train.carriage_type,
        adult_count: adultCount,
        child_count: childCount,
        infant_count: infantCount,
        departure_date:
          searchState.departure_date ?? getDepartureDateKey(train.departure_at),
        return_date: searchState.return_date ?? '',
        provider_name: train.provider_name,
        train_name: train.train_name,
        train_number: train.train_number,
        departure_station: train.departure_station,
        arrival_station: train.arrival_station,
        seat_options: Array.isArray(train.details?.seat_options) ? train.details.seat_options : [],
        amenities: Array.isArray(train.details?.amenities) ? train.details.amenities : [],
      },
    },
  }
}
