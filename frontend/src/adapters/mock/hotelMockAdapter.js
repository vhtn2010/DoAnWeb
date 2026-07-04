import {
  DEFAULT_HOTEL_PAGE_SIZE,
  DEFAULT_HOTEL_SORT,
} from '../../constants/hotels.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import { hotelServiceFixtures } from '../../fixtures/hotels.fixtures.js'

function normalizeText(value = '') {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
}

function parseDateValue(value) {
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
  const checkinDate = parseDateValue(checkin)
  const checkoutDate = parseDateValue(checkout)

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
    if (priceRange === 'under-2m') {
      return hotel.sale_price < 2000000
    }

    if (priceRange === '2-5m') {
      return hotel.sale_price >= 2000000 && hotel.sale_price <= 5000000
    }

    if (priceRange === 'over-5m') {
      return hotel.sale_price > 5000000
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

  return selectedStars.includes(String(hotel.details?.star_rating ?? ''))
}

function sortHotels(hotels, sortValue) {
  const nextHotels = [...hotels]

  if (sortValue === 'price_asc') {
    nextHotels.sort((first, second) => first.sale_price - second.sale_price)
    return nextHotels
  }

  if (sortValue === 'price_desc') {
    nextHotels.sort((first, second) => second.sale_price - first.sale_price)
    return nextHotels
  }

  if (sortValue === 'rating_desc') {
    nextHotels.sort(
      (first, second) => (second.details?.star_rating ?? 0) - (first.details?.star_rating ?? 0),
    )
    return nextHotels
  }

  return nextHotels
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
  const normalizedLocation = normalizeText(location)
  const normalizedDestination = normalizeText(destination)
  const safeLimit = Math.max(Number(limit) || DEFAULT_HOTEL_PAGE_SIZE, 1)

  const filteredHotels = sortHotels(
    hotelServiceFixtures.filter((hotel) => {
      if (
        hotel.service_type !== SERVICE_TYPES.hotel ||
        hotel.status !== SERVICE_STATUSES.active
      ) {
        return false
      }

      const searchableText = normalizeText(
        `${hotel.title} ${hotel.location_text} ${hotel.details?.address ?? ''}`,
      )

      const matchesLocation =
        !normalizedLocation || searchableText.includes(normalizedLocation)
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

  const total = filteredHotels.length
  const totalPages = Math.max(1, Math.ceil(total / safeLimit))
  const safePage = Math.min(Math.max(Number(page) || 1, 1), totalPages)
  const pageStart = (safePage - 1) * safeLimit
  const paginatedHotels = filteredHotels.slice(pageStart, pageStart + safeLimit)

  return {
    success: true,
    message: 'OK',
    data: paginatedHotels,
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: totalPages,
      has_next: safePage < totalPages,
    },
  }
}
