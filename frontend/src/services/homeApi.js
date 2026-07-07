import { getJson } from './apiClient.js'

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value == null || value === '') {
      return
    }

    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

export function getFeaturedServices(params = {}) {
  return getJson(`/services/featured${buildQueryString(params)}`)
}

export function getPopularLocations(params = {}) {
  return getJson(`/locations/popular${buildQueryString(params)}`)
}

export function getServiceFilterOptions() {
  return getJson('/services/filter-options')
}

export function getPublicPromotions(params = {}) {
  return getJson(`/promotions${buildQueryString(params)}`)
}
