const RANGE_OPTIONS = Object.freeze([
  { value: 'day', label: 'Ngày' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
])

const RANGE_GROUP_BY = Object.freeze({
  day: 'day',
  month: 'week',
  year: 'month',
})

const BREAKDOWN_COLORS = Object.freeze({
  netRevenue: '#c8102e',
  refundAmount: '#ffd700',
})

const numberFormatter = new Intl.NumberFormat('vi-VN')

function formatDateParam(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getDateParts(date = new Date()) {
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: String(date.getMonth() + 1).padStart(2, '0'),
    year: date.getFullYear(),
  }
}

function parsePeriodParts(period = '') {
  const [year, month, day] = String(period).split('-').map((part) => Number(part))

  return {
    day: Number.isFinite(day) ? day : 0,
    month: Number.isFinite(month) ? month : 0,
    year: Number.isFinite(year) ? year : 0,
  }
}

function formatPeriodLabel(period, groupBy) {
  const { day, month } = parsePeriodParts(period)

  if (!month) {
    return period || 'N/A'
  }

  if (groupBy === 'month') {
    return `Tháng ${month}`
  }

  if (groupBy === 'week') {
    return `Tuần ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
  }

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`
}

function formatPeriodButtonLabel(range, today = new Date()) {
  const { day, month, year } = getDateParts(today)

  if (range === 'day') {
    return `Ngày ${day}/${month}/${year}`
  }

  if (range === 'year') {
    return `Năm ${year}`
  }

  return `Tháng ${month}/${year}`
}

function getRangeStart(range, today = new Date()) {
  if (range === 'day') {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate())
  }

  if (range === 'year') {
    return new Date(today.getFullYear(), 0, 1)
  }

  return new Date(today.getFullYear(), today.getMonth(), 1)
}

function toNumber(value) {
  return Number(value || 0)
}

function calculatePercentage(value, total) {
  if (!total) {
    return 0
  }

  return Math.min(100, Math.round((value / total) * 100))
}

export function formatAdminRevenueCurrency(amount = 0) {
  return new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount)
}

export function formatAdminRevenueCompactCurrency(amount = 0) {
  const absoluteAmount = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  const formatShortNumber = (value, maximumFractionDigits = 1) =>
    new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits,
      minimumFractionDigits: 0,
    }).format(value)

  if (absoluteAmount >= 1000000000) {
    return `${sign}${formatShortNumber(absoluteAmount / 1000000000)}B đ`
  }

  if (absoluteAmount >= 1000000) {
    return `${sign}${formatShortNumber(absoluteAmount / 1000000)}M đ`
  }

  return `${sign}${numberFormatter.format(absoluteAmount)} đ`
}

export function getAdminRevenueRangeOptions() {
  return RANGE_OPTIONS
}

export function getAdminRevenueReportQuery(range = 'month') {
  const today = new Date()
  const from = getRangeStart(range, today)

  return {
    from: formatDateParam(from),
    group_by: RANGE_GROUP_BY[range] ?? RANGE_GROUP_BY.month,
    to: formatDateParam(today),
  }
}

export function mapAdminRevenueReportData(payload, { range = 'month' } = {}) {
  const summary = payload?.summary ?? {}
  const groupBy = payload?.group_by ?? RANGE_GROUP_BY[range] ?? RANGE_GROUP_BY.month
  const grossRevenue = toNumber(summary.gross_revenue)
  const netRevenue = toNumber(summary.net_revenue)
  const paymentCount = toNumber(summary.payment_count)
  const refundAmount = toNumber(summary.refund_amount)
  const refundCount = toNumber(summary.refund_count)
  const periods = Array.isArray(payload?.periods) ? payload.periods : []
  const mappedSeries = periods.map((point) => ({
    display: formatAdminRevenueCompactCurrency(toNumber(point.net_revenue)),
    label: formatPeriodLabel(point.period, groupBy),
    period: point.period,
    value: toNumber(point.net_revenue),
  }))
  const maxSeriesValue = Math.max(...mappedSeries.map((point) => point.value), 0)

  return {
    breakdown: [
      {
        amount: netRevenue,
        color: BREAKDOWN_COLORS.netRevenue,
        label: 'Doanh thu ròng',
        value: calculatePercentage(netRevenue, grossRevenue),
      },
      {
        amount: refundAmount,
        color: BREAKDOWN_COLORS.refundAmount,
        label: 'Hoàn tiền',
        value: calculatePercentage(refundAmount, grossRevenue),
      },
    ],
    groupBy,
    hasRevenueData: grossRevenue > 0 || mappedSeries.some((point) => point.value > 0),
    metrics: [
      {
        id: 'gross-revenue',
        label: 'Tổng Doanh Thu',
        tone: 'rose',
        trend: `${numberFormatter.format(paymentCount)} giao dịch`,
        trendDirection: 'neutral',
        value: formatAdminRevenueCompactCurrency(grossRevenue),
      },
      {
        id: 'payment-count',
        label: 'Giao Dịch Thu Tiền',
        tone: 'gold',
        trend: 'Đã đối soát',
        trendDirection: 'neutral',
        value: numberFormatter.format(paymentCount),
      },
      {
        id: 'net-revenue',
        label: 'Doanh Thu Ròng',
        tone: 'blue',
        trend: refundAmount > 0 ? 'Sau hoàn tiền' : 'Không hoàn tiền',
        trendDirection: 'neutral',
        value: formatAdminRevenueCompactCurrency(netRevenue),
      },
      {
        id: 'refund-amount',
        label: 'Hoàn Tiền',
        tone: 'brand',
        trend: `${numberFormatter.format(refundCount)} yêu cầu`,
        trendDirection: refundAmount > 0 ? 'down' : 'neutral',
        value: formatAdminRevenueCompactCurrency(refundAmount),
      },
    ],
    period: formatPeriodButtonLabel(range),
    range: payload?.range ?? null,
    series: mappedSeries.map((point) => ({
      ...point,
      highlight: maxSeriesValue > 0 && point.value === maxSeriesValue,
    })),
    summary: {
      grossRevenue,
      netRevenue,
      paymentCount,
      refundAmount,
      refundCount,
    },
    warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
  }
}
