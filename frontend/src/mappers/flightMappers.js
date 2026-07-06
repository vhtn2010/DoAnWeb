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

function resolveFareOptions(flight) {
  const fareOptions = Array.isArray(flight.details?.fare_options) ? flight.details.fare_options : []

  if (fareOptions.length > 0) {
    return fareOptions.map((fareOption, index) => ({
      ...fareOption,
      id: fareOption.id ?? `fare-${flight.id}-${index + 1}`,
      title: fareOption.title ?? getCabinClassLabel(flight.cabin_class).toUpperCase(),
      cta_label: fareOption.cta_label ?? 'Chọn',
      features: Array.isArray(fareOption.features) ? fareOption.features : [],
      taxes: Number(fareOption.taxes ?? 0),
      add_ons: Number(fareOption.add_ons ?? 0),
      total_price: Number(fareOption.total_price ?? fareOption.price ?? flight.sale_price ?? 0),
      price: Number(fareOption.price ?? flight.sale_price ?? 0),
      is_featured: Boolean(fareOption.is_featured),
      is_default: Boolean(fareOption.is_default),
    }))
  }

  return [
    {
      id: `fare-${flight.id}-default`,
      title: getCabinClassLabel(flight.cabin_class).toUpperCase(),
      price: Number(flight.sale_price ?? 0),
      currency: flight.currency ?? 'VND',
      badge: '',
      is_featured: true,
      is_default: true,
      cta_label: 'Đã chọn',
      included_baggage: flight.baggage_allowance,
      refundable: Boolean(flight.refundable),
      changeable: Boolean(flight.changeable),
      features: [
        flight.baggage_allowance,
        flight.refundable ? 'Hoàn vé' : 'Không hoàn vé',
        flight.changeable ? 'Thay đổi vé (Có phí)' : 'Không đổi vé',
      ].filter(Boolean),
      taxes: 0,
      add_ons: 0,
      total_price: Number(flight.sale_price ?? 0),
    },
  ]
}

function resolveEditorialDestination(editorialDestination = {}) {
  return {
    title: editorialDestination.title ?? '',
    description: editorialDestination.description ?? '',
    temperature_label: editorialDestination.temperature_label ?? '',
    timezone_label: editorialDestination.timezone_label ?? '',
    image_url: editorialDestination.image_url ?? '',
  }
}

function resolveFlightInfoText(flight) {
  if (flight.details?.flight_info) {
    return flight.details.flight_info
  }

  const aircraftLabel = flight.aircraft ?? 'tàu bay khai thác nội địa'

  return `Chuyến bay được khai thác bằng ${aircraftLabel}. Hành khách sẽ có hành trình gọn gàng với thông tin hạng vé, hành lý và chính sách hiển thị theo dữ liệu mock hiện tại.`
}

function resolvePaymentSummary(paymentSummary = {}) {
  return {
    passenger_label: paymentSummary.passenger_label ?? 'Người lớn (x1)',
    taxes_label: paymentSummary.taxes_label ?? 'Thuế & Phí',
    add_on_label: paymentSummary.add_on_label ?? 'Dịch vụ bổ sung',
    cta_primary: paymentSummary.cta_primary ?? 'Đặt ngay',
    cta_secondary: paymentSummary.cta_secondary ?? 'Thêm vào giỏ hàng',
  }
}

function buildBaseFlightView(flight) {
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
    departure_city_label: formatCityLabel(flight.departure_city),
    arrival_city_label: formatCityLabel(flight.arrival_city),
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
    onboard_benefits: Array.isArray(flight.details?.onboard_benefits)
      ? flight.details.onboard_benefits
      : [],
    policies: Array.isArray(flight.details?.policies) ? flight.details.policies : [],
    editorial_destination: resolveEditorialDestination(flight.details?.editorial_destination),
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
