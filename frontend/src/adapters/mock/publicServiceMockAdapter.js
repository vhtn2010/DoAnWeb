import { DEFAULT_TOUR_LIMIT, DEFAULT_TOUR_SORT } from '../../constants/tours.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { tourServiceFixtures } from '../../fixtures/services.fixtures.js'
import { normalizeTourService } from '../../mappers/serviceMappers.js'

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function getDurationGroup(service) {
  const durationDays = service.details?.duration_days ?? 0

  if (durationDays >= 1 && durationDays <= 3) {
    return '1-3'
  }

  if (durationDays >= 4 && durationDays <= 7) {
    return '4-7'
  }

  return 'other'
}

function matchesPriceRanges(service, selectedPrices) {
  if (!selectedPrices.length) {
    return true
  }

  return selectedPrices.some((priceRange) => {
    if (priceRange === 'under-2m') {
      return service.sale_price < 2000000
    }

    if (priceRange === '2-5m') {
      return service.sale_price >= 2000000 && service.sale_price <= 5000000
    }

    if (priceRange === 'over-5m') {
      return service.sale_price > 5000000
    }

    return false
  })
}

function matchesDurations(service, selectedDurations) {
  if (!selectedDurations.length) {
    return true
  }

  return selectedDurations.includes(getDurationGroup(service))
}

function matchesCategories(service, selectedCategories) {
  if (!selectedCategories.length) {
    return true
  }

  const categoryBySlug = {
    'da-lat-mong-mo-nghi-duong-lang-phap': 'Nghỉ dưỡng',
    'di-san-mien-trung-da-nang-hoi-an-hue': 'Văn hoá',
    'mien-tay-song-nuoc-cho-noi-dich-thuc': 'Khám phá',
    'nghi-duong-vinh-ha-long-du-thuyen-signature': 'Nghỉ dưỡng',
  }

  return selectedCategories.includes(categoryBySlug[service.slug] ?? '')
}

function sortServices(services, sortValue) {
  const nextServices = [...services]
  const sortOrderBySlug = {
    'da-lat-mong-mo-nghi-duong-lang-phap': 1,
    'di-san-mien-trung-da-nang-hoi-an-hue': 2,
    'mien-tay-song-nuoc-cho-noi-dich-thuc': 3,
    'nghi-duong-vinh-ha-long-du-thuyen-signature': 4,
  }

  if (sortValue === 'price_asc') {
    nextServices.sort((first, second) => first.sale_price - second.sale_price)
    return nextServices
  }

  if (sortValue === 'price_desc') {
    nextServices.sort((first, second) => second.sale_price - first.sale_price)
    return nextServices
  }

  nextServices.sort(
    (first, second) =>
      (sortOrderBySlug[first.slug] ?? 999) - (sortOrderBySlug[second.slug] ?? 999),
  )
  return nextServices
}

function getActiveTourServices() {
  return tourServiceFixtures
    .map((service) => normalizeTourService(service))
    .filter(
      (service) =>
        service.service_type === SERVICE_TYPES.tour &&
        service.status === SERVICE_STATUSES.active,
    )
}

export async function listTourServices({
  limit = DEFAULT_TOUR_LIMIT,
  location = '',
  page = 1,
  priceRanges = [],
  durations = [],
  categories = [],
  q = '',
  sort = DEFAULT_TOUR_SORT,
  type = SERVICE_TYPES.tour,
} = {}) {
  const normalizedKeyword = normalizeText(q || location)
  const safeLimit = Math.max(Number(limit) || DEFAULT_TOUR_LIMIT, 1)

  const filteredServices = sortServices(
    getActiveTourServices().filter((service) => {
      if (type && service.service_type !== type) {
        return false
      }

      const searchableText = normalizeText(`${service.title} ${service.location_text}`)
      const matchesKeyword =
        !normalizedKeyword || searchableText.includes(normalizedKeyword)

      return (
        matchesKeyword &&
        matchesPriceRanges(service, priceRanges) &&
        matchesDurations(service, durations) &&
        matchesCategories(service, categories)
      )
    }),
    sort,
  )

  const total = filteredServices.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const pageStart = (safePage - 1) * safeLimit

  return {
    success: true,
    message: 'OK',
    data: filteredServices.slice(pageStart, pageStart + safeLimit),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: totalPages,
      has_next: safePage < totalPages,
    },
  }
}

export async function getTourServiceBySlug(slug) {
  const service =
    getActiveTourServices().find((currentService) => currentService.slug === slug) ?? null

  if (!service) {
    return {
      success: false,
      message: 'Không tìm thấy dịch vụ.',
      data: null,
    }
  }

  return {
    success: true,
    message: 'OK',
    data: service,
  }
}

export async function getFeaturedTourServices({
  excludeSlug = '',
  limit = 3,
  sort = DEFAULT_TOUR_SORT,
} = {}) {
  const featuredServices = sortServices(
    getActiveTourServices().filter((service) => service.slug !== excludeSlug),
    sort,
  )
  const safeLimit = Math.max(Number(limit) || 3, 1)

  return {
    success: true,
    message: 'OK',
    data: featuredServices.slice(0, safeLimit),
    meta: {
      page: 1,
      limit: safeLimit,
      total: featuredServices.length,
      total_pages: Math.max(1, Math.ceil(featuredServices.length / safeLimit)),
      has_next: featuredServices.length > safeLimit,
    },
  }
}
