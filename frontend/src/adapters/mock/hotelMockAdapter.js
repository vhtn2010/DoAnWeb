import {
  DEFAULT_HOTEL_PAGE_SIZE,
  DEFAULT_HOTEL_SORT,
} from '../../constants/hotels.js'
import { SERVICE_STATUSES } from '../../constants/serviceStatuses.js'
import { SERVICE_TYPES } from '../../constants/serviceTypes.js'
import {
  getHotelFixtureBySlug,
  getHotelRoomsFixtureByHotelServiceId,
  hotelRelatedSlugMap,
  hotelServiceFixtures,
} from '../../fixtures/hotels.fixtures.js'

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

function parseIsoDateValue(value) {
  const [yearText, monthText, dayText] = String(value ?? '').split('-')
  const day = Number(dayText)
  const month = Number(monthText)
  const year = Number(yearText)

  if (!day || !month || !year) {
    return null
  }

  return new Date(year, month - 1, day)
}

function calculateNightCount(checkinDate, checkoutDate) {
  const checkin = parseIsoDateValue(checkinDate)
  const checkout = parseIsoDateValue(checkoutDate)

  if (!checkin || !checkout) {
    return 0
  }

  const diffInDays = Math.round((checkout.getTime() - checkin.getTime()) / 86400000)

  if (diffInDays < 1) {
    return 0
  }

  return diffInDays
}

function buildDateTimeStamp(dateText, timeText) {
  if (!dateText || !timeText) {
    return ''
  }

  return `${dateText}T${timeText}:00+07:00`
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
    nextHotels.sort((first, second) => (second.rating ?? 0) - (first.rating ?? 0))
    return nextHotels
  }

  return nextHotels
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function getRelatedHotels(hotelSlug) {
  const relatedSlugs = hotelRelatedSlugMap[hotelSlug] ?? []

  return relatedSlugs
    .map((slug) => getHotelFixtureBySlug(slug))
    .filter(
      (hotel) =>
        hotel &&
        hotel.service_type === SERVICE_TYPES.hotel &&
        hotel.status === SERVICE_STATUSES.active,
    )
}

function buildHotelBookingOptions({ hotel, room, guests, roomQuantity, nights, checkinDate, checkoutDate }) {
  return {
    hotel_name: hotel.title,
    room_name: room.title,
    guest_count: guests,
    room_quantity: roomQuantity,
    nights,
    bed_type: room.bed_type,
    room_size: room.room_size,
    selected_options: {
      ...(room.options ?? {}),
    },
    checkin_date: checkinDate,
    checkout_date: checkoutDate,
  }
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
        `${hotel.title} ${hotel.location_text} ${hotel.address ?? ''}`,
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
    data: cloneValue(paginatedHotels),
    meta: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: totalPages,
      has_next: safePage < totalPages,
    },
  }
}

export async function getHotelDetailBySlug(slug) {
  // TODO: replace mock hotel detail with GET /services/{slug} in API integration phase.
  const hotel = getHotelFixtureBySlug(slug)

  if (
    !hotel ||
    hotel.service_type !== SERVICE_TYPES.hotel ||
    hotel.status !== SERVICE_STATUSES.active
  ) {
    return {
      success: false,
      message: 'Không tìm thấy khách sạn.',
      data: null,
    }
  }

  const rooms = getHotelRoomsFixtureByHotelServiceId(hotel.id).filter(
    (room) =>
      room.service_type === SERVICE_TYPES.room &&
      room.status === SERVICE_STATUSES.active,
  )

  return {
    success: true,
    message: 'OK',
    data: {
      hotel: cloneValue(hotel),
      rooms: cloneValue(rooms),
      related_hotels: cloneValue(getRelatedHotels(hotel.slug)),
    },
  }
}

export async function getHotelRooms(hotelServiceId) {
  // TODO: replace mock room list with GET /services/{hotel_service_id}/rooms in API integration phase.
  const rooms = getHotelRoomsFixtureByHotelServiceId(hotelServiceId).filter(
    (room) =>
      room.service_type === SERVICE_TYPES.room &&
      room.status === SERVICE_STATUSES.active,
  )

  return {
    success: true,
    message: 'OK',
    data: cloneValue(rooms),
    meta: {
      total: rooms.length,
    },
  }
}

export async function checkHotelAvailability({
  hotel_service_id,
  selected_room_id,
  checkin_date,
  checkout_date,
  guests = 1,
  quantity = 1,
} = {}) {
  // TODO: replace mock availability with hotel/room availability API in integration phase.
  const hotel = hotelServiceFixtures.find((item) => item.id === hotel_service_id) ?? null
  const room = getHotelRoomsFixtureByHotelServiceId(hotel_service_id).find(
    (item) => item.id === selected_room_id,
  )

  if (!hotel || !room) {
    return {
      success: false,
      message: 'Không tìm thấy phòng phù hợp để kiểm tra.',
      data: null,
    }
  }

  const isDateRangeValid =
    Boolean(parseIsoDateValue(checkin_date)) &&
    Boolean(parseIsoDateValue(checkout_date)) &&
    calculateNightCount(checkin_date, checkout_date) >= 1
  const isGuestCountValid = Number(guests) >= 1 && Number(guests) <= Number(room.max_guests)
  const requestedQuantity = Math.max(Number(quantity) || 1, 1)
  const isAvailable =
    isDateRangeValid &&
    isGuestCountValid &&
    room.status === SERVICE_STATUSES.active &&
    room.available_quantity >= requestedQuantity

  return {
    success: true,
    message: 'Phòng còn khả dụng trong dữ liệu mock.',
    data: {
      is_available: isAvailable,
      available_quantity: room.available_quantity,
      selected_room_id: room.id,
      checkin_date,
      checkout_date,
      guests: Number(guests) || 1,
      hotel_service_id: hotel.id,
    },
  }
}

export async function buildHotelCartItemPayload({
  hotel_service_id,
  selected_room_id,
  checkin_date,
  checkout_date,
  guests = 1,
  room_quantity = 1,
} = {}) {
  // TODO: replace mock cart payload with POST /cart/items in integration phase.
  const hotel = hotelServiceFixtures.find((item) => item.id === hotel_service_id) ?? null
  const room = getHotelRoomsFixtureByHotelServiceId(hotel_service_id).find(
    (item) => item.id === selected_room_id,
  )

  if (!hotel || !room) {
    return {
      success: false,
      message: 'Không thể chuẩn bị dữ liệu đặt phòng mock.',
      data: null,
    }
  }

  const nights = calculateNightCount(checkin_date, checkout_date)
  const quantity = Math.max(Number(room_quantity) || 1, 1)

  return {
    success: true,
    message: 'Đã chuẩn bị dữ liệu thêm vào giỏ hàng.',
    data: {
      service_id: room.id,
      service_type: SERVICE_TYPES.room,
      reference_id: room.hotel_service_id,
      start_at: buildDateTimeStamp(checkin_date, hotel.checkin_time),
      end_at: buildDateTimeStamp(checkout_date, hotel.checkout_time),
      quantity,
      unit_price_snapshot: room.sale_price * nights,
      options: buildHotelBookingOptions({
        hotel,
        room,
        guests: Number(guests) || 1,
        roomQuantity: quantity,
        nights,
        checkinDate: checkin_date,
        checkoutDate: checkout_date,
      }),
    },
  }
}
