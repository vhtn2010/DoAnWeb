import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { addCartItemPreview } from '../repositories/cartRepository.js'
import {
  getFeaturedTourServices,
  getTourServiceBySlug,
} from '../repositories/publicServiceRepository.js'
import { mapTourServiceToView } from '../mappers/serviceMappers.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

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

  return {
    id: `cart-item-tour-${Date.now()}`,
    service_id: service.id,
    service_type: service.service_type,
    reference_id: service.id,
    start_at: formatDateTimeStamp(startDate, '08:00:00'),
    end_at: formatDateTimeStamp(endDate, '18:00:00'),
    quantity: 1,
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

export default function useTourServiceDetail() {
  const navigate = useNavigate()
  const { slug } = useParams()
  const { authState, isCustomer } = usePublicSession()

  const [service, setService] = useState(null)
  const [recommendedServices, setRecommendedServices] = useState([])
  const [selectedImage, setSelectedImage] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [adultCount, setAdultCount] = useState(2)
  const [childCount, setChildCount] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
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
    setIsFavorite(false)
    setIsShared(false)
    setBookingMessage('')
    setPendingAction('')
  }, [service])

  const childUnitPrice = Math.round((service?.sale_price ?? 0) * 0.7)
  const adultTotal = adultCount * (service?.sale_price ?? 0)
  const childTotal = childCount * childUnitPrice
  const totalPrice = adultTotal + childTotal

  async function handleShareClick() {
    if (typeof window !== 'undefined' && navigator?.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(window.location.href)
      } catch {
        // Keep the mocked share state even when clipboard is unavailable.
      }
    }

    setIsShared(true)
    setBookingMessage('Liên kết tour đã được sao chép ở chế độ mô phỏng.')
  }

  function legacyHandleBookNow() {
    setBookingMessage('Yêu cầu giữ chỗ đã được ghi nhận ở chế độ mô phỏng.')
  }

  async function createTourCartPreview() {
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

    setPendingAction('cart')
    setBookingMessage('')

    try {
      await createTourCartPreview()
      setBookingMessage('Tour đã được thêm vào giỏ hàng xem trước.')
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

    setPendingAction('checkout')
    setBookingMessage('')

    try {
      const cartItem = await createTourCartPreview()

      if (!cartItem) {
        legacyHandleBookNow()
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
    setIsFavorite,
    setSelectedImage,
    totalPrice,
  }
}
