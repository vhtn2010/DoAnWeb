import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import {
  DEFAULT_TRAIN_PAGE_SIZE,
  DEFAULT_TRAIN_PASSENGERS,
  DEFAULT_TRAIN_SEARCH_STATE,
  DEFAULT_TRAIN_SORT,
  TRAIN_SORT_OPTIONS,
} from '../constants/trains.js'
import { mapTrainToCardView } from '../mappers/trainMappers.js'
import {
  buildTrainSearchParams,
  getTrainSearchDefaults,
  listTrains,
} from '../repositories/trainRepository.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

const EMPTY_META = Object.freeze({
  page: 1,
  limit: DEFAULT_TRAIN_PAGE_SIZE,
  total: 0,
  total_display: 0,
  total_pages: 1,
  has_next: false,
})

const EMPTY_DEFAULTS = Object.freeze({
  trip_types: [],
  stations: [],
  default_passengers: DEFAULT_TRAIN_PASSENGERS,
  sort_options: TRAIN_SORT_OPTIONS,
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

function buildAuthAwarePath(path, isCustomer) {
  if (!isCustomer) {
    return path
  }

  const [pathname, queryString = ''] = String(path ?? '').split('?')
  const nextSearchParams = new URLSearchParams(queryString)
  nextSearchParams.set('auth', ROLES.customer)

  return `${pathname}?${nextSearchParams.toString()}`
}

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

function createInitialSearchState(searchParams) {
  return {
    trip_type: searchParams.get('trip_type') ?? DEFAULT_TRAIN_SEARCH_STATE.trip_type,
    from_station: searchParams.get('from') ?? DEFAULT_TRAIN_SEARCH_STATE.from_station,
    to_station: searchParams.get('to') ?? DEFAULT_TRAIN_SEARCH_STATE.to_station,
    departure_date:
      searchParams.get('departure_date') ?? DEFAULT_TRAIN_SEARCH_STATE.departure_date,
    return_date: searchParams.get('return_date') ?? DEFAULT_TRAIN_SEARCH_STATE.return_date,
    passengers: {
      adults: Number(searchParams.get('adults') ?? DEFAULT_TRAIN_PASSENGERS.adults),
      children: Number(searchParams.get('children') ?? DEFAULT_TRAIN_PASSENGERS.children),
      infants: Number(searchParams.get('infants') ?? DEFAULT_TRAIN_PASSENGERS.infants),
    },
  }
}

function createInitialFilterState(searchParams) {
  return {
    train_types: parseArraySearchParam(searchParams, 'types'),
    price_ranges: parseArraySearchParam(searchParams, 'prices'),
    departure_windows: parseArraySearchParam(searchParams, 'departure_windows'),
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
    return ''
  }

  const nextDate = new Date(baseDate)
  nextDate.setDate(nextDate.getDate() + days)

  return createDateKey(nextDate)
}

function getStationLabel(stations, stationCode) {
  const station = stations.find((item) => item.code === stationCode)
  return station?.city ?? stationCode ?? '---'
}

export default function useTrainList() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
  const isCustomer = authState === ROLES.customer

  const [searchState, setSearchState] = useState(() => createInitialSearchState(searchParams))
  const [draftFilters, setDraftFilters] = useState(() => createInitialFilterState(searchParams))
  const [appliedFilters, setAppliedFilters] = useState(() => createInitialFilterState(searchParams))
  const [selectedSort, setSelectedSort] = useState(
    () => searchParams.get('sort') ?? DEFAULT_TRAIN_SORT,
  )
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page') ?? 1))
  const [defaults, setDefaults] = useState(EMPTY_DEFAULTS)
  const [trains, setTrains] = useState([])
  const [meta, setMeta] = useState(EMPTY_META)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())
  const [selectedTrainId, setSelectedTrainId] = useState('')
  const [reloadSeed, setReloadSeed] = useState(0)

  useEffect(() => {
    let isActive = true

    async function loadDefaults() {
      try {
        const response = await getTrainSearchDefaults()

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

    async function loadTrains() {
      setLoading(true)
      setError('')

      try {
        const response = await listTrains({
          trip_type: searchState.trip_type,
          from_station: searchState.from_station,
          to_station: searchState.to_station,
          departure_date: searchState.departure_date,
          return_date: searchState.return_date,
          passengers: searchState.passengers,
          train_types: appliedFilters.train_types,
          price_ranges: appliedFilters.price_ranges,
          departure_windows: appliedFilters.departure_windows,
          sort: selectedSort,
          page: currentPage,
          limit: DEFAULT_TRAIN_PAGE_SIZE,
        })

        if (!isActive) {
          return
        }

        const mappedTrains = Array.isArray(response.data)
          ? response.data.map(mapTrainToCardView)
          : []

        setTrains((currentTrains) => {
          if (currentPage <= 1) {
            return mappedTrains
          }

          const existingIds = new Set(currentTrains.map((train) => train.id))
          const nextTrains = mappedTrains.filter((train) => !existingIds.has(train.id))

          return [...currentTrains, ...nextTrains]
        })
        setMeta(response.meta ?? EMPTY_META)
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setTrains([])
        setMeta(EMPTY_META)
        setError(loadError?.message ?? 'Không thể tải danh sách chuyến tàu lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadTrains()

    return () => {
      isActive = false
    }
  }, [appliedFilters, currentPage, reloadSeed, searchState, selectedSort])

  function preserveAuthQuery(path) {
    return buildAuthAwarePath(path, isCustomer)
  }

  function syncSearchParams({
    nextSearchState = searchState,
    nextFilters = appliedFilters,
    nextSort = selectedSort,
    nextPage = currentPage,
  } = {}) {
    setSearchParams(
      buildTrainSearchParams({
        auth: isCustomer ? ROLES.customer : '',
        trip_type: nextSearchState.trip_type,
        from_station: nextSearchState.from_station,
        to_station: nextSearchState.to_station,
        departure_date: nextSearchState.departure_date,
        return_date: nextSearchState.return_date,
        adults: nextSearchState.passengers.adults,
        children: nextSearchState.passengers.children,
        infants: nextSearchState.passengers.infants,
        train_types: nextFilters.train_types,
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
          ? currentState.return_date || addDaysToDate(currentState.departure_date, 5)
          : '',
    }))
  }

  function submitSearch() {
    if (searchState.from_station === searchState.to_station) {
      setFeedback(createFeedbackState('error', 'Ga đi và ga đến cần khác nhau.'))
      return
    }

    if (!searchState.departure_date) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn ngày đi.'))
      return
    }

    if (
      searchState.trip_type === 'round_trip' &&
      (!searchState.departure_date || !searchState.return_date)
    ) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn đủ ngày đi và ngày về.'))
      return
    }

    setCurrentPage(1)
    setSelectedTrainId('')
    setFeedback(createFeedbackState('info', 'Đã cập nhật kết quả chuyến tàu theo lựa chọn của bạn.'))
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
      train_types: [...draftFilters.train_types],
      price_ranges: [...draftFilters.price_ranges],
      departure_windows: [...draftFilters.departure_windows],
    }

    setAppliedFilters(nextFilters)
    setCurrentPage(1)
    setSelectedTrainId('')
    syncSearchParams({ nextFilters, nextPage: 1 })
  }

  function setSort(eventOrValue) {
    const nextSort =
      typeof eventOrValue === 'string' ? eventOrValue : eventOrValue.target.value

    setSelectedSort(nextSort)
    setCurrentPage(1)
    setSelectedTrainId('')
    syncSearchParams({ nextSort, nextPage: 1 })
  }

  function resetFilters() {
    const emptyFilters = {
      train_types: [],
      price_ranges: [],
      departure_windows: [],
    }

    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
    setSelectedTrainId('')
    syncSearchParams({ nextFilters: emptyFilters, nextPage: 1 })
  }

  function setPage(nextPage) {
    if (nextPage === currentPage) {
      return
    }

    setCurrentPage(nextPage)
    syncSearchParams({ nextPage })
  }

  function selectTrain(train) {
    if (!train) {
      return
    }

    setSelectedTrainId(train.id)
    setFeedback(
      createFeedbackState('success', `Đã chọn chuyến ${train.train_number_label} để tiếp tục.`),
    )
  }

  function openTrainDetail(train = null) {
    const nextTrain =
      train ?? trains.find((currentTrain) => currentTrain.id === selectedTrainId) ?? null

    if (!nextTrain) {
      setFeedback(createFeedbackState('error', 'Không tìm thấy chuyến tàu để mở chi tiết.'))
      return
    }

    setSelectedTrainId(nextTrain.id)
    navigate(preserveAuthQuery(`/trains/${nextTrain.slug}`))
  }

  function retry() {
    setReloadSeed((currentValue) => currentValue + 1)
  }

  const resultSummary = useMemo(() => {
    return {
      total: meta.total_display ?? meta.total ?? 0,
      fromLabel: getStationLabel(defaults.stations, searchState.from_station),
      toLabel: getStationLabel(defaults.stations, searchState.to_station),
    }
  }, [
    defaults.stations,
    meta.total,
    meta.total_display,
    searchState.from_station,
    searchState.to_station,
  ])

  const selectedTrain = useMemo(() => {
    return trains.find((train) => train.id === selectedTrainId) ?? null
  }, [selectedTrainId, trains])

  return {
    applyFilters,
    currentPage: meta.page ?? currentPage,
    defaults,
    draftFilters,
    error,
    feedback,
    formatCurrency: formatCurrencyVND,
    hasMore: Boolean(meta.has_next),
    loading,
    openTrainDetail,
    preserveAuthQuery,
    resetFilters,
    resultSummary,
    retry,
    searchState,
    selectedSort,
    selectedTrain,
    selectedTrainId,
    setFilter,
    setPage,
    setSort,
    selectTrain,
    submitSearch,
    trains,
    updatePassengers,
    updateSearchField,
    updateTripType,
  }
}
