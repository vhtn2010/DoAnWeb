import DashboardBreakdownCard from '../../components/admin/dashboard/DashboardBreakdownCard.jsx'
import DashboardMetricCard from '../../components/admin/dashboard/DashboardMetricCard.jsx'
import DashboardRevenueChart from '../../components/admin/dashboard/DashboardRevenueChart.jsx'
import RecentBookingsTable from '../../components/admin/dashboard/RecentBookingsTable.jsx'
import useAdminDashboard from '../../hooks/useAdminDashboard.js'

function AdminDashboardPage() {
  const {
    accessState,
    bookingStatusBreakdown,
    currentRoleLabel,
    error,
    feedback,
    formatCurrency,
    formatDateTime,
    formatShortCurrency,
    hasDashboardData,
    hasTopServices,
    loading,
    metricCards,
    periodLabel,
    recentBookings,
    reloadDashboard,
    revenueChart,
    selectedRange,
    setSelectedRange,
    timeRangeOptions,
    topServices,
  } = useAdminDashboard()

  if (!accessState.canViewDashboard) {
    return (
      <main className="admin-dashboard-page">
        <section className="admin-dashboard-page__hero">
          <div className="admin-dashboard-page__hero-copy">
            <p className="admin-dashboard-page__eyebrow">Dashboard quản trị</p>
            <h1 className="admin-dashboard-page__title">Tổng quan</h1>
            <p className="admin-dashboard-page__subtitle">
              Màn hình này chỉ dùng để preview canonical screen cho Admin/System Admin.
            </p>
          </div>
        </section>

        <section
          className="admin-dashboard-card admin-dashboard-page__status-card"
          aria-label="Giới hạn quyền truy cập"
        >
          <div className="admin-dashboard-page__status-copy">
            <h2 className="admin-dashboard-section-heading__title">
              Không áp dụng cho vai trò hiện tại
            </h2>
            <p className="admin-dashboard-section-heading__subtitle" role="status">
              Vai trò <strong>{currentRoleLabel}</strong> không được xem màn hình tổng quan hệ thống.
            </p>
          </div>
          <p className="admin-dashboard-page__status-message" role="status">
            {accessState.message}
          </p>
        </section>
      </main>
    )
  }

  if (!hasDashboardData && loading) {
    return (
      <main className="admin-dashboard-page">
        <section className="admin-dashboard-page__hero">
          <div className="admin-dashboard-page__hero-copy">
            <p className="admin-dashboard-page__eyebrow">Dashboard quản trị</p>
            <h1 className="admin-dashboard-page__title">Tổng quan</h1>
            <p className="admin-dashboard-page__subtitle">
              Theo dõi hoạt động kinh doanh của Net Viet Travel
            </p>
          </div>

          <div className="admin-dashboard-page__filters" aria-label="Bộ lọc thời gian" role="group">
            {timeRangeOptions.map((option) => (
              <button
                key={option.id}
                className={`admin-dashboard-page__filter ${
                  selectedRange === option.id ? 'admin-dashboard-page__filter--active' : ''
                }`}
                disabled
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section
          className="admin-dashboard-card admin-dashboard-page__status-card"
          aria-label="Đang tải dữ liệu dashboard"
        >
          <div className="admin-dashboard-page__status-copy">
            <h2 className="admin-dashboard-section-heading__title">Đang tải dashboard</h2>
            <p className="admin-dashboard-section-heading__subtitle" role="status">
              Mock adapter đang giả lập response tổng quan hệ thống theo response envelope API-ready.
            </p>
          </div>
        </section>
      </main>
    )
  }

  if (!hasDashboardData && error) {
    return (
      <main className="admin-dashboard-page">
        <section className="admin-dashboard-page__hero">
          <div className="admin-dashboard-page__hero-copy">
            <p className="admin-dashboard-page__eyebrow">Dashboard quản trị</p>
            <h1 className="admin-dashboard-page__title">Tổng quan</h1>
            <p className="admin-dashboard-page__subtitle">
              Theo dõi hoạt động kinh doanh của Net Viet Travel
            </p>
          </div>

          <div className="admin-dashboard-page__filters" aria-label="Bộ lọc thời gian" role="group">
            {timeRangeOptions.map((option) => (
              <button
                key={option.id}
                className={`admin-dashboard-page__filter ${
                  selectedRange === option.id ? 'admin-dashboard-page__filter--active' : ''
                }`}
                type="button"
                onClick={() => setSelectedRange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </section>

        <section
          className="admin-dashboard-card admin-dashboard-page__status-card"
          aria-label="Không thể tải dashboard"
        >
          <div className="admin-dashboard-page__status-copy">
            <h2 className="admin-dashboard-section-heading__title">Không thể tải dashboard</h2>
            <p className="admin-dashboard-page__status-message" role="status">
              {error}
            </p>
          </div>
          <div className="admin-dashboard-page__status-actions">
            <button
              className="admin-dashboard-page__retry-button"
              type="button"
              onClick={reloadDashboard}
            >
              Thử lại
            </button>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="admin-dashboard-page">
      <section className="admin-dashboard-page__hero">
        <div className="admin-dashboard-page__hero-copy">
          <p className="admin-dashboard-page__eyebrow">Dashboard quản trị</p>
          <h1 className="admin-dashboard-page__title">Tổng quan</h1>
          <p className="admin-dashboard-page__subtitle">
            Theo dõi hoạt động kinh doanh của Net Viet Travel
          </p>
        </div>

        <div className="admin-dashboard-page__filters" aria-label="Bộ lọc thời gian" role="group">
          {timeRangeOptions.map((option) => (
            <button
              key={option.id}
              className={`admin-dashboard-page__filter ${
                selectedRange === option.id ? 'admin-dashboard-page__filter--active' : ''
              }`}
              disabled={loading}
              type="button"
              onClick={() => setSelectedRange(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      {loading || error ? (
        <section
          className="admin-dashboard-card admin-dashboard-page__status-card"
          aria-label="Trạng thái dashboard mock"
        >
          <div className="admin-dashboard-page__status-copy">
            <h2 className="admin-dashboard-section-heading__title">Trạng thái dữ liệu</h2>
            <p className="admin-dashboard-section-heading__subtitle" role="status">
              {loading ? 'Đang đồng bộ dữ liệu dashboard từ mock adapter...' : feedback.message}
            </p>
          </div>
          {error ? (
            <div className="admin-dashboard-page__status-actions">
              <button
                className="admin-dashboard-page__retry-button"
                type="button"
                onClick={reloadDashboard}
              >
                Thử lại
              </button>
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="admin-dashboard-page__metrics" aria-label="Tóm tắt chỉ số">
        {metricCards.map((card) => (
          <DashboardMetricCard
            key={card.key}
            changePercent={card.changePercent}
            comparisonLabel={card.comparisonLabel}
            icon={card.icon}
            label={card.label}
            trend={card.trend}
            value={card.value}
          />
        ))}
      </section>

      <section className="admin-dashboard-page__analytics">
        {revenueChart ? (
          <DashboardRevenueChart
            chart={revenueChart}
            formatCurrency={formatCurrency}
            formatShortCurrency={formatShortCurrency}
            periodLabel={periodLabel}
          />
        ) : null}

        <div className="admin-dashboard-page__side-stack">
          <DashboardBreakdownCard
            items={bookingStatusBreakdown}
            renderMeta={(item) => (
              <>
                <strong>{item.count}</strong>
                <span>{item.share_percent}%</span>
              </>
            )}
            subtitle="Phân bổ đơn hàng theo trạng thái hiện tại"
            title="Trạng thái đơn hàng"
          />

          {hasTopServices ? (
            <DashboardBreakdownCard
              items={topServices}
              renderMeta={(item) => (
                <>
                  <strong>{item.share_percent}%</strong>
                  <span>{item.booking_count} đơn</span>
                </>
              )}
              subtitle="Nhóm dịch vụ đóng góp doanh thu tốt nhất"
              title="Top dịch vụ"
            />
          ) : null}
        </div>
      </section>

      <RecentBookingsTable
        bookings={recentBookings}
        formatCurrency={formatCurrency}
        formatDateTime={formatDateTime}
      />
    </main>
  )
}

export default AdminDashboardPage
