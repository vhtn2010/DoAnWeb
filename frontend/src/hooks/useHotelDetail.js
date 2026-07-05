import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { DEFAULT_HOTEL_SEARCH_VALUES } from '../constants/hotels.js'
import { ROLES } from '../constants/roles.js'
import { mapHotelDetailResponseToView } from '../mappers/hotelMappers.js'
import { addCartItemPreview } from '../repositories/cartRepository.js'
import {
  buildHotelCartItemPayload,
  checkHotelAvailability,
  getHotelDetailBySlug,
  getHotelRooms,
} from '../repositories/hotelRepository.js'
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

export default function useHotelDetail() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
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
        setRooms(mappedState.rooms)
        setRelatedHotels(
          mappedState.relatedHotels.map((relatedHotel) => ({
            ...relatedHotel,
            detail_path: buildAuthAwarePath(`/hotels/${relatedHotel.slug}`, isCustomer),
          })),
        )
        setSelectedRoomId('')
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

    const response = await checkHotelAvailability({
      hotel_service_id: hotel.id,
      selected_room_id: nextRoom.id,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      guests,
      quantity: roomQuantity,
    })

    const isAvailable = Boolean(response.data?.is_available)
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

    const payloadResponse = await buildHotelCartItemPayload({
      hotel_service_id: hotel.id,
      selected_room_id: nextRoom.id,
      checkin_date: checkinDate,
      checkout_date: checkoutDate,
      guests,
      room_quantity: roomQuantity,
    })

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
    updateDateRange,
    updateGuests,
    updateRoomQuantity,
    addSelectedRoomToCartMock,
  }
}
