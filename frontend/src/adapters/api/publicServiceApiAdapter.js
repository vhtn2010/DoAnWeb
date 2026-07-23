import { DEFAULT_TOUR_LIMIT, DEFAULT_TOUR_SORT } from '../../constants/tours.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { apiGet } from '../../services/apiClient.js'
import { getPublicTourComments } from './commentApiAdapter.js'
import { getPublicTourReviews } from './reviewApiAdapter.js'

const DEFAULT_LOCATION_LIMIT = 10
const FALLBACK_TOUR_IMAGE_URL = '/assets/template/service/list/tour-mien-trung.png'

function withCacheBust(params = {}) {
  return {
    ...params,
    _t: Date.now(),
  }
}

function toNumber(value) {
  if (value == null || value === '') {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function normalizeSlug(value, fallbackValue) {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }

  const fallbackSlug = String(fallbackValue ?? 'tour')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return fallbackSlug || `tour-${Date.now()}`
}

function normalizeTourCard(service = {}) {
  const basePrice = toNumber(service.base_price)
  const salePrice = toNumber(service.sale_price)
  const publicPrice = toNumber(service.public_price)
  const resolvedSalePrice = salePrice ?? publicPrice ?? basePrice ?? 0
  const resolvedBasePrice = basePrice ?? resolvedSalePrice
  const fallbackSlug = normalizeSlug(service.slug, service.id ?? service.title ?? 'tour')
  const rawDetails =
    service.details && typeof service.details === 'object' && !Array.isArray(service.details)
      ? service.details
      : service

  const normalizedDetails = {
    departure_location: rawDetails.departure_location ?? '',
    destination_location: rawDetails.destination_location ?? '',
    duration_days: toNumber(rawDetails.duration_days) ?? 0,
    duration_nights: toNumber(rawDetails.duration_nights) ?? 0,
    max_group_size: toNumber(rawDetails.max_group_size) ?? 0,
    departure_schedule: Array.isArray(rawDetails.departure_schedule)
      ? rawDetails.departure_schedule
      : [],
    transport_type: rawDetails.transport_type ?? '',
  }

  return {
    base_price: resolvedBasePrice,
    currency: service.currency ?? 'VND',
    details: normalizedDetails,
    has_sale_price:
      salePrice != null &&
      resolvedBasePrice != null &&
      Number.isFinite(salePrice) &&
      Number.isFinite(resolvedBasePrice) &&
      salePrice < resolvedBasePrice,
    id: service.id ?? fallbackSlug,
    image_url: service.primary_image ?? service.image_url ?? FALLBACK_TOUR_IMAGE_URL,
    location_text: service.location_text ?? 'Đang cập nhật',
    sale_price: resolvedSalePrice,
    service_type: service.service_type ?? SERVICE_TYPES.tour,
    short_description: service.short_description ?? '',
    slug: fallbackSlug,
    status: service.status ?? 'active',
    title: service.title ?? 'Tour đang cập nhật',
  }
}

function normalizeListMeta(meta = {}, limit = DEFAULT_TOUR_LIMIT) {
  const safeLimit = Number(meta.limit) || Number(limit) || DEFAULT_TOUR_LIMIT
  const total = Number(meta.total) || 0
  const totalPages = Number(meta.total_pages) || Math.max(1, Math.ceil(total / safeLimit))
  const currentPage = Number(meta.page) || 1

  return {
    has_next: Boolean(meta.has_next),
    limit: safeLimit,
    page: currentPage,
    total,
    total_pages: totalPages,
  }
}

function buildGalleryImages(primaryImage, images = []) {
  const imageUrls = Array.isArray(images)
    ? images.map((image) => image?.image_url).filter(Boolean)
    : []

  return Array.from(new Set([primaryImage, ...imageUrls].filter(Boolean)))
}

export async function listTourServices({
  limit = DEFAULT_TOUR_LIMIT,
  location = '',
  maxPrice,
  minPrice,
  page = 1,
  q = '',
  sort = DEFAULT_TOUR_SORT,
} = {}) {
  const response = await apiGet('/services', {
    query: withCacheBust({
      limit,
      location,
      max_price: maxPrice,
      min_price: minPrice,
      page,
      q,
      sort,
      type: SERVICE_TYPES.tour,
    }),
  })

  return {
    ...response,
    data: Array.isArray(response.data) ? response.data.map(normalizeTourCard) : [],
    meta: normalizeListMeta(response.meta, limit),
  }
}

export async function getTourServiceBySlug(slug) {
  const response = await apiGet(`/services/${slug}`, {
    query: withCacheBust(),
  })
  const service = response.data ?? null

  if (!service || service.service_type !== SERVICE_TYPES.tour) {
    return {
      ...response,
      data: null,
      success: false,
    }
  }

  let galleryImages = [service.primary_image ?? service.image_url ?? FALLBACK_TOUR_IMAGE_URL].filter(
    Boolean,
  )

  if (service.id) {
    const [imagesResponse, reviewsResponse, commentsResponse] = await Promise.all([
      apiGet(`/services/${service.id}/images`, {
        query: withCacheBust(),
      }).catch(() => ({ data: [] })),
      service.service_type === SERVICE_TYPES.tour
        ? getPublicTourReviews(service.id, { limit: 12 }).catch(() => ({
            data: [],
            meta: { summary: null },
          }))
        : Promise.resolve({ data: [], meta: { summary: null } }),
      service.service_type === SERVICE_TYPES.tour
        ? getPublicTourComments(service.id, { limit: 20 }).catch(() => ({
            data: [],
            meta: { comment_count: 0 },
          }))
        : Promise.resolve({ data: [], meta: { comment_count: 0 } }),
    ])
    galleryImages = buildGalleryImages(service.primary_image, imagesResponse.data)
    service.review_samples = Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []
    service.review_summary = reviewsResponse.meta?.summary ?? null
    service.comment_samples = Array.isArray(commentsResponse.data) ? commentsResponse.data : []
    service.comment_summary = {
      comment_count: Number(commentsResponse.meta?.comment_count || 0),
    }
  }

  return {
    ...response,
    data: {
      ...service,
      gallery_images: galleryImages.length ? galleryImages : [FALLBACK_TOUR_IMAGE_URL],
      image_url: service.primary_image ?? galleryImages[0] ?? FALLBACK_TOUR_IMAGE_URL,
    },
  }
}

export async function getPublicServiceBySlug(slug) {
  const response = await apiGet(`/services/${slug}`, {
    query: withCacheBust(),
  })
  const service = response.data ?? null

  if (!service) {
    return {
      ...response,
      data: null,
      success: false,
    }
  }

  let galleryImages = [service.primary_image ?? service.image_url ?? FALLBACK_TOUR_IMAGE_URL].filter(
    Boolean,
  )

  if (service.id) {
    const [imagesResponse, reviewsResponse, commentsResponse] = await Promise.all([
      apiGet(`/services/${service.id}/images`, {
        query: withCacheBust(),
      }).catch(() => ({ data: [] })),
      service.service_type === SERVICE_TYPES.tour
        ? getPublicTourReviews(service.id, { limit: 12 }).catch(() => ({
            data: [],
            meta: { summary: null },
          }))
        : Promise.resolve({ data: [], meta: { summary: null } }),
      service.service_type === SERVICE_TYPES.tour
        ? getPublicTourComments(service.id, { limit: 20 }).catch(() => ({
            data: [],
            meta: { comment_count: 0 },
          }))
        : Promise.resolve({ data: [], meta: { comment_count: 0 } }),
    ])
    galleryImages = buildGalleryImages(service.primary_image, imagesResponse.data)
    service.review_samples = Array.isArray(reviewsResponse.data) ? reviewsResponse.data : []
    service.review_summary = reviewsResponse.meta?.summary ?? null
    service.comment_samples = Array.isArray(commentsResponse.data) ? commentsResponse.data : []
    service.comment_summary = {
      comment_count: Number(commentsResponse.meta?.comment_count || 0),
    }
  }

  return {
    ...response,
    data: {
      ...service,
      gallery_images: galleryImages.length ? galleryImages : [FALLBACK_TOUR_IMAGE_URL],
      image_url: service.primary_image ?? galleryImages[0] ?? FALLBACK_TOUR_IMAGE_URL,
    },
  }
}

export async function getFeaturedTourServices({
  excludeSlug = '',
  limit = 3,
} = {}) {
  const safeLimit = Math.max(Number(limit) || 3, 1)
  const response = await apiGet('/services/featured', {
    query: withCacheBust({
      limit: excludeSlug ? safeLimit + 1 : safeLimit,
      type: SERVICE_TYPES.tour,
    }),
  })
  const normalizedServices = Array.isArray(response.data)
    ? response.data.map(normalizeTourCard).filter((service) => service.slug !== excludeSlug)
    : []

  return {
    ...response,
    data: normalizedServices.slice(0, safeLimit),
    meta: normalizeListMeta(
      {
        has_next: normalizedServices.length > safeLimit,
        limit: safeLimit,
        page: 1,
        total: normalizedServices.length,
        total_pages: Math.max(1, Math.ceil(normalizedServices.length / safeLimit)),
      },
      safeLimit,
    ),
  }
}

export async function getTourServiceCatalog() {
  const [filterOptionsResponse, popularLocationsResponse, enumResponse] = await Promise.all([
    apiGet('/services/filter-options', {
      query: withCacheBust(),
    }),
    apiGet('/locations/popular', {
      query: withCacheBust({
        limit: DEFAULT_LOCATION_LIMIT,
        type: SERVICE_TYPES.tour,
      }),
    }),
    apiGet('/lookups/enums', {
      query: withCacheBust(),
    }),
  ])

  return {
    success: true,
    message: 'OK',
    data: {
      enums: enumResponse.data ?? {},
      filter_options: filterOptionsResponse.data ?? {},
      popular_locations: Array.isArray(popularLocationsResponse.data?.locations)
        ? popularLocationsResponse.data.locations
        : [],
    },
  }
}
