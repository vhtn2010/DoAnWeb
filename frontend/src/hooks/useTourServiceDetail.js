import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { addCartItem, addCartItemPreview } from '../repositories/cartRepository.js'
import { useAddToCartToast } from '../components/public/feedback/addToCartToastContext.js'
import {
  getFeaturedTourServices,
  getPublicServiceBySlug,
} from '../repositories/publicServiceRepository.js'
import { mapPublicServiceToView } from '../mappers/publicServiceDetailMappers.js'
import useFavorites from './useFavorites.js'
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

function getLeadLocation(locationText) {
  return String(locationText ?? '').split(',')[0].trim()
}

function parseTourDepartureDate(value) {
  const normalizedValue = String(value ?? '').trim()

  if (!normalizedValue) {
    return null
  }

  const displayDateMatch = normalizedValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (displayDateMatch) {
    return new Date(
      Number(displayDateMatch[3]),
      Number(displayDateMatch[2]) - 1,
      Number(displayDateMatch[1]),
    )
  }

  const isoDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (isoDateMatch) {
    return new Date(
      Number(isoDateMatch[1]),
      Number(isoDateMatch[2]) - 1,
      Number(isoDateMatch[3]),
    )
  }

  const parsedDate = new Date(normalizedValue)

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function addDays(date, daysToAdd) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + daysToAdd)
  return nextDate
}

function formatDateTimeStamp(date, time = '08:00:00') {
  const safeDate = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(safeDate.getTime())) {
    return ''
  }

  const year = safeDate.getFullYear()
  const month = String(safeDate.getMonth() + 1).padStart(2, '0')
  const day = String(safeDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}T${time}+07:00`
}

function formatDateKey(date) {
  const safeDate = date instanceof Date ? date : new Date(date)

  if (Number.isNaN(safeDate.getTime())) {
    return ''
  }

  const year = safeDate.getFullYear()
  const month = String(safeDate.getMonth() + 1).padStart(2, '0')
  const day = String(safeDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function isFutureTourDate(value) {
  const parsedDate = parseTourDepartureDate(value)

  return parsedDate
    ? new Date(`${formatDateKey(parsedDate)}T00:00:00.000Z`).getTime() > Date.now()
    : false
}

function getPositiveCapacity(value) {
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function getScheduleAvailableSlots(scheduleItem = {}, fallbackCapacity = 0) {
  for (const key of [
    'available_slots',
    'availableSlots',
    'slots_available',
    'slotsAvailable',
    'available_quantity',
    'availableQuantity',
    'available_seats',
    'availableSeats',
    'remaining_slots',
    'remainingSlots',
    'remaining_quantity',
    'remainingQuantity',
    'slots',
  ]) {
    const value = Number(scheduleItem?.[key])

    if (Number.isFinite(value) && value >= 0) {
      return value
    }
  }

  for (const key of [
    'total_slots',
    'totalSlots',
    'max_slots',
    'maxSlots',
    'capacity',
  ]) {
    const value = getPositiveCapacity(scheduleItem?.[key])

    if (value != null) {
      return value
    }
  }

  return getPositiveCapacity(fallbackCapacity) ?? 0
}

function getTravellerCount(adultCount, childCount) {
  return Math.max(Number(adultCount) + Number(childCount), 1)
}

function getAvailableTourDepartureDates(service, requestedQuantity = 1) {
  const schedule = Array.isArray(service?.details?.departure_schedule)
    ? service.details.departure_schedule
    : []
  const fallbackCapacity = service?.details?.max_group_size
  const seenDates = new Set()
  const datesFromSchedule = schedule
    .filter((item) => getScheduleAvailableSlots(item, fallbackCapacity) >= requestedQuantity)
    .map((item) => parseTourDepartureDate(item?.date ?? item?.departure_at ?? ''))
    .filter(Boolean)
    .map(formatDateKey)
    .filter((dateKey) => {
      if (!dateKey || seenDates.has(dateKey) || !isFutureTourDate(dateKey)) {
        return false
      }

      seenDates.add(dateKey)
      return true
    })

  if (datesFromSchedule.length > 0) {
    return datesFromSchedule
  }

  return (service?.details?.departure_dates ?? [])
    .map((dateValue) => {
      const parsedDate = parseTourDepartureDate(dateValue)
      return parsedDate ? formatDateKey(parsedDate) : ''
    })
    .filter((dateKey) => dateKey && isFutureTourDate(dateKey))
}

function resolveTourDepartureDate(service, currentDepartureDate, requestedQuantity = 1) {
  const availableDates = getAvailableTourDepartureDates(service, requestedQuantity)

  if (!availableDates.length) {
    return ''
  }

  const currentDate = parseTourDepartureDate(currentDepartureDate)
  const currentDateKey = currentDate ? formatDateKey(currentDate) : ''

  return availableDates.includes(currentDateKey) ? currentDateKey : availableDates[0]
}

function buildTourCartItem({
  adultCount,
  adultPrice,
  childCount,
  childPrice,
  departureDate,
  infantCount = 0,
  infantPrice = 0,
  service,
  totalPrice,
}) {
  const startDate = parseTourDepartureDate(departureDate)
  const durationDays = Math.max(Number(service.details?.duration_days ?? 1) || 1, 1)
  const endDate = startDate ? addDays(startDate, durationDays - 1) : null
  const travellerCount = getTravellerCount(adultCount, childCount)

  return {
    id: `cart-item-tour-${Date.now()}`,
    service_id: service.id,
    service_type: service.service_type,
    reference_id: service.id,
    start_at: startDate ? formatDateTimeStamp(startDate, '08:00:00') : '',
    end_at: endDate ? formatDateTimeStamp(endDate, '18:00:00') : '',
    quantity: travellerCount,
    unit_price_snapshot: adultPrice,
    options: {
      adult_count: adultCount,
      adult_price: adultPrice,
      child_count: childCount,
      child_price: childPrice,
      infant_count: infantCount,
      infant_price: infantPrice,
      selected_total_price: totalPrice,
      departure_date: departureDate,
      duration_text: service.duration_text,
      package_name: service.tour_type ?? service.title,
      transport_text: service.transport_text,
    },
    created_at: new Date().toISOString(),
    service: {
      service_code: service.service_code,
      title: service.title,
      slug: service.slug,
      short_description: service.short_description,
      location_text: service.location_text,
      image_url: service.image_url,
      status: service.status,
    },
  }
}

function toCartPayload(cartItem) {
  return Object.entries({
    end_at: cartItem.end_at || undefined,
    options: cartItem.options,
    quantity: cartItem.quantity,
    reference_id: cartItem.reference_id,
    service_id: cartItem.service_id,
    service_type: cartItem.service_type,
    start_at: cartItem.start_at || undefined,
  }).reduce((payload, [key, value]) => {
    if (value !== undefined) {
      payload[key] = value
    }

    return payload
  }, {})
}

function resolveTourCartErrorMessage(error, requestedQuantity) {
  const message = String(error?.message ?? '')

  if (message.includes('Requested quantity exceeds available tour slots')) {
    return `Tour hiện không còn đủ chỗ cho ${requestedQuantity} khách. Vui lòng giảm số khách hoặc chọn lịch khởi hành khác.`
  }

  if (message.includes('Tour departure is not available')) {
    return 'Lịch khởi hành này hiện không còn khả dụng. Vui lòng chọn ngày khác.'
  }

  if (message.includes('Tour is not available')) {
    return 'Tour hiện chưa có lịch khởi hành khả dụng để thêm vào giỏ hàng.'
  }

  return message || 'Không thể thêm tour vào giỏ hàng lúc này.'
}

export default function useTourServiceDetail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const { openLoginRequiredModal } = usePublicAccessGate()
  const { authState, currentUser, isAuthenticatedCustomer, isCustomer } = usePublicSession()
  const { showAddToCartToast } = useAddToCartToast()
  const { hasFavorite, toggleFavorite } = useFavorites({ currentUser })

  const [service, setService] = useState(null)
  const [recommendedServices, setRecommendedServices] = useState([])
  const [selectedImage, setSelectedImage] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [adultCount, setAdultCount] = useState(2)
  const [childCount, setChildCount] = useState(0)
  const [isShared, setIsShared] = useState(false)
  const [bookingMessage, setBookingMessage] = useState('')
  const [pendingAction, setPendingAction] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
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
    let isActive = true

    async function loadServiceDetail() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const detailResponse = await getPublicServiceBySlug(slug)

        if (!isActive) {
          return
        }

        if (!detailResponse.success || !detailResponse.data) {
          setService(null)
          setRecommendedServices([])
          setErrorMessage(detailResponse.message ?? 'Không tìm thấy dịch vụ.')
          return
        }

        const mappedService = mapPublicServiceToView(detailResponse.data, {
          detailPath: buildPublicAuthPath(`/services/${detailResponse.data.slug}`, isCustomer),
        })
        const featuredResponse = detailResponse.data.service_type === 'tour'
          ? await getFeaturedTourServices({
              excludeSlug: detailResponse.data.slug,
              limit: 3,
            })
          : { data: [] }

        if (!isActive) {
          return
        }

        setService(mappedService)
        setRecommendedServices(
          Array.isArray(featuredResponse.data)
            ? featuredResponse.data.map((featuredService) =>
                mapPublicServiceToView(featuredService, {
                  detailPath: buildPublicAuthPath(`/services/${featuredService.slug}`, isCustomer),
                }),
              )
            : [],
        )
      } catch (error) {
        if (!isActive) {
          return
        }

        setService(null)
        setRecommendedServices([])
        setErrorMessage(error?.message ?? 'Không thể tải chi tiết tour lúc này.')
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    loadServiceDetail()

    return () => {
      isActive = false
    }
  }, [isCustomer, slug])

  useEffect(() => {
    if (!service) {
      return
    }

    setSelectedImage(service.gallery_images[0] ?? service.image_url)
    setDepartureDate(
      service.service_type === 'combo'
        ? ''
        : resolveTourDepartureDate(service, service.details.departure_dates[0] ?? '', 2),
    )
    setAdultCount(2)
    setChildCount(0)
    setIsShared(false)
    setBookingMessage('')
    setPendingAction('')
  }, [service])

  useEffect(() => {
    if (!service) {
      return
    }

    const travellerCount = getTravellerCount(adultCount, childCount)
    const resolvedDepartureDate = resolveTourDepartureDate(service, departureDate, travellerCount)

    if (resolvedDepartureDate && resolvedDepartureDate !== departureDate) {
      setDepartureDate(resolvedDepartureDate)
    }
  }, [adultCount, childCount, departureDate, service])

  const childUnitPrice = Math.round((service?.sale_price ?? 0) * 0.7)
  const adultTotal = adultCount * (service?.sale_price ?? 0)
  const childTotal = childCount * childUnitPrice
  const totalPrice = adultTotal + childTotal
  const pricingSummary = useMemo(() => {
    if (!service || service.service_type === 'combo') {
      return createPricingSummaryViewFromItem(null)
    }

    const travellerCount = getTravellerCount(adultCount, childCount)
    const resolvedDepartureDate = resolveTourDepartureDate(service, departureDate, travellerCount)
    const previewCartItem = buildTourCartItem({
      adultCount,
      adultPrice: service?.sale_price ?? 0,
      childCount,
      childPrice: childUnitPrice,
      departureDate: resolvedDepartureDate || departureDate,
      service,
      totalPrice,
    })

    return createPricingSummaryViewFromItem(previewCartItem)
  }, [adultCount, childCount, childUnitPrice, departureDate, service, totalPrice])
  const favoriteItem = useMemo(() => {
    if (!service) {
      return null
    }

    return buildFavoriteItem({
      favorite_key: buildFavoriteKey(service.service_type ?? 'tour', service.service_id ?? service.id ?? service.slug),
      service_type: service.service_type ?? 'tour',
      service_id: service.service_id ?? service.id ?? '',
      slug: service.slug,
      title: service.title,
      image_url: service.image_url,
      detail_path: service.detail_path ?? `/services/${service.slug}`,
      source_path: buildFavoriteSourcePath(location),
      source_label: getFavoriteSourceLabel(service.service_type ?? 'tour'),
      summary: [service.duration_text, service.transport_text].filter(Boolean).join(' • '),
      location_text: service.location_text,
    })
  }, [location, service])
  const isFavorite = favoriteItem ? hasFavorite(favoriteItem.favorite_key) : false

  async function handleShareClick() {
    if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(window.location.href)
      } catch {
        // Keep the share state even when clipboard is unavailable.
      }
    }

    setIsShared(true)
    setBookingMessage('Liên kết tour đã được sao chép.')
  }

  async function createTourCart() {
    if (!service) {
      return null
    }

    if (service.service_type === 'combo') {
      return null
    }

    const travellerCount = getTravellerCount(adultCount, childCount)
    const resolvedDepartureDate = resolveTourDepartureDate(service, departureDate, travellerCount)

    if (!resolvedDepartureDate) {
      throw new Error(`Tour hiện không còn đủ chỗ cho ${travellerCount} khách. Vui lòng giảm số khách hoặc chọn lịch khởi hành khác.`)
    }

    if (resolvedDepartureDate !== departureDate) {
      setDepartureDate(resolvedDepartureDate)
    }

    const cartItem = buildTourCartItem({
      adultCount,
      adultPrice: service?.sale_price ?? 0,
      childCount,
      childPrice: childUnitPrice,
      departureDate: resolvedDepartureDate,
      service,
      totalPrice,
    })

    if (isAuthenticatedCustomer) {
      await addCartItem(toCartPayload(cartItem), {
        authState,
        previewItem: cartItem,
      })
      return cartItem
    }

    await addCartItemPreview({
      authState,
      item: cartItem,
    })

    return cartItem
  }

  async function handleAddToCart() {
    if (pendingActionRef.current) {
      return
    }

    if (!service) {
      return
    }

    if (service.service_type === 'combo') {
      setBookingMessage('Combo hiện được hỗ trợ tư vấn trước khi đặt.')
      return
    }

    if (!isAuthenticatedCustomer) {
      openLoginRequiredModal({
        description: 'Đăng nhập để lưu tour bạn chọn và tiếp tục đặt chỗ thuận tiện hơn.',
        eyebrow: 'Giỏ hàng',
        title: 'Vui lòng đăng nhập để có thể thêm vào giỏ hàng',
      })
      return
    }

    pendingActionRef.current = 'cart'
    setPendingAction('cart')
    setBookingMessage('')

    try {
      await createTourCart()
      showAddToCartToast()
    } catch (error) {
      setBookingMessage(resolveTourCartErrorMessage(error, getTravellerCount(adultCount, childCount)))
    } finally {
      pendingActionRef.current = ''
      setPendingAction('')
    }
  }

  async function handleBookNow() {
    if (pendingActionRef.current) {
      return
    }

    if (!service) {
      return
    }

    if (service.service_type === 'combo') {
      setBookingMessage('Combo hiện được hỗ trợ tư vấn trước khi đặt.')
      return
    }

    if (!isAuthenticatedCustomer) {
      openLoginRequiredModal({
        description:
          'Đăng nhập để giữ lại tour đang chọn, nhập thông tin hành khách và hoàn tất đặt chỗ thuận tiện hơn.',
        eyebrow: 'Thanh toán',
        title: 'Vui lòng đăng nhập để tiếp tục bước đặt chỗ',
      })
      return
    }

    pendingActionRef.current = 'checkout'
    setPendingAction('checkout')
    setBookingMessage('')

    try {
      const cartItem = await createTourCart()

      if (!cartItem) {
        setBookingMessage('Không thể chuẩn bị đơn đặt tour lúc này.')
        return
      }

      if (isAuthenticatedCustomer) {
        navigate(buildPublicAuthPath('/checkout', isCustomer))
        return
      }

      navigate(buildPublicAuthPath('/checkout', isCustomer), {
        state: {
          selectedCartItemIds: [cartItem.id],
        },
      })
    } catch (error) {
      setBookingMessage(resolveTourCartErrorMessage(error, getTravellerCount(adultCount, childCount)))
    } finally {
      pendingActionRef.current = ''
      setPendingAction('')
    }
  }

  const breadcrumbHomePath = buildPublicAuthPath('/', isCustomer)
  const breadcrumbListPath = buildPublicAuthPath('/services', isCustomer)

  const infoItems = useMemo(() => {
    if (!service) {
      return []
    }

    if (service.service_type === 'combo') {
      return [
        {
          label: 'Loại dịch vụ',
          value: 'Combo',
        },
        {
          label: 'Hạng mục',
          value: `${Array.isArray(service.details?.combo_items) ? service.details.combo_items.length : 0} mục`,
        },
        {
          label: 'Hình thức',
          value: 'Tư vấn trước khi đặt',
        },
      ]
    }

    return [
      {
        label: 'Thời gian',
        value: service.duration_text,
      },
      {
        label: 'Phương tiện',
        value: service.transport_text,
      },
      {
        label: 'Loại tour',
        value: service.tour_type,
      },
    ]
  }, [service])

  function handleToggleFavorite() {
    if (!favoriteItem) {
      return
    }

    const result = toggleFavorite(favoriteItem)

    if (!result.updated) {
      return
    }

    setBookingMessage(
      result.nextState
        ? 'Tour đã được lưu vào danh sách yêu thích.'
        : 'Tour đã được bỏ khỏi danh sách yêu thích.',
    )
  }

  return {
    adultCount,
    adultTotal,
    bookingMessage,
    breadcrumbHomePath,
    breadcrumbListLabel: service?.service_type === 'combo' ? 'Danh sách Combo' : 'Danh sách Tour',
    breadcrumbListPath,
    childCount,
    childTotal,
    departureDate,
    errorMessage,
    handleAddToCart,
    handleBookNow,
    handleShareClick,
    infoItems,
    isFavorite,
    isLoading,
    isShared,
    leadLocation: service ? getLeadLocation(service.location_text) : '',
    pendingAction,
    pricingSummary,
    recommendedServices,
    selectedImage,
    service,
    setAdultCount,
    setChildCount,
    setDepartureDate,
    setSelectedImage,
    handleToggleFavorite,
    totalPrice,
  }
}
