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
import { listTourServices } from '../repositories/publicServiceRepository.js'
import { mapTourServiceToView } from '../mappers/serviceMappers.js'

const DEFAULT_TOUR_LIST_META = Object.freeze({
  page: 1,
  limit: DEFAULT_TOUR_LIMIT,
  total: 0,
  total_pages: 1,
  has_next: false,
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

function buildAuthAwarePath(path, isCustomer) {
  return isCustomer ? `${path}?auth=customer` : path
}

function buildServiceListSearchParams({ auth = '', keyword = '', sort = DEFAULT_TOUR_SORT } = {}) {
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

  return nextSearchParams
}

export default function useTourServiceList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
  const isCustomer = authState === ROLES.customer

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
    setSelectedSort(buildSortFromSearchParams(searchParams))
  }, [searchParams])

  useEffect(() => {
    let isActive = true

    async function loadServices() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const response = await listTourServices({
          categories: appliedFilters.categories,
          durations: appliedFilters.durations,
          limit: DEFAULT_TOUR_LIMIT,
          page: 1,
          priceRanges: appliedFilters.prices,
          q: appliedFilters.keyword,
          sort: selectedSort,
        })

        if (!isActive) {
          return
        }

        setServices(
          Array.isArray(response.data)
            ? response.data.map((service) =>
                mapTourServiceToView(service, {
                  detailPath: buildAuthAwarePath(`/services/${service.slug}`, isCustomer),
                }),
              )
            : [],
        )
        setMeta(response.meta ?? DEFAULT_TOUR_LIST_META)
      } catch (error) {
        if (!isActive) {
          return
        }

        setErrorMessage(error?.message ?? 'Không thể tải danh sách tour lúc này.')
        setServices([])
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
  }, [appliedFilters, isCustomer, selectedSort])

  function syncSearchParams({
    nextFilters = appliedFilters,
    nextSort = selectedSort,
  } = {}) {
    setSearchParams(
      buildServiceListSearchParams({
        auth: isCustomer ? ROLES.customer : '',
        keyword: nextFilters.keyword,
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

  function handleApplyFilters() {
    const nextFilters = {
      ...draftFilters,
      prices: [...draftFilters.prices],
      durations: [...draftFilters.durations],
      categories: [...draftFilters.categories],
    }

    setAppliedFilters(nextFilters)
    syncSearchParams({ nextFilters })
  }

  function handleResetFilters() {
    const emptyFilters = createEmptyFilters()
    setDraftFilters(emptyFilters)
    setAppliedFilters(emptyFilters)
    syncSearchParams({ nextFilters: emptyFilters })
  }

  function handleSortChange(event) {
    const nextSort = event.target.value
    setSelectedSort(nextSort)
    syncSearchParams({ nextSort })
  }

  const hasAppliedFilters = Boolean(appliedFilters.keyword) ||
    appliedFilters.prices.length > 0 ||
    appliedFilters.durations.length > 0 ||
    appliedFilters.categories.length > 0
  const resultCount = hasAppliedFilters ? meta.total : DEFAULT_TOUR_LIMIT

  return {
    breadcrumbHomePath: buildAuthAwarePath('/', isCustomer),
    categoryOptions: TOUR_CATEGORY_FILTER_OPTIONS,
    draftFilters,
    durationOptions: TOUR_DURATION_FILTER_OPTIONS,
    errorMessage,
    handleApplyFilters,
    handleResetFilters,
    handleSortChange,
    handleToggleValue,
    isLoading,
    priceOptions: TOUR_PRICE_FILTER_OPTIONS,
    resultCount,
    selectedSort,
    services,
    setDraftFilters,
    sortOptions: TOUR_SORT_OPTIONS,
  }
}
