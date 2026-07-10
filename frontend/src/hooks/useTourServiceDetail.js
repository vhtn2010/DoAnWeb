import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { addCartItem, addCartItemPreview } from '../repositories/cartRepository.js'
import {
  getFeaturedTourServices,
  getTourServiceBySlug,
} from '../repositories/publicServiceRepository.js'
import { mapTourServiceToView } from '../mappers/serviceMappers.js'
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

function getLeadLocation(locationText) {
  return locationText.split(',')[0].trim()
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

function buildTourCartItem({
  adultCount,
  childCount,
  departureDate,
  service,
  totalPrice,
}) {
  const startDate = parseTourDepartureDate(departureDate) ?? new Date()
  const durationDays = Math.max(Number(service.details?.duration_days ?? 1) || 1, 1)
  const endDate = addDays(startDate, durationDays - 1)
  const travellerCount = Math.max(adultCount + childCount, 1)

  return {
    id: `cart-item-tour-${Date.now()}`,
    service_id: service.id,
    service_type: service.service_type,
    reference_id: service.id,
    start_at: formatDateTimeStamp(startDate, '08:00:00'),
    end_at: formatDateTimeStamp(endDate, '18:00:00'),
    quantity: travellerCount,
    unit_price_snapshot: totalPrice,
    options: {
      adult_count: adultCount,
      child_count: childCount,
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
  return {
    end_at: cartItem.end_at,
    options: cartItem.options,
    quantity: cartItem.quantity,
    reference_id: cartItem.reference_id,
    service_id: cartItem.service_id,
    service_type: cartItem.service_type,
    start_at: cartItem.start_at,
  }
}

export default function useTourServiceDetail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const { openLoginRequiredModal } = usePublicAccessGate()
  const { authState, currentUser, isAuthenticatedCustomer, isCustomer } = usePublicSession()
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [slug])

  useEffect(() => {
    let isActive = true

    async function loadServiceDetail() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const detailResponse = await getTourServiceBySlug(slug)

        if (!isActive) {
          return
        }

        if (!detailResponse.success || !detailResponse.data) {
          setService(null)
          setRecommendedServices([])
          setErrorMessage(detailResponse.message ?? 'Không tìm thấy dịch vụ.')
          return
        }

        const mappedService = mapTourServiceToView(detailResponse.data, {
          detailPath: buildPublicAuthPath(`/services/${detailResponse.data.slug}`, isCustomer),
        })
        const featuredResponse = await getFeaturedTourServices({
          excludeSlug: detailResponse.data.slug,
          limit: 3,
        })

        if (!isActive) {
          return
        }

        setService(mappedService)
        setRecommendedServices(
          Array.isArray(featuredResponse.data)
            ? featuredResponse.data.map((featuredService) =>
                mapTourServiceToView(featuredService, {
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
    setDepartureDate(service.details.departure_dates[0] ?? '')
    setAdultCount(2)
    setChildCount(0)
    setIsShared(false)
    setBookingMessage('')
    setPendingAction('')
  }, [service])

  const childUnitPrice = Math.round((service?.sale_price ?? 0) * 0.7)
  const adultTotal = adultCount * (service?.sale_price ?? 0)
  const childTotal = childCount * childUnitPrice
  const totalPrice = adultTotal + childTotal
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

    const cartItem = buildTourCartItem({
      adultCount,
      childCount,
      departureDate,
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
    if (!service) {
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

    setPendingAction('cart')
    setBookingMessage('')

    try {
      await createTourCart()
      setBookingMessage(
        isAuthenticatedCustomer
          ? 'Tour đã được thêm vào giỏ hàng của bạn.'
          : 'Tour đã được thêm vào giỏ hàng xem trước.',
      )
      navigate(buildPublicAuthPath('/cart', isCustomer))
    } catch (error) {
      setBookingMessage(error?.message ?? 'Không thể thêm tour vào giỏ hàng lúc này.')
    } finally {
      setPendingAction('')
    }
  }

  async function handleBookNow() {
    if (!service) {
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

    setPendingAction('checkout')
    setBookingMessage('')

    try {
      const cartItem = await createTourCart()

      if (!cartItem) {
        setBookingMessage('Không thể chuẩn bị đơn đặt tour lúc này.')
        return
      }

      if (isAuthenticatedCustomer) {
        navigate(buildPublicAuthPath('/cart', isCustomer))
        return
      }

      navigate(buildPublicAuthPath('/checkout', isCustomer), {
        state: {
          selectedCartItemIds: [cartItem.id],
        },
      })
    } catch (error) {
      setBookingMessage(error?.message ?? 'Không thể tiếp tục đặt tour lúc này.')
    } finally {
      setPendingAction('')
    }
  }

  const breadcrumbHomePath = buildPublicAuthPath('/', isCustomer)
  const breadcrumbListPath = buildPublicAuthPath('/services', isCustomer)

  const infoItems = useMemo(() => {
    if (!service) {
      return []
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
