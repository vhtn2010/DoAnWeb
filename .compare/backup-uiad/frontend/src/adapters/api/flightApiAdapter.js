import {
  DEFAULT_FLIGHT_CABIN_CLASS,
  DEFAULT_FLIGHT_PAGE_SIZE,
  DEFAULT_FLIGHT_PASSENGERS,
  DEFAULT_FLIGHT_SORT,
  DEFAULT_FLIGHT_TRIP_TYPE,
  FLIGHT_CABIN_CLASS_OPTIONS,
  FLIGHT_SORT_OPTIONS,
  FLIGHT_TRIP_TYPE_OPTIONS,
} from '../../constants/flights.js'
import { vietnamAirportOptions } from '../../constants/vietnamAirports.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { apiGet, apiPost } from '../../services/apiClient.js'

const AIRLINE_ASSET_BY_NAME = Object.freeze({
  'bamboo airways': '/assets/template/home/v39_1679.png',
  'sun phuquoc airways': '/assets/template/home/v39_1669.png',
  'vietnam airlines': '/assets/template/brand/logo.png',
  'vietjet air': '/assets/template/home/v39_1685.png',
  'vietravel airlines': '/assets/template/service/detail/recommendation-mien-trung.png',
})

const AIRLINE_CODE_BY_NAME = Object.freeze({
  'bamboo airways': 'QH',
  'sun phuquoc airways': 'PQ',
  'vietnam airlines': 'VN',
  'vietjet air': 'VJ',
  'vietravel airlines': 'VU',
})

function stripVietnamese(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
}

function normalizeText(value = '') {
  return stripVietnamese(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function toNumber(value, fallbackValue = 0) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
}

function toOptionalNumber(value) {
  if (value == null || value === '') {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function calculateDurationMinutes(startAt, endAt) {
  const startDate = new Date(startAt)
  const endDate = new Date(endAt)

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return 0
  }

  return Math.max(Math.round((endDate.getTime() - startDate.getTime()) / 60000), 0)
}

function resolveAirportRecord(value) {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue) {
    return null
  }

  return (
    vietnamAirportOptions.find((airport) => {
      const candidates = [airport.code, airport.city, airport.airport_name, airport.label]

      return candidates.some((candidate) => normalizeText(candidate) === normalizedValue)
    }) ?? null
  )
}

function resolveAirlineCode(airlineName, flightNumber) {
  const normalizedAirlineName = normalizeText(airlineName)

  if (AIRLINE_CODE_BY_NAME[normalizedAirlineName]) {
    return AIRLINE_CODE_BY_NAME[normalizedAirlineName]
  }

  const flightNumberPrefix = String(flightNumber ?? '')
    .trim()
    .match(/^[A-Za-z]+/)

  return flightNumberPrefix ? flightNumberPrefix[0].toUpperCase() : 'FL'
}

function resolveAirlineImage(airlineName) {
  return AIRLINE_ASSET_BY_NAME[normalizeText(airlineName)] ?? '/assets/template/brand/logo.png'
}

function getPriceRangeKey(priceValue) {
  if (priceValue < 2000000) {
    return 'under-2m'
  }

  if (priceValue <= 5000000) {
    return '2-5m'
  }

  return 'over-5m'
}

function getDepartureWindowKey(dateValue) {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const hour = date.getHours()

  if (hour < 6) {
    return 'early_morning'
  }

  if (hour < 12) {
    return 'morning'
  }

  if (hour < 18) {
    return 'afternoon'
  }

  return 'evening'
}

function createDefaultFareOption(flight) {
  const totalPrice = Math.max(toNumber(flight.sale_price), 0)
  const baggageAllowance = flight.baggage_allowance || 'Theo quy định của hãng'

  return {
    id: `fare-${flight.reference_id || flight.id}-standard`,
    title: 'HẠNG VÉ TIÊU CHUẨN',
    price: totalPrice,
    currency: flight.currency ?? 'VND',
    badge: '',
    is_featured: true,
    is_default: true,
    cta_label: 'Đã chọn',
    included_baggage: baggageAllowance,
    refundable: Boolean(flight.refundable),
    changeable: Boolean(flight.changeable),
    summary_subtitle: baggageAllowance,
    benefits_preview: ['Làm thủ tục nhanh', 'Thông tin chuyến bay rõ ràng', 'Hỗ trợ đổi lịch theo điều kiện'],
    features: [
      baggageAllowance,
      flight.refundable ? 'Hoàn vé theo điều kiện' : 'Không hoàn vé',
      flight.changeable ? 'Đổi lịch theo điều kiện' : 'Không đổi lịch',
      `Còn ${flight.available_seats} chỗ`,
    ],
    taxes: 0,
    add_ons: 0,
    total_price: totalPrice,
  }
}

function buildFlightPolicies(flight, service = {}) {
  const policies = []

  if (service.cancellation_policy) {
    policies.push(service.cancellation_policy)
  }

  policies.push(flight.refundable ? 'Có hỗ trợ hoàn vé theo điều kiện.' : 'Vé không hỗ trợ hoàn.')
  policies.push(
    flight.changeable ? 'Có thể đổi lịch theo điều kiện của hãng.' : 'Không hỗ trợ đổi lịch.',
  )

  return policies
}

function mapSearchFlightRecord(record = {}) {
  const departureAirport = resolveAirportRecord(record.departure_airport)
  const arrivalAirport = resolveAirportRecord(record.arrival_airport)
  const farePrice = toNumber(record.fare_price)

  return {
    id: record.flight_detail_id ?? record.service_id ?? record.slug ?? '',
    service_id: record.service_id ?? '',
    service_type: SERVICE_TYPES.flight,
    service_code: '',
    title:
      record.title ??
      `${departureAirport?.city ?? record.departure_airport} - ${arrivalAirport?.city ?? record.arrival_airport}`,
    slug: record.slug ?? '',
    short_description: record.short_description ?? '',
    description: '',
    provider_name: '',
    airline_name: record.airline_name ?? 'Chuyến bay',
    airline_code: resolveAirlineCode(record.airline_name, record.flight_number),
    flight_number: record.flight_number ?? '',
    aircraft: '',
    departure_city: departureAirport?.city ?? record.departure_airport ?? '',
    departure_airport: departureAirport?.airport_name ?? record.departure_airport ?? '',
    departure_airport_code: departureAirport?.code ?? String(record.departure_airport ?? '').trim(),
    arrival_city: arrivalAirport?.city ?? record.arrival_airport ?? '',
    arrival_airport: arrivalAirport?.airport_name ?? record.arrival_airport ?? '',
    arrival_airport_code: arrivalAirport?.code ?? String(record.arrival_airport ?? '').trim(),
    departure_at: record.departure_at ?? '',
    arrival_at: record.arrival_at ?? '',
    duration_minutes: calculateDurationMinutes(record.departure_at, record.arrival_at),
    stop_type: 'direct',
    cabin_class: record.cabin_class ?? '',
    baggage_allowance: '',
    refundable: false,
    changeable: false,
    available_seats: toNumber(record.seats_available),
    base_price: farePrice,
    sale_price: farePrice,
    currency: record.currency ?? 'VND',
    status: SERVICE_STATUSES.active,
    image_url: resolveAirlineImage(record.airline_name),
    reference_id: record.flight_detail_id ?? '',
    flight_detail_id: record.flight_detail_id ?? '',
    details: {
      stop_count: 0,
    },
  }
}

function mapFlightDetailRecord(service = {}) {
  const detail = service.details ?? {}
  const departureAirport = resolveAirportRecord(detail.departure_airport)
  const arrivalAirport = resolveAirportRecord(detail.arrival_airport)
  const fallbackPrice = toNumber(detail.fare_price ?? service.public_price)
  const salePrice = toOptionalNumber(service.sale_price) ?? fallbackPrice
  const basePrice = toOptionalNumber(service.base_price) ?? salePrice

  const flight = {
    id: service.id ?? '',
    service_id: service.id ?? '',
    service_type: SERVICE_TYPES.flight,
    service_code: service.service_code ?? '',
    title:
      service.title ??
      `${departureAirport?.city ?? detail.departure_airport} - ${arrivalAirport?.city ?? detail.arrival_airport}`,
    slug: service.slug ?? '',
    short_description: service.short_description ?? '',
    description: service.description ?? '',
    provider_name: service.provider_name ?? '',
    airline_name: detail.airline_name ?? service.title ?? 'Chuyến bay',
    airline_code: resolveAirlineCode(detail.airline_name, detail.flight_number),
    flight_number: detail.flight_number ?? '',
    aircraft: service.metadata?.aircraft ?? '',
    departure_city: departureAirport?.city ?? detail.departure_airport ?? '',
    departure_airport: departureAirport?.airport_name ?? detail.departure_airport ?? '',
    departure_airport_code: departureAirport?.code ?? String(detail.departure_airport ?? '').trim(),
    arrival_city: arrivalAirport?.city ?? detail.arrival_airport ?? '',
    arrival_airport: arrivalAirport?.airport_name ?? detail.arrival_airport ?? '',
    arrival_airport_code: arrivalAirport?.code ?? String(detail.arrival_airport ?? '').trim(),
    departure_at: detail.departure_at ?? '',
    arrival_at: detail.arrival_at ?? '',
    duration_minutes: calculateDurationMinutes(detail.departure_at, detail.arrival_at),
    stop_type: 'direct',
    cabin_class: detail.cabin_class ?? DEFAULT_FLIGHT_CABIN_CLASS,
    baggage_allowance: service.metadata?.baggage_allowance ?? '',
    refundable: Boolean(service.metadata?.refundable),
    changeable: Boolean(service.metadata?.changeable),
    available_seats: toNumber(detail.seats_available),
    base_price: basePrice,
    sale_price: salePrice,
    currency: service.currency ?? 'VND',
    status: detail.is_bookable ? SERVICE_STATUSES.active : service.status ?? SERVICE_STATUSES.active,
    image_url: service.primary_image ?? resolveAirlineImage(detail.airline_name),
    reference_id: detail.id ?? '',
    flight_detail_id: detail.id ?? '',
  }

  const defaultFareOption = createDefaultFareOption(flight)

  return {
    ...flight,
    details: {
      id: detail.id ?? '',
      stop_count: 0,
      eco_tag: service.metadata?.eco_tag ?? '',
      fare_options:
        Array.isArray(service.metadata?.fare_options) && service.metadata.fare_options.length > 0
          ? service.metadata.fare_options
          : [defaultFareOption],
      flight_info:
        service.metadata?.flight_info ??
        `Chuyến bay ${flight.flight_number} khởi hành từ ${flight.departure_city} đến ${flight.arrival_city}.`,
      onboard_benefits:
        Array.isArray(service.metadata?.onboard_benefits) && service.metadata.onboard_benefits.length > 0
          ? service.metadata.onboard_benefits
          : ['Thông báo lịch trình đầy đủ', 'Hỗ trợ trực tuyến', 'Xác nhận giữ chỗ nhanh'],
      policies:
        Array.isArray(service.metadata?.policies) && service.metadata.policies.length > 0
          ? service.metadata.policies
          : buildFlightPolicies(flight, service),
      editorial_destination: service.metadata?.editorial_destination ?? null,
      payment_summary: service.metadata?.payment_summary ?? {},
    },
  }
}

function buildAirlineOptions(flights = []) {
  const airlineMap = new Map()

  flights.forEach((flight) => {
    if (!flight.airline_name) {
      return
    }

    airlineMap.set(flight.airline_code, {
      code: flight.airline_code,
      name: flight.airline_name,
    })
  })

  return [...airlineMap.values()].sort((left, right) => left.name.localeCompare(right.name, 'vi'))
}

function filterFlights(flights = [], filters = {}) {
  const {
    airline_codes = [],
    departure_windows = [],
    passengers = {},
    price_ranges = [],
    stop_counts = [],
  } = filters
  const minimumSeats = Math.max(
    toNumber(passengers.adults, 0) + toNumber(passengers.children, 0),
    1,
  )

  return flights.filter((flight) => {
    if (flight.available_seats < minimumSeats) {
      return false
    }

    if (airline_codes.length > 0 && !airline_codes.includes(flight.airline_code)) {
      return false
    }

    if (price_ranges.length > 0 && !price_ranges.includes(getPriceRangeKey(flight.sale_price))) {
      return false
    }

    if (
      departure_windows.length > 0 &&
      !departure_windows.includes(getDepartureWindowKey(flight.departure_at))
    ) {
      return false
    }

    if (stop_counts.length > 0 && !stop_counts.includes('direct')) {
      return false
    }

    return true
  })
}

function sortFlights(flights = [], sort = DEFAULT_FLIGHT_SORT) {
  const nextFlights = [...flights]

  if (sort === 'price_desc') {
    return nextFlights.sort((left, right) => right.sale_price - left.sale_price)
  }

  if (sort === 'departure_time_asc') {
    return nextFlights.sort(
      (left, right) => new Date(left.departure_at).getTime() - new Date(right.departure_at).getTime(),
    )
  }

  if (sort === 'duration_asc') {
    return nextFlights.sort((left, right) => left.duration_minutes - right.duration_minutes)
  }

  return nextFlights.sort((left, right) => left.sale_price - right.sale_price)
}

function paginateFlights(flights = [], { limit = DEFAULT_FLIGHT_PAGE_SIZE, page = 1 } = {}) {
  const safeLimit = Math.max(Number(limit) || DEFAULT_FLIGHT_PAGE_SIZE, 1)
  const total = flights.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const startIndex = (safePage - 1) * safeLimit

  return {
    rows: flights.slice(startIndex, startIndex + safeLimit),
    meta: {
      has_next: safePage < totalPages,
      limit: safeLimit,
      page: safePage,
      total,
      total_display: total,
      total_pages: totalPages,
    },
  }
}

export async function listFlights({
  airline_codes = [],
  cabin_class = DEFAULT_FLIGHT_CABIN_CLASS,
  departure_date = '',
  departure_windows = [],
  from_location = '',
  limit = DEFAULT_FLIGHT_PAGE_SIZE,
  page = 1,
  passengers = DEFAULT_FLIGHT_PASSENGERS,
  price_ranges = [],
  sort = DEFAULT_FLIGHT_SORT,
  stop_counts = [],
  to_location = '',
} = {}) {
  const response = await apiGet('/services/flights/search', {
    auth: false,
    query: {
      cabin_class,
      departure_date,
      from: from_location,
      to: to_location,
    },
  })
  const mappedFlights = Array.isArray(response.data) ? response.data.map(mapSearchFlightRecord) : []
  const filteredFlights = filterFlights(mappedFlights, {
    airline_codes,
    departure_windows,
    passengers,
    price_ranges,
    stop_counts,
  })
  const sortedFlights = sortFlights(filteredFlights, sort)
  const paginatedFlights = paginateFlights(sortedFlights, {
    limit,
    page,
  })

  return {
    ...response,
    data: paginatedFlights.rows,
    meta: {
      ...paginatedFlights.meta,
      airlines: buildAirlineOptions(mappedFlights),
    },
  }
}

export async function getFlightSearchDefaults() {
  return {
    success: true,
    message: 'Flight defaults retrieved successfully',
    data: {
      trip_types: FLIGHT_TRIP_TYPE_OPTIONS,
      cabin_classes: FLIGHT_CABIN_CLASS_OPTIONS,
      default_passengers: DEFAULT_FLIGHT_PASSENGERS,
      airports: vietnamAirportOptions.map((airport) => ({
        ...airport,
        airport_code: airport.code,
      })),
      airlines: [],
      sort_options: FLIGHT_SORT_OPTIONS,
    },
  }
}

export function buildFlightSearchParams({
  auth = '',
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

  if (auth) {
    searchParams.set('auth', auth)
  }

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

export async function getFlightDetailBySlug(slug, { reference_id = '' } = {}) {
  const response = await apiGet(`/services/${encodeURIComponent(slug)}`, {
    auth: false,
    query: {
      reference_id,
    },
  })
  const service = response.data ?? null

  if (!service || service.service_type !== SERVICE_TYPES.flight) {
    return {
      success: false,
      message: 'Không tìm thấy chuyến bay.',
      data: null,
    }
  }

  const flight = mapFlightDetailRecord(service)
  const departureDate = String(flight.departure_at ?? '').split('T')[0]
  let relatedFlights = []

  if (flight.departure_airport_code && flight.arrival_airport_code && departureDate) {
    try {
      const relatedResponse = await apiGet('/services/flights/search', {
        auth: false,
        query: {
          departure_date: departureDate,
          from: flight.departure_airport_code,
          to: flight.arrival_airport_code,
        },
      })

      relatedFlights = Array.isArray(relatedResponse.data)
        ? relatedResponse.data
            .map(mapSearchFlightRecord)
            .filter((relatedFlight) => relatedFlight.reference_id !== flight.reference_id)
            .slice(0, 3)
        : []
    } catch {
      relatedFlights = []
    }
  }

  return {
    success: true,
    message: response.message ?? 'Flight detail retrieved successfully',
    data: {
      flight,
      related_flights: relatedFlights,
    },
  }
}

export async function checkFlightAvailability({
  quantity = 1,
  reference_id = '',
  service_id = '',
  selected_flight_id = '',
  start_at,
} = {}) {
  const resolvedServiceId = service_id || selected_flight_id

  if (!resolvedServiceId || !reference_id) {
    return {
      success: false,
      message: 'Không thể kiểm tra chỗ cho chuyến bay này.',
      data: null,
    }
  }

  const response = await apiPost(`/services/${resolvedServiceId}/availability`, {
    auth: false,
    body: {
      quantity: Math.max(Number(quantity) || 1, 1),
      reference_id,
      service_type: SERVICE_TYPES.flight,
      start_at,
    },
  })

  return {
    ...response,
    data: response.data
      ? {
          available_seats: toNumber(response.data.available_quantity),
          is_available: Boolean(response.data.available),
          selected_flight_id: resolvedServiceId,
          unit_price: toOptionalNumber(response.data.unit_price),
        }
      : null,
  }
}

export async function buildFlightSelectionPayload(
  flight,
  selectedFareOrSearchState = null,
  maybeSearchState = {},
) {
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

  if (!flight.reference_id) {
    return {
      success: false,
      message: 'Chuyến bay hiện chưa có mã chỗ để đặt vé.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'Đã chuẩn bị dữ liệu chuyến bay.',
    data: {
      service_id: flight.service_id ?? flight.id,
      service_type: SERVICE_TYPES.flight,
      reference_id: flight.reference_id,
      start_at: flight.departure_at,
      end_at: flight.arrival_at,
      quantity: Math.max(payingPassengers, 1),
      unit_price_snapshot: toNumber(selectedFare?.price ?? flight.sale_price),
      options: {
        trip_type: searchState.trip_type ?? DEFAULT_FLIGHT_TRIP_TYPE,
        route_label: `${flight.departure_city} - ${flight.arrival_city}`,
        cabin_class: flight.cabin_class,
        cabin_class_label:
          FLIGHT_CABIN_CLASS_OPTIONS.find((option) => option.value === flight.cabin_class)?.label ??
          flight.cabin_class,
        adult_count: adultCount,
        child_count: childCount,
        infant_count: infantCount,
        departure_date:
          searchState.departure_date ?? String(flight.departure_at ?? '').split('T')[0] ?? '',
        return_date: searchState.return_date ?? '',
        baggage_allowance: selectedFare?.included_baggage ?? flight.baggage_allowance ?? '',
        airline_name: flight.airline_name,
        flight_number: flight.flight_number,
        selected_fare_id: selectedFare?.id ?? '',
        selected_fare_title: selectedFare?.title ?? '',
        selected_fare_total_price: toNumber(
          selectedFare?.total_price ?? selectedFare?.price ?? flight.sale_price,
        ),
        taxes: toNumber(selectedFare?.taxes),
        add_ons: toNumber(selectedFare?.add_ons),
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
