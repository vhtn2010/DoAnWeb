import {
  DEFAULT_FLIGHT_CABIN_CLASS,
  DEFAULT_FLIGHT_PAGE_SIZE,
  DEFAULT_FLIGHT_SORT,
  DEFAULT_FLIGHT_TRIP_TYPE,
} from '../../constants/flights.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import {
  flightRelatedSlugMap,
  flightSearchDefaultsFixture,
  flightServiceFixtures,
  getFlightFixtureBySlug,
} from '../../fixtures/flights.fixtures.js'

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function getRelatedFlights(flightSlug) {
  const relatedSlugs = flightRelatedSlugMap[flightSlug] ?? []

  return relatedSlugs.filter(Boolean).reduce((relatedFlights, slug) => {
    const flight = getFlightFixtureBySlug(slug)

    if (
      !flight ||
      flight.service_type !== SERVICE_TYPES.flight ||
      flight.status !== SERVICE_STATUSES.active
    ) {
      return relatedFlights
    }

    relatedFlights.push(flight)
    return relatedFlights
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

function matchesPriceRanges(flight, priceRanges = []) {
  if (!priceRanges.length) {
    return true
  }

  return priceRanges.some((priceRange) => {
    if (priceRange === 'under-2m') {
      return flight.sale_price < 2000000
    }

    if (priceRange === '2-5m') {
      return flight.sale_price >= 2000000 && flight.sale_price <= 5000000
    }

    if (priceRange === 'over-5m') {
      return flight.sale_price > 5000000
    }

    return false
  })
}

function matchesAirlines(flight, airlineCodes = []) {
  if (!airlineCodes.length) {
    return true
  }

  return airlineCodes.includes(flight.airline_code)
}

function matchesDepartureWindows(flight, departureWindows = []) {
  if (!departureWindows.length) {
    return true
  }

  const departureHour = getDepartureHour(flight.departure_at)

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

function matchesStopCounts(flight, stopCounts = []) {
  if (!stopCounts.length) {
    return true
  }

  const stopCount = Number(flight.details?.stop_count ?? 0)

  return stopCounts.some((stopValue) => {
    if (stopValue === 'direct') {
      return stopCount === 0
    }

    if (stopValue === 'one_stop') {
      return stopCount === 1
    }

    return false
  })
}

function sortFlights(flights, sortValue) {
  const nextFlights = [...flights]

  if (sortValue === 'price_asc') {
    nextFlights.sort((first, second) => first.sale_price - second.sale_price)
    return nextFlights
  }

  if (sortValue === 'price_desc') {
    nextFlights.sort((first, second) => second.sale_price - first.sale_price)
    return nextFlights
  }

  if (sortValue === 'departure_time_asc') {
    nextFlights.sort(
      (first, second) =>
        new Date(first.departure_at).getTime() - new Date(second.departure_at).getTime(),
    )
    return nextFlights
  }

  if (sortValue === 'duration_asc') {
    nextFlights.sort((first, second) => first.duration_minutes - second.duration_minutes)
    return nextFlights
  }

  return nextFlights
}

function shouldUseFigmaDisplayTotal({
  airline_codes = [],
  departure_date = '',
  departure_windows = [],
  from_location = '',
  price_ranges = [],
  stop_counts = [],
  to_location = '',
}) {
  return (
    from_location === 'HAN' &&
    to_location === 'SGN' &&
    departure_date === '2026-07-10' &&
    !airline_codes.length &&
    !price_ranges.length &&
    !departure_windows.length &&
    !stop_counts.length
  )
}

export async function listFlights({
  trip_type = DEFAULT_FLIGHT_TRIP_TYPE,
  from_location = '',
  to_location = '',
  departure_date = '',
  return_date = '',
  cabin_class = DEFAULT_FLIGHT_CABIN_CLASS,
  passengers = {},
  airline_codes = [],
  price_ranges = [],
  departure_windows = [],
  stop_counts = [],
  sort = DEFAULT_FLIGHT_SORT,
  page = 1,
  limit = DEFAULT_FLIGHT_PAGE_SIZE,
} = {}) {
  // TODO: replace mock flight list with GET /services?service_type=flight in API integration phase.
  const safeLimit = Math.max(Number(limit) || DEFAULT_FLIGHT_PAGE_SIZE, 1)
  const safeCabinClass = String(cabin_class ?? '').trim()

  const filteredFlights = sortFlights(
    flightServiceFixtures.filter((flight) => {
      if (
        flight.service_type !== SERVICE_TYPES.flight ||
        flight.status !== SERVICE_STATUSES.active
      ) {
        return false
      }

      const matchesRoute =
        (!from_location || flight.departure_airport_code === from_location) &&
        (!to_location || flight.arrival_airport_code === to_location)
      const matchesDepartureDate =
        !departure_date || getDepartureDateKey(flight.departure_at) === departure_date
      const matchesCabinClass = !safeCabinClass || flight.cabin_class === safeCabinClass
      const hasEnoughSeats =
        flight.available_seats >=
        Math.max(Number(passengers.adults ?? 0) + Number(passengers.children ?? 0), 1)

      return (
        matchesRoute &&
        matchesDepartureDate &&
        matchesCabinClass &&
        hasEnoughSeats &&
        matchesAirlines(flight, airline_codes) &&
        matchesPriceRanges(flight, price_ranges) &&
        matchesDepartureWindows(flight, departure_windows) &&
        matchesStopCounts(flight, stop_counts)
      )
    }),
    sort,
  )

  const total = filteredFlights.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const pageStart = (safePage - 1) * safeLimit
  const paginatedFlights = filteredFlights.slice(pageStart, pageStart + safeLimit)
  const totalDisplay = shouldUseFigmaDisplayTotal({
    airline_codes,
    departure_date,
    departure_windows,
    from_location,
    price_ranges,
    stop_counts,
    to_location,
  })
    ? 35
    : total

  return {
    success: true,
    message: 'OK',
    data: cloneValue(paginatedFlights),
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

export async function getFlightSearchDefaults() {
  // TODO: replace mock flight search defaults with flight metadata API in integration phase.
  return {
    success: true,
    message: 'OK',
    data: cloneValue(flightSearchDefaultsFixture),
  }
}

export function buildFlightSearchParams({
  auth: _auth = '',
  trip_type = DEFAULT_FLIGHT_TRIP_TYPE,
  from_location = '',
  to_location = '',
  departure_date = '',
  return_date = '',
  adults = 1,
  children = 0,
  infants = 0,
  cabin_class = DEFAULT_FLIGHT_CABIN_CLASS,
  airline_codes = [],
  price_ranges = [],
  departure_windows = [],
  stop_counts = [],
  sort = DEFAULT_FLIGHT_SORT,
  page = 1,
} = {}) {
  const searchParams = new URLSearchParams()

  if (trip_type && trip_type !== DEFAULT_FLIGHT_TRIP_TYPE) {
    searchParams.set('trip_type', trip_type)
  }

  if (from_location) {
    searchParams.set('from', from_location)
  }

  if (to_location) {
    searchParams.set('to', to_location)
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

  if (cabin_class && cabin_class !== DEFAULT_FLIGHT_CABIN_CLASS) {
    searchParams.set('cabin_class', cabin_class)
  }

  if (airline_codes.length) {
    searchParams.set('airlines', airline_codes.join(','))
  }

  if (price_ranges.length) {
    searchParams.set('prices', price_ranges.join(','))
  }

  if (departure_windows.length) {
    searchParams.set('departure_windows', departure_windows.join(','))
  }

  if (stop_counts.length) {
    searchParams.set('stops', stop_counts.join(','))
  }

  if (sort && sort !== DEFAULT_FLIGHT_SORT) {
    searchParams.set('sort', sort)
  }

  if (Number(page) > 1) {
    searchParams.set('page', String(page))
  }

  return searchParams
}

export async function getFlightDetailBySlug(slug) {
  // TODO: replace mock flight detail with GET /services/{slug} in API integration phase.
  const flight = getFlightFixtureBySlug(slug)

  if (
    !flight ||
    flight.service_type !== SERVICE_TYPES.flight ||
    flight.status !== SERVICE_STATUSES.active
  ) {
    return {
      success: false,
      message: 'Không tìm thấy chuyến bay.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: {
      flight: cloneValue(flight),
      related_flights: cloneValue(getRelatedFlights(flight.slug)),
    },
  }
}

export async function checkFlightAvailability({
  selected_flight_id = '',
  quantity = 1,
} = {}) {
  // TODO: replace mock flight availability with flight availability API in integration phase.
  const flight = flightServiceFixtures.find((item) => item.id === selected_flight_id)

  if (!flight || flight.service_type !== SERVICE_TYPES.flight) {
    return {
      success: false,
      message: 'Không tìm thấy chuyến bay.',
      data: null,
    }
  }

  const requestedQuantity = Math.max(Number(quantity) || 1, 1)
  const isAvailable =
    flight.status === SERVICE_STATUSES.active && flight.available_seats >= requestedQuantity

  return {
    success: true,
    message: isAvailable
      ? 'Chuyến bay còn chỗ trong dữ liệu mock.'
      : 'Chuyến bay không còn đủ chỗ trong dữ liệu mock.',
    data: {
      is_available: isAvailable,
      available_seats: flight.available_seats,
      selected_flight_id: flight.id,
    },
  }
}

export async function buildFlightSelectionPayload(
  flight,
  selectedFareOrSearchState = null,
  maybeSearchState = {},
) {
  // TODO: replace mock cart payload with POST /cart/items in API integration phase.
  if (!flight || flight.service_type !== SERVICE_TYPES.flight) {
    return {
      success: false,
      message: 'Không thể chuẩn bị dữ liệu chuyến bay.',
      data: null,
    }
  }

  const selectedFareLooksLikeSearchState =
    selectedFareOrSearchState &&
    typeof selectedFareOrSearchState === 'object' &&
    !Array.isArray(selectedFareOrSearchState) &&
    ('trip_type' in selectedFareOrSearchState ||
      'passengers' in selectedFareOrSearchState ||
      'departure_date' in selectedFareOrSearchState ||
      'return_date' in selectedFareOrSearchState)
  const selectedFare = selectedFareLooksLikeSearchState ? null : selectedFareOrSearchState
  const searchState = selectedFareLooksLikeSearchState
    ? selectedFareOrSearchState
    : maybeSearchState ?? {}
  const adultCount = Math.max(Number(searchState.passengers?.adults ?? 1), 1)
  const childCount = Math.max(Number(searchState.passengers?.children ?? 0), 0)
  const infantCount = Math.max(Number(searchState.passengers?.infants ?? 0), 0)
  const payingPassengers = adultCount + childCount
  const unitPriceSnapshot = Math.max(Number(selectedFare?.price ?? flight.sale_price ?? 0), 0)
  const selectedFareTotal = Math.max(
    Number(selectedFare?.total_price ?? selectedFare?.price ?? flight.sale_price ?? 0),
    0,
  )

  return {
    success: true,
    message: 'Đã chuẩn bị dữ liệu chuyến bay.',
    data: {
      service_id: flight.id,
      service_type: SERVICE_TYPES.flight,
      reference_id: flight.flight_number,
      start_at: flight.departure_at,
      end_at: flight.arrival_at,
      quantity: Math.max(payingPassengers, 1),
      unit_price_snapshot: unitPriceSnapshot,
      options: {
        trip_type: searchState.trip_type ?? DEFAULT_FLIGHT_TRIP_TYPE,
        route_label: `${flight.departure_city} - ${flight.arrival_city}`,
        cabin_class: flight.cabin_class,
        cabin_class_label:
          flightSearchDefaultsFixture.cabin_classes.find(
            (item) => item.value === flight.cabin_class,
          )?.label ?? flight.cabin_class,
        adult_count: adultCount,
        child_count: childCount,
        infant_count: infantCount,
        departure_date:
          searchState.departure_date ?? getDepartureDateKey(flight.departure_at),
        return_date: searchState.return_date ?? '',
        baggage_allowance: selectedFare?.included_baggage ?? flight.baggage_allowance,
        airline_name: flight.airline_name,
        flight_number: flight.flight_number,
        selected_fare_id: selectedFare?.id ?? '',
        selected_fare_title: selectedFare?.title ?? '',
        selected_fare_total_price: selectedFareTotal,
        taxes: Number(selectedFare?.taxes ?? 0),
        add_ons: Number(selectedFare?.add_ons ?? 0),
        refundable:
          typeof selectedFare?.refundable === 'boolean'
            ? selectedFare.refundable
            : flight.refundable,
        changeable:
          typeof selectedFare?.changeable === 'boolean'
            ? selectedFare.changeable
            : flight.changeable,
      },
    },
  }
}
