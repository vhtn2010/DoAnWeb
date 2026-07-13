import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DEFAULT_HOTEL_SEARCH_VALUES } from '../constants/hotels.js'
import { mapHotelDetailResponseToView } from '../mappers/hotelMappers.generated.js'
import { addCartItem, addCartItemPreview } from '../repositories/cartRepository.js'
import { getHotelDetailBySlug, getHotelRooms } from '../repositories/hotelRepository.js'
import useFavorites from './useFavorites.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import usePublicAccessGate from './usePublicAccessGate.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'
import {
  buildFavoriteItem,
  buildFavoriteKey,
  buildFavoriteSourcePath,
  getFavoriteSourceLabel,
} from '../services/favoriteStorage.js'

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

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

function createAvailabilityState() {
  return {
    checked: false,
    data: null,
    isAvailable: false,
    message: '',
  }
}

function buildCartItemFromPayload({ hotel, payload, room }) {
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
  const { openLoginRequiredModal } = usePublicAccessGate()
  const { authState, currentUser, isAuthenticatedCustomer, isCustomer } = usePublicSession()
  const { hasFavorite, toggleFavorite } = useFavorites({ currentUser })

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
  const [availability, setAvailability] = useState(() => createAvailabilityState())
  const [reloadSeed, setReloadSeed] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        behavior: 'smooth',
        left: 0,
        top: 0,
      })
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
            detail_path: buildPublicAuthPath(`/hotels/${relatedHotel.slug}`, isCustomer),
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
  const favoriteItem = useMemo(() => {
    if (!hotel) {
      return null
    }

    return buildFavoriteItem({
      favorite_key: buildFavoriteKey('hotel', hotel.service_id ?? hotel.id ?? hotel.slug),
      service_type: 'hotel',
      service_id: hotel.service_id ?? hotel.id ?? '',
      slug: hotel.slug,
      title: hotel.title,
      image_url: hotel.image_url,
      detail_path: hotel.detail_path ?? `/hotels/${hotel.slug}`,
      source_path: buildFavoriteSourcePath(location),
      source_label: getFavoriteSourceLabel('hotel'),
      summary: hotel.address ?? hotel.location_text ?? '',
      location_text: hotel.location_text ?? hotel.address ?? '',
    })
  }, [hotel, location])
  const isFavorite = favoriteItem ? hasFavorite(favoriteItem.favorite_key) : false
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
        data: null,
        isAvailable: false,
        message: 'Chưa có phòng nào được chọn để kiểm tra.',
      })
      return {
        data: null,
        success: false,
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
      : 'Lựa chọn hiện tại chưa khả dụng. Vui lòng đổi ngày hoặc số khách.'

    setAvailability({
      checked: true,
      data: response.data,
      isAvailable,
      message: nextMessage,
    })

    if (!isAvailable) {
      setFeedback(createFeedbackState('error', nextMessage))
    }

    return response
  }

  async function addSelectedRoomToCart({ roomIdOverride } = {}) {
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
    const payload = {
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
      reference_id: nextRoom.id,
      service_id: hotel.id,
      service_type: hotel.service_type ?? 'hotel',
      start_at: buildDateTimeStamp(checkinDate, hotel.checkin_time),
      unit_price_snapshot: resolveCurrentPrice(nextRoom) * Math.max(nights, 1),
    }

    const cartItem = buildCartItemFromPayload({
      hotel,
      payload,
      room: nextRoom,
    })

    if (isAuthenticatedCustomer) {
      await addCartItem(payload, {
        authState,
        previewItem: cartItem,
      })
      setFeedback(createFeedbackState('success', 'Phòng đã được thêm vào giỏ hàng của bạn.'))
      return {
        cartItem,
        payload,
        success: true,
      }
    }

    await addCartItemPreview({
      authState,
      item: cartItem,
    })
    setFeedback(
      createFeedbackState(
        'success',
        'Phòng đã được thêm vào giỏ hàng xem trước. Đăng nhập để đồng bộ với tài khoản của bạn.',
      ),
    )

    return {
      cartItem,
      payload,
      success: true,
    }
  }

  async function goToCartAction(roomIdOverride) {
    if (!isAuthenticatedCustomer) {
      openLoginRequiredModal({
        description: 'Đăng nhập để lưu phòng bạn chọn và tiếp tục đặt chỗ thuận tiện hơn.',
        eyebrow: 'Giỏ hàng',
        title: 'Vui lòng đăng nhập để có thể thêm vào giỏ hàng',
      })
      return
    }

    const result = await addSelectedRoomToCart({ roomIdOverride })

    if (!result.success) {
      return
    }
  }

  async function goToCheckoutAction(roomIdOverride) {
    if (!isAuthenticatedCustomer) {
      openLoginRequiredModal({
        description:
          'Đăng nhập để giữ lại phòng đang chọn, nhập thông tin khách lưu trú và hoàn tất đặt chỗ thuận tiện hơn.',
        eyebrow: 'Thanh toán',
        title: 'Vui lòng đăng nhập để tiếp tục bước đặt chỗ',
      })
      return
    }

    const result = await addSelectedRoomToCart({ roomIdOverride })

    if (!result.success) {
      return
    }

    navigate(buildPublicAuthPath('/cart', isCustomer))
  }

  function retry() {
    setReloadSeed((currentValue) => currentValue + 1)
  }

  function handleToggleFavorite() {
    if (!favoriteItem) {
      return
    }

    const result = toggleFavorite(favoriteItem)

    if (!result.updated) {
      return
    }

    setFeedback(
      createFeedbackState(
        result.nextState ? 'success' : 'info',
        result.nextState
          ? 'Khách sạn đã được lưu vào danh sách yêu thích.'
          : 'Khách sạn đã được bỏ khỏi danh sách yêu thích.',
      ),
    )
  }

  return {
    addSelectedRoomToCart,
    availability,
    breadcrumbHomePath: buildPublicAuthPath('/', isCustomer),
    breadcrumbListPath: buildPublicAuthPath('/hotels', isCustomer),
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
    goToCartAction,
    goToCartMock: goToCartAction,
    goToCheckoutAction,
    goToCheckoutMock: goToCheckoutAction,
    guests,
    hotel,
    isFavorite,
    isCustomer,
    loading,
    relatedHotels,
    retry,
    roomQuantity,
    rooms,
    selectRoom,
    selectedRoom,
    selectedRoomId,
    stayNights,
    handleToggleFavorite,
    updateDateRange,
    updateGuests,
    updateRoomQuantity,
  }
}
