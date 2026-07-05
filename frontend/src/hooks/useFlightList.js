import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  DEFAULT_FLIGHT_PAGE_SIZE,
  DEFAULT_FLIGHT_PASSENGERS,
  DEFAULT_FLIGHT_SEARCH_STATE,
  DEFAULT_FLIGHT_SORT,
  DEFAULT_FLIGHT_TRIP_TYPE,
  FLIGHT_SORT_OPTIONS,
} from '../constants/flights.js'
import { mapFlightToCardView } from '../mappers/flightMappers.js'
import { ROLES } from '../constants/roles.js'
import { addCartItemPreview } from '../repositories/cartRepository.js'
import {
  buildFlightSearchParams,
  buildFlightSelectionPayload,
  getFlightSearchDefaults,
  listFlights,
} from '../repositories/flightRepository.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

const EMPTY_META = Object.freeze({
  page: 1,
  limit: DEFAULT_FLIGHT_PAGE_SIZE,
  total: 0,
  total_pages: 1,
  has_next: false,
})

const EMPTY_DEFAULTS = Object.freeze({
  trip_types: [],
  cabin_classes: [],
  default_passengers: DEFAULT_FLIGHT_PASSENGERS,
  airports: [],
  airlines: [],
  sort_options: FLIGHT_SORT_OPTIONS,
})

function parseArraySearchParam(searchParams, key) {
  const value = searchParams.get(key)

  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function createInitialSearchState(searchParams) {
  return {
    trip_type: searchParams.get('trip_type') ?? DEFAULT_FLIGHT_SEARCH_STATE.trip_type,
    from_location: searchParams.get('from') ?? DEFAULT_FLIGHT_SEARCH_STATE.from_location,
    to_location: searchParams.get('to') ?? DEFAULT_FLIGHT_SEARCH_STATE.to_location,
    departure_date:
      searchParams.get('departure_date') ?? DEFAULT_FLIGHT_SEARCH_STATE.departure_date,
    return_date: searchParams.get('return_date') ?? DEFAULT_FLIGHT_SEARCH_STATE.return_date,
    cabin_class: searchParams.get('cabin_class') ?? DEFAULT_FLIGHT_SEARCH_STATE.cabin_class,
    passengers: {
      adults: Number(searchParams.get('adults') ?? DEFAULT_FLIGHT_PASSENGERS.adults),
      children: Number(searchParams.get('children') ?? DEFAULT_FLIGHT_PASSENGERS.children),
      infants: Number(searchParams.get('infants') ?? DEFAULT_FLIGHT_PASSENGERS.infants),
    },
  }
}

function createInitialFilterState(searchParams) {
  return {
    airline_codes: parseArraySearchParam(searchParams, 'airlines'),
    price_ranges: parseArraySearchParam(searchParams, 'prices'),
    departure_windows: parseArraySearchParam(searchParams, 'departure_windows'),
  }
}

function buildAuthAwarePath(path, isCustomer) {
  return isCustomer ? `${path}?auth=customer` : path
}

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

function buildFlightCartItem({ flight, payload }) {
  return {
    id: `cart-item-flight-${Date.now()}`,
    service_id: payload.service_id,
    service_type: payload.service_type,
    reference_id: payload.reference_id,
    start_at: payload.start_at,
    end_at: payload.end_at,
    quantity: payload.quantity,
    unit_price_snapshot: payload.unit_price_snapshot,
    options: {
      ...(payload.options ?? {}),
    },
    created_at: new Date().toISOString(),
    service: {
      service_code: flight.service_code,
      title: `${flight.airline_name} ${flight.flight_number}`,
      slug: flight.slug,
      short_description: flight.short_description,
      location_text: `${flight.departure_city} - ${flight.arrival_city}`,
      image_url: flight.image_url,
      status: flight.status,
    },
  }
}

function formatResultLocation(airports, airportCode) {
  const airport = airports.find((item) => item.airport_code === airportCode)

  if (!airport) {
    return airportCode || '---'
  }

  if (airport.city === 'TP. Hồ Chí Minh') {
    return 'TP. HCM'
  }

  return airport.city
}

export default function useFlightList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
  const isCustomer = authState === ROLES.customer

  const [searchState, setSearchState] = useState(() => createInitialSearchState(searchParams))
  const [draftFilters, setDraftFilters] = useState(() => createInitialFilterState(searchParams))
  const [appliedFilters, setAppliedFilters] = useState(() => createInitialFilterState(searchParams))
  const [selectedSort, setSelectedSort] = useState(
    () => searchParams.get('sort') ?? DEFAULT_FLIGHT_SORT,
  )
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page') ?? 1))
  const [defaults, setDefaults] = useState(EMPTY_DEFAULTS)
  const [flights, setFlights] = useState([])
  const [meta, setMeta] = useState(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())
  const [selectedFlightId, setSelectedFlightId] = useState('')
  const [reloadSeed, setReloadSeed] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadDefaults() {
      try {
        const response = await getFlightSearchDefaults()

        if (!isActive || !response.success || !response.data) {
          return
        }

        setDefaults(response.data)
      } catch {
        if (isActive) {
          setDefaults(EMPTY_DEFAULTS)
        }
      }
    }

    loadDefaults()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadFlights() {
      setLoading(true)
      setError('')

      try {
        const response = await listFlights({
          trip_type: searchState.trip_type,
          from_location: searchState.from_location,
          to_location: searchState.to_location,
          departure_date: searchState.departure_date,
          return_date: searchState.return_date,
          cabin_class: searchState.cabin_class,
          passengers: searchState.passengers,
          airline_codes: appliedFilters.airline_codes,
          price_ranges: appliedFilters.price_ranges,
          departure_windows: appliedFilters.departure_windows,
          sort: selectedSort,
          page: currentPage,
          limit: DEFAULT_FLIGHT_PAGE_SIZE,
        })

        if (!isActive) {
          return
        }

        const mappedFlights = Array.isArray(response.data)
          ? response.data.map(mapFlightToCardView)
          : []

        setFlights((currentFlights) => {
          if (currentPage <= 1) {
            return mappedFlights
          }

          const existingIds = new Set(currentFlights.map((flight) => flight.id))
          const nextFlights = mappedFlights.filter((flight) => !existingIds.has(flight.id))

          return [...currentFlights, ...nextFlights]
        })
        setMeta(response.meta ?? EMPTY_META)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setFlights([])
        setMeta(EMPTY_META)
        setError(loadError?.message ?? 'Không thể tải danh sách chuyến bay lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadFlights()

    return () => {
      isActive = false
    }
  }, [appliedFilters, currentPage, reloadSeed, searchState, selectedSort])

  function syncSearchParams({
    nextSearchState = searchState,
    nextFilters = appliedFilters,
    nextSort = selectedSort,
    nextPage = currentPage,
  } = {}) {
    setSearchParams(
      buildFlightSearchParams({
        auth: isCustomer ? ROLES.customer : '',
        trip_type: nextSearchState.trip_type,
        from_location: nextSearchState.from_location,
        to_location: nextSearchState.to_location,
        departure_date: nextSearchState.departure_date,
        return_date: nextSearchState.return_date,
        adults: nextSearchState.passengers.adults,
        children: nextSearchState.passengers.children,
        infants: nextSearchState.passengers.infants,
        cabin_class: nextSearchState.cabin_class,
        airline_codes: nextFilters.airline_codes,
        price_ranges: nextFilters.price_ranges,
        departure_windows: nextFilters.departure_windows,
        sort: nextSort,
        page: nextPage,
      }),
    )
  }

  function updateSearchField(fieldName, value) {
    setSearchState((currentState) => ({
      ...currentState,
      [fieldName]: value,
    }))
  }

  function updatePassengers(type, value) {
    setSearchState((currentState) => ({
      ...currentState,
      passengers: {
        ...currentState.passengers,
        [type]: Math.max(Number(value) || 0, type === 'adults' ? 1 : 0),
      },
    }))
  }

  function updateTripType(tripType) {
    setSearchState((currentState) => ({
      ...currentState,
      trip_type: tripType,
      return_date:
        tripType === 'round_trip'
          ? currentState.return_date || DEFAULT_FLIGHT_SEARCH_STATE.return_date
          : '',
    }))
  }

  function submitSearch() {
    if (searchState.from_location === searchState.to_location) {
      setFeedback(createFeedbackState('error', 'Điểm đi và điểm đến cần khác nhau.'))
      return
    }

    if (
      searchState.trip_type === DEFAULT_FLIGHT_TRIP_TYPE &&
      !searchState.departure_date
    ) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn ngày đi.'))
      return
    }

    if (
      searchState.trip_type !== DEFAULT_FLIGHT_TRIP_TYPE &&
      (!searchState.departure_date || !searchState.return_date)
    ) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn đủ ngày đi và ngày về.'))
      return
    }

    setCurrentPage(1)
    setSelectedFlightId('')
    setFeedback(
      createFeedbackState(
        'info',
        searchState.trip_type === 'round_trip'
          ? 'Đang hiển thị chặng đi trước trong dữ liệu mock cho hành trình khứ hồi.'
          : 'Đã cập nhật kết quả chuyến bay theo lựa chọn của bạn.',
      ),
    )
    syncSearchParams({ nextPage: 1 })
  }

  function setFilter(filterKey, value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: currentFilters[filterKey].includes(value)
        ? currentFilters[filterKey].filter((item) => item !== value)
        : [...currentFilters[filterKey], value],
    }))
  }

  function applyFilters() {
    const nextFilters = {
      airline_codes: [...draftFilters.airline_codes],
      price_ranges: [...draftFilters.price_ranges],
      departure_windows: [...draftFilters.departure_windows],
    }

    setAppliedFilters(nextFilters)
    setCurrentPage(1)
    setSelectedFlightId('')
    syncSearchParams({ nextFilters, nextPage: 1 })
  }

  function setSort(eventOrValue) {
    const nextSort =
      typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value

    setSelectedSort(nextSort)
    setCurrentPage(1)
    setSelectedFlightId('')
    syncSearchParams({ nextSort, nextPage: 1 })
  }

  function resetFilters() {
    const emptyFilters = {
      airline_codes: [],
      price_ranges: [],
      departure_windows: [],
    }

    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
    setSelectedFlightId('')
    syncSearchParams({ nextFilters: emptyFilters, nextPage: 1 })
  }

  function setPage(nextPage) {
    if (nextPage === currentPage) {
      return
    }

    setCurrentPage(nextPage)
    syncSearchParams({ nextPage })
  }

  function selectFlight(flight) {
    setSelectedFlightId(flight.id)
    setFeedback(createFeedbackState('success', `Đã chọn chuyến ${flight.flight_number_label} để tiếp tục.`))
  }

  function goToFlightDetail(flight) {
    setSelectedFlightId(flight.id)
    setFeedback(
      createFeedbackState(
        'info',
        'Màn chi tiết chuyến bay sẽ được thực hiện ở task sau. Bạn vẫn có thể đặt vé mock ngay từ danh sách.',
      ),
    )
  }

  async function continueBookingMock(flight) {
    const selectedFlight = flight ?? flights.find((item) => item.id === selectedFlightId)

    if (!selectedFlight) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn một chuyến bay trước khi tiếp tục.'))
      return
    }

    const payloadResponse = await buildFlightSelectionPayload(selectedFlight, searchState)

    if (!payloadResponse.success || !payloadResponse.data) {
      setFeedback(createFeedbackState('error', payloadResponse.message ?? 'Không thể chuẩn bị dữ liệu chuyến bay mock.'))
      return
    }

    await addCartItemPreview({
      authState,
      item: buildFlightCartItem({
        flight: selectedFlight,
        payload: payloadResponse.data,
      }),
    })

    navigate(buildAuthAwarePath('/cart', isCustomer))
  }

  function retry() {
    setReloadSeed((currentValue) => currentValue + 1)
  }

  const resultSummary = useMemo(() => {
    return {
      total: meta.total ?? 0,
      fromLabel: formatResultLocation(defaults.airports, searchState.from_location),
      toLabel: formatResultLocation(defaults.airports, searchState.to_location),
    }
  }, [defaults.airports, meta.total, searchState.from_location, searchState.to_location])

  return {
    applyFilters,
    currentPage: meta.page ?? currentPage,
    defaults,
    draftFilters,
    error,
    feedback,
    flights,
    formatCurrency: formatCurrencyVND,
    goToFlightDetail,
    continueBookingMock,
    hasMore: Boolean(meta.has_next),
    loading,
    resetFilters,
    resultSummary,
    retry,
    searchState,
    selectFlight,
    selectedFlightId,
    selectedSort,
    setFilter,
    setPage,
    setSort,
    submitSearch,
    updatePassengers,
    updateSearchField,
    updateTripType,
  }
}
