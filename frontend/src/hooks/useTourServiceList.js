import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import {
  DEFAULT_TOUR_LIMIT,
  DEFAULT_TOUR_SORT,
  TOUR_CATEGORY_FILTER_OPTIONS,
  TOUR_DURATION_FILTER_OPTIONS,
  TOUR_PRICE_FILTER_OPTIONS,
  TOUR_SORT_OPTIONS,
} from '../constants/tours.js'
import {
  getTourServiceCatalog,
  listTourServices,
} from '../repositories/publicServiceRepository.js'
import { mapTourServiceToView } from '../mappers/serviceMappers.js'

const MAX_CLIENT_TOUR_RESULTS = 50

const DEFAULT_TOUR_LIST_META = Object.freeze({
  page: 1,
  limit: DEFAULT_TOUR_LIMIT,
  total: 0,
  total_pages: 1,
  has_next: false,
})

const DEFAULT_TOUR_CATALOG = Object.freeze({
  knownLocations: new Map(),
  sortOptions: TOUR_SORT_OPTIONS,
  supportsTour: true,
})

function createEmptyFilters() {
  return {
    keyword: '',
    prices: [],
    durations: [],
    categories: [],
  }
}

function humanizeQueryValue(value) {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function buildFiltersFromSearchParams(searchParams) {
  const nextFilters = createEmptyFilters()
  const locationValue = searchParams.get('location') ?? searchParams.get('to') ?? ''

  if (locationValue) {
    nextFilters.keyword = humanizeQueryValue(locationValue)
  }

  return nextFilters
}

function buildSortFromSearchParams(searchParams) {
  return searchParams.get('sort') ?? DEFAULT_TOUR_SORT
}

function buildPageFromSearchParams(searchParams) {
  const parsedPage = Number.parseInt(searchParams.get('page') ?? '1', 10)

  if (!Number.isInteger(parsedPage) || parsedPage < 1) {
    return 1
  }

  return parsedPage
}

function buildAuthAwarePath(path, isCustomer) {
  return isCustomer ? `${path}?auth=customer` : path
}

function buildServiceListSearchParams({
  auth = '',
  keyword = '',
  page = 1,
  sort = DEFAULT_TOUR_SORT,
} = {}) {
  const nextSearchParams = new URLSearchParams()

  if (auth) {
    nextSearchParams.set('auth', auth)
  }

  if (keyword.trim()) {
    nextSearchParams.set('location', keyword.trim())
  }

  if (sort && sort !== DEFAULT_TOUR_SORT) {
    nextSearchParams.set('sort', sort)
  }

  if (page > 1) {
    nextSearchParams.set('page', String(page))
  }

  return nextSearchParams
}

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim()
}

function resolvePriceQuery(priceRanges = []) {
  if (!priceRanges.length) {
    return {
      maxPrice: null,
      minPrice: null,
      needsClientFilter: false,
    }
  }

  const priceRangeMap = {
    'under-2m': {
      maxPrice: 1999999,
      minPrice: null,
    },
    '2-5m': {
      maxPrice: 5000000,
      minPrice: 2000000,
    },
    'over-5m': {
      maxPrice: null,
      minPrice: 5000001,
    },
  }
  const orderedRanges = ['under-2m', '2-5m', 'over-5m']
  const selectedIndexes = orderedRanges
    .map((range, index) => (priceRanges.includes(range) ? index : -1))
    .filter((index) => index >= 0)

  if (!selectedIndexes.length) {
    return {
      maxPrice: null,
      minPrice: null,
      needsClientFilter: false,
    }
  }

  const isContiguous =
    selectedIndexes[selectedIndexes.length - 1] - selectedIndexes[0] + 1 ===
    selectedIndexes.length

  if (!isContiguous || selectedIndexes.length === orderedRanges.length) {
    return {
      maxPrice: null,
      minPrice: null,
      needsClientFilter: true,
    }
  }

  const firstRange = priceRangeMap[orderedRanges[selectedIndexes[0]]]
  const lastRange =
    priceRangeMap[orderedRanges[selectedIndexes[selectedIndexes.length - 1]]]

  return {
    maxPrice: lastRange.maxPrice,
    minPrice: firstRange.minPrice,
    needsClientFilter: false,
  }
}

function getServiceDisplayPrice(service) {
  if (Number.isFinite(service.sale_price)) {
    return service.sale_price
  }

  if (Number.isFinite(service.base_price)) {
    return service.base_price
  }

  return null
}

function matchesPriceRanges(service, selectedPrices) {
  if (!selectedPrices.length) {
    return true
  }

  const displayPrice = getServiceDisplayPrice(service)

  if (!Number.isFinite(displayPrice)) {
    return false
  }

  return selectedPrices.some((priceRange) => {
    if (priceRange === 'under-2m') {
      return displayPrice < 2000000
    }

    if (priceRange === '2-5m') {
      return displayPrice >= 2000000 && displayPrice <= 5000000
    }

    if (priceRange === 'over-5m') {
      return displayPrice > 5000000
    }

    return false
  })
}

function matchesDurations(service, selectedDurations) {
  if (!selectedDurations.length) {
    return true
  }

  return selectedDurations.includes(service.duration_group)
}

function matchesCategories(service, selectedCategories) {
  if (!selectedCategories.length) {
    return true
  }

  return selectedCategories.includes(service.category_label)
}

function paginateServices(services, page, limit) {
  const safeLimit = Math.max(Number(limit) || DEFAULT_TOUR_LIMIT, 1)
  const total = services.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const startIndex = (safePage - 1) * safeLimit

  return {
    data: services.slice(startIndex, startIndex + safeLimit),
    meta: {
      has_next: safePage < totalPages,
      limit: safeLimit,
      page: safePage,
      total,
      total_pages: totalPages,
    },
  }
}

function buildSortOptions(sortValues = []) {
  if (!Array.isArray(sortValues) || !sortValues.length) {
    return TOUR_SORT_OPTIONS
  }

  const sortValueSet = new Set(sortValues)
  const filteredOptions = TOUR_SORT_OPTIONS.filter((option) => sortValueSet.has(option.value))

  return filteredOptions.length ? filteredOptions : TOUR_SORT_OPTIONS
}

function collectKnownLocations(filterOptions = {}, popularLocations = []) {
  const knownLocations = new Map()

  const pushLocation = (value) => {
    if (typeof value !== 'string' || !value.trim()) {
      return
    }

    const normalizedValue = normalizeText(value)

    if (!normalizedValue || knownLocations.has(normalizedValue)) {
      return
    }

    knownLocations.set(normalizedValue, value.trim())
  }

  if (Array.isArray(filterOptions.locations)) {
    filterOptions.locations.forEach(pushLocation)
  }

  if (Array.isArray(popularLocations)) {
    popularLocations.forEach((location) => pushLocation(location?.location))
  }

  return knownLocations
}

function resolveLocationQuery(keyword, knownLocations) {
  const normalizedKeyword = normalizeText(keyword)

  if (!normalizedKeyword || !(knownLocations instanceof Map)) {
    return ''
  }

  return knownLocations.get(normalizedKeyword) ?? ''
}

function createPaginationPages(currentPage, totalPages) {
  if (totalPages <= 1) {
    return [1]
  }

  if (totalPages <= 3) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  if (currentPage <= 2) {
    return [1, 2, 3]
  }

  if (currentPage >= totalPages - 1) {
    return [totalPages - 2, totalPages - 1, totalPages]
  }

  return [currentPage - 1, currentPage, currentPage + 1]
}

export default function useTourServiceList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
  const isCustomer = authState === ROLES.customer

  const [catalog, setCatalog] = useState(DEFAULT_TOUR_CATALOG)
  const [currentPage, setCurrentPage] = useState(() => buildPageFromSearchParams(searchParams))
  const [draftFilters, setDraftFilters] = useState(() => buildFiltersFromSearchParams(searchParams))
  const [appliedFilters, setAppliedFilters] = useState(() => buildFiltersFromSearchParams(searchParams))
  const [selectedSort, setSelectedSort] = useState(() => buildSortFromSearchParams(searchParams))
  const [services, setServices] = useState([])
  const [meta, setMeta] = useState(DEFAULT_TOUR_LIST_META)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const nextFilters = buildFiltersFromSearchParams(searchParams)
    setDraftFilters(nextFilters)
    setAppliedFilters(nextFilters)
    setCurrentPage(buildPageFromSearchParams(searchParams))
    setSelectedSort(buildSortFromSearchParams(searchParams))
  }, [searchParams])

  useEffect(() => {
    let isActive = true

    async function loadCatalog() {
      try {
        const response = await getTourServiceCatalog()

        if (!isActive) {
          return
        }

        const filterOptions = response.data?.filter_options ?? {}
        const popularLocations = response.data?.popular_locations ?? []
        const enums = response.data?.enums ?? {}

        setCatalog({
          knownLocations: collectKnownLocations(filterOptions, popularLocations),
          sortOptions: buildSortOptions(filterOptions.sort_options),
          supportsTour: Array.isArray(enums.service_type)
            ? enums.service_type.includes('tour')
            : true,
        })
      } catch {
        if (isActive) {
          setCatalog(DEFAULT_TOUR_CATALOG)
        }
      }
    }

    loadCatalog()

    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    let isActive = true

    async function loadServices() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        if (!catalog.supportsTour) {
          throw new Error('He thong chua ho tro du lieu tour cong khai.')
        }

        const normalizedKeyword = appliedFilters.keyword.trim()
        const resolvedPriceQuery = resolvePriceQuery(appliedFilters.prices)
        const needsClientSideFiltering =
          resolvedPriceQuery.needsClientFilter ||
          appliedFilters.durations.length > 0 ||
          appliedFilters.categories.length > 0
        const requestPage = needsClientSideFiltering ? 1 : currentPage
        const requestLimit = needsClientSideFiltering
          ? MAX_CLIENT_TOUR_RESULTS
          : DEFAULT_TOUR_LIMIT
        const requestSort = catalog.sortOptions.some((option) => option.value === selectedSort)
          ? selectedSort
          : DEFAULT_TOUR_SORT

        const response = await listTourServices({
          limit: requestLimit,
          location: resolveLocationQuery(normalizedKeyword, catalog.knownLocations),
          maxPrice: resolvedPriceQuery.maxPrice,
          minPrice: resolvedPriceQuery.minPrice,
          page: requestPage,
          q: normalizedKeyword.length >= 2 ? normalizedKeyword : '',
          sort: requestSort,
        })

        if (!isActive) {
          return
        }

        const mappedServices = Array.isArray(response.data)
          ? response.data.map((service) =>
              mapTourServiceToView(service, {
                detailPath: buildAuthAwarePath(`/services/${service.slug}`, isCustomer),
              }),
            )
          : []
        const filteredServices = mappedServices.filter(
          (service) =>
            matchesPriceRanges(service, appliedFilters.prices) &&
            matchesDurations(service, appliedFilters.durations) &&
            matchesCategories(service, appliedFilters.categories),
        )
        const nextResult = needsClientSideFiltering
          ? paginateServices(filteredServices, currentPage, DEFAULT_TOUR_LIMIT)
          : {
              data: filteredServices,
              meta: response.meta ?? DEFAULT_TOUR_LIST_META,
            }

        setServices(nextResult.data)
        setMeta(nextResult.meta)
      } catch (error) {
        if (!isActive) {
          return
        }

        setErrorMessage(error?.message ?? 'Không thể tải danh sách tour lúc này.')
        setServices([])
        setMeta(DEFAULT_TOUR_LIST_META)
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadServices()

    return () => {
      isActive = false
    }
  }, [appliedFilters, catalog, currentPage, isCustomer, selectedSort])

  function syncSearchParams({
    nextFilters = appliedFilters,
    nextPage = currentPage,
    nextSort = selectedSort,
  } = {}) {
    setSearchParams(
      buildServiceListSearchParams({
        auth: isCustomer ? ROLES.customer : '',
        keyword: nextFilters.keyword,
        page: nextPage,
        sort: nextSort,
      }),
    )
  }

  function handleToggleValue(filterKey, value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      [filterKey]: currentFilters[filterKey].includes(value)
        ? currentFilters[filterKey].filter((item) => item !== value)
        : [...currentFilters[filterKey], value],
    }))
  }

  function handleKeywordChange(value) {
    setDraftFilters((currentFilters) => ({
      ...currentFilters,
      keyword: value,
    }))
  }

  function handleApplyFilters() {
    const nextFilters = {
      ...draftFilters,
      prices: [...draftFilters.prices],
      durations: [...draftFilters.durations],
      categories: [...draftFilters.categories],
    }

    setAppliedFilters(nextFilters)
    setCurrentPage(1)
    syncSearchParams({ nextFilters, nextPage: 1 })
  }

  function handleResetFilters() {
    const emptyFilters = createEmptyFilters()
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    setCurrentPage(1)
    syncSearchParams({ nextFilters: emptyFilters, nextPage: 1 })
  }

  function handleSortChange(event) {
    const nextSort = event.target.value
    setSelectedSort(nextSort)
    setCurrentPage(1)
    syncSearchParams({ nextPage: 1, nextSort })
  }

  function handlePageChange(nextPage) {
    if (nextPage < 1 || nextPage > meta.total_pages || nextPage === currentPage) {
      return
    }

    setCurrentPage(nextPage)
    syncSearchParams({ nextPage })
  }

  return {
    breadcrumbHomePath: buildAuthAwarePath('/', isCustomer),
    canGoNext: meta.page < meta.total_pages,
    canGoPrevious: meta.page > 1,
    categoryOptions: TOUR_CATEGORY_FILTER_OPTIONS,
    currentPage: meta.page,
    draftFilters,
    durationOptions: TOUR_DURATION_FILTER_OPTIONS,
    errorMessage,
    handleApplyFilters,
    handleKeywordChange,
    handlePageChange,
    handleResetFilters,
    handleSortChange,
    handleToggleValue,
    isLoading,
    paginationPages: createPaginationPages(meta.page, meta.total_pages),
    priceOptions: TOUR_PRICE_FILTER_OPTIONS,
    resultCount: meta.total,
    selectedSort,
    services,
    sortOptions: catalog.sortOptions,
    totalPages: meta.total_pages,
  }
}
