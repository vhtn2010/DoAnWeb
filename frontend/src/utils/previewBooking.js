function padNumber(value) {
  return String(value).padStart(2, '0')
}

export function buildPreviewBookingCode(now = new Date()) {
  const safeDate = now instanceof Date && !Number.isNaN(now.getTime()) ? now : new Date()
  const year = safeDate.getFullYear()
  const month = padNumber(safeDate.getMonth() + 1)
  const day = padNumber(safeDate.getDate())
  const hours = padNumber(safeDate.getHours())
  const minutes = padNumber(safeDate.getMinutes())
  const seconds = padNumber(safeDate.getSeconds())

  return `BK${year}${month}${day}${hours}${minutes}${seconds}`
}

export function resolvePreviewBookingCode(...values) {
  for (const value of values) {
    const normalizedValue = typeof value === 'string' ? value.trim().toUpperCase() : ''

    if (normalizedValue) {
      return normalizedValue
    }
  }

  return buildPreviewBookingCode()
}
