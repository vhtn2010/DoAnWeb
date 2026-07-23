import { vietnamAirportOptions } from '../constants/vietnamAirports.js'

const DESTINATION_EDITORIAL_BY_AIRPORT_CODE = Object.freeze({
  // TODO: replace mock destination editorial with destination content from database/API in integration phase.
  SGN: {
    title: 'Khám phá TP. Hồ Chí Minh',
    description:
      'Được mệnh danh là Hòn ngọc Viễn Đông, Sài Gòn là sự hòa quyện giữa lịch sử, văn hóa và nhịp sống sôi động không ngừng nghỉ. Từ những công trình kiến trúc thời Pháp thuộc đến chợ Bến Thành tấp nập, mỗi góc phố đều kể một câu chuyện về quá khứ và tương lai của Việt Nam.',
    temperature_label: '29°C Nắng',
    timezone_label: 'Múi giờ GMT +7',
    image_url: '/assets/template/home/v39_1669.png',
  },
  DAD: {
    title: 'Khám phá Đà Nẵng',
    description:
      'Đà Nẵng là thành phố biển năng động, nổi bật với những cây cầu biểu tượng, bãi biển Mỹ Khê và nhịp sống hiện đại. Từ trung tâm thành phố, bạn có thể dễ dàng kết nối tới Hội An, bán đảo Sơn Trà và chuỗi trải nghiệm ẩm thực miền Trung rất riêng.',
    temperature_label: '28°C Nắng',
    timezone_label: 'Múi giờ GMT +7',
    image_url: '/assets/template/service/detail/recommendation-mien-trung.png',
  },
  HAN: {
    title: 'Khám phá Hà Nội',
    description:
      'Hà Nội là thủ đô ngàn năm văn hiến, nơi nhịp sống hiện đại giao thoa cùng phố cổ, hồ Hoàn Kiếm và chiều sâu văn hóa truyền thống. Thành phố phù hợp cho những hành trình vừa nghỉ ngơi, vừa tìm kiếm trải nghiệm ẩm thực, lịch sử và đời sống địa phương đặc sắc.',
    temperature_label: '27°C Dịu nhẹ',
    timezone_label: 'Múi giờ GMT +7',
    image_url: '/assets/template/home/v39_1679.png',
  },
})

const DESTINATION_EDITORIAL_BY_CITY = Object.freeze({
  'TP. Hồ Chí Minh': DESTINATION_EDITORIAL_BY_AIRPORT_CODE.SGN,
  'Đà Nẵng': DESTINATION_EDITORIAL_BY_AIRPORT_CODE.DAD,
  'Hà Nội': DESTINATION_EDITORIAL_BY_AIRPORT_CODE.HAN,
})

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

function formatDateLabel(value) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${padNumber(date.getDate())}/${padNumber(date.getMonth() + 1)}`
}

function formatDurationCompact(durationMinutes = 0) {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  if (hours === 0) {
    return `${minutes}m`
  }

  if (minutes === 0) {
    return `${hours}h`
  }

  return `${hours}h ${minutes}m`
}

function formatDurationDisplay(durationMinutes = 0) {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  if (hours === 0) {
    return `${minutes} phút`
  }

  if (minutes === 0) {
    return `${hours} giờ`
  }

  return `${hours} giờ ${minutes} phút`
}

function formatFlightNumber(value = '') {
  const normalizedValue = String(value).trim()
  const match = normalizedValue.match(/^([A-Za-z]+)(\d+)$/)

  if (!match) {
    return normalizedValue
  }

  return `${match[1].toUpperCase()}-${match[2]}`
}

function getCabinClassLabel(cabinClass = '') {
  const labels = {
    economy: 'Phổ thông',
    premium_economy: 'Phổ thông đặc biệt',
    business: 'Thương gia',
    first: 'Hạng nhất',
  }

  return labels[cabinClass] ?? cabinClass
}

function formatCityLabel(city = '') {
  if (city === 'TP. Hồ Chí Minh') {
    return 'TP. Hồ Chí Minh'
  }

  return city
}

function normalizeAirportLookupText(value = '') {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/quoc te/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function resolveAirportLocationRecord({ airportCode = '', airportLabel = '', cityLabel = '' } = {}) {
  const normalizedCode = String(airportCode ?? '').trim().toUpperCase()
  const normalizedValues = [
    airportLabel,
    cityLabel,
    normalizedCode,
  ]
    .map((value) => normalizeAirportLookupText(value))
    .filter(Boolean)

  return (
    vietnamAirportOptions.find((airport) => {
      if (normalizedCode && airport.code === normalizedCode) {
        return true
      }

      const airportCandidates = [
        airport.code,
        airport.city,
        airport.airport_name,
        airport.province,
        airport.label,
      ]
        .map((value) => normalizeAirportLookupText(value))
        .filter(Boolean)

      return normalizedValues.some((value) =>
        airportCandidates.some((candidate) =>
          candidate === value || candidate.includes(value) || value.includes(candidate),
        ),
      )
    }) ?? null
  )
}

function formatProvinceLabel(airportRecord, cityLabel = '') {
  return airportRecord?.province || cityLabel
}

function formatAirportCardLabel(airportLabel = '', cityLabel = '') {
  const normalizedAirportLabel = String(airportLabel ?? '').trim()

  if (!normalizedAirportLabel) {
    return cityLabel
  }

  return normalizedAirportLabel
    .replace(/^Sân bay quốc tế\s+/i, 'Sân bay ')
    .replace(/^Cảng hàng không quốc tế\s+/i, 'Sân bay ')
    .trim()
}

function formatAirportShortLabel(airportLabel = '', cityLabel = '') {
  const normalizedAirportLabel = String(airportLabel ?? '').trim()

  if (!normalizedAirportLabel) {
    return cityLabel
  }

  return normalizedAirportLabel
    .replace(/^Sân bay quốc tế\s+/i, '')
    .replace(/^Sân bay\s+/i, '')
    .replace(/^Cảng hàng không quốc tế\s+/i, '')
    .trim()
}

function resolveStopText(flight) {
  const stopCount = Number(flight.details?.stop_count ?? 0)

  if (stopCount > 0) {
    return `${stopCount} điểm dừng`
  }

  if (flight.stop_type === 'direct') {
    return 'Bay thẳng'
  }

  return 'Bay thẳng'
}

function resolveTerminalLabel(code = '', fallbackLabel = '') {
  if (fallbackLabel) {
    return fallbackLabel
  }

  const defaultTerminals = {
    HAN: 'Nhà ga T1',
    SGN: 'Nhà ga T2',
  }

  return defaultTerminals[code] ?? ''
}

function createFallbackFareOptions(flight) {
  const standardPrice = Math.max(Number(flight.sale_price ?? 0), 1100000)
  const liteTotalPrice = Math.max(standardPrice - 250000, 850000)
  const businessTotalPrice = Math.max(
    Number(flight.base_price ?? standardPrice + 850000) + 900000,
    3000000,
  )
  const taxes = 400000

  return [
    {
      id: `fare-${flight.id}-economy-lite`,
      title: 'PHỔ THÔNG TIẾT KIỆM',
      price: Math.max(liteTotalPrice - taxes, 450000),
      currency: flight.currency ?? 'VND',
      badge: '',
      is_featured: false,
      is_default: false,
      cta_label: 'Chọn',
      included_baggage: '12kg Hành lý xách tay',
      refundable: false,
      changeable: false,
      summary_subtitle: '12kg xách tay • Không hoàn vé',
      benefits_preview: ['WiFi miễn phí bay', 'Cổng sạc USB'],
      features: [
        'Không bao gồm hành lý ký gửi',
        '12kg Hành lý xách tay',
        'Không hoàn vé',
        'Không chọn chỗ trước',
      ],
      taxes,
      add_ons: 0,
      total_price: liteTotalPrice,
    },
    {
      id: `fare-${flight.id}-economy-standard`,
      title: 'PHỔ THÔNG TIÊU CHUẨN',
      price: Math.max(standardPrice - taxes, 700000),
      currency: flight.currency ?? 'VND',
      badge: 'PHỔ BIẾN NHẤT',
      is_featured: true,
      is_default: true,
      cta_label: 'Đã chọn',
      included_baggage: flight.baggage_allowance || '20kg Hành lý ký gửi',
      refundable: Boolean(flight.refundable),
      changeable: Boolean(flight.changeable),
      summary_subtitle: `${flight.baggage_allowance || '20kg ký gửi'} • Linh hoạt đổi vé`,
      benefits_preview: ['WiFi miễn phí bay', 'Cổng sạc USB', 'Phần ăn'],
      features: [
        flight.baggage_allowance || '20kg Hành lý ký gửi',
        '12kg Hành lý xách tay',
        flight.changeable ? 'Thay đổi vé (Có phí)' : 'Không đổi vé',
        'Chọn chỗ tiêu chuẩn',
        'Bao gồm phần ăn nóng',
      ],
      taxes,
      add_ons: 0,
      total_price: standardPrice,
    },
    {
      id: `fare-${flight.id}-business`,
      title: 'THƯƠNG GIA',
      price: Math.max(businessTotalPrice - taxes, standardPrice + 1400000),
      currency: flight.currency ?? 'VND',
      badge: '',
      is_featured: false,
      is_default: false,
      cta_label: 'Chọn',
      included_baggage: '40kg Hành lý ký gửi',
      refundable: true,
      changeable: true,
      summary_subtitle: '40kg ký gửi • Ưu tiên làm thủ tục',
      benefits_preview: ['Phòng chờ', 'Ưu tiên check-in', 'Ẩm thực cao cấp'],
      features: [
        '40kg Hành lý ký gửi',
        'Sử dụng phòng chờ',
        'Ưu tiên làm thủ tục',
        'Ẩm thực cao cấp',
      ],
      taxes,
      add_ons: 0,
      total_price: businessTotalPrice,
    },
  ]
}

function resolveFareOptions(flight) {
  const fareOptions = Array.isArray(flight.details?.fare_options) ? flight.details.fare_options : []
  const normalizedFareOptions =
    fareOptions.length >= 3 ? fareOptions : createFallbackFareOptions(flight)

  return normalizedFareOptions.map((fareOption, index) => ({
    ...fareOption,
    id: fareOption.id ?? `fare-${flight.id}-${index + 1}`,
    title: fareOption.title ?? getCabinClassLabel(flight.cabin_class).toUpperCase(),
    cta_label: fareOption.cta_label ?? 'Chọn',
    features: Array.isArray(fareOption.features) ? fareOption.features.slice(0, 5) : [],
    taxes: Number(fareOption.taxes ?? 0),
    add_ons: Number(fareOption.add_ons ?? 0),
    total_price: Number(fareOption.total_price ?? fareOption.price ?? flight.sale_price ?? 0),
    price: Number(fareOption.price ?? flight.sale_price ?? 0),
    is_featured: Boolean(fareOption.is_featured),
    is_default: Boolean(fareOption.is_default),
    summary_subtitle: fareOption.summary_subtitle ?? '',
    benefits_preview: Array.isArray(fareOption.benefits_preview)
      ? fareOption.benefits_preview
      : ['WiFi miễn phí bay', 'Cổng sạc USB', 'Phần ăn'],
  }))
}

function resolveEditorialDestination(editorialDestination = {}, flight = {}) {
  const normalizedEditorialDestination =
    editorialDestination && typeof editorialDestination === 'object' ? editorialDestination : {}
  editorialDestination = normalizedEditorialDestination
  const arrivalCityLabel = formatCityLabel(flight.arrival_city ?? 'điểm đến')
  const fallbackEditorial =
    DESTINATION_EDITORIAL_BY_AIRPORT_CODE[flight.arrival_airport_code] ??
    DESTINATION_EDITORIAL_BY_CITY[arrivalCityLabel] ??
    null

  return {
    title: editorialDestination.title ?? fallbackEditorial?.title ?? `Khám phá ${arrivalCityLabel}`,
    description:
      editorialDestination.description ??
      fallbackEditorial?.description ??
      `${arrivalCityLabel} là điểm đến sôi động với nhịp sống hiện đại, ẩm thực đa dạng và nhiều trải nghiệm văn hóa đặc sắc phù hợp cho cả hành trình công tác lẫn nghỉ ngơi cuối tuần.`,
    temperature_label:
      editorialDestination.temperature_label ?? fallbackEditorial?.temperature_label ?? '29°C Nắng',
    timezone_label:
      editorialDestination.timezone_label ?? fallbackEditorial?.timezone_label ?? 'Múi giờ GMT +7',
    image_url:
      editorialDestination.image_url ??
      fallbackEditorial?.image_url ??
      '/assets/template/home/v39_1669.png',
  }
}

function resolveFlightInfoText(flight) {
  if (flight.details?.flight_info) {
    return flight.details.flight_info
  }

  const aircraftLabel = flight.aircraft ?? 'tàu bay khai thác nội địa'

  return `Chuyến bay được khai thác bằng ${aircraftLabel}. Hành khách sẽ có hành trình gọn gàng với thông tin hạng vé, hành lý và chính sách hiển thị theo dữ liệu hiện có.`
}

function resolveOnboardBenefits(flight) {
  if (Array.isArray(flight.details?.onboard_benefits) && flight.details.onboard_benefits.length) {
    return flight.details.onboard_benefits
  }

  return ['WiFi miễn phí bay', 'Cổng sạc USB', 'Phần ăn']
}

function resolvePaymentSummary(paymentSummary = {}) {
  const normalizedPaymentSummary =
    paymentSummary && typeof paymentSummary === 'object' ? paymentSummary : {}
  paymentSummary = normalizedPaymentSummary
  return {
    passenger_label: paymentSummary.passenger_label ?? 'Người lớn (x1)',
    taxes_label: paymentSummary.taxes_label ?? 'Thuế & Phí',
    add_on_label: paymentSummary.add_on_label ?? 'Dịch vụ bổ sung',
    cta_primary: paymentSummary.cta_primary ?? 'Đặt ngay',
    cta_secondary: paymentSummary.cta_secondary ?? 'Thêm vào giỏ hàng',
    fare_subtitle: paymentSummary.fare_subtitle ?? '',
  }
}

function buildFlightDetailPath(flight, detailPathPrefix = '/flights') {
  const basePath = `${detailPathPrefix}/${flight.slug}`

  if (!flight.reference_id) {
    return basePath
  }

  const searchParams = new URLSearchParams({
    reference_id: flight.reference_id,
  })

  return `${basePath}?${searchParams.toString()}`
}

function buildBaseFlightView(flight) {
  const departureCityLabel = formatCityLabel(flight.departure_city)
  const arrivalCityLabel = formatCityLabel(flight.arrival_city)
  const departureAirportRecord = resolveAirportLocationRecord({
    airportCode: flight.departure_airport_code,
    airportLabel: flight.departure_airport,
    cityLabel: departureCityLabel,
  })
  const arrivalAirportRecord = resolveAirportLocationRecord({
    airportCode: flight.arrival_airport_code,
    airportLabel: flight.arrival_airport,
    cityLabel: arrivalCityLabel,
  })
  const departureAirportLabel =
    departureAirportRecord?.airport_name ?? flight.departure_airport
  const arrivalAirportLabel =
    arrivalAirportRecord?.airport_name ?? flight.arrival_airport

  return {
    ...flight,
    departure_time_label: formatTimeLabel(flight.departure_at),
    arrival_time_label: formatTimeLabel(flight.arrival_at),
    departure_date_label: formatDateLabel(flight.departure_at),
    arrival_date_label: formatDateLabel(flight.arrival_at),
    duration_text: formatDurationCompact(Number(flight.duration_minutes ?? 0)),
    duration_display: formatDurationDisplay(Number(flight.duration_minutes ?? 0)),
    route_text: `${flight.departure_airport_code} → ${flight.arrival_airport_code}`,
    flight_number_label: formatFlightNumber(flight.flight_number),
    service_code_label: flight.service_code || formatFlightNumber(flight.flight_number),
    aircraft_label: flight.aircraft || 'Máy bay khai thác nội địa',
    cabin_class_label: getCabinClassLabel(flight.cabin_class),
    departure_city_label: departureCityLabel,
    arrival_city_label: arrivalCityLabel,
    departure_province_label: formatProvinceLabel(departureAirportRecord, departureCityLabel),
    arrival_province_label: formatProvinceLabel(arrivalAirportRecord, arrivalCityLabel),
    departure_airport_card_label: formatAirportCardLabel(departureAirportLabel, departureCityLabel),
    arrival_airport_card_label: formatAirportCardLabel(arrivalAirportLabel, arrivalCityLabel),
    departure_airport_short_label: formatAirportShortLabel(departureAirportLabel, departureCityLabel),
    arrival_airport_short_label: formatAirportShortLabel(arrivalAirportLabel, arrivalCityLabel),
    departure_terminal_label: resolveTerminalLabel(
      flight.departure_airport_code,
      flight.details?.departure_terminal,
    ),
    arrival_terminal_label: resolveTerminalLabel(
      flight.arrival_airport_code,
      flight.details?.arrival_terminal,
    ),
    stop_text: resolveStopText(flight),
    policy_text: [
      flight.refundable ? 'Hoàn vé' : 'Không hoàn vé',
      flight.changeable ? 'Đổi lịch được' : 'Không đổi lịch',
    ].join(' • '),
  }
}

export function mapFlightToCardView(flight) {
  return {
    ...buildBaseFlightView(flight),
    detail_path: buildFlightDetailPath(flight),
  }
}

export function mapFlightDetailResponseToView(
  responseData,
  { detailPathPrefix = '/flights' } = {},
) {
  const flight = responseData?.flight

  if (!flight) {
    return {
      flight: null,
      relatedFlights: [],
    }
  }

  const mappedFlight = {
    ...buildBaseFlightView(flight),
    detail_path: buildFlightDetailPath(flight, detailPathPrefix),
    eco_tag: flight.details?.eco_tag ?? '',
    fare_options: resolveFareOptions(flight),
    flight_info: resolveFlightInfoText(flight),
    onboard_benefits: resolveOnboardBenefits(flight),
    policies: Array.isArray(flight.details?.policies) ? flight.details.policies : [],
    editorial_destination: resolveEditorialDestination(flight.details?.editorial_destination, flight),
    payment_summary: resolvePaymentSummary(flight.details?.payment_summary),
  }

  return {
    flight: mappedFlight,
    relatedFlights: Array.isArray(responseData.related_flights)
      ? responseData.related_flights.map((relatedFlight) => ({
          ...mapFlightToCardView(relatedFlight),
          detail_path: buildFlightDetailPath(relatedFlight, detailPathPrefix),
        }))
      : [],
  }
}
