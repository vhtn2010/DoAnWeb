import { useMemo, useState } from 'react'
import {
  AdminButton,
  AdminSegmentedControl,
} from '../../components/admin/ui/index.js'

const RANGE_OPTIONS = Object.freeze([
  { value: 'day', label: 'Ngày' },
  { value: 'month', label: 'Tháng' },
  { value: 'year', label: 'Năm' },
])

const REVENUE_REPORTS = Object.freeze({
  day: {
    period: 'Ngày 05/07/2026',
    metrics: [
      { id: 'total-revenue', label: 'Tổng Doanh Thu', tone: 'rose', trend: '+8.4%', trendDirection: 'up', value: '128.5M đ' },
      { id: 'new-orders', label: 'Đơn Hàng Mới', tone: 'gold', trend: '+6.1%', trendDirection: 'up', value: '42' },
      { id: 'net-profit', label: 'Lợi Nhuận Ròng', tone: 'blue', trend: '+1.9%', trendDirection: 'up', value: '24.8M đ' },
      { id: 'new-customers', label: 'Khách Hàng Mới', tone: 'brand', trend: '+10.2%', trendDirection: 'up', value: '9' },
    ],
    series: [
      { label: '08:00', value: 30, display: '18M' },
      { label: '10:00', value: 50, display: '26M' },
      { label: '12:00', value: 45, display: '19M' },
      { label: '14:00', value: 70, display: '33M' },
      { label: '16:00', value: 65, display: '21M' },
      { label: '18:00', value: 90, display: '28M', highlight: true },
      { label: '20:00', value: 85, display: '25M' },
    ],
    breakdown: [
      { color: '#c8102e', label: 'Tour Du lịch', value: 48 },
      { color: '#ffd700', label: 'Khách sạn', value: 26 },
      { color: '#546ea7', label: 'Chuyến bay', value: 17 },
      { color: '#906f6b', label: 'Tàu hỏa', value: 9 },
    ],
  },
  month: {
    period: 'Tháng 05, 2026',
    metrics: [
      { id: 'total-revenue', label: 'Tổng Doanh Thu', tone: 'rose', trend: '+12.5%', trendDirection: 'up', value: '4.25B đ' },
      { id: 'new-orders', label: 'Đơn Hàng Mới', tone: 'gold', trend: '+5.2%', trendDirection: 'up', value: '1,245' },
      { id: 'net-profit', label: 'Lợi Nhuận Ròng', tone: 'blue', trend: '-2.1%', trendDirection: 'down', value: '850M đ' },
      { id: 'new-customers', label: 'Khách Hàng Mới', tone: 'brand', trend: '+18.4%', trendDirection: 'up', value: '30' },
    ],
    series: [
      { label: 'Tuần 1', value: 30, display: '520M' },
      { label: 'Tuần 2', value: 50, display: '760M' },
      { label: 'Tuần 3', value: 45, display: '690M' },
      { label: 'Tuần 4', value: 70, display: '1.02B' },
      { label: 'Tuần 5', value: 65, display: '940M' },
      { label: 'Tuần 6', value: 90, display: '1.28B', highlight: true },
      { label: 'Tuần 7', value: 85, display: '1.18B' },
    ],
    breakdown: [
      { color: '#c8102e', label: 'Tour Du lịch', value: 45 },
      { color: '#ffd700', label: 'Khách sạn', value: 30 },
      { color: '#546ea7', label: 'Chuyến bay', value: 15 },
      { color: '#906f6b', label: 'Tàu hỏa', value: 10 },
    ],
  },
  year: {
    period: 'Năm 2026',
    metrics: [
      { id: 'total-revenue', label: 'Tổng Doanh Thu', tone: 'rose', trend: '+21.8%', trendDirection: 'up', value: '48.7B đ' },
      { id: 'new-orders', label: 'Đơn Hàng Mới', tone: 'gold', trend: '+14.6%', trendDirection: 'up', value: '14,920' },
      { id: 'net-profit', label: 'Lợi Nhuận Ròng', tone: 'blue', trend: '+9.8%', trendDirection: 'up', value: '9.8B đ' },
      { id: 'new-customers', label: 'Khách Hàng Mới', tone: 'brand', trend: '+26.2%', trendDirection: 'up', value: '326' },
    ],
    series: [
      { label: 'Tháng 1', value: 38, display: '3.4B' },
      { label: 'Tháng 2', value: 46, display: '3.8B' },
      { label: 'Tháng 3', value: 55, display: '4.2B' },
      { label: 'Tháng 4', value: 64, display: '4.7B' },
      { label: 'Tháng 5', value: 78, display: '5.5B' },
      { label: 'Tháng 6', value: 90, display: '6.4B', highlight: true },
      { label: 'Tháng 7', value: 84, display: '6.1B' },
    ],
    breakdown: [
      { color: '#c8102e', label: 'Tour Du lịch', value: 52 },
      { color: '#ffd700', label: 'Khách sạn', value: 24 },
      { color: '#546ea7', label: 'Chuyến bay', value: 14 },
      { color: '#906f6b', label: 'Tàu hỏa', value: 10 },
    ],
  },
})

function DownloadIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M10 2v10m0 0 4-4m-4 4L6 8M3 14v2.5A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M4 2h8l4 4v12H4V2Zm8 0v4h4"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M6.6 14v-4h1.5c.78 0 1.25.42 1.25 1.1 0 .7-.47 1.12-1.25 1.12h-.55V14m3.05 0v-4h1.18c1.25 0 2.02.76 2.02 2s-.77 2-2.02 2h-1.18m4.02 0v-4h2.32m-2.32 1.8h1.92"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.1"
      />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="M6 2v3m8-3v3M3 8h14M5 4h10a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <path
        d="m5 7.5 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  )
}

function KebabIcon() {
  return (
    <svg fill="none" viewBox="0 0 4 16">
      <path
        d="M2 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM2 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM2 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function TrendIcon({ direction = 'up' }) {
  if (direction === 'down') {
    return (
      <svg fill="none" viewBox="0 0 16 10">
        <path
          d="M1 1.5 5.4 5.9l2.7-2.7L15 9m0 0h-4m4 0V5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    )
  }

  return (
    <svg fill="none" viewBox="0 0 16 10">
      <path
        d="M1 8.5 5.4 4.1l2.7 2.7L15 1m0 0h-4m4 0v4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function RevenueMetricCard({ metric }) {
  return (
    <article className={`admin-revenue-metric admin-revenue-metric--${metric.tone}`}>
      <p className="admin-revenue-metric__label">{metric.label}</p>
      <strong className="admin-revenue-metric__value">{metric.value}</strong>
      <span
        aria-label={`${metric.trendDirection === 'down' ? 'Giảm' : 'Tăng'} ${metric.trend}`}
        className={`admin-revenue-metric__trend admin-revenue-metric__trend--${metric.trendDirection}`}
      >
        <TrendIcon direction={metric.trendDirection} />
        {metric.trend}
      </span>
    </article>
  )
}

function AdminRevenuePage() {
  const [range, setRange] = useState('month')
  const [feedback, setFeedback] = useState('')
  const report = REVENUE_REPORTS[range]
  const maxSeriesValue = useMemo(
    () => Math.max(...report.series.map((point) => point.value)),
    [report],
  )

  function exportReport(format) {
    setFeedback(`Đã chuẩn bị báo cáo doanh thu ${report.period} dạng ${format}.`)
  }

  return (
    <main className="admin-revenue-page">
      <section className="admin-revenue-page__header">
        <div className="admin-revenue-page__header-copy">
          <h1>Báo cáo Doanh thu</h1>
          <p>Phân tích doanh thu và hiệu quả tài chính</p>
        </div>
        <div className="admin-revenue-page__actions" aria-label="Xuất báo cáo">
          <AdminButton
            className="admin-revenue-page__export admin-revenue-page__export--excel"
            icon={<DownloadIcon />}
            onClick={() => exportReport('Excel')}
          >
            Xuất Excel
          </AdminButton>
          <AdminButton
            className="admin-revenue-page__export admin-revenue-page__export--pdf"
            icon={<PdfIcon />}
            onClick={() => exportReport('PDF')}
            variant="primary"
          >
            Xuất PDF
          </AdminButton>
        </div>
      </section>

      <section className="admin-revenue-page__filters" aria-label="Bộ lọc khoảng thời gian báo cáo">
        <div className="admin-revenue-page__filter-range">
          <span className="admin-revenue-page__filter-label">Thời gian:</span>
          <AdminSegmentedControl
            ariaLabel="Chọn khoảng thời gian báo cáo"
            className="admin-revenue-page__range-tabs"
            options={RANGE_OPTIONS}
            value={range}
            variant="pill"
            onChange={setRange}
          />
        </div>

        <button className="admin-revenue-page__period-button" type="button">
          <CalendarIcon />
          <span>{report.period}</span>
          <ChevronDownIcon />
        </button>
      </section>

      {feedback ? (
        <p className="admin-ops-page__result-note" role="status">
          {feedback}
        </p>
      ) : null}

      <section className="admin-revenue-page__metrics" aria-label="Chỉ số doanh thu">
        {report.metrics.map((metric) => (
          <RevenueMetricCard key={metric.id} metric={metric} />
        ))}
      </section>

      <div className="admin-revenue-page__analytics">
        <section className="admin-revenue-page__chart-card" aria-labelledby="revenue-trend-title">
          <header className="admin-revenue-page__card-header">
            <h2 id="revenue-trend-title">Xu hướng Doanh thu</h2>
            <button aria-label="Xem chi tiết xu hướng doanh thu" type="button">
              <KebabIcon />
            </button>
          </header>

          <div className="admin-revenue-page__chart-area" aria-label="Khu vực biểu đồ doanh thu">
            <div className="admin-revenue-page__bars">
              {report.series.map((point) => (
                <span
                  aria-label={`${point.label}: ${point.display}`}
                  className={`admin-revenue-page__bar${point.highlight ? ' admin-revenue-page__bar--highlight' : ''}`}
                  key={point.label}
                  style={{ height: `${Math.max(30, Math.round((point.value / maxSeriesValue) * 100))}%` }}
                />
              ))}
            </div>
            <span className="admin-revenue-page__chart-label">Khu vực biểu đồ đồ thị đường</span>
          </div>
        </section>

        <section className="admin-revenue-page__breakdown-card" aria-labelledby="service-breakdown-title">
          <header className="admin-revenue-page__card-header">
            <h2 id="service-breakdown-title">Cơ cấu Dịch vụ</h2>
          </header>

          <div className="admin-revenue-page__breakdown-list">
            {report.breakdown.map((item) => (
              <div className="admin-revenue-page__breakdown-item" key={item.label}>
                <div className="admin-revenue-page__breakdown-row">
                  <span className="admin-revenue-page__breakdown-name">
                    <span style={{ backgroundColor: item.color }} />
                    {item.label}
                  </span>
                  <strong>{item.value}%</strong>
                </div>
                <div className="admin-revenue-page__progress" aria-hidden="true">
                  <span style={{ backgroundColor: item.color, width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}

export default AdminRevenuePage
