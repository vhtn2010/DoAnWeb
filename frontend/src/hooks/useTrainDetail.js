import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ROLES } from '../constants/roles.js'
import { mapTrainDetailResponseToView } from '../mappers/trainMappers.js'
import { addCartItemPreview } from '../repositories/cartRepository.js'
import {
  buildTrainSelectionPayload,
  checkTrainAvailability,
  getTrainDetailBySlug,
} from '../repositories/trainRepository.js'
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
  selectedSeat,
  selectedSeatOption,
  train,
}) {
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
      car_label: selectedCar?.name ?? '',
      seat_label: selectedSeat ? `${selectedCar?.name ?? 'Toa'} - Chỗ ${selectedSeat.number}` : '',
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
  const navigate = useNavigate()
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const authState =
    searchParams.get('auth') === ROLES.customer ? ROLES.customer : ROLES.guest
  const isCustomer = authState === ROLES.customer

  const [train, setTrain] = useState(null)
  const [relatedTrains, setRelatedTrains] = useState([])
  const [selectedCarId, setSelectedCarId] = useState('')
  const [selectedSeatId, setSelectedSeatId] = useState('')
  const [selectedSeatOptionId, setSelectedSeatOptionId] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState(() => createFeedbackState())
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
        const response = await getTrainDetailBySlug(slug)

        if (!isActive) {
          return
        }

        if (!response.success || !response.data?.train) {
          setTrain(null)
          setRelatedTrains([])
          setSelectedCarId('')
          setSelectedSeatId('')
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
            detail_path: buildAuthAwarePath(relatedTrain.detail_path, isCustomer),
          })),
        )
        setSelectedCarId(defaultCar?.id ?? '')
        setSelectedSeatId('')
        setSelectedSeatOptionId(defaultSeatOption?.id ?? '')
      } catch (loadError) {
        if (!isActive) {
          return
        }

        setTrain(null)
        setRelatedTrains([])
        setSelectedCarId('')
        setSelectedSeatId('')
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
  }, [isCustomer, reloadSeed, slug])

  const selectedCar = useMemo(() => {
    return train?.cars?.find((car) => car.id === selectedCarId) ?? train?.cars?.[0] ?? null
  }, [selectedCarId, train])

  const selectedSeat = useMemo(() => {
    return selectedCar?.seats?.find((seat) => seat.id === selectedSeatId) ?? null
  }, [selectedCar, selectedSeatId])

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

    const seatPrice = Math.max(
      Number(selectedSeat?.price ?? selectedSeatOption?.price ?? train.sale_price ?? 0),
      0,
    )
    const serviceFee = Math.max(Number(train.payment_summary?.service_fee ?? 0), 0)

    return {
      line_title: `${train.train_number_label} | ${selectedSeatOption?.name ?? train.seat_class}`,
      line_subtitle: `${train.departure_station_code} - ${train.arrival_station_code}`,
      seat_label: selectedSeat
        ? `${selectedCar?.name ?? 'Toa'} - Chỗ ${selectedSeat.number}`
        : 'Chưa chọn chỗ',
      seat_code: selectedSeat?.code ?? 'Vui lòng chọn chỗ',
      service_fee_label: train.payment_summary?.fee_label ?? 'Phí dịch vụ',
      service_fee: serviceFee,
      base_price: seatPrice,
      total_price: seatPrice + serviceFee,
      security_note:
        train.payment_summary?.security_note ?? 'Thanh toán bảo mật SSL 256-bit',
      cta_primary: train.payment_summary?.cta_primary ?? 'Đặt ngay',
      cta_secondary: train.payment_summary?.cta_secondary ?? 'Thêm vào giỏ hàng',
    }
  }, [selectedCar, selectedSeat, selectedSeatOption, train])

  function preserveAuthQuery(path) {
    return buildAuthAwarePath(path, isCustomer)
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
    setSelectedSeatId('')
    setSelectedSeatOptionId(matchingSeatOption?.id ?? '')
    setFeedback(createFeedbackState('info', `Đã chuyển sang ${nextCar.name}.`))
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

    setSelectedSeatId(nextSeat.id)
    setFeedback(
      createFeedbackState(
        'success',
        `Đã chọn ${selectedCar.name} - chỗ ${nextSeat.number} cho hành trình này.`,
      ),
    )
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
      setSelectedSeatId('')
    }

    setFeedback(
      createFeedbackState('info', `Đã cập nhật hạng chỗ ${nextSeatOption.name.toLowerCase()}.`),
    )
  }

  async function buildMockBooking() {
    if (!train || !selectedCar || !selectedSeat || !selectedSeatOption) {
      setFeedback(createFeedbackState('error', 'Vui lòng chọn chỗ trước khi tiếp tục.'))
      return {
        success: false,
      }
    }

    // TODO: replace mock train availability with train availability API in integration phase.
    const availabilityResponse = await checkTrainAvailability({
      selected_train_id: train.id,
      selected_car_id: selectedCar.id,
      selected_seat_id: selectedSeat.id,
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
      selectedSeat,
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
      selectedSeat,
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
        'Đã tạo payload mock theo chỗ đã chọn và lưu vào giỏ hàng preview.',
      ),
    )

    return {
      success: true,
      cartItem,
      payload: payloadResponse.data,
    }
  }

  async function addToCartMock() {
    const result = await buildMockBooking()

    if (!result.success) {
      return
    }

    navigate(preserveAuthQuery('/cart'))
  }

  async function bookNowMock() {
    const result = await buildMockBooking()

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

  return {
    addToCartMock,
    bookNowMock,
    bookingSummary,
    currentAuthPreviewQuery: isCustomer ? '?auth=customer' : '',
    error,
    feedback,
    formatCurrency: formatCurrencyVND,
    goBackToTrains,
    loading,
    preserveAuthQuery,
    relatedTrains,
    retry,
    selectCar,
    selectSeat,
    selectSeatOption,
    selectedCar,
    selectedCarId,
    selectedSeat,
    selectedSeatId,
    selectedSeatOption,
    selectedSeatOptionId,
    train,
  }
}
