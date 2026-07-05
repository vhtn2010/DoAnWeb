import {
  AdminButton,
  AdminCard,
  AdminErrorState,
  AdminLoadingBlock,
} from '../../components/admin/ui/index.js'
import useAdminDashboard from '../../hooks/useAdminDashboard.js'

const rangeTabs = [
  { label: '30 Ngày', value: '30_days' },
  { label: '7 Ngày', value: '7_days' },
]

const fallbackActivities = [
  {
    author: 'Bởi: Admin Nguyễn Văn A',
    icon: 'plus',
    key: 'tour-created',
    time: '10 phút trước',
    title: 'Tạo mới Tour Vịnh Hạ Long',
    tone: 'danger',
  },
  {
    author: 'Bởi: Staff Trần Thị B',
    icon: 'check',
    key: 'partner-approved',
    time: '45 phút trước',
    title: 'Phê duyệt đối tác Khách sạn ABC',
    tone: 'success',
  },
  {
    author: 'Bởi: System (Auto)',
    icon: 'history',
    key: 'payment-config',
    time: '2 giờ trước',
    title: 'Cập nhật cấu hình Cổng thanh toán',
    tone: 'neutral',
  },
  {
    author: 'Hạ tầng hệ thống',
    icon: 'warning',
    key: 'server-warning',
    time: '3 giờ trước',
    title: 'Cảnh báo tải cao: Server Node 02',
    tone: 'warning',
  },
]

const iconPaths = {
  arrowRight: (
    <path
      d="M5 12h13m-5-5 5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
  chart: (
    <>
      <path
        d="M4.5 19V5m0 14h15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 15v-4m4 4V8m4 7v-6"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </>
  ),
  check: (
    <path
      d="m7 12 3 3 7-7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2.4"
    />
  ),
  history: (
    <>
      <path
        d="M5 9V5h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M5.6 9.5a7 7 0 1 1 1.3 6.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </>
  ),
  plus: (
    <>
      <circle cx="12" cy="12" fill="currentColor" r="7" />
      <path d="M12 8.5v7M8.5 12h7" stroke="#fff" strokeLinecap="round" strokeWidth="1.8" />
    </>
  ),
  refresh: (
    <path
      d="M18.5 7.5a7 7 0 1 0 1 6.5m0-6.5V3.8m0 3.7h-3.7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
  revenue: (
    <path
      d="M4.5 18.5V15m5 3.5v-7m5 7v-10m5 10V5.5M4.5 12.5l5-5 4 4 6-7"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
    />
  ),
  staff: (
    <>
      <rect
        fill="none"
        height="12"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.8"
        width="14"
        x="5"
        y="7"
      />
      <path
        d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M12 11v3m-2-1.5h4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </>
  ),
  trendUp: (
    <path
      d="m4.5 14 4.5-4.5 3 3L18.5 6m0 0h-4m4 0v4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
  users: (
    <>
      <circle cx="9" cy="9" fill="currentColor" r="3.4" />
      <circle cx="16.3" cy="9.8" fill="currentColor" opacity="0.8" r="2.6" />
      <path
        d="M3.8 18.5a5.3 5.3 0 0 1 10.4 0"
        fill="currentColor"
        opacity="0.92"
      />
      <path d="M13.7 18.5a4.2 4.2 0 0 1 6.5 0" fill="currentColor" opacity="0.72" />
    </>
  ),
  warning: (
    <path
      d="M12 4.8 21 19H3L12 4.8Zm0 5.2v3.6m0 2.8h.01"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    />
  ),
}

function DashboardIcon({ name }) {
  return (
    <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24">
      {iconPaths[name]}
    </svg>
  )
}

function getMetricByKey(metricCards, key) {
  return metricCards.find((card) => card.key === key)
}

function formatCompactVnd(amount = 0) {
  if (amount >= 1000000000) {
    return `${new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: amount >= 10000000000 ? 0 : 1,
    }).format(amount / 1000000000)}B ₫`
  }

  if (amount >= 1000000) {
    return `${new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: amount >= 100000000 ? 0 : 1,
    }).format(amount / 1000000)}M ₫`
  }

  return new Intl.NumberFormat('vi-VN', {
    currency: 'VND',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount)
}

function formatPercent(value = 0) {
  const prefix = value >= 0 ? '+' : ''

  return `${prefix}${value}%`
}

function formatNumber(value = 0) {
  return new Intl.NumberFormat('vi-VN').format(value)
}

function formatRelativeTime(value) {
  const dateValue = value ? new Date(value) : null

  if (!dateValue || Number.isNaN(dateValue.getTime())) {
    return 'Vừa cập nhật'
  }

  const diffMs = Date.now() - dateValue.getTime()

  if (diffMs <= 0) {
    return 'Vừa cập nhật'
  }

  const minutes = Math.floor(diffMs / 60000)

  if (minutes < 60) {
    return `${Math.max(minutes, 1)} phút trước`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} giờ trước`
  }

  const days = Math.floor(hours / 24)

  return `${days} ngày trước`
}

function getChartGeometry(series = []) {
  const width = 548
  const height = 360
  const paddingX = 26
  const paddingY = 34
  const usableWidth = width - paddingX * 2
  const usableHeight = height - paddingY * 2
  const baseline = height - paddingY
  const maxValue = Math.max(...series.map((point) => point.value), 1)
  const safeSeries = series.length > 0 ? series : [{ label: '0', value: 0 }]
  const points = safeSeries.map((point, index) => {
    const ratio = safeSeries.length === 1 ? 0.5 : index / (safeSeries.length - 1)
    const valueRatio = point.value / maxValue

    return {
      ...point,
      x: paddingX + ratio * usableWidth,
      y: baseline - valueRatio * usableHeight,
    }
  })
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ')
  const areaPath = [
    `M ${points[0].x} ${baseline}`,
    ...points.map((point) => `L ${point.x} ${point.y}`),
    `L ${points[points.length - 1].x} ${baseline}`,
    'Z',
  ].join(' ')

  return {
    areaPath,
    baseline,
    height,
    linePoints,
    points,
    width,
  }
}

function getSystemMetrics(dashboardOverview = {}, metricCards = []) {
  const overview = dashboardOverview ?? {}
  const revenueMetric = getMetricByKey(metricCards, 'total_revenue')
  const customerMetric = getMetricByKey(metricCards, 'new_customers')

  return [
    {
      icon: 'revenue',
      key: 'revenue',
      label: 'TỔNG DOANH THU',
      tone: 'danger',
      trend: formatPercent(overview.revenue_growth_rate ?? revenueMetric?.changePercent ?? 12.5),
      value: formatCompactVnd(overview.total_revenue ?? 4200000000),
    },
    {
      icon: 'users',
      key: 'users',
      label: 'TỔNG NGƯỜI DÙNG',
      tone: 'info',
      trend: formatPercent(overview.customer_growth_rate ?? customerMetric?.changePercent ?? 5.2),
      value: formatNumber(overview.total_users ?? 12450),
    },
    {
      capacity: formatNumber(overview.staff_admin_capacity ?? 50),
      icon: 'staff',
      key: 'staff',
      label: 'STAFF/ ADMIN ACTIVE',
      tone: 'accent',
      value: formatNumber(overview.staff_admin_active ?? 45),
    },
  ]
}

function getBookingActivityTitle(booking) {
  if (booking.status === 'completed') {
    return `Hoàn tất đơn ${booking.service_title}`
  }

  if (booking.status === 'confirmed') {
    return `Phê duyệt đặt chỗ ${booking.service_title}`
  }

  if (booking.status === 'cancelled') {
    return `Cập nhật hủy đơn ${booking.service_title}`
  }

  return `Tạo mới yêu cầu ${booking.service_title}`
}

function getBookingActivityTone(status) {
  if (status === 'completed' || status === 'confirmed') {
    return 'success'
  }

  if (status === 'cancelled') {
    return 'danger'
  }

  return 'warning'
}

function getBookingActivityIcon(status) {
  if (status === 'completed' || status === 'confirmed') {
    return 'check'
  }

  if (status === 'cancelled') {
    return 'history'
  }

  return 'plus'
}

function getActivityItems(recentBookings = []) {
  if (recentBookings.length === 0) {
    return fallbackActivities
  }

  return recentBookings.slice(0, 4).map((booking) => ({
    author: `Khách: ${booking.customer_name}`,
    icon: getBookingActivityIcon(booking.status),
    key: booking.id ?? booking.booking_code,
    time: formatRelativeTime(booking.created_at),
    title: getBookingActivityTitle(booking),
    tone: getBookingActivityTone(booking.status),
  }))
}

function getChartSubtitle(selectedRange, periodLabel) {
  if (selectedRange === '30_days') {
    return 'Theo dõi xu hướng 30 ngày qua'
  }

  if (selectedRange === '7_days') {
    return 'Theo dõi xu hướng 7 ngày qua'
  }

  return periodLabel ? `Theo dõi xu hướng ${periodLabel.toLowerCase()}` : 'Theo dõi xu hướng doanh thu'
}

function AdminDashboardPage() {
  const {
    accessState,
    currentRole,
    currentRoleLabel,
    dashboardOverview,
    error,
    hasDashboardData,
    loading,
    metricCards,
    periodLabel,
    recentBookings,
    reloadDashboard,
    revenueChart,
    selectedRange,
    setSelectedRange,
  } = useAdminDashboard()

  const chartSeries = revenueChart?.series ?? []
  const chartGeometry = getChartGeometry(chartSeries)
  const systemMetrics = getSystemMetrics(dashboardOverview, metricCards)
  const activityItems = getActivityItems(recentBookings)
  const auditLogPath = `/admin/audit-logs?role=${currentRole}`

  if (!accessState.canViewDashboard) {
    return (
      <main className="admin-system-page admin-system-dashboard">
        <section className="admin-system-dashboard__page-header">
          <div className="admin-system-dashboard__title-mark" aria-hidden="true" />
          <div className="admin-system-dashboard__page-copy">
            <h1>Tổng quan hệ thống</h1>
            <p>Theo dõi các chỉ số quan trọng và hoạt động vận hành.</p>
          </div>
        </section>
        <AdminErrorState
          title="Không áp dụng cho vai trò hiện tại"
          description={`Vai trò ${currentRoleLabel} không được xem màn hình tổng quan hệ thống.`}
        />
      </main>
    )
  }

  return (
    <main className="admin-system-page admin-system-dashboard">
      <section className="admin-system-dashboard__page-header">
        <div className="admin-system-dashboard__title-group">
          <div className="admin-system-dashboard__title-mark" aria-hidden="true" />
          <div className="admin-system-dashboard__page-copy">
            <h1>Tổng quan hệ thống</h1>
            <p>Theo dõi các chỉ số quan trọng và hoạt động vận hành.</p>
          </div>
        </div>

        <AdminButton
          className="admin-system-dashboard__refresh"
          icon={<DashboardIcon name="refresh" />}
          loading={loading}
          size="sm"
          variant="secondary"
          onClick={reloadDashboard}
        >
          Làm mới
        </AdminButton>
      </section>

      {loading && !hasDashboardData ? (
        <AdminCard className="admin-system-dashboard__state-card" padding="lg">
          <AdminLoadingBlock rows={3} />
        </AdminCard>
      ) : null}

      {error ? (
        <AdminErrorState
          title="Không thể tải dashboard"
          description={error}
          action={
            <AdminButton variant="secondary" onClick={reloadDashboard}>
              Thử lại
            </AdminButton>
          }
        />
      ) : null}

      {hasDashboardData ? (
        <>
          <section className="admin-system-dashboard__metrics" aria-label="Chỉ số hệ thống">
            {systemMetrics.map((metric) => (
              <article
                className={`admin-system-dashboard__metric-card admin-system-dashboard__metric-card--${metric.tone}`}
                key={metric.key}
              >
                <div className="admin-system-dashboard__metric-top">
                  <span className="admin-system-dashboard__metric-icon" aria-hidden="true">
                    <DashboardIcon name={metric.icon} />
                  </span>

                  {metric.trend ? (
                    <span className="admin-system-dashboard__metric-trend">
                      <DashboardIcon name="trendUp" />
                      {metric.trend}
                    </span>
                  ) : null}
                </div>

                <div className="admin-system-dashboard__metric-copy">
                  <p>{metric.label}</p>
                  <strong>
                    {metric.value}
                    {metric.capacity ? <span> / {metric.capacity}</span> : null}
                  </strong>
                </div>
              </article>
            ))}
          </section>

          <section className="admin-system-dashboard__overview" aria-label="Tổng quan doanh thu và hoạt động">
            <article className="admin-system-dashboard__chart-card">
              <header className="admin-system-dashboard__chart-header">
                <div>
                  <h2>Tăng trưởng Doanh thu</h2>
                  <p>{getChartSubtitle(selectedRange, periodLabel)}</p>
                </div>

                <div className="admin-system-dashboard__range-tabs" role="group" aria-label="Khoảng thời gian doanh thu">
                  {rangeTabs.map((tab) => (
                    <button
                      className={`admin-system-dashboard__range-tab ${
                        selectedRange === tab.value ? 'admin-system-dashboard__range-tab--active' : ''
                      }`}
                      disabled={loading}
                      key={tab.value}
                      type="button"
                      aria-pressed={selectedRange === tab.value}
                      onClick={() => setSelectedRange(tab.value)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </header>

              <div className="admin-system-dashboard__chart-visual" role="img" aria-label="Biểu đồ tăng trưởng doanh thu">
                <svg
                  className="admin-system-dashboard__chart-svg"
                  viewBox={`0 0 ${chartGeometry.width} ${chartGeometry.height}`}
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="systemDashboardArea" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#c8102e" stopOpacity="0.17" />
                      <stop offset="100%" stopColor="#c8102e" stopOpacity="0.05" />
                    </linearGradient>
                    <linearGradient id="systemDashboardLine" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0%" stopColor="#ffd700" />
                      <stop offset="100%" stopColor="#c8102e" />
                    </linearGradient>
                  </defs>
                  <path className="admin-system-dashboard__chart-area" d={chartGeometry.areaPath} />
                  <polyline className="admin-system-dashboard__chart-line" points={chartGeometry.linePoints} />
                  {chartGeometry.points.map((point) => (
                    <circle
                      className="admin-system-dashboard__chart-dot"
                      cx={point.x}
                      cy={point.y}
                      key={point.period ?? point.label}
                      r="4.5"
                    />
                  ))}
                </svg>

                <span className="admin-system-dashboard__chart-pill">
                  <DashboardIcon name="chart" />
                  Biểu đồ Interactive
                </span>
              </div>
            </article>

            <aside className="admin-system-dashboard__activity-card" aria-label="Hoạt động gần đây">
              <header className="admin-system-dashboard__activity-header">
                <h2>Hoạt động gần đây</h2>
                <a className="admin-system-dashboard__activity-link" href={auditLogPath}>
                  Xem tất cả
                  <DashboardIcon name="arrowRight" />
                </a>
              </header>

              <div className="admin-system-dashboard__activity-list">
                {activityItems.map((activity) => (
                  <article className="admin-system-dashboard__activity-item" key={activity.key}>
                    <span
                      className={`admin-system-dashboard__activity-icon admin-system-dashboard__activity-icon--${activity.tone}`}
                      aria-hidden="true"
                    >
                      <DashboardIcon name={activity.icon} />
                    </span>

                    <div className="admin-system-dashboard__activity-copy">
                      <h3>{activity.title}</h3>
                      <p>{activity.author}</p>
                      <time>{activity.time}</time>
                    </div>
                  </article>
                ))}
              </div>
            </aside>
          </section>
        </>
      ) : null}
    </main>
  )
}

export default AdminDashboardPage
