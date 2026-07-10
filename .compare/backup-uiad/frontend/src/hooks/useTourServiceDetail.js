import { useEffect, useMemo, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import {
  getFeaturedTourServices,
  getTourServiceBySlug,
} from '../repositories/publicServiceRepository.js'
import { mapTourServiceToView } from '../mappers/serviceMappers.js'

function buildAuthAwarePath(path, isCustomer) {
  return isCustomer ? `${path}?auth=customer` : path
}

function getLeadLocation(locationText) {
  return locationText.split(',')[0].trim()
}

export default function useTourServiceDetail() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
  const isCustomer = authState === ROLES.customer

  const [service, setService] = useState(null)
  const [recommendedServices, setRecommendedServices] = useState([])
  const [selectedImage, setSelectedImage] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [adultCount, setAdultCount] = useState(2)
  const [childCount, setChildCount] = useState(0)
  const [isFavorite, setIsFavorite] = useState(false)
  const [isShared, setIsShared] = useState(false)
  const [bookingMessage, setBookingMessage] = useState('')
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
          detailPath: buildAuthAwarePath(`/services/${detailResponse.data.slug}`, isCustomer),
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
                  detailPath: buildAuthAwarePath(`/services/${featuredService.slug}`, isCustomer),
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

  function handleBookNow() {
    setBookingMessage('Yêu cầu giữ chỗ đã được ghi nhận ở chế độ mô phỏng.')
  }

  const breadcrumbHomePath = buildAuthAwarePath('/', isCustomer)
  const breadcrumbListPath = buildAuthAwarePath('/services', isCustomer)

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
    handleBookNow,
    handleShareClick,
    infoItems,
    isFavorite,
    isLoading,
    isShared,
    leadLocation: service ? getLeadLocation(service.location_text) : '',
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
