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

function formatDurationText(durationMinutes = 0) {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60

  return `${hours}h${padNumber(minutes)}p`
}

function formatStationLabel(station = '', city = '') {
  if (station) {
    return station
  }

  return city
}

export function mapTrainToCardView(train) {
  return {
    ...train,
    departure_time_label: formatTimeLabel(train.departure_at),
    arrival_time_label: formatTimeLabel(train.arrival_at),
    departure_date_key: formatDateKey(train.departure_at),
    arrival_date_key: formatDateKey(train.arrival_at),
    duration_text: formatDurationText(Number(train.duration_minutes ?? 0)),
    departure_station_label: formatStationLabel(train.departure_station, train.departure_city),
    arrival_station_label: formatStationLabel(train.arrival_station, train.arrival_city),
    train_number_label: String(train.train_number ?? '').toUpperCase(),
    availability_label: `Chỉ còn ${train.available_seats} chỗ`,
    route_label: `${train.departure_city} - ${train.arrival_city}`,
  }
}
