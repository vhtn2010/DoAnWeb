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
import usePublicSession from './usePublicSession.js'
import {
  buildFlightSearchParams,
  getFlightSearchDefaults,
  listFlights,
} from '../repositories/flightRepository.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import {
  buildPublicAuthPath,
  getPublicAuthQueryValue,
} from '../utils/publicNavigation.js'

const EMPTY_META = Object.freeze({
  page: 1,
  limit: DEFAULT_FLIGHT_PAGE_SIZE,
  total: 0,
  total_display: 0,
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

function pickSingleFilterValue(value = []) {
  return Array.isArray(value) && value.length ? [value[0]] : []
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
    airline_codes: pickSingleFilterValue(parseArraySearchParam(searchParams, 'airlines')),
    price_ranges: pickSingleFilterValue(parseArraySearchParam(searchParams, 'prices')),
    departure_windows: pickSingleFilterValue(
      parseArraySearchParam(searchParams, 'departure_windows'),
    ),
    stop_counts: pickSingleFilterValue(parseArraySearchParam(searchParams, 'stops')),
  }
}

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

function createDateFromKey(dateKey) {
  if (!dateKey) {
    return null
  }

  const [year, month, day] = String(dateKey)
    .split('-')
    .map((value) => Number(value))

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day, 12)
}

function createDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}

function addDaysToDate(dateKey, days) {
  const baseDate = createDateFromKey(dateKey)

  if (!baseDate) {
    return DEFAULT_FLIGHT_SEARCH_STATE.return_date
  }

  const nextDate = new Date(baseDate)
  nextDate.setDate(nextDate.getDate() + days)

  return createDateKey(nextDate)
}

function formatResultLocation(airports, airportCode) {
  const airport = airports.find((item) => item.airport_code === airportCode)

  if (!airport) {
    return airportCode || '---'
  }

  if (airport.code === 'SGN' || airport.airport_code === 'SGN') {
    return 'TP. HCM'
  }

  return airport.province || airport.city
}

export default function useFlightList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { isCustomer } = usePublicSession()

  const [searchState, setSearchState] = useState(() => createInitialSearchState(searchParams))
  const [appliedSearchState, setAppliedSearchState] = useState(() =>
    createInitialSearchState(searchParams),
  )
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
          trip_type: appliedSearchState.trip_type,
          from_location: appliedSearchState.from_location,
          to_location: appliedSearchState.to_location,
          departure_date: appliedSearchState.departure_date,
          return_date: appliedSearchState.return_date,
          cabin_class: appliedSearchState.cabin_class,
          passengers: appliedSearchState.passengers,
          airline_codes: appliedFilters.airline_codes,
          price_ranges: appliedFilters.price_ranges,
          departure_windows: appliedFilters.departure_windows,
          stop_counts: appliedFilters.stop_counts,
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

        setFlights(mappedFlights)
        if (Array.isArray(response.meta?.airlines)) {
          setDefaults((currentDefaults) => ({
            ...currentDefaults,
            airlines: response.meta.airlines,
          }))
        }
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
  }, [appliedFilters, appliedSearchState, currentPage, reloadSeed, selectedSort])

  function preserveAuthQuery(path) {
    return buildPublicAuthPath(path, isCustomer)
  }

  function syncSearchParams({
    nextSearchState = appliedSearchState,
    nextFilters = appliedFilters,
    nextSort = selectedSort,
    nextPage = currentPage,
  } = {}) {
    setSearchParams(
      buildFlightSearchParams({
        auth: getPublicAuthQueryValue(isCustomer),
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
        stop_counts: nextFilters.stop_counts,
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
          ? currentState.return_date || addDaysToDate(currentState.departure_date, 5)
          : '',
    }))
  }

  function submitSearch() {
    if (
      searchState.from_location &&
      searchState.to_location &&
      searchState.from_location === searchState.to_location
    ) {
      setFeedback(createFeedbackState('error', 'Điểm đi và điểm đến cần khác nhau.'))
      return
    }

    if (
      searchState.trip_type === DEFAULT_FLIGHT_TRIP_TYPE &&
      searchState.return_date &&
      !searchState.departure_date
    ) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn ngày đi.'))
      return
    }

    if (
      searchState.trip_type !== DEFAULT_FLIGHT_TRIP_TYPE &&
      (searchState.return_date && !searchState.departure_date)
    ) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn đủ ngày đi và ngày về.'))
      return
    }

    setCurrentPage(1)
    setAppliedSearchState(searchState)
    setSelectedFlightId('')
    setFeedback(createFeedbackState('info', 'Đã cập nhật kết quả chuyến bay theo lựa chọn của bạn.'))
    syncSearchParams({ nextPage: 1, nextSearchState: searchState })
  }

  function setFilter(filterKey, value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]:
        currentFilters[filterKey].length === 1 && currentFilters[filterKey][0] === value
          ? []
          : [value],
    }))
  }

  function applyFilters() {
    const nextFilters = {
      airline_codes: pickSingleFilterValue(draftFilters.airline_codes),
      price_ranges: pickSingleFilterValue(draftFilters.price_ranges),
      departure_windows: pickSingleFilterValue(draftFilters.departure_windows),
      stop_counts: pickSingleFilterValue(draftFilters.stop_counts),
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
      stop_counts: [],
    }

    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
    setSelectedFlightId('')
    syncSearchParams({ nextFilters: emptyFilters, nextPage: 1 })
  }

  function setPage(nextPage) {
    const maxPage = Math.max(1, Number(meta.total_pages) || 1)

    if (nextPage < 1 || nextPage > maxPage || nextPage === currentPage) {
      return
    }

    setSelectedFlightId('')
    setCurrentPage(nextPage)
    syncSearchParams({ nextPage })
  }

  function selectFlight(flight) {
    setSelectedFlightId(flight.id)
    setFeedback(
      createFeedbackState('success', `Đã chọn chuyến ${flight.flight_number_label} để tiếp tục.`),
    )
  }

  function openFlightDetail(flight) {
    if (!flight) {
      return
    }

    setSelectedFlightId(flight.id)
    navigate(preserveAuthQuery(flight.detail_path ?? `/flights/${flight.slug}`))
  }

  function retry() {
    setReloadSeed((currentValue) => currentValue + 1)
  }

  const resultSummary = useMemo(() => {
    return {
      total: meta.total_display ?? meta.total ?? 0,
      fromLabel: formatResultLocation(defaults.airports, appliedSearchState.from_location),
      toLabel: formatResultLocation(defaults.airports, appliedSearchState.to_location),
    }
  }, [
    defaults.airports,
    meta.total,
    meta.total_display,
    appliedSearchState.from_location,
    appliedSearchState.to_location,
  ])

  return {
    applyFilters,
    currentPage: meta.page ?? currentPage,
    defaults,
    draftFilters,
    error,
    feedback,
    flights,
    formatCurrency: formatCurrencyVND,
    loading,
    openFlightDetail,
    preserveAuthQuery,
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
    totalPages: meta.total_pages ?? 1,
    updatePassengers,
    updateSearchField,
    updateTripType,
  }
}
