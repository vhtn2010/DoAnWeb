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

function formatDurationText(durationMinutes = 0) {
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

function getCabinClassLabel(cabinClass = '') {
  const labels = {
    economy: 'Phổ thông',
    premium_economy: 'Phổ thông đặc biệt',
    business: 'Thương gia',
    first: 'Hạng nhất',
  }

  return labels[cabinClass] ?? cabinClass
}

export function mapFlightToCardView(flight) {
  return {
    ...flight,
    departure_time_label: formatTimeLabel(flight.departure_at),
    arrival_time_label: formatTimeLabel(flight.arrival_at),
    departure_date_label: formatDateLabel(flight.departure_at),
    arrival_date_label: formatDateLabel(flight.arrival_at),
    duration_text: formatDurationText(Number(flight.duration_minutes ?? 0)),
    route_text: `${flight.departure_airport_code} → ${flight.arrival_airport_code}`,
    cabin_class_label: getCabinClassLabel(flight.cabin_class),
    policy_text: [
      flight.refundable ? 'Hoàn vé' : 'Không hoàn vé',
      flight.changeable ? 'Đổi lịch được' : 'Không đổi lịch',
    ].join(' • '),
  }
}
