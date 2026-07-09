const WEEKDAY_LABELS = Object.freeze(['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'])

function createDate(year, monthIndex, day) {
  return new Date(year, monthIndex, day)
}

export function normalizeRevenueDate(date = new Date()) {
  return createDate(date.getFullYear(), date.getMonth(), date.getDate())
}

export function compareRevenueDates(firstDate, secondDate) {
  const firstTime = normalizeRevenueDate(firstDate).getTime()
  const secondTime = normalizeRevenueDate(secondDate).getTime()

  if (firstTime === secondTime) {
    return 0
  }

  return firstTime > secondTime ? 1 : -1
}

export function isSameRevenueDate(firstDate, secondDate) {
  return compareRevenueDates(firstDate, secondDate) === 0
}

export function addRevenueMonths(date, offset) {
  return createDate(date.getFullYear(), date.getMonth() + offset, 1)
}

export function getRevenueMonthDays(monthDate) {
  const firstDayOfMonth = createDate(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const startOffset = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1
  const gridStartDate = createDate(
    firstDayOfMonth.getFullYear(),
    firstDayOfMonth.getMonth(),
    1 - startOffset,
  )

  return Array.from({ length: 42 }, (_, index) =>
    createDate(
      gridStartDate.getFullYear(),
      gridStartDate.getMonth(),
      gridStartDate.getDate() + index,
    ),
  )
}

export function getRevenueWeekdayLabels() {
  return WEEKDAY_LABELS
}

export function formatRevenueMonthLabel(date) {
  return `Tháng ${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`
}

export function formatRevenueDateLabel(date) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date)
}

export function formatRevenueDateParam(date) {
  const normalizedDate = normalizeRevenueDate(date)
  const year = normalizedDate.getFullYear()
  const month = String(normalizedDate.getMonth() + 1).padStart(2, '0')
  const day = String(normalizedDate.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function getDefaultRevenueDateRange(range = 'month', today = new Date()) {
  const normalizedToday = normalizeRevenueDate(today)

  if (range === 'day') {
    return {
      endDate: normalizedToday,
      startDate: normalizedToday,
    }
  }

  if (range === 'year') {
    return {
      endDate: normalizedToday,
      startDate: createDate(normalizedToday.getFullYear(), 0, 1),
    }
  }

  return {
    endDate: normalizedToday,
    startDate: createDate(normalizedToday.getFullYear(), normalizedToday.getMonth(), 1),
  }
}

export function normalizeRevenueDateRange(dateRange, range = 'month', today = new Date()) {
  const fallbackRange = getDefaultRevenueDateRange(range, today)
  const startDate = normalizeRevenueDate(dateRange?.startDate ?? fallbackRange.startDate)
  const endDate = normalizeRevenueDate(dateRange?.endDate ?? fallbackRange.endDate)

  if (compareRevenueDates(startDate, endDate) <= 0) {
    return { endDate, startDate }
  }

  return {
    endDate: startDate,
    startDate: endDate,
  }
}

export function formatRevenueDateRangeLabel(dateRange, range = 'month', today = new Date()) {
  const normalizedRange = normalizeRevenueDateRange(dateRange, range, today)
  const startLabel = formatRevenueDateLabel(normalizedRange.startDate)
  const endLabel = formatRevenueDateLabel(normalizedRange.endDate)

  if (startLabel === endLabel) {
    return `Ngày ${startLabel}`
  }

  return `${startLabel} - ${endLabel}`
}
