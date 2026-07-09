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
  return diffInDays >= 1 ? diffInDays : 0
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
    nextHotels.sort(
      (first, second) => (second.details?.star_rating ?? 0) - (first.details?.star_rating ?? 0),
    )
    return nextHotels
  }

  return nextHotels
}

function cloneValue(value) {
  return JSON.parse(JSON.stringify(value))
}

function mapHotelFixture(hotel = {}) {
  return {
    ...cloneValue(hotel),
    address: hotel.details?.address ?? '',
    amenities: cloneValue(hotel.details?.amenities ?? []),
    checkin_time: hotel.details?.checkin_time ?? '14:00',
    checkout_time: hotel.details?.checkout_time ?? '12:00',
    rating: Number(hotel.details?.star_rating ?? 0),
    review_count: Array.isArray(hotel.details?.review_items)
      ? hotel.details.review_items.length
      : 0,
  }
}

function mapRoomFixture(room = {}, hotel = {}) {
  return {
    id: room.id,
    hotel_service_id: room.hotel_service_id ?? hotel.id,
    service_type: SERVICE_TYPES.room,
    title: room.name ?? '',
    slug: `${hotel.slug ?? hotel.id ?? 'hotel'}-${room.id ?? 'room'}`,
    short_description: room.description ?? '',
    description: room.description ?? '',
    location_text: hotel.location_text ?? '',
    base_price: Number(room.base_price ?? hotel.base_price ?? 0),
    sale_price: Number(room.base_price ?? hotel.sale_price ?? 0),
    currency: hotel.currency ?? 'VND',
    status: room.status ?? SERVICE_STATUSES.active,
    image_url: hotel.image_url ?? '',
    bed_type: room.bed_type ?? '',
    room_size: room.room_size ?? '',
    max_guests: Number(room.max_adults ?? 1) + Number(room.max_children ?? 0),
    max_adults: Number(room.max_adults ?? 1),
    max_children: Number(room.max_children ?? 0),
    total_quantity: Number(room.total_rooms ?? 0),
    available_quantity: Number(room.available_rooms ?? 0),
    options: {},
  }
}

function getHotelFixtureBySlug(slug) {
  return hotelServiceFixtures.find((hotel) => hotel.slug === slug) ?? null
}

function getHotelRoomsFixtureByHotelServiceId(hotelServiceId) {
  const hotel = hotelServiceFixtures.find((item) => item.id === hotelServiceId) ?? null

  if (!hotel || !Array.isArray(hotel.room_types)) {
    return []
  }

  return hotel.room_types.map((room) => mapRoomFixture(room, hotel))
}

function buildHotelBookingOptions({
  hotel,
  room,
  guests,
  roomQuantity,
  nights,
  checkinDate,
  checkoutDate,
}) {
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

export async function getHotelDetailBySlug(slug) {
  const hotel = getHotelFixtureBySlug(slug)

  if (
    !hotel ||
    hotel.service_type !== SERVICE_TYPES.hotel ||
    hotel.status !== SERVICE_STATUSES.active
  ) {
    return {
      success: false,
      message: 'Hotel not found.',
      data: null,
    }
  }

  const rooms = getHotelRoomsFixtureByHotelServiceId(hotel.id).filter(
    (room) => room.service_type === SERVICE_TYPES.room && room.status === SERVICE_STATUSES.active,
  )

  return {
    success: true,
    message: 'OK',
    data: {
      hotel: mapHotelFixture(hotel),
      rooms: cloneValue(rooms),
      related_hotels: [],
    },
  }
}

export async function getHotelRooms(hotelServiceId) {
  const rooms = getHotelRoomsFixtureByHotelServiceId(hotelServiceId).filter(
    (room) => room.service_type === SERVICE_TYPES.room && room.status === SERVICE_STATUSES.active,
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
  const hotel = hotelServiceFixtures.find((item) => item.id === hotel_service_id) ?? null
  const room = getHotelRoomsFixtureByHotelServiceId(hotel_service_id).find(
    (item) => item.id === selected_room_id,
  )

  if (!hotel || !room) {
    return {
      success: false,
      message: 'Room not found.',
      data: null,
    }
  }

  const isDateRangeValid =
    Boolean(parseIsoDateValue(checkin_date)) &&
    Boolean(parseIsoDateValue(checkout_date)) &&
    calculateNightCount(checkin_date, checkout_date) >= 1
  const requestedQuantity = Math.max(Number(quantity) || 1, 1)
  const isGuestCountValid = Number(guests) >= 1 && Number(guests) <= Number(room.max_guests)
  const isAvailable =
    isDateRangeValid &&
    isGuestCountValid &&
    room.status === SERVICE_STATUSES.active &&
    room.available_quantity >= requestedQuantity

  return {
    success: true,
    message: 'Mock availability checked.',
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
  const hotel = hotelServiceFixtures.find((item) => item.id === hotel_service_id) ?? null
  const room = getHotelRoomsFixtureByHotelServiceId(hotel_service_id).find(
    (item) => item.id === selected_room_id,
  )

  if (!hotel || !room) {
    return {
      success: false,
      message: 'Cannot prepare mock booking payload.',
      data: null,
    }
  }

  const nights = calculateNightCount(checkin_date, checkout_date)
  const quantity = Math.max(Number(room_quantity) || 1, 1)
  const mappedHotel = mapHotelFixture(hotel)

  return {
    success: true,
    message: 'Mock booking payload prepared.',
    data: {
      service_id: room.id,
      service_type: SERVICE_TYPES.room,
      reference_id: room.hotel_service_id,
      start_at: buildDateTimeStamp(checkin_date, mappedHotel.checkin_time),
      end_at: buildDateTimeStamp(checkout_date, mappedHotel.checkout_time),
      quantity,
      unit_price_snapshot: room.sale_price * nights,
      options: buildHotelBookingOptions({
        hotel: mappedHotel,
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
