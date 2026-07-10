import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import { mapFlightDetailResponseToView } from '../mappers/flightMappers.js'
import { addCartItem } from '../repositories/cartRepository.js'
import {
  buildFlightSelectionPayload,
  checkFlightAvailability,
  getFlightDetailBySlug,
} from '../repositories/flightRepository.js'
import { hasCustomerSession } from '../utils/authSession.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'

function buildAuthAwarePath(path, isCustomer) {
  if (!isCustomer) {
    return path
  }

  const [pathname, queryString = ''] = String(path ?? '').split('?')
  const nextSearchParams = new URLSearchParams(queryString)
  nextSearchParams.set('auth', ROLES.customer)

  return `${pathname}?${nextSearchParams.toString()}`
}

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

function buildLoginPath(pathname, search = '') {
  const nextPath = buildAuthAwarePath(pathname, true)
  const nextSearchParams = new URLSearchParams(search)
  nextSearchParams.set('redirect', nextPath)

  return `/login?${nextSearchParams.toString()}`
}

function createDefaultSearchState(flight) {
  const departureDate = String(flight?.departure_at ?? '').split('T')[0]

  return {
    trip_type: 'one_way',
    departure_date: departureDate,
    return_date: '',
    passengers: {
      adults: 1,
      children: 0,
      infants: 0,
    },
  }
}

function buildFlightCartItem({ flight, payload, selectedFare }) {
  return {
    id: `cart-item-flight-detail-${Date.now()}`,
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
      service_code: flight.service_code,
      title: `${flight.airline_name} ${flight.flight_number_label}`,
      slug: flight.slug,
      short_description: flight.short_description,
      location_text: `${flight.departure_city_label} - ${flight.arrival_city_label}`,
      image_url: flight.image_url,
      status: flight.status,
    },
    selected_fare: selectedFare
      ? {
          id: selectedFare.id,
          title: selectedFare.title,
          total_price: selectedFare.total_price,
        }
      : null,
  }
}

export default function useFlightDetail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const referenceId = searchParams.get('reference_id') ?? ''
  const isAuthenticatedCustomer = hasCustomerSession()
  const authState =
    searchParams.get('auth') === ROLES.customer || isAuthenticatedCustomer
      ? ROLES.customer
      : ROLES.guest
  const isCustomer = authState === ROLES.customer

  const [flight, setFlight] = useState(null)
  const [relatedFlights, setRelatedFlights] = useState([])
  const [selectedFareId, setSelectedFareId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false)
  const [loginPromptVariant, setLoginPromptVariant] = useState('cart')
  const [reloadSeed, setReloadSeed] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [referenceId, slug])

  useEffect(() => {
    let isActive = true

    async function loadFlightDetail() {
      setLoading(true)
      setError('')
      setFeedback(createFeedbackState())

      try {
        const response = await getFlightDetailBySlug(slug, {
          reference_id: referenceId,
        })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data?.flight) {
          setFlight(null)
          setRelatedFlights([])
          setSelectedFareId('')
          setError(response.message ?? 'Không tìm thấy chuyến bay.')
          return
        }

        const mappedState = mapFlightDetailResponseToView(response.data, {
          detailPathPrefix: '/flights',
        })
        const defaultFare =
          mappedState.flight?.fare_options.find((fare) => fare.is_default) ??
          mappedState.flight?.fare_options.find((fare) => fare.is_featured) ??
          mappedState.flight?.fare_options[0] ??
          null

        setFlight(mappedState.flight)
        setRelatedFlights(
          mappedState.relatedFlights.map((relatedFlight) => ({
            ...relatedFlight,
            detail_path: buildAuthAwarePath(relatedFlight.detail_path, isCustomer),
          })),
        )
        setSelectedFareId(defaultFare?.id ?? '')
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setFlight(null)
        setRelatedFlights([])
        setSelectedFareId('')
        setError(loadError?.message ?? 'Không thể tải chi tiết chuyến bay lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadFlightDetail()

    return () => {
      isActive = false
    }
  }, [isCustomer, referenceId, reloadSeed, slug])

  const selectedFare = useMemo(() => {
    if (!flight) {
      return null
    }

    return (
      flight.fare_options.find((fare) => fare.id === selectedFareId) ??
      flight.fare_options.find((fare) => fare.is_default) ??
      flight.fare_options.find((fare) => fare.is_featured) ??
      flight.fare_options[0] ??
      null
    )
  }, [flight, selectedFareId])

  function preserveAuthQuery(path) {
    return buildAuthAwarePath(path, isCustomer)
  }

  function selectFare(fareId) {
    if (!fareId) {
      return
    }

    setSelectedFareId(fareId)
    setFeedback(createFeedbackState('info', 'Đã cập nhật hạng vé bạn muốn xem.'))
  }

  async function buildFlightBooking() {
    if (!flight || !selectedFare) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn hạng vé trước khi tiếp tục.'))
      return {
        success: false,
      }
    }

    const availabilityResponse = await checkFlightAvailability({
      quantity: 1,
      reference_id: flight.reference_id,
      service_id: flight.service_id ?? flight.id,
      start_at: flight.departure_at,
    })

    if (!availabilityResponse.success || !availabilityResponse.data?.is_available) {
      setFeedback(
        createFeedbackState(
          'error',
          availabilityResponse.message ?? 'Chuyến bay hiện không còn đủ chỗ.',
        ),
      )
      return {
        success: false,
      }
    }

    const payloadResponse = await buildFlightSelectionPayload(
      flight,
      selectedFare,
      createDefaultSearchState(flight),
    )

    if (!payloadResponse.success || !payloadResponse.data) {
      setFeedback(
        createFeedbackState(
          'error',
          payloadResponse.message ?? 'Không thể chuẩn bị dữ liệu chuyến bay.',
        ),
      )
      return {
        success: false,
      }
    }

    const cartItem = buildFlightCartItem({
      flight,
      payload: payloadResponse.data,
      selectedFare,
    })

    return {
      success: true,
      cartItem,
      payload: payloadResponse.data,
    }
  }

  async function addToCartAction() {
    if (!isAuthenticatedCustomer) {
      setLoginPromptVariant('cart')
      setIsLoginPromptOpen(true)
      return
    }

    const result = await buildFlightBooking()

    if (!result.success) {
      return
    }

    await addCartItem(result.payload, {
      authState,
      previewItem: result.cartItem,
    })

    navigate(preserveAuthQuery('/cart'))
  }

  async function bookNowAction() {
    if (!isAuthenticatedCustomer) {
      setLoginPromptVariant('booking')
      setIsLoginPromptOpen(true)
      return
    }

    const result = await buildFlightBooking()

    if (!result.success) {
      return
    }

    if (isAuthenticatedCustomer) {
      await addCartItem(result.payload, {
        authState,
        previewItem: result.cartItem,
      })
      navigate(preserveAuthQuery('/cart'))
      return
    }
  }

  function goBackToFlights() {
    navigate(preserveAuthQuery('/flights'))
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
    currentAuthPreviewQuery: isCustomer ? '?auth=customer' : '',
    error,
    feedback,
    flight,
    formatCurrency: formatCurrencyVND,
    goBackToFlights,
    loading,
    preserveAuthQuery,
    relatedFlights,
    retry,
    selectFare,
    selectedFare,
    selectedFareId,
    addToCartAction,
    bookNowAction,
    closeLoginPrompt,
    goToLoginFromPrompt,
    isLoginPromptOpen,
    loginPromptVariant,
  }
}
