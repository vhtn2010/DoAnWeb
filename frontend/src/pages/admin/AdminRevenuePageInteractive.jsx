import { useEffect, useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminLoadingBlock,
  AdminSegmentedControl,
} from '../../components/admin/ui/index.js'
import useAdminRevenueReportEnhanced from '../../hooks/useAdminRevenueReportEnhanced.js'
import {
  addRevenueMonths,
  compareRevenueDates,
  formatRevenueDateLabel,
  formatRevenueDateRangeLabel,
  formatRevenueMonthLabel,
  getDefaultRevenueDateRange,
  getRevenueMonthDays,
  getRevenueWeekdayLabels,
  isSameRevenueDate,
  normalizeRevenueDate,
} from '../../utils/adminRevenueDateRange.js'
import { ADMIN_PERMISSIONS, hasPermission } from '../../utils/rolePermissions.js'

const WEEKDAY_LABELS = getRevenueWeekdayLabels()

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

function MonthNavIcon({ direction }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 12 12">
      <path
        d={direction === 'left' ? 'M7.5 2.25 3.75 6l3.75 3.75' : 'M4.5 2.25 8.25 6 4.5 9.75'}
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function startOfRevenueMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function isSameRevenueMonth(firstDate, secondDate) {
  return (
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth()
  )
}

function getPickerPreviewLabel(draftRange, range) {
  if (!draftRange.startDate) {
    return 'Chọn ngày bắt đầu và ngày kết thúc để xem doanh thu.'
  }

  if (!draftRange.endDate) {
    return `Đã chọn ngày bắt đầu ${formatRevenueDateLabel(draftRange.startDate)}. Chọn thêm ngày kết thúc hoặc bấm áp dụng để xem trong 1 ngày.`
  }

  return `Đang xem dữ liệu từ ${formatRevenueDateRangeLabel(draftRange, range)}.`
}

function getInitialVisibleMonth(date, today = new Date()) {
  const currentMonth = startOfRevenueMonth(today)
  const selectedMonth = startOfRevenueMonth(date)

  if (isSameRevenueMonth(currentMonth, selectedMonth)) {
    return addRevenueMonths(selectedMonth, -1)
  }

  return selectedMonth
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

function RevenueDateRangePopover({
  draftRange,
  loading,
  range,
  today,
  visibleMonth,
  onApply,
  onMonthChange,
  onPickDate,
  onReset,
}) {
  const monthPanels = [visibleMonth, addRevenueMonths(visibleMonth, 1)]

  return (
    <div
      aria-label="Chọn khoảng ngày doanh thu"
      className="admin-revenue-page__period-popover"
      role="dialog"
    >
      <div className="admin-revenue-page__period-popover-header">
        <div className="admin-revenue-page__period-popover-copy">
          <h3>Chọn khoảng ngày</h3>
          <p>{getPickerPreviewLabel(draftRange, range)}</p>
        </div>

        <div className="admin-revenue-page__period-popover-nav">
          <button
            aria-label="Tháng trước"
            className="admin-revenue-page__period-nav-button"
            type="button"
            onClick={() => onMonthChange(-1)}
          >
            <MonthNavIcon direction="left" />
          </button>
          <button
            aria-label="Tháng sau"
            className="admin-revenue-page__period-nav-button"
            type="button"
            onClick={() => onMonthChange(1)}
          >
            <MonthNavIcon direction="right" />
          </button>
        </div>
      </div>

      <div className="admin-revenue-page__period-summary">
        <div className="admin-revenue-page__period-summary-card">
          <span>Từ ngày</span>
          <strong>
            {draftRange.startDate ? formatRevenueDateLabel(draftRange.startDate) : 'Chọn ngày bắt đầu'}
          </strong>
        </div>
        <div className="admin-revenue-page__period-summary-card">
          <span>Đến ngày</span>
          <strong>
            {draftRange.endDate ? formatRevenueDateLabel(draftRange.endDate) : 'Chọn ngày kết thúc'}
          </strong>
        </div>
      </div>

      <div className="admin-revenue-page__period-calendars">
        {monthPanels.map((monthDate) => (
          <section className="admin-revenue-page__calendar-month" key={monthDate.toISOString()}>
            <h4 className="admin-revenue-page__calendar-month-label">
              {formatRevenueMonthLabel(monthDate)}
            </h4>

            <div className="admin-revenue-page__calendar-weekdays">
              {WEEKDAY_LABELS.map((weekdayLabel) => (
                <span
                  className={`admin-revenue-page__calendar-weekday ${
                    weekdayLabel === 'CN'
                      ? 'admin-revenue-page__calendar-weekday--sunday'
                      : ''
                  }`}
                  key={`${monthDate.toISOString()}-${weekdayLabel}`}
                >
                  {weekdayLabel}
                </span>
              ))}
            </div>

            <div className="admin-revenue-page__calendar-grid">
              {getRevenueMonthDays(monthDate).map((day) => {
                const normalizedDay = normalizeRevenueDate(day)
                const isCurrentMonth = day.getMonth() === monthDate.getMonth()
                const isStartDate = draftRange.startDate && isSameRevenueDate(day, draftRange.startDate)
                const isEndDate = draftRange.endDate && isSameRevenueDate(day, draftRange.endDate)
                const isInSelectedRange =
                  draftRange.startDate &&
                  draftRange.endDate &&
                  compareRevenueDates(day, draftRange.startDate) > 0 &&
                  compareRevenueDates(day, draftRange.endDate) < 0
                const isFutureDay = compareRevenueDates(normalizedDay, today) > 0

                return (
                  <button
                    className={`admin-revenue-page__calendar-day ${
                      isCurrentMonth ? '' : 'admin-revenue-page__calendar-day--outside'
                    } ${
                      day.getDay() === 0 ? 'admin-revenue-page__calendar-day--sunday' : ''
                    } ${
                      isInSelectedRange ? 'admin-revenue-page__calendar-day--in-range' : ''
                    } ${
                      isStartDate ? 'admin-revenue-page__calendar-day--range-start' : ''
                    } ${
                      isEndDate ? 'admin-revenue-page__calendar-day--range-end' : ''
                    } ${isFutureDay ? 'admin-revenue-page__calendar-day--disabled' : ''}`}
                    disabled={isFutureDay || loading}
                    key={day.toISOString()}
                    type="button"
                    onClick={() => onPickDate(normalizedDay)}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <div className="admin-revenue-page__period-popover-footer">
        <button
          className="admin-revenue-page__period-reset"
          disabled={loading}
          type="button"
          onClick={onReset}
        >
          Đặt lại theo mốc hiện tại
        </button>

        <div className="admin-revenue-page__period-actions">
          <button
            className="admin-revenue-page__period-apply"
            disabled={!draftRange.startDate || loading}
            type="button"
            onClick={onApply}
          >
            Áp dụng khoảng ngày
          </button>
        </div>
      </div>
    </div>
  )
}

function AdminRevenuePageInteractive() {
  const { currentPermissions, currentRole } = useOutletContext()
  const {
    dateRange,
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
    setDateRange,
    setRange,
  } = useAdminRevenueReportEnhanced()
  const pickerRef = useRef(null)
  const today = useMemo(() => normalizeRevenueDate(new Date()), [])
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [draftRange, setDraftRange] = useState(dateRange)
  const [visibleMonth, setVisibleMonth] = useState(() =>
    getInitialVisibleMonth(dateRange.startDate, today),
  )
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

  useEffect(() => {
    if (isPickerOpen) {
      return
    }

    setDraftRange(dateRange)
    setVisibleMonth(getInitialVisibleMonth(dateRange.startDate, today))
  }, [dateRange, isPickerOpen, today])

  useEffect(() => {
    if (!isPickerOpen) {
      return undefined
    }

    function handlePointerDown(event) {
      if (!pickerRef.current?.contains(event.target)) {
        setIsPickerOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsPickerOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isPickerOpen])

  function handleTogglePicker() {
    if (loading) {
      return
    }

    if (!isPickerOpen) {
      setDraftRange(dateRange)
      setVisibleMonth(getInitialVisibleMonth(dateRange.startDate, today))
    }

    setIsPickerOpen((currentValue) => !currentValue)
  }

  function handleDatePick(nextDate) {
    setDraftRange((currentRange) => {
      if (!currentRange.startDate || currentRange.endDate) {
        return {
          endDate: null,
          startDate: nextDate,
        }
      }

      if (compareRevenueDates(nextDate, currentRange.startDate) < 0) {
        return {
          endDate: currentRange.startDate,
          startDate: nextDate,
        }
      }

      return {
        endDate: nextDate,
        startDate: currentRange.startDate,
      }
    })
  }

  function handleApplyDateRange() {
    if (!draftRange.startDate) {
      return
    }

    setDateRange({
      endDate: draftRange.endDate ?? draftRange.startDate,
      startDate: draftRange.startDate,
    })
    setIsPickerOpen(false)
  }

  function handleResetDateRange() {
    const fallbackRange = getDefaultRevenueDateRange(range, today)

    setDraftRange(fallbackRange)
    setVisibleMonth(getInitialVisibleMonth(fallbackRange.startDate, today))
  }

  function handleRangeChange(nextRange) {
    setIsPickerOpen(false)
    setRange(nextRange)
  }

  return (
    <main className="admin-revenue-page">
      <section className="admin-revenue-page__header">
        <div className="admin-revenue-page__header-copy">
          <h1>Báo cáo doanh thu</h1>
          <p>Phân tích doanh thu và hiệu quả tài chính theo khoảng ngày thực tế.</p>
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
            ariaLabel="Chọn mốc xem báo cáo"
            className="admin-revenue-page__range-tabs"
            disabled={loading}
            options={rangeOptions}
            value={range}
            variant="pill"
            onChange={handleRangeChange}
          />
        </div>

        <div className="admin-revenue-page__period-picker" ref={pickerRef}>
          <button
            aria-expanded={isPickerOpen}
            aria-haspopup="dialog"
            className={`admin-revenue-page__period-button ${
              isPickerOpen ? 'admin-revenue-page__period-button--open' : ''
            }`}
            disabled={loading}
            type="button"
            onClick={handleTogglePicker}
          >
            <CalendarIcon />
            <span>{report?.period ?? formatRevenueDateRangeLabel(dateRange, range)}</span>
            <ChevronDownIcon />
          </button>

          {isPickerOpen ? (
            <RevenueDateRangePopover
              draftRange={draftRange}
              loading={loading}
              range={range}
              today={today}
              visibleMonth={visibleMonth}
              onApply={handleApplyDateRange}
              onMonthChange={(offset) => setVisibleMonth((currentMonth) => addRevenueMonths(currentMonth, offset))}
              onPickDate={handleDatePick}
              onReset={handleResetDateRange}
            />
          ) : null}
        </div>
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
                <h2 id="revenue-trend-title">Xu hướng doanh thu</h2>
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

export default AdminRevenuePageInteractive
