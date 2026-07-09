import {
  buildDefaultSeatOptionFromString,
  trainStationFixtures,
} from '../fixtures/trains.fixtures.js'

function padNumber(value) {
  return String(value).padStart(2, '0')
}

function formatTimeLabel(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '--:--'
  }

  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`
}

function formatDateKey(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`
}

function formatDurationCompact(durationMinutes = 0) {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return `${hours}h${padNumber(minutes)}p`
}

function formatDurationDisplay(durationMinutes = 0) {
  const safeMinutes = Math.max(Number(durationMinutes) || 0, 0)
  const days = Math.floor(safeMinutes / (60 * 24))
  const hours = Math.floor((safeMinutes % (60 * 24)) / 60)
  const minutes = safeMinutes % 60
  const parts = []

  if (days > 0) {
    parts.push(`${days}d`)
  }

  if (hours > 0) {
    parts.push(`${hours} giờ`)
  }

  if (minutes > 0 || parts.length === 0) {
    parts.push(`${minutes} phút`)
  }

  return parts.join(' ')
}

function formatStationLabel(station = '', city = '') {
  if (station) {
    return station
  }

  return city
}

function getArrivalDayOffsetLabel(departureAt, arrivalAt) {
  const departureDate = new Date(departureAt)
  const arrivalDate = new Date(arrivalAt)

  if (Number.isNaN(departureDate.getTime()) || Number.isNaN(arrivalDate.getTime())) {
    return ''
  }

  const departureStart = new Date(
    departureDate.getFullYear(),
    departureDate.getMonth(),
    departureDate.getDate(),
  )
  const arrivalStart = new Date(
    arrivalDate.getFullYear(),
    arrivalDate.getMonth(),
    arrivalDate.getDate(),
  )
  const dayOffset = Math.round(
    (arrivalStart.getTime() - departureStart.getTime()) / (1000 * 60 * 60 * 24),
  )

  return dayOffset > 0 ? `(+${dayOffset})` : ''
}

function buildBaseTrainView(train) {
  const trainNumberLabel = String(train.train_number ?? '').toUpperCase()
  const departureStationLabel = formatStationLabel(train.departure_station, train.departure_city)
  const arrivalStationLabel = formatStationLabel(train.arrival_station, train.arrival_city)

  return {
    ...train,
    departure_time_label: formatTimeLabel(train.departure_at),
    arrival_time_label: formatTimeLabel(train.arrival_at),
    departure_date_key: formatDateKey(train.departure_at),
    arrival_date_key: formatDateKey(train.arrival_at),
    duration_text: formatDurationCompact(Number(train.duration_minutes ?? 0)),
    duration_display: formatDurationDisplay(Number(train.duration_minutes ?? 0)),
    departure_station_label: departureStationLabel,
    arrival_station_label: arrivalStationLabel,
    train_number_label: trainNumberLabel,
    availability_label: `Chỉ còn ${train.available_seats} chỗ`,
    route_label: `${train.departure_city} - ${train.arrival_city}`,
    route_code_label: `${train.departure_station_code} → ${train.arrival_station_code}`,
    detail_path: `/trains/${train.slug}`,
    header_title:
      train.details?.header_title ?? `Tàu ${trainNumberLabel} ${train.train_name}`.trim(),
    route_note: train.details?.route_note ?? train.short_description,
    arrival_day_offset_label: getArrivalDayOffsetLabel(train.departure_at, train.arrival_at),
  }
}

function normalizeSeatOptions(train) {
  const seatOptions = Array.isArray(train.details?.seat_options) ? train.details.seat_options : []

  if (!seatOptions.length) {
    return [buildDefaultSeatOptionFromString(train.seat_class, 0, train)]
  }

  return seatOptions.map((seatOption, index) => {
    if (typeof seatOption === 'string') {
      return buildDefaultSeatOptionFromString(seatOption, index, train)
    }

    return {
      id: seatOption.id ?? `${train.id}-seat-option-${index + 1}`,
      name: seatOption.name ?? `Hạng chỗ ${index + 1}`,
      badge: seatOption.badge ?? '',
      price: Math.max(Number(seatOption.price ?? train.sale_price ?? 0), 0),
      seat_type: seatOption.seat_type ?? '',
      benefits: Array.isArray(seatOption.benefits) ? seatOption.benefits : [],
      is_default: Boolean(seatOption.is_default),
      is_primary:
        typeof seatOption.is_primary === 'boolean'
          ? seatOption.is_primary
          : index < 2,
    }
  })
}

function createFallbackSeats({
  carId,
  seatType,
  totalSeats,
  price,
  codePrefix,
}) {
  return Array.from({ length: totalSeats }, (_, index) => ({
    id: `${carId}-seat-${padNumber(index + 1)}`,
    code: `${codePrefix}${padNumber(index + 1)}`,
    number: padNumber(index + 1),
    status: (index + 1) % 5 === 0 ? 'booked' : 'available',
    price,
    car_id: carId,
    seat_type: seatType,
  }))
}

function normalizeCars(train, seatOptions) {
  const cars = Array.isArray(train.details?.cars) ? train.details.cars : []

  if (!cars.length) {
    return seatOptions.map((seatOption, index) => {
      const carId = `${train.id}-fallback-car-${index + 1}`
      const totalSeats = seatOption.seat_type === 'soft_sleeper' ? 24 : 20

      return {
        id: carId,
        name: `Toa ${index + 1}`,
        label: `Toa ${index + 1}: ${seatOption.name} (${totalSeats})`,
        tab_label: `Toa ${index + 1}`,
        seat_type: seatOption.seat_type ?? 'soft_seat',
        total_seats: totalSeats,
        layout: {
          row_size: seatOption.seat_type === 'soft_sleeper' ? 6 : 4,
          aisle_after: seatOption.seat_type === 'soft_sleeper' ? 3 : 2,
          group_size: seatOption.seat_type === 'hard_sleeper' ? 6 : 4,
          group_columns: 2,
        },
        seats: createFallbackSeats({
          carId,
          seatType: seatOption.seat_type ?? 'soft_seat',
          totalSeats,
          price: seatOption.price,
          codePrefix: `T${index + 1}-`,
        }),
      }
    })
  }

  return cars.map((car, index) => {
    const seats = Array.isArray(car.seats) ? car.seats : []
    const totalSeats = Math.max(Number(car.total_seats ?? seats.length ?? 0), seats.length, 1)
    const matchingSeatOption =
      seatOptions.find((seatOption) => seatOption.seat_type === car.seat_type) ?? seatOptions[0]

    return {
      id: car.id ?? `${train.id}-car-${index + 1}`,
      name: car.name ?? `Toa ${index + 1}`,
      tab_label: car.tab_label ?? car.name ?? `Toa ${index + 1}`,
      label:
        car.label ??
        `${car.name ?? `Toa ${index + 1}`}: ${matchingSeatOption?.name ?? 'Hạng chỗ'} (${totalSeats})`,
      seat_type: car.seat_type ?? matchingSeatOption?.seat_type ?? 'soft_seat',
      total_seats: totalSeats,
      layout: {
        row_size: Math.max(Number(car.layout?.row_size ?? 4), 1),
        aisle_after: Math.max(Number(car.layout?.aisle_after ?? 2), 0),
        group_size: Math.max(Number(car.layout?.group_size ?? 4), 1),
        group_columns: Math.max(Number(car.layout?.group_columns ?? 2), 1),
      },
      seats: seats.map((seat, seatIndex) => ({
        id: seat.id ?? `${car.id ?? train.id}-seat-${seatIndex + 1}`,
        code: seat.code ?? `${car.name ?? `T${index + 1}`}-${padNumber(seatIndex + 1)}`,
        number: seat.number ?? padNumber(seatIndex + 1),
        status: seat.status === 'booked' ? 'booked' : 'available',
        price: Math.max(Number(seat.price ?? matchingSeatOption?.price ?? train.sale_price ?? 0), 0),
        car_id: seat.car_id ?? car.id ?? `${train.id}-car-${index + 1}`,
        seat_type: car.seat_type ?? matchingSeatOption?.seat_type ?? 'soft_seat',
      })),
    }
  })
}

function buildRouteStopsKey(train) {
  return `${train.departure_station_code}-${train.arrival_station_code}`
}

function getFallbackSchedule(train) {
  const routeStopsByKey = {
    'SGN-HAN': [
      { station_name: 'Ga Sài Gòn', city: 'TP. Hồ Chí Minh', time: formatTimeLabel(train.departure_at), note: 'Khởi hành' },
      { station_name: 'Ga Nha Trang', city: 'Khánh Hòa', time: '05:30', note: 'Dừng đón khách' },
      { station_name: 'Ga Đà Nẵng', city: 'Đà Nẵng', time: '18:00', note: 'Dừng kỹ thuật' },
      { station_name: 'Ga Hà Nội', city: 'Hà Nội', time: formatTimeLabel(train.arrival_at), note: 'Đến nơi' },
    ],
    'HUE-DNA': [
      { station_name: 'Ga Huế', city: 'Huế', time: formatTimeLabel(train.departure_at), note: 'Khởi hành' },
      { station_name: 'Ga Lăng Cô', city: 'Thừa Thiên Huế', time: '09:20', note: 'Ngắm cảnh' },
      { station_name: 'Ga Đà Nẵng', city: 'Đà Nẵng', time: formatTimeLabel(train.arrival_at), note: 'Đến nơi' },
    ],
  }

  return routeStopsByKey[buildRouteStopsKey(train)] ?? [
    {
      station_name: train.departure_station,
      city: train.departure_city,
      time: formatTimeLabel(train.departure_at),
      note: 'Khởi hành',
    },
    {
      station_name: train.arrival_station,
      city: train.arrival_city,
      time: formatTimeLabel(train.arrival_at),
      note: 'Đến nơi',
    },
  ]
}

function normalizeSchedule(train) {
  const schedule = Array.isArray(train.details?.schedule) ? train.details.schedule : []
  const normalizedSchedule = schedule.length ? schedule : getFallbackSchedule(train)

  return normalizedSchedule.map((stop, index) => ({
    id: `${train.id}-schedule-${index + 1}`,
    station_name: stop.station_name ?? train.departure_station,
    city: stop.city ?? '',
    time: stop.time ?? '',
    note: stop.note ?? '',
    is_terminal: index === 0 || index === normalizedSchedule.length - 1,
  }))
}

function normalizePaymentSummary(paymentSummary = {}) {
  return {
    fee_label: paymentSummary.fee_label ?? 'Phí dịch vụ',
    service_fee: Math.max(Number(paymentSummary.service_fee ?? 15000), 0),
    cta_primary: paymentSummary.cta_primary ?? 'Đặt ngay',
    cta_secondary: paymentSummary.cta_secondary ?? 'Thêm vào giỏ hàng',
    security_note: paymentSummary.security_note ?? 'Thanh toán bảo mật SSL 256-bit',
  }
}

function normalizeMemberDiscount(memberDiscount = {}) {
  return {
    title: memberDiscount.title ?? 'Giảm giá thành viên',
    description:
      memberDiscount.description ??
      'Đăng nhập để tiết kiệm 10% cho tất cả các tuyến tàu nội địa trong hè này.',
    link_label: memberDiscount.link_label ?? 'Tìm hiểu thêm',
  }
}

function getStationOptionByCode(code = '') {
  return trainStationFixtures.find((station) => station.code === code) ?? null
}

function buildRelatedTrainCard(relatedTrain, detailPathPrefix) {
  const mappedTrain = buildBaseTrainView(relatedTrain)
  const departureStation = getStationOptionByCode(relatedTrain.departure_station_code)
  const arrivalStation = getStationOptionByCode(relatedTrain.arrival_station_code)

  return {
    ...mappedTrain,
    image_alt: mappedTrain.header_title,
    detail_path: `${detailPathPrefix}/${relatedTrain.slug}`,
    departure_station_code_label:
      departureStation?.label ?? relatedTrain.departure_station_code,
    arrival_station_code_label: arrivalStation?.label ?? relatedTrain.arrival_station_code,
  }
}

export function mapTrainToCardView(train) {
  return buildBaseTrainView(train)
}

export function mapTrainDetailResponseToView(
  responseData,
  { detailPathPrefix = '/trains' } = {},
) {
  const train = responseData?.train

  if (!train) {
    return {
      train: null,
      relatedTrains: [],
    }
  }

  const seatOptions = normalizeSeatOptions(train)
  const featuredSeatOptions = seatOptions.filter((seatOption) => seatOption.is_primary)
  const cars = normalizeCars(train, seatOptions)
  const mappedTrain = {
    ...buildBaseTrainView(train),
    detail_path: `${detailPathPrefix}/${train.slug}`,
    seat_options: seatOptions,
    featured_seat_options: featuredSeatOptions.length ? featuredSeatOptions : seatOptions.slice(0, 2),
    cars,
    schedule: normalizeSchedule(train),
    amenities: Array.isArray(train.details?.amenities) ? train.details.amenities : [],
    policies: Array.isArray(train.details?.policies) ? train.details.policies : [],
    payment_summary: normalizePaymentSummary(train.details?.payment_summary),
    member_discount: normalizeMemberDiscount(train.details?.member_discount),
    carriage_info: train.details?.carriage_info ?? '',
    baggage_policy: train.details?.baggage_policy ?? '',
    refund_policy: train.details?.refund_policy ?? '',
  }

  return {
    train: mappedTrain,
    relatedTrains: Array.isArray(responseData.related_trains)
      ? responseData.related_trains.map((relatedTrain) =>
          buildRelatedTrainCard(relatedTrain, detailPathPrefix),
        )
      : [],
  }
}
