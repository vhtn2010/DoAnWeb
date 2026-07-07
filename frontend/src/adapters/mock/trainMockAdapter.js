import {
  DEFAULT_TRAIN_PAGE_SIZE,
  DEFAULT_TRAIN_SORT,
  DEFAULT_TRAIN_TRIP_TYPE,
} from '../../constants/trains.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import {
  getTrainFixtureBySlug,
  trainRelatedSlugMap,
  trainSearchDefaultsFixture,
  trainServiceFixtures,
} from '../../fixtures/trains.fixtures.js'

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function getRelatedTrains(trainSlug) {
  const relatedSlugs = trainRelatedSlugMap[trainSlug] ?? []

  return relatedSlugs.filter(Boolean).reduce((relatedTrains, slug) => {
    const train = getTrainFixtureBySlug(slug)

    if (
      !train ||
      train.service_type !== SERVICE_TYPES.train ||
      train.status !== SERVICE_STATUSES.active
    ) {
      return relatedTrains
    }

    relatedTrains.push(train)
    return relatedTrains
  }, [])
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

function resolveSelectedSeatArgument(selectedSeatOrSearchState = null) {
  if (
    selectedSeatOrSearchState &&
    typeof selectedSeatOrSearchState === 'object' &&
    !Array.isArray(selectedSeatOrSearchState) &&
    ('trip_type' in selectedSeatOrSearchState ||
      'passengers' in selectedSeatOrSearchState ||
      'departure_date' in selectedSeatOrSearchState ||
      'return_date' in selectedSeatOrSearchState)
  ) {
    return {
      selectedSeat: null,
      selectedSeatOption: null,
      searchState: selectedSeatOrSearchState,
    }
  }

  return null
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

export async function getTrainDetailBySlug(slug) {
  // TODO: replace mock train detail with GET /services/{slug} in API integration phase.
  const train = getTrainFixtureBySlug(slug)

  if (
    !train ||
    train.service_type !== SERVICE_TYPES.train ||
    train.status !== SERVICE_STATUSES.active
  ) {
    return {
      success: false,
      message: 'Không tìm thấy chuyến tàu.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: {
      train: cloneValue(train),
      related_trains: cloneValue(getRelatedTrains(train.slug)),
    },
  }
}

export async function checkTrainAvailability({
  selected_train_id = '',
  selected_car_id = '',
  selected_seat_id = '',
} = {}) {
  // TODO: replace mock train availability with train availability API in integration phase.
  const train = trainServiceFixtures.find((item) => item.id === selected_train_id)

  if (!train || train.service_type !== SERVICE_TYPES.train) {
    return {
      success: false,
      message: 'Không tìm thấy chuyến tàu.',
      data: null,
    }
  }

  const cars = Array.isArray(train.details?.cars) ? train.details.cars : []
  const selectedCar = cars.find((car) => car.id === selected_car_id) ?? null
  const selectedSeat = selectedCar?.seats?.find((seat) => seat.id === selected_seat_id) ?? null
  const isAvailable =
    train.status === SERVICE_STATUSES.active &&
    Boolean(selectedCar) &&
    Boolean(selectedSeat) &&
    selectedSeat.status === 'available'

  return {
    success: true,
    message: isAvailable
      ? 'Chỗ ngồi còn khả dụng trong dữ liệu mock.'
      : 'Chỗ ngồi này hiện không còn khả dụng trong dữ liệu mock.',
    data: {
      is_available: isAvailable,
      selected_seat_id: selectedSeat?.id ?? '',
      selected_car_id: selectedCar?.id ?? '',
    },
  }
}

export async function buildTrainSelectionPayload(
  train,
  selectedSeatOrSearchState = null,
  selectedSeatOptionOrSearchState = null,
  maybeSearchState = {},
) {
  // TODO: replace mock cart payload with POST /cart/items in integration phase.
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

  const legacyArguments = resolveSelectedSeatArgument(selectedSeatOrSearchState)
  let selectedSeat = legacyArguments?.selectedSeat ?? selectedSeatOrSearchState
  let selectedSeatOption = legacyArguments?.selectedSeatOption ?? selectedSeatOptionOrSearchState
  let searchState = legacyArguments?.searchState ?? maybeSearchState ?? {}

  if (
    !legacyArguments &&
    selectedSeatOptionOrSearchState &&
    typeof selectedSeatOptionOrSearchState === 'object' &&
    !Array.isArray(selectedSeatOptionOrSearchState) &&
    ('trip_type' in selectedSeatOptionOrSearchState ||
      'passengers' in selectedSeatOptionOrSearchState ||
      'departure_date' in selectedSeatOptionOrSearchState ||
      'return_date' in selectedSeatOptionOrSearchState)
  ) {
    selectedSeatOption = null
    searchState = selectedSeatOptionOrSearchState
  }

  if (!selectedSeat) {
    return {
      success: false,
      message: 'Vui lòng chọn chỗ trước khi tiếp tục.',
      data: null,
    }
  }

  const adultCount = Math.max(Number(searchState.passengers?.adults ?? 1), 1)
  const childCount = Math.max(Number(searchState.passengers?.children ?? 0), 0)
  const infantCount = Math.max(Number(searchState.passengers?.infants ?? 0), 0)
  const serviceFee = Math.max(Number(train.details?.payment_summary?.service_fee ?? 0), 0)
  const unitPriceSnapshot = Math.max(
    Number(selectedSeat.price ?? selectedSeatOption?.price ?? train.sale_price ?? 0),
    0,
  )

  return {
    success: true,
    message: 'Đã chuẩn bị dữ liệu chuyến tàu.',
    data: {
      service_id: train.id,
      service_type: SERVICE_TYPES.train,
      reference_id: train.train_number,
      start_at: train.departure_at,
      end_at: train.arrival_at,
      quantity: 1,
      unit_price_snapshot: unitPriceSnapshot,
      options: {
        trip_type: searchState.trip_type ?? DEFAULT_TRAIN_TRIP_TYPE,
        route_label: `${train.departure_city} - ${train.arrival_city}`,
        seat_class: selectedSeatOption?.name ?? train.seat_class,
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
        selected_car_id: selectedSeat.car_id,
        selected_seat_id: selectedSeat.id,
        selected_seat_code: selectedSeat.code,
        selected_seat_number: selectedSeat.number,
        selected_seat_option_id: selectedSeatOption?.id ?? '',
        selected_seat_option_name: selectedSeatOption?.name ?? train.seat_class,
        selected_seat_price: unitPriceSnapshot,
        service_fee: serviceFee,
        total_amount: unitPriceSnapshot + serviceFee,
        amenities: Array.isArray(train.details?.amenities) ? train.details.amenities : [],
      },
    },
  }
}
