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
  const standardPrice = Math.max(Number(flight.sale_price ?? 0), 1000000)
  const litePrice = Math.max(standardPrice - 250000, 850000)
  const businessPrice = Math.max(
    Number(flight.base_price ?? standardPrice + 850000) + 900000,
    standardPrice + 1900000,
  )
  const taxes = 400000

  return [
    {
      id: `fare-${flight.id}-economy-lite`,
      title: 'PHỔ THÔNG TIẾT KIỆM',
      price: Math.max(litePrice - taxes, 650000),
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
      total_price: litePrice,
    },
    {
      id: `fare-${flight.id}-economy-standard`,
      title: 'PHỔ THÔNG TIÊU CHUẨN',
      price: Math.max(standardPrice - taxes, 850000),
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
        'Bao gồm phần ăn',
      ],
      taxes,
      add_ons: 0,
      total_price: standardPrice,
    },
    {
      id: `fare-${flight.id}-business`,
      title: 'THƯƠNG GIA',
      price: Math.max(businessPrice - taxes, standardPrice + 1200000),
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
        'Phòng chờ sân bay',
        'Ưu tiên làm thủ tục',
        'Ẩm thực cao cấp',
      ],
      taxes,
      add_ons: 0,
      total_price: businessPrice,
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
      : ['WiFi miá»…n phÃ­ bay', 'Cá»•ng sáº¡c USB', 'Pháº§n Äƒn'],
  }))
}

function resolveEditorialDestination(editorialDestination = {}, flight = {}) {
  const arrivalCityLabel = formatCityLabel(flight.arrival_city ?? 'điểm đến')

  return {
    title: editorialDestination.title ?? `Khám phá ${arrivalCityLabel}`,
    description:
      editorialDestination.description ??
      `${arrivalCityLabel} là điểm đến sôi động với nhịp sống hiện đại, ẩm thực đa dạng và nhiều trải nghiệm văn hóa đặc sắc phù hợp cho cả hành trình công tác lẫn nghỉ ngơi cuối tuần.`,
    temperature_label: editorialDestination.temperature_label ?? '29°C Nắng',
    timezone_label: editorialDestination.timezone_label ?? 'Múi giờ GMT +7',
    image_url: editorialDestination.image_url ?? '/assets/template/home/v39_1669.png',
  }
}

function resolveFlightInfoText(flight) {
  if (flight.details?.flight_info) {
    return flight.details.flight_info
  }

  const aircraftLabel = flight.aircraft ?? 'tàu bay khai thác nội địa'

  return `Chuyến bay được khai thác bằng ${aircraftLabel}. Hành khách sẽ có hành trình gọn gàng với thông tin hạng vé, hành lý và chính sách hiển thị theo dữ liệu mock hiện tại.`
}

function resolveOnboardBenefits(flight) {
  if (Array.isArray(flight.details?.onboard_benefits) && flight.details.onboard_benefits.length) {
    return flight.details.onboard_benefits
  }

  return ['WiFi miễn phí bay', 'Cổng sạc USB', 'Phần ăn']
}

function resolvePaymentSummary(paymentSummary = {}) {
  return {
    passenger_label: paymentSummary.passenger_label ?? 'Người lớn (x1)',
    taxes_label: paymentSummary.taxes_label ?? 'Thuế & Phí',
    add_on_label: paymentSummary.add_on_label ?? 'Dịch vụ bổ sung',
    cta_primary: paymentSummary.cta_primary ?? 'Đặt ngay',
    cta_secondary: paymentSummary.cta_secondary ?? 'Thêm vào giỏ hàng',
    fare_subtitle: paymentSummary.fare_subtitle ?? '',
  }
}

function buildBaseFlightView(flight) {
  const departureCityLabel = formatCityLabel(flight.departure_city)
  const arrivalCityLabel = formatCityLabel(flight.arrival_city)

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
    aircraft_label: flight.aircraft ?? 'Máy bay khai thác nội địa',
    cabin_class_label: getCabinClassLabel(flight.cabin_class),
    departure_city_label: departureCityLabel,
    arrival_city_label: arrivalCityLabel,
    departure_airport_short_label: formatAirportShortLabel(flight.departure_airport, departureCityLabel),
    arrival_airport_short_label: formatAirportShortLabel(flight.arrival_airport, arrivalCityLabel),
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
    detail_path: `/flights/${flight.slug}`,
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
    detail_path: `${detailPathPrefix}/${flight.slug}`,
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
          detail_path: `${detailPathPrefix}/${relatedFlight.slug}`,
        }))
      : [],
  }
}
