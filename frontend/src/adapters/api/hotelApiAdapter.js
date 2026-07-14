import {
  DEFAULT_HOTEL_PAGE_SIZE,
  DEFAULT_HOTEL_SORT,
} from '../../constants/hotels.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { apiGet } from '../../services/apiClient.js'

const MAX_HOTEL_FETCH_LIMIT = 50

let hotelCatalogPromise = null
const hotelDetailCache = new Map()
const hotelRoomCache = new Map()

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function toNumber(value, fallbackValue = 0) {
  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : fallbackValue
}

function toOptionalNumber(value) {
  if (value == null || value === '') {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function resolveCurrentPrice(item = {}) {
  const basePrice = toNumber(item.base_price)
  const salePrice = toOptionalNumber(item.sale_price)

  if (salePrice != null && salePrice < basePrice) {
    return salePrice
  }

  return basePrice
}

function parseDisplayDate(value) {
  const [dayText, monthText, yearText] = String(value ?? '').split('-')
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  if (!day || !month || !year) {
    return null
  }

  return new Date(year, month - 1, day)
}

function getStayDurationGroup(checkin, checkout) {
  const checkinDate = parseDisplayDate(checkin)
  const checkoutDate = parseDisplayDate(checkout)

  if (!checkinDate || !checkoutDate) {
    return null
  }

  const diffInDays = Math.round((checkoutDate.getTime() - checkinDate.getTime()) / 86400000)

  if (diffInDays >= 1 && diffInDays <= 3) {
    return '1-3'
  }

  if (diffInDays >= 4 && diffInDays <= 7) {
    return '4-7'
  }

  return 'other'
}

function matchesPriceRanges(hotel, selectedPrices) {
  if (!selectedPrices.length) {
    return true
  }

  return selectedPrices.some((priceRange) => {
    const currentPrice = resolveCurrentPrice(hotel)

    if (priceRange === 'under-2m') {
      return currentPrice < 2000000
    }

    if (priceRange === '2-5m') {
      return currentPrice >= 2000000 && currentPrice <= 5000000
    }

    if (priceRange === 'over-5m') {
      return currentPrice > 5000000
    }

    return false
  })
}

function matchesDurationFilters(selectedDurations, checkin, checkout) {
  if (!selectedDurations.length) {
    return true
  }

  const stayDurationGroup = getStayDurationGroup(checkin, checkout)

  if (!stayDurationGroup) {
    return false
  }

  return selectedDurations.includes(stayDurationGroup)
}

function matchesStarRatings(hotel, selectedStars) {
  if (!selectedStars.length) {
    return true
  }

  return selectedStars.includes(String(hotel.details?.star_rating ?? hotel.rating ?? ''))
}

function sortHotels(hotels, sortValue) {
  const nextHotels = [...hotels]

  if (sortValue === 'price_asc') {
    nextHotels.sort((first, second) => resolveCurrentPrice(first) - resolveCurrentPrice(second))
    return nextHotels
  }

  if (sortValue === 'price_desc') {
    nextHotels.sort((first, second) => resolveCurrentPrice(second) - resolveCurrentPrice(first))
    return nextHotels
  }

  if (sortValue === 'rating_desc') {
    nextHotels.sort((first, second) => (second.rating ?? 0) - (first.rating ?? 0))
    return nextHotels
  }

  return nextHotels
}

function buildListMeta({ limit, page, total }) {
  const safeLimit = Math.max(Number(limit) || DEFAULT_HOTEL_PAGE_SIZE, 1)
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)

  return {
    has_next: safePage < totalPages,
    limit: safeLimit,
    page: safePage,
    total,
    total_pages: totalPages,
  }
}

function buildFallbackHotelSummary(service = {}) {
  return {
    address: service.location_text ?? '',
    amenities: [],
    base_price: toNumber(service.base_price),
    checkin_time: '',
    checkout_time: '',
    currency: service.currency ?? 'VND',
    description: service.description ?? '',
    details: {
      star_rating: 0,
    },
    gallery: service.primary_image ? [service.primary_image] : [],
    id: service.id,
    image_url: service.primary_image ?? '',
    location_text: service.location_text ?? '',
    policies: [],
    rating: 0,
    review_count: 0,
    sale_price: toOptionalNumber(service.sale_price),
    service_type: service.service_type ?? SERVICE_TYPES.hotel,
    short_description: service.short_description ?? '',
    slug: service.slug,
    status: service.status ?? SERVICE_STATUSES.active,
    title: service.title ?? 'Khách sạn đang cập nhật',
  }
}

function mapServiceDetailToHotel(service = {}, { gallery } = {}) {
  const details = service.details ?? {}
  const starRating = toNumber(details.star_rating)
  const resolvedBasePrice = toNumber(service.base_price)
  const resolvedSalePrice = toOptionalNumber(service.sale_price)
  const resolvedGallery = Array.isArray(gallery)
    ? gallery.filter(Boolean)
    : (service.primary_image ? [service.primary_image] : [])
  const fallbackImage = resolvedGallery[0] ?? service.primary_image ?? ''

  return {
    address: details.address ?? service.location_text ?? '',
    amenities: Array.isArray(details.amenities) ? details.amenities : [],
    base_price: resolvedBasePrice,
    checkin_time: details.checkin_time ?? '',
    checkout_time: details.checkout_time ?? '',
    currency: service.currency ?? 'VND',
    description: service.description ?? '',
    details: {
      ...details,
      star_rating: starRating,
    },
    gallery: resolvedGallery,
    id: service.id,
    image_url: fallbackImage,
    location_text: service.location_text ?? '',
    policies: details.hotel_policy ? [details.hotel_policy] : [],
    rating: starRating,
    review_count: 0,
    sale_price: resolvedSalePrice,
    service_type: service.service_type ?? SERVICE_TYPES.hotel,
    short_description: service.short_description ?? '',
    slug: service.slug,
    status: SERVICE_STATUSES.active,
    title: service.title ?? 'Khách sạn đang cập nhật',
  }
}

function mapApiRoomToView(room = {}, hotelServiceId) {
  const basePrice = toNumber(room.base_price)
  const maxAdults = toNumber(room.max_adults)
  const maxChildren = toNumber(room.max_children)
  const maxGuests = Math.max(1, maxAdults + maxChildren)

  return {
    available_quantity: toNumber(room.available_rooms),
    base_price: basePrice,
    bed_type: room.bed_type ?? '',
    currency: room.currency ?? 'VND',
    description: room.description ?? '',
    gallery: [],
    hotel_service_id: hotelServiceId,
    id: room.id,
    image_url: '',
    max_adults: maxAdults,
    max_children: maxChildren,
    max_guests: maxGuests,
    options: {},
    room_size: '',
    sale_price: null,
    service_type: SERVICE_TYPES.room,
    short_description: room.description ?? '',
    status: SERVICE_STATUSES.active,
    title: room.name ?? 'Phòng đang cập nhật',
  }
}

async function fetchAllHotelSummaries() {
  const firstPageResponse = await apiGet('/services', {
    query: {
      limit: MAX_HOTEL_FETCH_LIMIT,
      page: 1,
      sort: 'newest',
      type: SERVICE_TYPES.hotel,
    },
  })

  const firstPageData = Array.isArray(firstPageResponse.data) ? firstPageResponse.data : []
  const totalPages = Number(firstPageResponse.meta?.total_pages ?? 1)

  if (totalPages <= 1) {
    return firstPageData
  }

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      apiGet('/services', {
        query: {
          limit: MAX_HOTEL_FETCH_LIMIT,
          page: index + 2,
          sort: 'newest',
          type: SERVICE_TYPES.hotel,
        },
      }),
    ),
  )

  return [
    ...firstPageData,
    ...remainingResponses.flatMap((response) =>
      Array.isArray(response.data) ? response.data : [],
    ),
  ]
}

async function getHotelDetailRecord(slug) {
  if (hotelDetailCache.has(slug)) {
    return hotelDetailCache.get(slug)
  }

  const detailPromise = apiGet(`/services/${encodeURIComponent(slug)}`).catch((error) => {
    hotelDetailCache.delete(slug)
    throw error
  })

  hotelDetailCache.set(slug, detailPromise)
  return detailPromise
}

async function loadHotelCatalog() {
  if (!hotelCatalogPromise) {
    hotelCatalogPromise = (async () => {
      const hotelSummaries = await fetchAllHotelSummaries()
      const hotelDetails = await Promise.all(
        hotelSummaries.map(async (service) => {
          try {
            const response = await getHotelDetailRecord(service.slug)
            return mapServiceDetailToHotel(response.data, {
              gallery: service.primary_image ? [service.primary_image] : [],
            })
          } catch {
            return buildFallbackHotelSummary(service)
          }
        }),
      )

      return hotelDetails.filter(
        (hotel) =>
          hotel &&
          hotel.service_type === SERVICE_TYPES.hotel &&
          hotel.status === SERVICE_STATUSES.active,
      )
    })().catch((error) => {
      hotelCatalogPromise = null
      throw error
    })
  }

  return hotelCatalogPromise
}

export async function listHotels({
  location = '',
  checkin = '',
  checkout = '',
  destination = '',
  priceRanges = [],
  durations = [],
  starRatings = [],
  sort = DEFAULT_HOTEL_SORT,
  page = 1,
  limit = DEFAULT_HOTEL_PAGE_SIZE,
} = {}) {
  const hotels = await loadHotelCatalog()
  const normalizedLocation = normalizeText(location)
  const normalizedDestination = normalizeText(destination)
  const safeLimit = Math.max(Number(limit) || DEFAULT_HOTEL_PAGE_SIZE, 1)
  const filteredHotels = sortHotels(
    hotels.filter((hotel) => {
      const searchableText = normalizeText(
        `${hotel.title} ${hotel.location_text} ${hotel.address ?? ''}`,
      )
      const matchesLocation = !normalizedLocation || searchableText.includes(normalizedLocation)
      const matchesDestination =
        !normalizedDestination || searchableText.includes(normalizedDestination)

      return (
        matchesLocation &&
        matchesDestination &&
        matchesPriceRanges(hotel, priceRanges) &&
        matchesDurationFilters(durations, checkin, checkout) &&
        matchesStarRatings(hotel, starRatings)
      )
    }),
    sort,
  )
  const meta = buildListMeta({
    limit: safeLimit,
    page,
    total: filteredHotels.length,
  })
  const pageStart = (meta.page - 1) * safeLimit
  const paginatedHotels = filteredHotels.slice(pageStart, pageStart + safeLimit)

  return {
    data: paginatedHotels,
    message: 'Hotels retrieved successfully',
    meta,
    success: true,
  }
}

export async function getHotelDetailBySlug(slug) {
  const detailResponse = await getHotelDetailRecord(slug)
  let gallery = []

  try {
    const imageResponse = await apiGet(`/services/${detailResponse.data.id}/images`)
    gallery = Array.isArray(imageResponse.data)
      ? imageResponse.data.map((image) => image.image_url).filter(Boolean)
      : []
  } catch {
    gallery = detailResponse.data.primary_image ? [detailResponse.data.primary_image] : []
  }

  const hotel = mapServiceDetailToHotel(detailResponse.data, { gallery })

  return {
    data: {
      hotel,
      related_hotels: [],
    },
    message: 'Hotel detail retrieved successfully',
    success: true,
  }
}

export async function getHotelRooms(hotelServiceId) {
  if (hotelRoomCache.has(hotelServiceId)) {
    return hotelRoomCache.get(hotelServiceId)
  }

  const roomPromise = (async () => {
    const response = await apiGet(`/services/${hotelServiceId}/rooms`)
    const rooms = Array.isArray(response.data)
      ? response.data.map((room) => mapApiRoomToView(room, hotelServiceId))
      : []

    return {
      data: rooms,
      message: response.message ?? 'Hotel rooms retrieved successfully',
      meta: {
        total: rooms.length,
      },
      success: true,
    }
  })().catch((error) => {
    hotelRoomCache.delete(hotelServiceId)
    throw error
  })

  hotelRoomCache.set(hotelServiceId, roomPromise)
  return roomPromise
}
