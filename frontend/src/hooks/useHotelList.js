import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  DEFAULT_HOTEL_PAGE_SIZE,
  DEFAULT_HOTEL_SEARCH_VALUES,
  DEFAULT_HOTEL_SORT,
  HOTEL_SORT_OPTIONS,
} from '../constants/hotels.js'
import { mapHotelSummaryToCardView } from '../mappers/hotelMappers.generated.js'
import { listHotels } from '../repositories/hotelRepository.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import usePublicSession from './usePublicSession.js'
import {
  buildPublicAuthPath,
  getPublicAuthQueryValue,
} from '../utils/publicNavigation.js'

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
    location: searchParams.get('location') ?? DEFAULT_HOTEL_SEARCH_VALUES.location,
    checkin: searchParams.get('checkin') ?? DEFAULT_HOTEL_SEARCH_VALUES.checkin,
    checkout: searchParams.get('checkout') ?? DEFAULT_HOTEL_SEARCH_VALUES.checkout,
  }
}

function createInitialAppliedSearchState(searchParams) {
  if (
    searchParams.get('location') ||
    searchParams.get('checkin') ||
    searchParams.get('checkout')
  ) {
    return {
      location: searchParams.get('location') ?? '',
      checkin: searchParams.get('checkin') ?? '',
      checkout: searchParams.get('checkout') ?? '',
    }
  }

  return {
    location: '',
    checkin: '',
    checkout: '',
  }
}

function createInitialFilterState(searchParams) {
  return {
    sidebarLocation: searchParams.get('destination') ?? '',
    priceRanges: parseArraySearchParam(searchParams, 'prices'),
    durations: parseArraySearchParam(searchParams, 'durations'),
    starRatings: parseArraySearchParam(searchParams, 'stars'),
  }
}

function buildHotelSearchParams({
  auth: _auth = '',
  location = '',
  checkin = '',
  checkout = '',
  sidebarLocation = '',
  prices = [],
  durations = [],
  stars = [],
  sort = DEFAULT_HOTEL_SORT,
  page = 1,
} = {}) {
  const nextSearchParams = new URLSearchParams()

  if (location.trim()) {
    nextSearchParams.set('location', location.trim())
  }

  if (checkin.trim()) {
    nextSearchParams.set('checkin', checkin.trim())
  }

  if (checkout.trim()) {
    nextSearchParams.set('checkout', checkout.trim())
  }

  if (sidebarLocation.trim()) {
    nextSearchParams.set('destination', sidebarLocation.trim())
  }

  if (prices.length) {
    nextSearchParams.set('prices', prices.join(','))
  }

  if (durations.length) {
    nextSearchParams.set('durations', durations.join(','))
  }

  if (stars.length) {
    nextSearchParams.set('stars', stars.join(','))
  }

  if (sort && sort !== DEFAULT_HOTEL_SORT) {
    nextSearchParams.set('sort', sort)
  }

  if (page > 1) {
    nextSearchParams.set('page', String(page))
  }

  return nextSearchParams
}

export default function useHotelList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { isCustomer } = usePublicSession()

  const [searchDraft, setSearchDraft] = useState(() => createInitialSearchState(searchParams))
  const [appliedSearch, setAppliedSearch] = useState(() =>
    createInitialAppliedSearchState(searchParams),
  )
  const [filterDraft, setFilterDraft] = useState(() => createInitialFilterState(searchParams))
  const [appliedFilters, setAppliedFilters] = useState(() =>
    createInitialFilterState(searchParams),
  )
  const [selectedSort, setSelectedSort] = useState(
    () => searchParams.get('sort') ?? DEFAULT_HOTEL_SORT,
  )
  const [currentPage, setCurrentPage] = useState(() => Number(searchParams.get('page') ?? 1))
  const [favoriteIds, setFavoriteIds] = useState([])
  const [responseState, setResponseState] = useState({
    data: [],
    meta: {
      page: 1,
      limit: DEFAULT_HOTEL_PAGE_SIZE,
      total: 0,
      total_pages: 1,
      has_next: false,
    },
  })
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isActive = true

    async function loadHotels() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await listHotels({
          location: appliedSearch.location,
          checkin: appliedSearch.checkin,
          checkout: appliedSearch.checkout,
          destination: appliedFilters.sidebarLocation,
          priceRanges: appliedFilters.priceRanges,
          durations: appliedFilters.durations,
          starRatings: appliedFilters.starRatings,
          sort: selectedSort,
          page: currentPage,
          limit: DEFAULT_HOTEL_PAGE_SIZE,
        })

        if (!isActive) {
          return
        }

        setResponseState({
          data: Array.isArray(response.data) ? response.data : [],
          meta: response.meta ?? {
            page: 1,
            limit: DEFAULT_HOTEL_PAGE_SIZE,
            total: 0,
            total_pages: 1,
            has_next: false,
          },
        })
      } catch (error) {
        if (!isActive) {
          return
        }

        setErrorMessage(error?.message ?? 'Không thể tải danh sách khách sạn lúc này.')
        setResponseState((currentState) => ({
          ...currentState,
          data: [],
        }))
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadHotels()

    return () => {
      isActive = false
    }
  }, [appliedFilters, appliedSearch, currentPage, selectedSort])

  function syncSearchParams({
    nextSearch = appliedSearch,
    nextFilters = appliedFilters,
    nextSort = selectedSort,
    nextPage = currentPage,
  } = {}) {
    setSearchParams(
      buildHotelSearchParams({
        auth: getPublicAuthQueryValue(isCustomer),
        location: nextSearch.location,
        checkin: nextSearch.checkin,
        checkout: nextSearch.checkout,
        sidebarLocation: nextFilters.sidebarLocation,
        prices: nextFilters.priceRanges,
        durations: nextFilters.durations,
        stars: nextFilters.starRatings,
        sort: nextSort,
        page: nextPage,
      }),
    )
  }

  function handleSearchFieldChange(name, value) {
    setSearchDraft((currentDraft) => ({
      ...currentDraft,
      [name]: value,
    }))
  }

  function handleApplySearch() {
    const nextSearch = { ...searchDraft }
    setAppliedSearch(nextSearch)
    setCurrentPage(1)
    syncSearchParams({ nextSearch, nextPage: 1 })
  }

  function handleSidebarLocationChange(event) {
    const { value } = event.target

    setFilterDraft((currentDraft) => ({
      ...currentDraft,
      sidebarLocation: value,
    }))
  }

  function handleToggleFilter(filterKey, value) {
    setFilterDraft((currentDraft) => ({
      ...currentDraft,
      [filterKey]: currentDraft[filterKey].includes(value)
        ? currentDraft[filterKey].filter((currentValue) => currentValue !== value)
        : [...currentDraft[filterKey], value],
    }))
  }

  function handleApplyFilters() {
    const nextFilters = {
      ...filterDraft,
      priceRanges: [...filterDraft.priceRanges],
      durations: [...filterDraft.durations],
      starRatings: [...filterDraft.starRatings],
    }

    setAppliedFilters(nextFilters)
    setCurrentPage(1)
    syncSearchParams({ nextFilters, nextPage: 1 })
  }

  function handleSortChange(event) {
    const nextSort = event.target.value
    setSelectedSort(nextSort)
    setCurrentPage(1)
    syncSearchParams({ nextSort, nextPage: 1 })
  }

  function handlePageChange(nextPage) {
    setCurrentPage(nextPage)
    syncSearchParams({ nextPage })
  }

  function handleToggleFavorite(hotelId) {
    setFavoriteIds((currentIds) =>
      currentIds.includes(hotelId)
        ? currentIds.filter((currentId) => currentId !== hotelId)
        : [...currentIds, hotelId],
    )
  }

  const visibleHotels = useMemo(
    () =>
      responseState.data.map((hotel) =>
        mapHotelSummaryToCardView(hotel, {
          detailPath: buildPublicAuthPath(`/hotels/${hotel.slug}`, isCustomer),
        }),
      ),
    [isCustomer, responseState.data],
  )
  const totalPages = responseState.meta.total_pages ?? 1
  const safeCurrentPage = responseState.meta.page ?? currentPage
  const breadcrumbHomePath = buildPublicAuthPath('/', isCustomer)
  const resultSummary = useMemo(() => {
    if (isLoading) {
      return 'Đang tải danh sách khách sạn...'
    }

    if (!responseState.meta.total) {
      return 'Chưa có khách sạn phù hợp với bộ lọc hiện tại.'
    }

    return `Hiển thị ${visibleHotels.length} trong ${responseState.meta.total} khách sạn nổi bật`
  }, [isLoading, responseState.meta.total, visibleHotels.length])

  return {
    breadcrumbHomePath,
    currentPage: safeCurrentPage,
    errorMessage,
    favoriteIds,
    filterDraft,
    formatCurrency: formatCurrencyVND,
    handleApplyFilters,
    handleApplySearch,
    handlePageChange,
    handleSearchFieldChange,
    handleSidebarLocationChange,
    handleSortChange,
    handleToggleFavorite,
    handleToggleFilter,
    isLoading,
    resultSummary,
    searchDraft,
    selectedSort,
    sortOptions: HOTEL_SORT_OPTIONS,
    totalPages,
    visibleHotels,
  }
}
