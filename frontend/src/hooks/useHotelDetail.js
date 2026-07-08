import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_HOTEL_SEARCH_VALUES } from '../constants/hotels.js'
import { ROLES } from '../constants/roles.js'
import { mapHotelDetailResponseToView } from '../mappers/hotelMappers.generated.js'
import { addCartItemPreview } from '../repositories/cartRepository.js'
import { getHotelDetailBySlug, getHotelRooms } from '../repositories/hotelRepository.js'
import { hasCustomerSession } from '../utils/authSession.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

function convertDisplayDateToInput(value) {
  const [dayText, monthText, yearText] = String(value ?? '').split('-')

  if (!dayText || !monthText || !yearText) {
    return ''
  }

  return `${yearText}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')}`
}

function parseInputDate(value) {
  const [yearText, monthText, dayText] = String(value ?? '').split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (!year || !month || !day) {
    return null
  }

  return new Date(year, month - 1, day)
}

function calculateStayNights(checkinDate, checkoutDate) {
  const checkin = parseInputDate(checkinDate)
  const checkout = parseInputDate(checkoutDate)

  if (!checkin || !checkout) {
    return 0
  }

  return Math.max(
    0,
    Math.round((checkout.getTime() - checkin.getTime()) / 86400000),
  )
}

function resolveCurrentPrice(item = {}) {
  const basePrice = Number(item.base_price ?? 0)
  const salePrice = item.sale_price == null ? null : Number(item.sale_price)

  if (salePrice != null && Number.isFinite(salePrice) && salePrice < basePrice) {
    return salePrice
  }

  return basePrice
}

function normalizeTimeValue(value) {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return ''
  }

  return normalizedValue.length === 5 ? `${normalizedValue}:00` : normalizedValue
}

function buildDateTimeStamp(dateText, timeText) {
  const normalizedTime = normalizeTimeValue(timeText)

  if (!dateText || !normalizedTime) {
    return ''
  }

  return `${dateText}T${normalizedTime}+07:00`
}

function buildAuthAwarePath(path, isCustomer) {
  return isCustomer ? `${path}?auth=customer` : path
}

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

function createAvailabilityState() {
  return {
    checked: false,
    isAvailable: false,
    message: '',
    data: null,
  }
}

function buildLoginPath(pathname, search = '') {
  const nextPath = buildAuthAwarePath(pathname, true)
  const nextSearchParams = new URLSearchParams(search)
  nextSearchParams.set('redirect', nextPath)

  return `/login?${nextSearchParams.toString()}`
}

function buildCartItemFromPayload({ hotel, room, payload }) {
  return {
    id: `cart-item-room-${Date.now()}`,
    service_id: payload.service_id,
    service_type: payload.service_type,
    reference_id: payload.reference_id,
    start_at: payload.start_at,
    end_at: payload.end_at,
    quantity: payload.quantity,
    unit_price_snapshot: payload.unit_price_snapshot,
    options: {
      ...(payload.options ?? {}),
    },
    created_at: new Date().toISOString(),
    service: {
      service_code: hotel.service_code,
      title: hotel.title,
      slug: hotel.slug,
      short_description: hotel.short_description,
      location_text: hotel.location_text,
      image_url: room.image_url ?? hotel.image_url,
      status: hotel.status,
    },
  }
}

function buildHotelBookingOptions({
  checkinDate,
  checkoutDate,
  guests,
  hotel,
  nights,
  room,
  roomQuantity,
}) {
  return {
    bed_type: room.bed_type,
    checkin_date: checkinDate,
    checkout_date: checkoutDate,
    guest_count: guests,
    hotel_name: hotel.title,
    nights,
    room_name: room.title,
    room_quantity: roomQuantity,
    room_size: room.room_size,
    selected_options: {
      ...(room.options ?? {}),
    },
  }
}

export default function useHotelDetail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const isAuthenticatedCustomer = hasCustomerSession()
  const authState =
    searchParams.get('auth') === ROLES.customer || isAuthenticatedCustomer
      ? ROLES.customer
      : ROLES.guest
  const isCustomer = authState === ROLES.customer

  const [hotel, setHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [relatedHotels, setRelatedHotels] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [checkinDate, setCheckinDate] = useState(() =>
    convertDisplayDateToInput(DEFAULT_HOTEL_SEARCH_VALUES.checkin),
  )
  const [checkoutDate, setCheckoutDate] = useState(() =>
    convertDisplayDateToInput(DEFAULT_HOTEL_SEARCH_VALUES.checkout),
  )
  const [guests, setGuests] = useState(2)
  const [roomQuantity, setRoomQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false)
  const [availability, setAvailability] = useState(() => createAvailabilityState())
  const [reloadSeed, setReloadSeed] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [slug])

  useEffect(() => {
    let isActive = true

    async function loadHotelDetail() {
      setLoading(true)
      setError('')
      setFeedback(createFeedbackState())

      try {
        const detailResponse = await getHotelDetailBySlug(slug)

        if (!isActive) {
          return
        }

        if (!detailResponse.success || !detailResponse.data?.hotel) {
          setHotel(null)
          setRooms([])
          setRelatedHotels([])
          setError(detailResponse.message ?? 'Không tìm thấy khách sạn.')
          return
        }

        const roomsResponse = await getHotelRooms(detailResponse.data.hotel.id)

        if (!isActive) {
          return
        }

        const mappedState = mapHotelDetailResponseToView(
          {
            hotel: detailResponse.data.hotel,
            rooms: roomsResponse.data,
            related_hotels: detailResponse.data.related_hotels,
          },
          {
            detailPathPrefix: '/hotels',
          },
        )

        setHotel(mappedState.hotel)
        setRooms(
          mappedState.rooms.map((room) => ({
            ...room,
            gallery:
              Array.isArray(room.gallery) && room.gallery.length > 0
                ? room.gallery
                : mappedState.hotel.gallery,
            image_url: room.image_url || mappedState.hotel.image_url,
          })),
        )
        setRelatedHotels(
          mappedState.relatedHotels.map((relatedHotel) => ({
            ...relatedHotel,
            detail_path: buildAuthAwarePath(`/hotels/${relatedHotel.slug}`, isCustomer),
          })),
        )
        setSelectedRoomId(mappedState.rooms[0]?.id ?? '')
        setSelectedImage(mappedState.hotel.gallery[0] ?? mappedState.hotel.image_url)
        setAvailability(createAvailabilityState())
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setHotel(null)
        setRooms([])
        setRelatedHotels([])
        setError(loadError?.message ?? 'Không thể tải chi tiết khách sạn lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadHotelDetail()

    return () => {
      isActive = false
    }
  }, [isCustomer, reloadSeed, slug])

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? null,
    [rooms, selectedRoomId],
  )
  const stayNights = useMemo(
    () => calculateStayNights(checkinDate, checkoutDate),
    [checkinDate, checkoutDate],
  )

  function selectRoom(roomId) {
    setSelectedRoomId(roomId)
    setFeedback(createFeedbackState('info', 'Đã cập nhật phòng bạn đang quan tâm.'))
    setAvailability(createAvailabilityState())
  }

  function resolveRoom(roomIdOverride) {
    if (roomIdOverride) {
      return rooms.find((room) => room.id === roomIdOverride) ?? null
    }

    return selectedRoom
  }

  function updateDateRange({ checkinDate: nextCheckinDate, checkoutDate: nextCheckoutDate }) {
    if (nextCheckinDate) {
      setCheckinDate(nextCheckinDate)
    }

    if (nextCheckoutDate) {
      setCheckoutDate(nextCheckoutDate)
    }

    setAvailability(createAvailabilityState())
    setFeedback(createFeedbackState())
  }

  function updateGuests(nextGuests) {
    setGuests(Math.max(1, Number(nextGuests) || 1))
    setAvailability(createAvailabilityState())
  }

  function updateRoomQuantity(nextRoomQuantity) {
    setRoomQuantity(Math.max(1, Number(nextRoomQuantity) || 1))
    setAvailability(createAvailabilityState())
  }

  async function checkAvailabilityForRoom(roomIdOverride) {
    const nextRoom = resolveRoom(roomIdOverride)

    if (!hotel || !nextRoom) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn phòng trước khi tiếp tục.'))
      setAvailability({
        checked: true,
        isAvailable: false,
        message: 'Chưa có phòng nào được chọn để kiểm tra.',
        data: null,
      })
      return {
        success: false,
        data: null,
      }
    }

    const requestedGuests = Math.max(1, Number(guests) || 1)
    const requestedQuantity = Math.max(1, Number(roomQuantity) || 1)
    const maxGuests =
      Number(nextRoom.max_guests) ||
      Number(nextRoom.max_adults ?? 0) + Number(nextRoom.max_children ?? 0)
    const isAvailable =
      calculateStayNights(checkinDate, checkoutDate) >= 1 &&
      requestedGuests <= Math.max(1, maxGuests) &&
      requestedQuantity <= Number(nextRoom.available_quantity ?? 0)
    const response = {
      data: {
        available_quantity: Number(nextRoom.available_quantity ?? 0),
        checkin_date: checkinDate,
        checkout_date: checkoutDate,
        guests: requestedGuests,
        hotel_service_id: hotel.id,
        is_available: isAvailable,
        selected_room_id: nextRoom.id,
      },
      success: true,
    }
    const nextMessage = isAvailable
      ? `Còn ${response.data?.available_quantity ?? 0} phòng khả dụng cho lựa chọn hiện tại.`
      : 'Lựa chọn hiện tại chưa khả dụng trong dữ liệu mock. Vui lòng đổi ngày hoặc số khách.'

    setAvailability({
      checked: true,
      isAvailable,
      message: nextMessage,
      data: response.data,
    })

    if (!isAvailable) {
      setFeedback(createFeedbackState('error', nextMessage))
    }

    return response
  }

  async function addSelectedRoomToCartMock({ roomIdOverride } = {}) {
    const nextRoom = resolveRoom(roomIdOverride)

    if (!hotel || !nextRoom) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn phòng trước khi đặt.'))
      return {
        success: false,
      }
    }

    if (selectedRoomId !== nextRoom.id) {
      setSelectedRoomId(nextRoom.id)
    }

    const availabilityResponse = await checkAvailabilityForRoom(nextRoom.id)

    if (!availabilityResponse.success || !availabilityResponse.data?.is_available) {
      return {
        success: false,
      }
    }

    const requestedGuests = Math.max(1, Number(guests) || 1)
    const requestedQuantity = Math.max(1, Number(roomQuantity) || 1)
    const nights = calculateStayNights(checkinDate, checkoutDate)
    const payloadResponse = {
      data: {
        end_at: buildDateTimeStamp(checkoutDate, hotel.checkout_time),
        options: buildHotelBookingOptions({
          checkinDate,
          checkoutDate,
          guests: requestedGuests,
          hotel,
          nights,
          room: nextRoom,
          roomQuantity: requestedQuantity,
        }),
        quantity: requestedQuantity,
        reference_id: nextRoom.hotel_service_id,
        service_id: nextRoom.id,
        service_type: nextRoom.service_type,
        start_at: buildDateTimeStamp(checkinDate, hotel.checkin_time),
        unit_price_snapshot: resolveCurrentPrice(nextRoom) * nights,
      },
      success: true,
    }

    if (!payloadResponse.success || !payloadResponse.data) {
      setFeedback(createFeedbackState('error', payloadResponse.message ?? 'Không thể chuẩn bị đặt phòng mock.'))
      return {
        success: false,
      }
    }

    const cartItem = buildCartItemFromPayload({
      hotel,
      room: nextRoom,
      payload: payloadResponse.data,
    })

    await addCartItemPreview({
      authState,
      item: cartItem,
    })

    setFeedback(
      createFeedbackState(
        'success',
        'Đã tạo payload mock và thêm phòng vào giỏ hàng preview.',
      ),
    )

    return {
      success: true,
      cartItem,
      payload: payloadResponse.data,
    }
  }

  async function goToCartMock(roomIdOverride) {
    if (!isAuthenticatedCustomer) {
      setIsLoginPromptOpen(true)
      return
    }

    const result = await addSelectedRoomToCartMock({ roomIdOverride })

    if (!result.success) {
      return
    }

    navigate(buildAuthAwarePath('/cart', isCustomer))
  }

  async function goToCheckoutMock(roomIdOverride) {
    const result = await addSelectedRoomToCartMock({ roomIdOverride })

    if (!result.success) {
      return
    }

    navigate(buildAuthAwarePath('/checkout', isCustomer), {
      state: {
        selectedCartItemIds: [result.cartItem.id],
      },
    })
  }

  function retry() {
    setReloadSeed((currentValue) => currentValue + 1)
  }

  function closeLoginPrompt() {
    setIsLoginPromptOpen(false)
  }

  function goToLoginFromPrompt() {
    setIsLoginPromptOpen(false)
    navigate(buildLoginPath(location.pathname, location.search))
  }

  return {
    availability,
    breadcrumbHomePath: buildAuthAwarePath('/', isCustomer),
    breadcrumbListPath: buildAuthAwarePath('/hotels', isCustomer),
    checkAvailability: checkAvailabilityForRoom,
    checkinDate,
    checkoutDate,
    error,
    feedback,
    formatCurrency: formatCurrencyVND,
    galleryState: {
      images: hotel?.gallery ?? [],
      selectedImage,
      setSelectedImage,
    },
    goToCartMock,
    goToCheckoutMock,
    guests,
    hotel,
    isLoginPromptOpen,
    isCustomer,
    loading,
    closeLoginPrompt,
    goToLoginFromPrompt,
    relatedHotels,
    retry,
    roomQuantity,
    rooms,
    selectRoom,
    selectedRoom,
    selectedRoomId,
    stayNights,
    updateDateRange,
    updateGuests,
    updateRoomQuantity,
    addSelectedRoomToCartMock,
  }
}
