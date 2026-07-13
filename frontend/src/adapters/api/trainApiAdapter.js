import {
  DEFAULT_TRAIN_PAGE_SIZE,
  DEFAULT_TRAIN_PASSENGERS,
  DEFAULT_TRAIN_SORT,
  DEFAULT_TRAIN_TRIP_TYPE,
  TRAIN_DEPARTURE_TIME_FILTER_OPTIONS,
  TRAIN_PRICE_FILTER_OPTIONS,
  TRAIN_SORT_OPTIONS,
  TRAIN_TRIP_TYPE_OPTIONS,
  TRAIN_TYPE_FILTER_OPTIONS,
  VIETNAM_TRAIN_STATION_OPTIONS,
} from '../../constants/trains.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { apiGet, apiPost } from '../../services/apiClient.js'

const FALLBACK_TRAIN_IMAGE_URL =
  '/assets/template/service/detail/recommendation-mien-trung.png'

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

function resolveStationRecord(value = '') {
  const normalizedValue = normalizeText(value)

  if (!normalizedValue) {
    return null
  }

  return (
    VIETNAM_TRAIN_STATION_OPTIONS.find((station) => {
      const candidates = [
        station.code,
        station.city,
        station.station_name,
        station.label,
      ]

      return candidates.some((candidate) => normalizeText(candidate) === normalizedValue)
    }) ?? null
  )
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

function getPriceRangeKey(priceValue) {
  if (priceValue < 2000000) {
    return 'under-2m'
  }

  if (priceValue <= 5000000) {
    return '2-5m'
  }

  return 'over-5m'
}

function inferTrainType({ durationMinutes = 0, seatClass = '', trainNumber = '' } = {}) {
  const normalizedTrainNumber = String(trainNumber ?? '').trim().toUpperCase()
  const normalizedSeatClass = normalizeText(seatClass)

  if (normalizedTrainNumber.startsWith('TN')) {
    return 'local'
  }

  if (normalizedSeatClass.includes('vip')) {
    return 'quality_fast'
  }

  if (durationMinutes > 0 && durationMinutes <= 240) {
    return 'express'
  }

  if (normalizedTrainNumber.startsWith('SE')) {
    return 'fast'
  }

  return 'express'
}

function matchesPriceRanges(train, priceRanges = []) {
  if (!priceRanges.length) {
    return true
  }

  return priceRanges.includes(getPriceRangeKey(Number(train.sale_price ?? 0)))
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

  return departureWindows.includes(getDepartureWindowKey(train.departure_at))
}

function sortTrains(trains = [], sort = DEFAULT_TRAIN_SORT) {
  const nextTrains = [...trains]

  if (!sort) {
    return nextTrains
  }

  if (sort === 'price_desc') {
    return nextTrains.sort((leftTrain, rightTrain) => rightTrain.sale_price - leftTrain.sale_price)
  }

  if (sort === 'departure_time_asc') {
    return nextTrains.sort(
      (leftTrain, rightTrain) =>
        new Date(leftTrain.departure_at).getTime() - new Date(rightTrain.departure_at).getTime(),
    )
  }

  if (sort === 'duration_asc') {
    return nextTrains.sort(
      (leftTrain, rightTrain) => leftTrain.duration_minutes - rightTrain.duration_minutes,
    )
  }

  if (sort === 'price_asc') {
    return nextTrains.sort(
      (leftTrain, rightTrain) => leftTrain.sale_price - rightTrain.sale_price,
    )
  }

  return nextTrains
}

function paginateTrains(trains = [], { limit = DEFAULT_TRAIN_PAGE_SIZE, page = 1 } = {}) {
  const safeLimit = Math.max(Number(limit) || DEFAULT_TRAIN_PAGE_SIZE, 1)
  const total = trains.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const startIndex = (safePage - 1) * safeLimit

  return {
    rows: trains.slice(startIndex, startIndex + safeLimit),
    meta: {
      has_next: safePage < totalPages,
      limit: safeLimit,
      page: safePage,
      total,
      total_pages: totalPages,
    },
  }
}

function mapSearchRecordToTrain(record = {}) {
  const departureStation = resolveStationRecord(record.departure_station)
  const arrivalStation = resolveStationRecord(record.arrival_station)
  const farePrice = toNumber(record.fare_price)
  const durationMinutes = calculateDurationMinutes(record.departure_at, record.arrival_at)
  const trainType = inferTrainType({
    durationMinutes,
    seatClass: record.seat_class,
    trainNumber: record.train_number,
  })

  return {
    id: record.service_id ?? record.train_detail_id ?? record.slug ?? '',
    service_id: record.service_id ?? '',
    service_code: '',
    service_type: SERVICE_TYPES.train,
    title:
      record.title ??
      `${arrivalStation?.city ?? record.arrival_station} - ${departureStation?.city ?? record.departure_station}`,
    slug: record.slug ?? '',
    short_description: '',
    description: '',
    provider_name: '',
    train_number: record.train_number ?? '',
    train_name: 'Chuyến tàu',
    departure_station: departureStation?.station_name ?? record.departure_station ?? '',
    departure_station_code:
      departureStation?.code ?? String(record.departure_station ?? '').trim(),
    departure_city: departureStation?.city ?? record.departure_station ?? '',
    arrival_station: arrivalStation?.station_name ?? record.arrival_station ?? '',
    arrival_station_code: arrivalStation?.code ?? String(record.arrival_station ?? '').trim(),
    arrival_city: arrivalStation?.city ?? record.arrival_station ?? '',
    departure_at: record.departure_at ?? '',
    arrival_at: record.arrival_at ?? '',
    duration_minutes: durationMinutes,
    seat_class: record.seat_class ?? '',
    carriage_type: '',
    total_seats: toNumber(record.seats_total, toNumber(record.seats_available)),
    available_seats: toNumber(record.seats_available),
    base_price: farePrice,
    sale_price: farePrice,
    currency: record.currency ?? 'VND',
    status: SERVICE_STATUSES.active,
    image_url: FALLBACK_TRAIN_IMAGE_URL,
    reference_id: record.train_detail_id ?? '',
    train_detail_id: record.train_detail_id ?? '',
    details: {
      train_type: trainType,
      seats_total: toNumber(record.seats_total, toNumber(record.seats_available)),
      seats_available: toNumber(record.seats_available),
    },
  }
}

function mapServiceDetailToTrain(service = {}) {
  const detail = service.details ?? {}
  const departureStation = resolveStationRecord(detail.departure_station)
  const arrivalStation = resolveStationRecord(detail.arrival_station)
  const durationMinutes = calculateDurationMinutes(detail.departure_at, detail.arrival_at)
  const farePrice = toOptionalNumber(detail.fare_price)
  const basePrice = farePrice ?? toOptionalNumber(service.base_price) ?? 0
  const salePrice = farePrice ?? toOptionalNumber(service.sale_price) ?? basePrice
  const trainType = inferTrainType({
    durationMinutes,
    seatClass: detail.seat_class,
    trainNumber: detail.train_number,
  })

  return {
    id: service.id ?? '',
    service_id: service.id ?? '',
    service_code: service.service_code ?? '',
    service_type: SERVICE_TYPES.train,
    title: service.title ?? 'Chuyến tàu dang cap nhat',
    slug: service.slug ?? '',
    short_description: service.short_description ?? '',
    description: service.description ?? '',
    provider_name: service.provider_name ?? '',
    train_number: detail.train_number ?? '',
    train_name: service.title ?? 'Chuyến tàu',
    departure_station: departureStation?.station_name ?? detail.departure_station ?? '',
    departure_station_code:
      departureStation?.code ?? String(detail.departure_station ?? '').trim(),
    departure_city: departureStation?.city ?? detail.departure_station ?? '',
    arrival_station: arrivalStation?.station_name ?? detail.arrival_station ?? '',
    arrival_station_code:
      arrivalStation?.code ?? String(detail.arrival_station ?? '').trim(),
    arrival_city: arrivalStation?.city ?? detail.arrival_station ?? '',
    departure_at: detail.departure_at ?? '',
    arrival_at: detail.arrival_at ?? '',
    duration_minutes: durationMinutes,
    seat_class: detail.seat_class ?? '',
    carriage_type: service.metadata?.carriage_type ?? '',
    total_seats: toNumber(detail.seats_total, toNumber(detail.seats_available)),
    available_seats: toNumber(detail.seats_available),
    base_price: basePrice,
    sale_price: salePrice,
    currency: service.currency ?? 'VND',
    status:
      detail.is_bookable === false
        ? service.status ?? SERVICE_STATUSES.active
        : SERVICE_STATUSES.active,
    image_url: service.primary_image ?? FALLBACK_TRAIN_IMAGE_URL,
    reference_id: detail.id ?? '',
    train_detail_id: detail.id ?? '',
    details: {
      amenities: Array.isArray(service.metadata?.amenities) ? service.metadata.amenities : [],
      baggage_policy: service.metadata?.baggage_policy ?? '',
      carriage_info: service.metadata?.carriage_info ?? '',
      cars: Array.isArray(service.metadata?.cars) ? service.metadata.cars : [],
      member_discount: service.metadata?.member_discount ?? {},
      payment_summary: service.metadata?.payment_summary ?? {},
      policies: Array.isArray(service.metadata?.policies) ? service.metadata.policies : [],
      refund_policy: service.metadata?.refund_policy ?? '',
      route_note: service.short_description ?? '',
      schedule: Array.isArray(service.metadata?.schedule) ? service.metadata.schedule : [],
      seat_options: Array.isArray(service.metadata?.seat_options)
        ? service.metadata.seat_options
        : [],
      seats_total: toNumber(detail.seats_total, toNumber(detail.seats_available)),
      seats_available: toNumber(detail.seats_available),
      train_type: trainType,
    },
  }
}

async function searchTrainRows({
  departure_date = '',
  from_station = '',
  seat_class = '',
  to_station = '',
} = {}) {
  return apiGet('/services/trains/search', {
    auth: false,
    query: {
      ...(departure_date ? { departure_date } : {}),
      ...(String(from_station ?? '').trim()
        ? { from: String(from_station ?? '').trim() }
        : {}),
      ...(seat_class ? { seat_class } : {}),
      ...(String(to_station ?? '').trim()
        ? { to: String(to_station ?? '').trim() }
        : {}),
    },
  })
}

function normalizeSelectedSeats(selectedSeatValue = null) {
  if (Array.isArray(selectedSeatValue)) {
    return selectedSeatValue.filter(Boolean)
  }

  if (selectedSeatValue && typeof selectedSeatValue === 'object') {
    return [selectedSeatValue]
  }

  return []
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
      searchState: selectedSeatOrSearchState,
      selectedSeat: null,
      selectedSeatOption: null,
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
  passengers = DEFAULT_TRAIN_PASSENGERS,
  train_types = [],
  price_ranges = [],
  departure_windows = [],
  sort = DEFAULT_TRAIN_SORT,
  page = 1,
  limit = DEFAULT_TRAIN_PAGE_SIZE,
} = {}) {
  const requiredSeats = Math.max(
    toNumber(passengers.adults, 0) + toNumber(passengers.children, 0),
    1,
  )
  const response = await searchTrainRows({
    departure_date,
    from_station,
    to_station,
  })
  const mappedTrains = Array.isArray(response.data)
    ? response.data.map(mapSearchRecordToTrain)
    : []
  const filteredTrains = sortTrains(
    mappedTrains.filter((train) => {
      return (
        train.available_seats >= requiredSeats &&
        matchesTrainTypes(train, train_types) &&
        matchesPriceRanges(train, price_ranges) &&
        matchesDepartureWindows(train, departure_windows)
      )
    }),
    sort,
  )
  const paginatedTrains = paginateTrains(filteredTrains, {
    limit,
    page,
  })

  return {
    ...response,
    data: paginatedTrains.rows,
    meta: {
      ...paginatedTrains.meta,
      return_date,
      trip_type,
    },
  }
}

export async function getTrainSearchDefaults() {
  return {
    success: true,
    message: 'Train defaults retrieved successfully',
    data: {
      default_passengers: DEFAULT_TRAIN_PASSENGERS,
      departure_windows: TRAIN_DEPARTURE_TIME_FILTER_OPTIONS,
      price_ranges: TRAIN_PRICE_FILTER_OPTIONS,
      sort_options: TRAIN_SORT_OPTIONS,
      stations: VIETNAM_TRAIN_STATION_OPTIONS,
      train_types: TRAIN_TYPE_FILTER_OPTIONS,
      trip_types: TRAIN_TRIP_TYPE_OPTIONS,
    },
  }
}

export function buildTrainSearchParams({
  auth: _auth = '',
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

export async function getTrainDetailBySlug(slug, { reference_id = '' } = {}) {
  const response = await apiGet(`/services/${encodeURIComponent(slug)}`, {
    auth: false,
    query: {
      reference_id,
    },
  })
  const service = response.data ?? null

  if (!service || service.service_type !== SERVICE_TYPES.train) {
    return {
      success: false,
      message: 'Không tìm thấy chuyến tàu.',
      data: null,
    }
  }

  const train = mapServiceDetailToTrain(service)
  let relatedTrains = []

  if (train.departure_city && train.arrival_city && train.departure_at) {
    try {
      const relatedResponse = await searchTrainRows({
        departure_date: String(train.departure_at).split('T')[0] ?? '',
        from_station: train.departure_station_code,
        to_station: train.arrival_station_code,
      })

      relatedTrains = Array.isArray(relatedResponse.data)
        ? relatedResponse.data
            .map(mapSearchRecordToTrain)
            .filter(
              (relatedTrain) =>
                relatedTrain.reference_id !== train.reference_id &&
                relatedTrain.slug !== train.slug,
            )
            .slice(0, 3)
        : []
    } catch {
      relatedTrains = []
    }
  }

  return {
    success: true,
    message: response.message ?? 'Train detail retrieved successfully',
    data: {
      related_trains: relatedTrains,
      train,
    },
  }
}

export async function checkTrainAvailability({
  quantity,
  reference_id = '',
  selected_seat_ids = [],
  selected_train_id = '',
  start_at,
} = {}) {
  if (!selected_train_id || !reference_id) {
    return {
      success: false,
      message: 'Không thể kiểm tra chỗ cho chuyến tàu này.',
      data: null,
    }
  }

  const resolvedQuantity = Math.max(
    Number(quantity) || selected_seat_ids.filter(Boolean).length || 1,
    1,
  )
  const response = await apiPost(`/services/${selected_train_id}/availability`, {
    auth: false,
    body: {
      quantity: resolvedQuantity,
      reference_id,
      service_type: SERVICE_TYPES.train,
      start_at,
    },
  })

  return {
    ...response,
    data: response.data
      ? {
          available_seats: toNumber(response.data.available_quantity),
          is_available: Boolean(response.data.available),
          reference_id,
          selected_train_id,
          unit_price: toOptionalNumber(response.data.unit_price),
        }
      : null,
  }
}

export async function buildTrainSelectionPayload(
  train,
  selectedSeatOrSearchState = null,
  selectedSeatOptionOrSearchState = null,
  maybeSearchState = {},
) {
  if (!train || train.service_type !== SERVICE_TYPES.train) {
    return {
      success: false,
      message: 'Không thể chuẩn bị dữ liệu chuyến tàu.',
      data: null,
    }
  }

  if (!train.reference_id) {
    return {
      success: false,
      message: 'Chuyến tàu hien chua co ma cho de dat ve.',
      data: null,
    }
  }

  const legacyArguments = resolveSelectedSeatArgument(selectedSeatOrSearchState)
  let selectedSeatValue = legacyArguments?.selectedSeat ?? selectedSeatOrSearchState
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

  const selectedSeats = normalizeSelectedSeats(selectedSeatValue)

  if (!selectedSeats.length) {
    return {
      success: false,
      message: 'Vui lòng chọn chỗ trước khi tiếp tục.',
      data: null,
    }
  }

  const adultCount = Math.max(Number(searchState.passengers?.adults ?? 1), 1)
  const childCount = Math.max(Number(searchState.passengers?.children ?? 0), 0)
  const infantCount = Math.max(Number(searchState.passengers?.infants ?? 0), 0)
  const unitPriceSnapshot = Math.max(
    Number(selectedSeats[0]?.price ?? selectedSeatOption?.price ?? train.sale_price ?? 0),
    0,
  )
  const totalSeatPrice = selectedSeats.reduce(
    (totalPrice, seat) => totalPrice + Math.max(Number(seat.price ?? unitPriceSnapshot), 0),
    0,
  )

  return {
    success: true,
    message: 'Đã chuẩn bị dữ liệu chuyến tàu.',
    data: {
      end_at: train.arrival_at,
      options: {
        adult_count: adultCount,
        amenities: Array.isArray(train.details?.amenities) ? train.details.amenities : [],
        arrival_station: train.arrival_station,
        baggage_policy: train.details?.baggage_policy ?? '',
        carriage_type: train.carriage_type,
        child_count: childCount,
        departure_date:
          searchState.departure_date ?? String(train.departure_at ?? '').split('T')[0] ?? '',
        departure_station: train.departure_station,
        infant_count: infantCount,
        provider_name: train.provider_name,
        refund_policy: train.details?.refund_policy ?? '',
        return_date: searchState.return_date ?? '',
        route_label: `${train.departure_city} - ${train.arrival_city}`,
        seat_class: selectedSeatOption?.name ?? train.seat_class,
        seat_code: selectedSeats.map((seat) => seat.code).join(', '),
        seat_codes: selectedSeats.map((seat) => seat.code),
        seat_id: selectedSeats[0]?.id ?? '',
        seat_ids: selectedSeats.map((seat) => seat.id),
        seat_option_id: selectedSeatOption?.id ?? '',
        seat_option_name: selectedSeatOption?.name ?? train.seat_class,
        selected_seat_code: selectedSeats.map((seat) => seat.code).join(', '),
        selected_seat_codes: selectedSeats.map((seat) => seat.code),
        selected_seat_id: selectedSeats[0]?.id ?? '',
        selected_seat_ids: selectedSeats.map((seat) => seat.id),
        selected_seat_number: selectedSeats.map((seat) => seat.number).join(', '),
        selected_seat_numbers: selectedSeats.map((seat) => seat.number),
        selected_seat_option_id: selectedSeatOption?.id ?? '',
        selected_seat_option_name: selectedSeatOption?.name ?? train.seat_class,
        selected_seat_price: totalSeatPrice,
        service_fee: Math.max(Number(train.payment_summary?.service_fee ?? 0), 0),
        total_amount:
          totalSeatPrice + Math.max(Number(train.payment_summary?.service_fee ?? 0), 0),
        train_name: train.train_name,
        train_number: train.train_number,
        trip_type: searchState.trip_type ?? DEFAULT_TRAIN_TRIP_TYPE,
      },
      quantity: selectedSeats.length,
      reference_id: train.reference_id,
      service_id: train.service_id ?? train.id,
      service_type: SERVICE_TYPES.train,
      start_at: train.departure_at,
      unit_price_snapshot: unitPriceSnapshot,
    },
  }
}
