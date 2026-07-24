import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingBlock,
  AdminSegmentedControl,
} from '../../components/admin/ui/index.js'
import useAdminRevenueReport from '../../hooks/useAdminRevenueReport.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

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
  const trendDirection = metric.trendDirection === 'down' ? 'down' : 'up'
  const trendToneClass =
    metric.trendDirection === 'neutral'
      ? ''
      : ` admin-revenue-metric__trend--${trendDirection}`

  return (
    <article className={`admin-revenue-metric admin-revenue-metric--${metric.tone}`}>
      <p className="admin-revenue-metric__label">{metric.label}</p>
      <strong className="admin-revenue-metric__value">{metric.value}</strong>
      {metric.trend ? (
        <span
          aria-label={metric.trend}
          className={`admin-revenue-metric__trend${trendToneClass}`}
        >
          {metric.trendDirection === 'neutral' ? null : (
            <TrendIcon direction={trendDirection} />
          )}
          {metric.trend}
        </span>
      ) : null}
    </article>
  )
}

function AdminRevenuePage() {
  const { currentPermissions, currentRole } = useOutletContext()
  const {
    error,
    exportReport,
    exportingFormat,
    feedback,
    hasReport,
    loading,
    range,
    rangeOptions,
    reloadReport,
    report,
    setRange,
  } = useAdminRevenueReport()
  const maxSeriesValue = useMemo(
    () => Math.max(...(report?.series ?? []).map((point) => point.value), 0),
    [report],
  )
  const hasSeriesData = Boolean(report?.series?.some((point) => point.value > 0))
  const canExport = Boolean(hasReport) && !loading && hasPermission(
    currentRole,
    ADMIN_PERMISSIONS.reportsExport,
    currentPermissions,
  )

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
            disabled={!canExport}
            icon={<DownloadIcon />}
            loading={exportingFormat === 'xlsx'}
            onClick={() => exportReport('xlsx')}
          >
            Xuất Excel
          </AdminButton>
          <AdminButton
            className="admin-revenue-page__export admin-revenue-page__export--pdf"
            disabled={!canExport}
            icon={<PdfIcon />}
            loading={exportingFormat === 'pdf'}
            variant="primary"
            onClick={() => exportReport('pdf')}
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
            disabled={loading}
            options={rangeOptions}
            value={range}
            variant="pill"
            onChange={setRange}
          />
        </div>

        <button className="admin-revenue-page__period-button" disabled={loading} type="button">
          <CalendarIcon />
          <span>{report?.period ?? ''}</span>
          <ChevronDownIcon />
        </button>
      </section>

      {feedback ? (
        <p className="admin-ops-page__result-note" role="status">
          {feedback}
        </p>
      ) : null}

      {loading && !hasReport ? (
        <AdminLoadingBlock rows={4} />
      ) : null}

      {error && !hasReport ? (
        <AdminErrorState
          title="Không thể tải báo cáo doanh thu"
          description={error}
          action={
            <AdminButton variant="secondary" onClick={reloadReport}>
              Thử lại
            </AdminButton>
          }
        />
      ) : null}

      {hasReport ? (
        <>
          {error ? (
            <AdminErrorState
              title="Dữ liệu có thể chưa mới nhất"
              description={error}
              action={
                <AdminButton variant="secondary" onClick={reloadReport}>
                  Tải lại
                </AdminButton>
              }
            />
          ) : null}

          {report.warnings.length > 0 ? (
            <p className="admin-ops-page__result-note" role="status">
              {report.warnings.map((warning) => warning.message).join(' ')}
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
                {hasSeriesData ? (
                  <div className="admin-revenue-page__bars">
                    {report.series.map((point) => (
                      <span
                        aria-label={`${point.label}: ${point.display}`}
                        className={`admin-revenue-page__bar${point.highlight ? ' admin-revenue-page__bar--highlight' : ''}`}
                        key={point.period}
                        style={{
                          height: `${Math.max(12, Math.round((point.value / maxSeriesValue) * 100))}%`,
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <AdminEmptyState
                    title="Chưa có doanh thu"
                    description="Backend chưa ghi nhận giao dịch thành công trong khoảng thời gian này."
                  />
                )}
                <span className="admin-revenue-page__chart-label">
                  Doanh thu ròng theo {report.groupBy === 'month' ? 'tháng' : report.groupBy === 'week' ? 'tuần' : 'ngày'}
                </span>
              </div>
            </section>

            <section className="admin-revenue-page__breakdown-card" aria-labelledby="cashflow-breakdown-title">
              <header className="admin-revenue-page__card-header">
                <h2 id="cashflow-breakdown-title">Cơ cấu dòng tiền</h2>
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
        </>
      ) : null}
    </main>
  )
}

export default AdminRevenuePage
