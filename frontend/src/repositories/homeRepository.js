import {
  getHomeDestinations as getHomeDestinationsWithMockAdapter,
  getHomeFeaturedServices as getHomeFeaturedServicesWithMockAdapter,
  getHomeFlashSaleServices as getHomeFlashSaleServicesWithMockAdapter,
  getHomePageFallbackData as getHomePageFallbackDataWithMockAdapter,
} from '../adapters/mock/homeMockAdapter.js'
import { HOME_SORT_QUERY_MAP } from '../constants/homeFigma.js'
import { SERVICE_TYPES } from '../constants/serviceTypes.js'
import { formatQueryDate, slugifyQueryValue } from '../mappers/homeFigmaMappers.js'
import {
  normalizeVietnamLocationDisplay,
  normalizeVietnamLocationOptions,
} from '../utils/locationDisplay.js'
import {
  getFeaturedServices as getFeaturedServicesFromApi,
  getPopularLocations as getPopularLocationsFromApi,
  getPublicPromotions as getPublicPromotionsFromApi,
  getServiceFilterOptions as getServiceFilterOptionsFromApi,
} from '../services/homeApi.js'

const homeAdapter = {
  getHomeDestinations: getHomeDestinationsWithMockAdapter,
  getHomeFeaturedServices: getHomeFeaturedServicesWithMockAdapter,
  getHomeFlashSaleServices: getHomeFlashSaleServicesWithMockAdapter,
  getHomePageFallbackData: getHomePageFallbackDataWithMockAdapter,
}
const FLASH_SALE_MAX_REMAINING_HOURS = 22

function calculateDiscountPercent(basePrice, salePrice) {
  const numericBasePrice = Number(basePrice)
  const numericSalePrice = Number(salePrice)

  if (!numericBasePrice || !numericSalePrice || numericSalePrice >= numericBasePrice) {
    return 0
  }

  return Math.max(1, Math.round(((numericBasePrice - numericSalePrice) / numericBasePrice) * 100))
}

function normalizeLocationKey(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function createDestinationVisualLookup(destinations = []) {
  return destinations.reduce((lookup, destination, index) => {
    const locationKey = normalizeLocationKey(
      normalizeVietnamLocationDisplay(destination.title || destination.slug),
    )

    lookup[locationKey] = {
      badge_text: destination.badge_text ?? destination.details?.badge_text ?? '',
      card_size: destination.details?.card_size ?? destination.size ?? 'small',
      image_url: destination.image_url ?? '',
      short_description: destination.short_description ?? '',
      slug: destination.slug ?? locationKey,
      title: destination.title ?? '',
    }

    if (!lookup[`index-${index}`]) {
      lookup[`index-${index}`] = lookup[locationKey]
    }

    return lookup
  }, {})
}

function createPopularLocationLookup(popularLocations = []) {
  return popularLocations.reduce((lookup, locationEntry) => {
    const locationKey = normalizeLocationKey(
      normalizeVietnamLocationDisplay(locationEntry?.location),
    )

    if (locationKey && !lookup.has(locationKey)) {
      lookup.set(locationKey, locationEntry)
    }

    return lookup
  }, new Map())
}

function buildHomeDestinations(popularLocations = [], fallbackDestinations = []) {
  if (!popularLocations.length) {
    return fallbackDestinations
  }

  const destinationVisualLookup = createDestinationVisualLookup(fallbackDestinations)
  const popularLocationLookup = createPopularLocationLookup(popularLocations)
  const usedPopularLocationKeys = new Set()

  const orderedDestinations = fallbackDestinations.map((fallbackDestination, index) => {
    const locationKey = normalizeLocationKey(
      normalizeVietnamLocationDisplay(
        fallbackDestination.title || fallbackDestination.location_text,
      ),
    )
    const popularLocation = popularLocationLookup.get(locationKey)
    const fallbackVisual =
      destinationVisualLookup[locationKey] ??
      destinationVisualLookup[`index-${index}`] ??
      {}

    if (popularLocation) {
      usedPopularLocationKeys.add(locationKey)
    }

    return mapPopularLocationToDestination(
      popularLocation ?? {
        location: fallbackDestination.title,
        service_count: 0,
      },
      fallbackVisual,
      index,
    )
  })

  const extraDestinations = popularLocations
    .filter((locationEntry) => {
      const locationKey = normalizeLocationKey(
        normalizeVietnamLocationDisplay(locationEntry?.location),
      )

      return locationKey && !usedPopularLocationKeys.has(locationKey)
    })
    .map((locationEntry, index) => {
      const destinationIndex = orderedDestinations.length + index
      const fallbackVisual = destinationVisualLookup[`index-${destinationIndex}`] ?? {}

      return mapPopularLocationToDestination(locationEntry, fallbackVisual, destinationIndex)
    })

  return [...orderedDestinations, ...extraDestinations].slice(0, 4)
}

function getPriceUnit(serviceType) {
  if (serviceType === SERVICE_TYPES.hotel) {
    return '/đêm'
  }

  if (serviceType === SERVICE_TYPES.combo || serviceType === SERVICE_TYPES.tour) {
    return '/khách'
  }

  if (serviceType === SERVICE_TYPES.flight || serviceType === SERVICE_TYPES.train) {
    return '/vé'
  }

  return ''
}

function mapFeaturedServiceToHomeCard(service = {}, fallback = {}) {
  const salePrice = service.sale_price ?? service.public_price ?? 0

  return {
    ...fallback,
    id: service.id ?? fallback.id ?? '',
    service_code: fallback.service_code ?? '',
    service_type: service.service_type ?? fallback.service_type ?? SERVICE_TYPES.tour,
    title: service.title ?? fallback.title ?? '',
    slug: service.slug ?? fallback.slug ?? '',
    short_description: service.short_description ?? fallback.short_description ?? '',
    location_text: normalizeVietnamLocationDisplay(
      service.location_text ?? fallback.location_text ?? '',
    ),
    base_price: service.base_price ?? fallback.base_price ?? 0,
    sale_price: salePrice,
    currency: service.currency ?? fallback.currency ?? 'VND',
    status: fallback.status ?? 'active',
    image_url: service.primary_image ?? fallback.image_url ?? '',
    details: {
      ...(fallback.details ?? {}),
      discount_percent: calculateDiscountPercent(service.base_price, salePrice),
      price_unit: getPriceUnit(service.service_type),
    },
  }
}

function mapPopularLocationToDestination(locationEntry = {}, fallback = {}, index = 0) {
  const locationName = normalizeVietnamLocationDisplay(
    locationEntry.location ?? fallback.title ?? '',
  )
  const serviceCount = Number(locationEntry.service_count) || 0

  return {
    id: fallback.id ?? `popular-location-${index + 1}`,
    service_code: fallback.service_code ?? `DEST-${index + 1}`,
    service_type: fallback.service_type ?? SERVICE_TYPES.tour,
    title: locationName,
    slug: fallback.slug ?? (normalizeLocationKey(locationName) || `destination-${index + 1}`),
    short_description:
      serviceCount > 0
        ? `${serviceCount} dịch vụ đang hoạt động tại ${locationName}.`
        : fallback.short_description ?? '',
    location_text: locationName,
    base_price: 0,
    sale_price: 0,
    currency: 'VND',
    status: 'active',
    image_url: fallback.image_url ?? '',
    details: {
      badge_text: serviceCount > 0 ? `TOP ${serviceCount}` : fallback.badge_text ?? '',
      card_size: fallback.card_size ?? 'small',
    },
  }
}

function buildFlashSaleMeta(promotions = [], fallbackMeta = {}) {
  const activePromotion = Array.isArray(promotions)
    ? promotions
      .filter((promotion) => promotion?.valid_to)
      .sort(
        (firstPromotion, secondPromotion) =>
          new Date(firstPromotion.valid_to).getTime() -
          new Date(secondPromotion.valid_to).getTime(),
      )[0]
    : null

  if (!activePromotion) {
    return fallbackMeta
  }

  const remainingMilliseconds = new Date(activePromotion.valid_to).getTime() - Date.now()

  if (!Number.isFinite(remainingMilliseconds) || remainingMilliseconds <= 0) {
    return fallbackMeta
  }

  const maxRemainingMilliseconds = FLASH_SALE_MAX_REMAINING_HOURS * 60 * 60 * 1000
  const displayedMilliseconds = Math.min(remainingMilliseconds, maxRemainingMilliseconds)
  const totalMinutes = Math.floor(displayedMilliseconds / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60

  return {
    ...fallbackMeta,
    timer: {
      days: String(days).padStart(2, '0'),
      hours: String(hours).padStart(2, '0'),
      minutes: String(minutes).padStart(2, '0'),
    },
  }
}

async function loadFeaturedServices(params = {}) {
  const response = await getFeaturedServicesFromApi(params)
  return Array.isArray(response?.data) ? response.data : []
}

export function getHomePageFallbackData() {
  return homeAdapter.getHomePageFallbackData()
}

export async function getHomePageData() {
  const fallbackResponse = homeAdapter.getHomePageFallbackData()
  const fallbackData = fallbackResponse.data
  const fallbackDestinations = Array.isArray(fallbackData.destinations)
    ? fallbackData.destinations
    : []

  const [
    featuredResult,
    popularLocationsResult,
    filterOptionsResult,
    promotionsResult,
  ] = await Promise.allSettled([
    loadFeaturedServices({ limit: 6 }),
    getPopularLocationsFromApi({ limit: 4 }),
    getServiceFilterOptionsFromApi(),
    getPublicPromotionsFromApi({ active_only: true, limit: 1 }),
  ])

  const featuredServices =
    featuredResult.status === 'fulfilled' && featuredResult.value.length > 0
      ? featuredResult.value
      : []
  const flashSaleServices =
    featuredServices.length > 0
      ? featuredServices.slice(0, 3).map((service, index) =>
        mapFeaturedServiceToHomeCard(
          service,
          fallbackData.flash_sale_services?.[index] ?? fallbackData.featured_services?.[index] ?? {},
        ),
      )
      : fallbackData.flash_sale_services
  const mappedFeaturedServices =
    featuredServices.length > 0
      ? featuredServices.slice(0, 3).map((service, index) =>
        mapFeaturedServiceToHomeCard(
          service,
          fallbackData.featured_services?.[index] ?? {},
        ),
      )
      : fallbackData.featured_services

  const popularLocations =
    popularLocationsResult.status === 'fulfilled' &&
      Array.isArray(popularLocationsResult.value?.data?.locations)
      ? popularLocationsResult.value.data.locations
      : []
  const destinations =
    popularLocations.length > 0
      ? buildHomeDestinations(popularLocations, fallbackDestinations)
      : fallbackDestinations

  const filterOptions = filterOptionsResult.status === 'fulfilled'
    ? filterOptionsResult.value?.data
    : null
  const provinces =
    Array.isArray(filterOptions?.locations) && filterOptions.locations.length > 0
      ? normalizeVietnamLocationOptions(filterOptions.locations)
      : normalizeVietnamLocationOptions(fallbackData.provinces)
  const promotions =
    promotionsResult.status === 'fulfilled' && Array.isArray(promotionsResult.value?.data)
      ? promotionsResult.value.data
      : []

  return {
    success: true,
    message: 'OK',
    data: {
      hero: fallbackData.hero,
      search_defaults: fallbackData.search_defaults,
      featured_services: mappedFeaturedServices,
      flash_sale_services: flashSaleServices,
      destinations,
      value_props: fallbackData.value_props,
      flash_sale_meta: buildFlashSaleMeta(promotions, fallbackData.flash_sale_meta),
      provinces,
    },
  }
}

export async function getHomeFeaturedServices({ limit = 3, type } = {}) {
  try {
    const featuredServices = await loadFeaturedServices({ limit, type })
    const fallbackData = homeAdapter.getHomePageFallbackData().data

    return {
      success: true,
      message: 'OK',
      data: featuredServices.map((service, index) =>
        mapFeaturedServiceToHomeCard(service, fallbackData.featured_services?.[index] ?? {}),
      ),
    }
  } catch {
    return homeAdapter.getHomeFeaturedServices({ limit })
  }
}

export async function getHomeFlashSaleServices({ limit = 3, type } = {}) {
  try {
    const featuredServices = await loadFeaturedServices({ limit, type })
    const fallbackData = homeAdapter.getHomePageFallbackData().data

    return {
      success: true,
      message: 'OK',
      data: featuredServices.map((service, index) =>
        mapFeaturedServiceToHomeCard(
          service,
          fallbackData.flash_sale_services?.[index] ?? fallbackData.featured_services?.[index] ?? {},
        ),
      ),
    }
  } catch {
    return homeAdapter.getHomeFlashSaleServices({ limit })
  }
}

export async function getHomeDestinations({ limit = 4, type } = {}) {
  try {
    const response = await getPopularLocationsFromApi({ limit, type })
    const fallbackData = homeAdapter.getHomePageFallbackData().data
    const destinationVisualLookup = createDestinationVisualLookup(fallbackData.destinations)
    const locations = Array.isArray(response?.data?.locations) ? response.data.locations : []

    return {
      success: true,
      message: 'OK',
      data: locations.map((locationEntry, index) => {
        const locationKey = normalizeLocationKey(locationEntry.location)
        const fallbackVisual =
          destinationVisualLookup[locationKey] ??
          destinationVisualLookup[`index-${index}`] ??
          {}

        return mapPopularLocationToDestination(locationEntry, fallbackVisual, index)
      }),
    }
  } catch {
    return homeAdapter.getHomeDestinations({ limit })
  }
}

export function buildHomeSearchParams(formState, { auth: _auth = '' } = {}) {
  const params = new URLSearchParams()

  const fromValue = normalizeVietnamLocationDisplay(formState.from).trim()
  const toValue = normalizeVietnamLocationDisplay(formState.to).trim()
  const startValue = formatQueryDate(formState.startDate)
  const endValue = formatQueryDate(formState.endDate)
  const sortValue = HOME_SORT_QUERY_MAP[formState.sort] ?? slugifyQueryValue(formState.sort)

  if (fromValue) {
    params.set('from', fromValue)
  }

  if (toValue) {
    params.set('to', toValue)
  }

  if (startValue) {
    params.set('start', startValue)
  }

  if (endValue) {
    params.set('end', endValue)
  }

  if (sortValue) {
    params.set('sort', sortValue)
  }

  Object.entries(formState.filters ?? {}).forEach(([key, value]) => {
    if (value) {
      params.set(key, slugifyQueryValue(value))
    }
  })

  // TODO: replace local search routing with API-backed search params when integration phase starts.
  return params
}


