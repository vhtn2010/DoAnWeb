import {
  getHomeDestinations as getHomeDestinationsWithMockAdapter,
  getHomeFeaturedServices as getHomeFeaturedServicesWithMockAdapter,
  getHomeFlashSaleServices as getHomeFlashSaleServicesWithMockAdapter,
  getHomePageData as getHomePageDataWithMockAdapter,
  getHomePageFallbackData as getHomePageFallbackDataWithMockAdapter,
} from '../adapters/mock/homeMockAdapter.js'
import { HOME_SORT_QUERY_MAP } from '../constants/home.js'
import { formatQueryDate, slugifyQueryValue } from '../mappers/homeMappers.js'

const homeAdapter = {
  getHomeDestinations: getHomeDestinationsWithMockAdapter,
  getHomeFeaturedServices: getHomeFeaturedServicesWithMockAdapter,
  getHomeFlashSaleServices: getHomeFlashSaleServicesWithMockAdapter,
  getHomePageData: getHomePageDataWithMockAdapter,
  getHomePageFallbackData: getHomePageFallbackDataWithMockAdapter,
}

export function getHomePageFallbackData() {
  return homeAdapter.getHomePageFallbackData()
}

export function getHomePageData(params) {
  return homeAdapter.getHomePageData(params)
}

export function getHomeFeaturedServices(params) {
  return homeAdapter.getHomeFeaturedServices(params)
}

export function getHomeFlashSaleServices(params) {
  return homeAdapter.getHomeFlashSaleServices(params)
}

export function getHomeDestinations(params) {
  return homeAdapter.getHomeDestinations(params)
}

export function buildHomeSearchParams(formState, { auth = '' } = {}) {
  const params = new URLSearchParams()

  if (auth) {
    params.set('auth', auth)
  }

  params.set('from', slugifyQueryValue(formState.from))
  params.set('to', slugifyQueryValue(formState.to))
  params.set('start', formatQueryDate(formState.startDate))
  params.set('end', formatQueryDate(formState.endDate))
  params.set(
    'sort',
    HOME_SORT_QUERY_MAP[formState.sort] ?? slugifyQueryValue(formState.sort),
  )

  Object.entries(formState.filters ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, slugifyQueryValue(value))
    }
  })

  // TODO: replace local search routing with API-backed search params when integration phase starts.
  return params
}
