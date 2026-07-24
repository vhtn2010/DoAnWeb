import { useEffect, useMemo, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  DEFAULT_HOTEL_PAGE_SIZE,
  DEFAULT_HOTEL_SORT,
  HOTEL_SORT_OPTIONS,
} from '../constants/hotels.js'
import { mapHotelSummaryToCardView } from '../mappers/hotelMappers.generated.js'
import { listHotels } from '../repositories/hotelRepository.js'
import useFavorites from './useFavorites.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import usePublicSession from './usePublicSession.js'
import {
  buildPublicAuthPath,
  getPublicAuthQueryValue,
} from '../utils/publicNavigation.js'
import {
  buildFavoriteItem,
  buildFavoriteKey,
  buildFavoriteSourcePath,
  getFavoriteSourceLabel,
} from '../services/favoriteStorage.js'

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
    location: searchParams.get('location') ?? '',
    checkin: searchParams.get('checkin') ?? '',
    checkout: searchParams.get('checkout') ?? '',
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
    priceRanges: pickSingleFilterValue(parseArraySearchParam(searchParams, 'prices')),
    starRatings: pickSingleFilterValue(parseArraySearchParam(searchParams, 'stars')),
  }
}

function buildHotelSearchParams({
  auth: _auth = '',
  location = '',
  checkin = '',
  checkout = '',
  sidebarLocation = '',
  prices = [],
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
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { currentUser, isCustomer } = usePublicSession()
  const { hasFavorite, toggleFavorite } = useFavorites({ currentUser })

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
      [filterKey]:
        currentDraft[filterKey].length === 1 && currentDraft[filterKey][0] === value
          ? []
          : [value],
    }))
  }

  function handleApplyFilters() {
    const nextFilters = {
      ...filterDraft,
      priceRanges: pickSingleFilterValue(filterDraft.priceRanges),
      starRatings: pickSingleFilterValue(filterDraft.starRatings),
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

  function handleToggleFavorite(hotel) {
    toggleFavorite(buildFavoriteItem({
      favorite_key: buildFavoriteKey('hotel', hotel.service_id ?? hotel.id ?? hotel.slug),
      service_type: 'hotel',
      service_id: hotel.service_id ?? hotel.id ?? '',
      slug: hotel.slug,
      title: hotel.title,
      image_url: hotel.image_url,
      detail_path: hotel.detail_path ?? `/hotels/${hotel.slug}`,
      source_path: buildFavoriteSourcePath(location),
      source_label: getFavoriteSourceLabel('hotel'),
      summary: hotel.displayAddress ?? hotel.address ?? '',
      location_text: hotel.location_text ?? hotel.displayAddress ?? hotel.address ?? '',
    }))
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
  const favoriteIds = useMemo(
    () =>
      visibleHotels
        .filter((hotel) => hasFavorite(buildFavoriteKey('hotel', hotel.service_id ?? hotel.id ?? hotel.slug)))
        .map((hotel) => hotel.id),
    [hasFavorite, visibleHotels],
  )
  const breadcrumbHomePath = buildPublicAuthPath('/', isCustomer)
  const resultSummary = useMemo(() => {
    if (isLoading) {
      return ''
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
