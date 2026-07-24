import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAddToCartToast } from '../components/public/feedback/addToCartToastContext.js'
import { mapHotelDetailResponseToView } from '../mappers/hotelMappers.generated.js'
import { addCartItem, addCartItemPreview } from '../repositories/cartRepository.js'
import {
  checkHotelAvailability,
  getHotelDetailBySlug,
  getHotelRooms,
} from '../repositories/hotelRepository.js'
import { getPublicTourComments } from '../repositories/commentRepository.js'
import { getPublicTourReviews } from '../repositories/reviewRepository.js'
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
import { createPricingSummaryViewFromItem } from '../utils/pricingSummaryView.js'

function formatInputDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

function normalizeDateToInput(value) {
  const normalizedValue = String(value ?? '').trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedValue)) {
    return normalizedValue
  }

  const [dayText, monthText, yearText] = normalizedValue.split('-')

  if (!dayText || !monthText || !yearText) {
    return ''
  }

  return `${yearText}-${monthText.padStart(2, '0')}-${dayText.padStart(2, '0')}`
}

function addDaysToInputDate(value, dayCount = 1) {
  const date = parseInputDate(value)

  if (!date) {
    return ''
  }

  date.setDate(date.getDate() + dayCount)

  return formatInputDate(date)
}

function resolveDateRangeFromSearch(search = '') {
  const searchParams = new URLSearchParams(search)
  const checkinDate = normalizeDateToInput(searchParams.get('checkin'))
  let checkoutDate = normalizeDateToInput(searchParams.get('checkout'))

  if (checkinDate && calculateStayNights(checkinDate, checkoutDate) < 1) {
    checkoutDate = addDaysToInputDate(checkinDate, 1)
  }

  return {
    checkinDate,
    checkoutDate,
  }
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
  roomPrice,
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
    room_price: roomPrice,
    room_quantity: roomQuantity,
    room_size: room.room_size,
    selected_options: {
      ...(room.options ?? {}),
    },
  }
}

function formatCompactReviewCount(reviewCount = 0) {
  const numericCount = Number(reviewCount ?? 0)

  if (numericCount >= 1000) {
    return `${(numericCount / 1000).toFixed(1).replace('.0', '')}k`
  }

  return String(numericCount)
}

function buildHotelCartPayload({
  checkinDate,
  checkoutDate,
  guests,
  hotel,
  room,
  roomQuantity,
}) {
  if (!hotel || !room) {
    return null
  }

  const nights = calculateStayNights(checkinDate, checkoutDate)

  if (nights < 1) {
    return null
  }

  const requestedGuests = Math.max(1, Number(guests) || 1)
  const requestedQuantity = Math.max(1, Number(roomQuantity) || 1)
  const roomPrice = resolveCurrentPrice(room)

  return {
    end_at: buildDateTimeStamp(checkoutDate, hotel.checkout_time),
    options: buildHotelBookingOptions({
      checkinDate,
      checkoutDate,
      guests: requestedGuests,
      hotel,
      nights,
      room,
      roomPrice,
      roomQuantity: requestedQuantity,
    }),
    quantity: requestedQuantity,
    reference_id: room.id,
    service_id: hotel.id,
    service_type: hotel.service_type ?? 'hotel',
    start_at: buildDateTimeStamp(checkinDate, hotel.checkin_time),
    unit_price_snapshot: roomPrice * Math.max(nights, 1),
  }
}

export default function useHotelDetail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const { openLoginRequiredModal } = usePublicAccessGate()
  const { authState, currentUser, isAuthenticatedCustomer, isCustomer } = usePublicSession()
  const { showAddToCartToast } = useAddToCartToast()
  const { hasFavorite, toggleFavorite } = useFavorites({ currentUser })

  const [hotel, setHotel] = useState(null)
  const [rooms, setRooms] = useState([])
  const [relatedHotels, setRelatedHotels] = useState([])
  const [selectedRoomId, setSelectedRoomId] = useState('')
  const [checkinDate, setCheckinDate] = useState(() =>
    resolveDateRangeFromSearch(location.search).checkinDate,
  )
  const [checkoutDate, setCheckoutDate] = useState(() =>
    resolveDateRangeFromSearch(location.search).checkoutDate,
  )
  const [guests, setGuests] = useState(2)
  const [roomQuantity, setRoomQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())
  const [availability, setAvailability] = useState(() => createAvailabilityState())
  const [pendingAction, setPendingAction] = useState('')
  const [reloadSeed, setReloadSeed] = useState(0)
  const pendingActionRef = useRef('')

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
    const nextDateRange = resolveDateRangeFromSearch(location.search)

    setCheckinDate((currentDate) =>
      currentDate === nextDateRange.checkinDate ? currentDate : nextDateRange.checkinDate,
    )
    setCheckoutDate((currentDate) =>
      currentDate === nextDateRange.checkoutDate ? currentDate : nextDateRange.checkoutDate,
    )
  }, [location.search])

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

        const hotelId = detailResponse.data.hotel.id
        const [roomsResponse, reviewsResponse, commentsResponse] = await Promise.all([
          getHotelRooms(hotelId),
          getPublicTourReviews(hotelId, { limit: 12 }).catch(() => ({
            data: [],
            meta: { summary: null },
          })),
          getPublicTourComments(hotelId, { limit: 20 }).catch(() => ({
            data: [],
            meta: { comment_count: 0 },
          })),
        ])

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

        const reviewSummary = reviewsResponse.meta?.summary ?? null
        const reviewCount = Number(
          reviewSummary?.review_count ?? mappedState.hotel.review_count ?? 0,
        )
        const ratingValue = Number(
          reviewSummary?.average_rating ?? mappedState.hotel.rating ?? 0,
        )

        setHotel({
          ...mappedState.hotel,
          comment_samples: Array.isArray(commentsResponse.data) ? commentsResponse.data : [],
          comment_summary: {
            comment_count: Number(commentsResponse.meta?.comment_count || 0),
          },
          display_review_count: formatCompactReviewCount(reviewCount),
          display_rating_text: `${ratingValue.toFixed(1)} / 5.0`,
          rating: ratingValue,
          review_count: reviewCount,
          review_samples: Array.isArray(reviewsResponse.data) ? reviewsResponse.data : [],
          review_summary: reviewSummary,
        })
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
  const pricingSummary = useMemo(() => {
    const pricingSource = selectedRoom || hotel

    if (!hotel || !pricingSource) {
      return createPricingSummaryViewFromItem(null)
    }

    const unitRoomPrice = resolveCurrentPrice(pricingSource)
    const requestedQuantity = Math.max(1, Number(roomQuantity) || 1)
    const estimatedNights = Math.max(stayNights, 1)

    return createPricingSummaryViewFromItem(
      {
        id: selectedRoom?.id || hotel.id,
        quantity: requestedQuantity,
        service_type: selectedRoom?.service_type ?? hotel.service_type ?? 'hotel',
        unit_price: unitRoomPrice,
        unit_price_snapshot: unitRoomPrice * estimatedNights,
        options: {
          nights: estimatedNights,
          room_price: unitRoomPrice,
          room_quantity: requestedQuantity,
        },
      },
    )
  }, [hotel, roomQuantity, selectedRoom, stayNights])

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

  async function checkAvailabilityForRoom(roomIdOverride, { shouldShowAvailableMessage = true } = {}) {
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
    const stayNights = calculateStayNights(checkinDate, checkoutDate)

    if (stayNights < 1) {
      const dateMessage = 'Vui lòng chọn ngày nhận và trả phòng hợp lệ.'

      setAvailability({
        checked: true,
        data: null,
        isAvailable: false,
        message: dateMessage,
      })
      setFeedback(createFeedbackState('error', dateMessage))
      return {
        data: null,
        success: false,
      }
    }

    let response

    try {
      response = await checkHotelAvailability({
        adults: requestedGuests,
        children: 0,
        quantity: requestedQuantity,
        reference_id: nextRoom.id,
        service_id: hotel.id,
        start_at: buildDateTimeStamp(checkinDate, hotel.checkin_time),
      })
    } catch (availabilityError) {
      const nextMessage =
        availabilityError?.message ?? 'Không thể kiểm tra tình trạng phòng lúc này.'

      setAvailability({
        checked: true,
        data: null,
        isAvailable: false,
        message: nextMessage,
      })
      setFeedback(createFeedbackState('error', nextMessage))
      return {
        data: null,
        success: false,
      }
    }

    const isAvailable = Boolean(response.success && response.data?.is_available)
    const responseData = response.data
      ? {
          ...response.data,
          checkin_date: checkinDate,
          checkout_date: checkoutDate,
          guests: requestedGuests,
          hotel_service_id: hotel.id,
          selected_room_id: nextRoom.id,
        }
      : null
    const nextMessage = isAvailable
      ? `Còn ${responseData?.available_quantity ?? 0} phòng khả dụng cho lựa chọn hiện tại.`
      : (response.message ?? 'Lựa chọn hiện tại chưa khả dụng. Vui lòng đổi ngày hoặc số khách.')

    const nextAvailability = {
      checked: true,
      data: responseData,
      isAvailable,
      message: nextMessage,
    }

    setAvailability(
      shouldShowAvailableMessage || !isAvailable
        ? nextAvailability
        : createAvailabilityState(),
    )

    if (!isAvailable) {
      setFeedback(createFeedbackState('error', nextMessage))
    }

    return {
      ...response,
      data: responseData,
    }
  }

  async function addSelectedRoomToCart({ roomIdOverride, shouldShowCartToast = false } = {}) {
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

    const availabilityResponse = await checkAvailabilityForRoom(nextRoom.id, {
      shouldShowAvailableMessage: false,
    })

    if (!availabilityResponse.success || !availabilityResponse.data?.is_available) {
      return {
        success: false,
      }
    }

    const payload = buildHotelCartPayload({
      checkinDate,
      checkoutDate,
      guests,
      hotel,
      room: nextRoom,
      roomQuantity,
    })

    if (!payload) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn ngày nhận và trả phòng hợp lệ.'))
      return {
        success: false,
      }
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
      if (shouldShowCartToast) {
        showAddToCartToast()
      }
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
    if (shouldShowCartToast) {
      showAddToCartToast()
    }

    return {
      cartItem,
      payload,
      success: true,
    }
  }

  async function goToCartAction(roomIdOverride) {
    if (pendingActionRef.current) {
      return
    }

    if (!isAuthenticatedCustomer) {
      openLoginRequiredModal({
        description: 'Đăng nhập để lưu phòng bạn chọn và tiếp tục đặt chỗ thuận tiện hơn.',
        eyebrow: 'Giỏ hàng',
        title: 'Vui lòng đăng nhập để có thể thêm vào giỏ hàng',
      })
      return
    }

    pendingActionRef.current = 'cart'
    setPendingAction('cart')

    try {
      await addSelectedRoomToCart({
        roomIdOverride,
        shouldShowCartToast: true,
      })
    } catch (actionError) {
      setFeedback(
        createFeedbackState(
          'error',
          actionError?.message ?? 'Không thể thêm phòng vào giỏ hàng lúc này.',
        ),
      )
    } finally {
      pendingActionRef.current = ''
      setPendingAction('')
    }
  }

  async function goToCheckoutAction(roomIdOverride) {
    if (pendingActionRef.current) {
      return
    }

    if (!isAuthenticatedCustomer) {
      openLoginRequiredModal({
        description:
          'Đăng nhập để giữ lại phòng đang chọn, nhập thông tin khách lưu trú và hoàn tất đặt chỗ thuận tiện hơn.',
        eyebrow: 'Thanh toán',
        title: 'Vui lòng đăng nhập để tiếp tục bước đặt chỗ',
      })
      return
    }

    pendingActionRef.current = 'checkout'
    setPendingAction('checkout')

    try {
      const result = await addSelectedRoomToCart({ roomIdOverride })

      if (!result.success) {
        return
      }

      navigate(buildPublicAuthPath('/checkout', isCustomer))
    } catch (actionError) {
      setFeedback(
        createFeedbackState(
          'error',
          actionError?.message ?? 'Không thể chuẩn bị đặt phòng lúc này.',
        ),
      )
    } finally {
      pendingActionRef.current = ''
      setPendingAction('')
    }
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
    pendingAction,
    pricingSummary,
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
