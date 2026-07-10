import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { mapTrainDetailResponseToView } from '../mappers/trainMappers.js'
import { addCartItemPreview } from '../repositories/cartRepository.js'
import {
  buildTrainSelectionPayload,
  checkTrainAvailability,
  getTrainDetailBySlug,
} from '../repositories/trainRepository.js'
import { formatCurrencyVND } from '../utils/formatCurrency.js'
import usePublicSession from './usePublicSession.js'
import { buildPublicAuthPath } from '../utils/publicNavigation.js'

function createFeedbackState(tone = 'info', message = '') {
  return {
    tone,
    message,
  }
}

function buildLoginPath(pathname, search = '') {
  const nextPath = buildPublicAuthPath(pathname, true)
  const nextSearchParams = new URLSearchParams(search)
  nextSearchParams.set('redirect', nextPath)

  return `/login?${nextSearchParams.toString()}`
}

function createDefaultSearchState(train) {
  const departureDate = String(train?.departure_at ?? '').split('T')[0]

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

function buildTrainCartItem({
  payload,
  selectedCar,
  selectedSeats,
  selectedSeatOption,
  train,
}) {
  const firstSelectedSeat = selectedSeats[0] ?? null
  const seatIds = selectedSeats.map((seat) => seat.id)
  const seatCodes = selectedSeats.map((seat) => seat.code)
  const seatNumbers = selectedSeats.map((seat) => seat.number)

  return {
    id: `cart-item-train-detail-${Date.now()}`,
    service_id: payload.service_id,
    service_type: payload.service_type,
    reference_id: payload.reference_id,
    start_at: payload.start_at,
    end_at: payload.end_at,
    quantity: payload.quantity,
    unit_price_snapshot: payload.unit_price_snapshot,
    options: {
      ...(payload.options ?? {}),
      seat_class: selectedSeatOption?.name ?? train.seat_class,
      car_id: selectedCar?.id ?? '',
      car_label: selectedCar?.name ?? '',
      seat_id: firstSelectedSeat?.id ?? '',
      seat_ids: seatIds,
      seat_code: seatCodes.join(', '),
      seat_codes: seatCodes,
      seat_option_id: selectedSeatOption?.id ?? '',
      seat_option_name: selectedSeatOption?.name ?? train.seat_class,
      seat_label: seatNumbers.length
        ? `${selectedCar?.name ?? 'Toa'} - Chỗ ${seatNumbers.join(', ')}`
        : '',
    },
    created_at: new Date().toISOString(),
    service: {
      service_code: train.service_code,
      title: `${train.train_number_label} | ${train.train_name}`,
      slug: train.slug,
      short_description: train.short_description,
      location_text: `${train.departure_city} - ${train.arrival_city}`,
      image_url: train.image_url,
      status: train.status,
    },
  }
}

function findDefaultSeatOption(train, carId = '') {
  const selectedCar = train?.cars?.find((car) => car.id === carId) ?? null

  return (
    train?.seat_options?.find((seatOption) => seatOption.seat_type === selectedCar?.seat_type) ??
    train?.seat_options?.find((seatOption) => seatOption.is_default) ??
    train?.seat_options?.[0] ??
    null
  )
}

export default function useTrainDetail() {
  const location = useLocation()
  const navigate = useNavigate()
  const { slug } = useParams()
  const { authState, isAuthenticatedCustomer, isCustomer } = usePublicSession()
  const referenceId = new URLSearchParams(location.search).get('reference_id') ?? ''

  const [train, setTrain] = useState(null)
  const [relatedTrains, setRelatedTrains] = useState([])
  const [selectedCarId, setSelectedCarId] = useState('')
  const [selectedSeatIds, setSelectedSeatIds] = useState([])
  const [selectedSeatOptionId, setSelectedSeatOptionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false)
  const [reloadSeed, setReloadSeed] = useState(0)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [slug])

  useEffect(() => {
    let isActive = true

    async function loadTrainDetail() {
      setLoading(true)
      setError('')
      setFeedback(createFeedbackState())

      try {
        const response = await getTrainDetailBySlug(slug, {
          reference_id: referenceId,
        })

        if (!isActive) {
          return
        }

        if (!response.success || !response.data?.train) {
          setTrain(null)
          setRelatedTrains([])
          setSelectedCarId('')
          setSelectedSeatIds([])
          setSelectedSeatOptionId('')
          setError(response.message ?? 'Không tìm thấy chuyến tàu.')
          return
        }

        const mappedState = mapTrainDetailResponseToView(response.data, {
          detailPathPrefix: '/trains',
        })
        const defaultCar = mappedState.train?.cars?.[0] ?? null
        const defaultSeatOption =
          findDefaultSeatOption(mappedState.train, defaultCar?.id) ??
          mappedState.train?.seat_options?.[0] ??
          null

        setTrain(mappedState.train)
        setRelatedTrains(
          mappedState.relatedTrains.map((relatedTrain) => ({
            ...relatedTrain,
            detail_path: buildPublicAuthPath(relatedTrain.detail_path, isCustomer),
          })),
        )
        setSelectedCarId(defaultCar?.id ?? '')
        setSelectedSeatIds([])
        setSelectedSeatOptionId(defaultSeatOption?.id ?? '')
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setTrain(null)
        setRelatedTrains([])
        setSelectedCarId('')
        setSelectedSeatIds([])
        setSelectedSeatOptionId('')
        setError(loadError?.message ?? 'Không thể tải chi tiết chuyến tàu lúc này.')
      } finally {
        if (isActive) {
          setLoading(false)
        }
      }
    }

    loadTrainDetail()

    return () => {
      isActive = false
    }
  }, [isCustomer, referenceId, reloadSeed, slug])

  const selectedCar = useMemo(() => {
    return train?.cars?.find((car) => car.id === selectedCarId) ?? train?.cars?.[0] ?? null
  }, [selectedCarId, train])

  const selectedSeats = useMemo(() => {
    if (!selectedCar) {
      return []
    }

    const selectedSeatIdSet = new Set(selectedSeatIds)

    return selectedCar.seats.filter((seat) => selectedSeatIdSet.has(seat.id))
  }, [selectedCar, selectedSeatIds])

  const selectedSeatOption = useMemo(() => {
    return (
      train?.seat_options?.find((seatOption) => seatOption.id === selectedSeatOptionId) ??
      findDefaultSeatOption(train, selectedCar?.id) ??
      null
    )
  }, [selectedCar?.id, selectedSeatOptionId, train])

  const bookingSummary = useMemo(() => {
    if (!train) {
      return null
    }

    const unitSeatPrice = Math.max(
      Number(selectedSeatOption?.price ?? selectedSeats[0]?.price ?? train.sale_price ?? 0),
      0,
    )
    const seatPrice = selectedSeats.length
      ? selectedSeats.reduce(
          (totalPrice, seat) => totalPrice + Math.max(Number(seat.price ?? unitSeatPrice), 0),
          0,
        )
      : unitSeatPrice
    const serviceFee = Math.max(Number(train.payment_summary?.service_fee ?? 0), 0)
    const seatNumbers = selectedSeats.map((seat) => seat.number)
    const seatCodes = selectedSeats.map((seat) => seat.code)

    return {
      title: train.header_title,
      line_title: `${train.train_number_label} | ${selectedSeatOption?.name ?? train.seat_class}`,
      line_subtitle: `${train.departure_station_code} - ${train.arrival_station_code}`,
      quantity_label: `${selectedSeats.length} Chỗ`,
      seat_class_label: selectedSeatOption?.name ?? train.seat_class,
      seat_label: seatNumbers.length
        ? `${selectedCar?.name ?? 'Toa'} - Chỗ ${seatNumbers.join(', ')}`
        : 'Chưa chọn chỗ',
      seat_code: seatCodes.length ? seatCodes.join(', ') : 'Vui lòng chọn chỗ',
      base_price_label: 'Giá chỗ',
      service_fee_label: train.payment_summary?.fee_label ?? 'Phí dịch vụ',
      service_fee: serviceFee,
      base_price: seatPrice,
      total_price: seatPrice + serviceFee,
      security_note:
        train.payment_summary?.security_note ?? 'Thanh toán bảo mật SSL 256-bit',
      cta_primary: train.payment_summary?.cta_primary ?? 'Đặt ngay',
      cta_secondary: train.payment_summary?.cta_secondary ?? 'Thêm vào giỏ hàng',
    }
  }, [selectedCar, selectedSeatOption, selectedSeats, train])

  function preserveAuthQuery(path) {
    return buildPublicAuthPath(path, isCustomer)
  }

  function selectCar(carId) {
    if (!train) {
      return
    }

    const nextCar = train.cars.find((car) => car.id === carId)

    if (!nextCar) {
      return
    }

    const matchingSeatOption =
      train.seat_options.find((seatOption) => seatOption.seat_type === nextCar.seat_type) ??
      selectedSeatOption

    setSelectedCarId(nextCar.id)
    setSelectedSeatIds([])
    setSelectedSeatOptionId(matchingSeatOption?.id ?? '')
    setFeedback(createFeedbackState())
  }

  function selectSeat(seatId) {
    if (!selectedCar) {
      return
    }

    const nextSeat = selectedCar.seats.find((seat) => seat.id === seatId)

    if (!nextSeat) {
      return
    }

    if (nextSeat.status !== 'available') {
      setFeedback(createFeedbackState('error', 'Chỗ này đã được đặt. Vui lòng chọn chỗ khác.'))
      return
    }

    if (selectedSeatIds.includes(nextSeat.id)) {
      setSelectedSeatIds((currentSeatIds) => currentSeatIds.filter((currentSeatId) => currentSeatId !== nextSeat.id))
      setFeedback(createFeedbackState('info', `Đã bỏ chọn ${selectedCar.name} - chỗ ${nextSeat.number}.`))
      return
    }

    setSelectedSeatIds((currentSeatIds) => [...currentSeatIds, nextSeat.id])
    setFeedback(createFeedbackState('success', `Đã chọn ${selectedCar.name} - chỗ ${nextSeat.number}.`))
  }

  function selectSeatOption(seatOptionId) {
    if (!train) {
      return
    }

    const nextSeatOption = train.seat_options.find((seatOption) => seatOption.id === seatOptionId)

    if (!nextSeatOption) {
      return
    }

    const matchingCar =
      train.cars.find((car) => car.seat_type === nextSeatOption.seat_type) ?? train.cars[0] ?? null

    setSelectedSeatOptionId(nextSeatOption.id)

    if (matchingCar && matchingCar.id !== selectedCarId) {
      setSelectedCarId(matchingCar.id)
      setSelectedSeatIds([])
    }

    if (!matchingCar || matchingCar.id === selectedCarId) {
      setSelectedSeatIds([])
    }

    setFeedback(
      createFeedbackState('info', `Đã cập nhật hạng chỗ ${nextSeatOption.name.toLowerCase()}.`),
    )
  }

  async function buildMockBooking({
    missingSeatMessage = 'Vui lòng chọn chỗ trước khi tiếp tục.',
  } = {}) {
    if (!train || !selectedCar || !selectedSeats.length || !selectedSeatOption) {
      setFeedback(createFeedbackState('error', missingSeatMessage))
      return {
        success: false,
      }
    }

    try {
      const availabilityResponse = await checkTrainAvailability({
        quantity: selectedSeats.length,
        reference_id: train.reference_id,
        selected_seat_ids: selectedSeats.map((seat) => seat.id),
        selected_train_id: train.id,
        start_at: train.departure_at,
      })

      if (!availabilityResponse.success || !availabilityResponse.data?.is_available) {
        setFeedback(
          createFeedbackState(
            'error',
            availabilityResponse.message ??
              'Chỗ ngồi hiện không còn khả dụng trong dữ liệu mock.',
          ),
        )
        return {
          success: false,
        }
      }

      // TODO: replace mock cart payload with POST /cart/items in integration phase.
      const payloadResponse = await buildTrainSelectionPayload(
        train,
        selectedSeats,
        selectedSeatOption,
        createDefaultSearchState(train),
      )

      if (!payloadResponse.success || !payloadResponse.data) {
        setFeedback(
          createFeedbackState(
            'error',
            payloadResponse.message ?? 'Không thể chuẩn bị dữ liệu chuyến tàu mock.',
          ),
        )
        return {
          success: false,
        }
      }

      const cartItem = buildTrainCartItem({
        payload: payloadResponse.data,
        selectedCar,
        selectedSeats,
        selectedSeatOption,
        train,
      })

      await addCartItemPreview({
        authState,
        item: cartItem,
      })

      setFeedback(
        createFeedbackState(
          'success',
          `Đã tạo payload mock cho ${selectedSeats.length} chỗ đã chọn và lưu vào giỏ hàng preview.`,
        ),
      )

      return {
        success: true,
        cartItem,
        payload: payloadResponse.data,
      }
    } catch (bookingError) {
      setFeedback(
        createFeedbackState(
          'error',
          bookingError?.message ?? 'Không thể xử lý vé tàu trong luồng mock lúc này.',
        ),
      )

      return {
        success: false,
      }
    }
  }

  async function addToCartMock() {
    if (!isAuthenticatedCustomer) {
      setIsLoginPromptOpen(true)
      return
    }

    const result = await buildMockBooking({
      missingSeatMessage: 'Vui lòng chọn chỗ trước khi thêm vào giỏ hàng.',
    })

    if (!result.success) {
      return
    }

    navigate(preserveAuthQuery('/cart'))
  }

  async function bookNowMock() {
    const result = await buildMockBooking({
      missingSeatMessage: 'Vui lòng chọn chỗ trước khi tiếp tục.',
    })

    if (!result.success) {
      return
    }

    navigate(preserveAuthQuery('/checkout'), {
      state: {
        selectedCartItemIds: [result.cartItem.id],
      },
    })
  }

  function goBackToTrains() {
    navigate(preserveAuthQuery('/trains'))
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
    addToCartMock,
    bookNowMock,
    bookingSummary,
    closeLoginPrompt,
    currentAuthPreviewQuery: '',
    error,
    feedback,
    formatCurrency: formatCurrencyVND,
    goToLoginFromPrompt,
    goBackToTrains,
    isLoginPromptOpen,
    loading,
    preserveAuthQuery,
    relatedTrains,
    retry,
    selectCar,
    selectSeat,
    selectSeatOption,
    selectedCar,
    selectedCarId,
    selectedSeatIds,
    selectedSeats,
    selectedSeatOption,
    selectedSeatOptionId,
    train,
  }
}
