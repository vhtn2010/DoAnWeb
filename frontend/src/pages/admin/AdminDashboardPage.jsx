import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import DashboardBreakdownCard from '../../components/admin/dashboard/DashboardBreakdownCard.jsx'
import DashboardMetricCard from '../../components/admin/dashboard/DashboardMetricCard.jsx'
import DashboardRevenueChart from '../../components/admin/dashboard/DashboardRevenueChart.jsx'
import RecentBookingsTable from '../../components/admin/dashboard/RecentBookingsTable.jsx'
import { getAdminRoleLabel } from '../../data/mockAdminServices.js'
import {
  dashboardTimeRangeOptions,
  mockDashboardData,
} from '../../data/mockDashboardData.js'

const numberFormatter = new Intl.NumberFormat('vi-VN')

const summaryCardConfig = [
  {
    key: 'revenue_overview',
    label: 'Doanh thu',
    icon: 'revenue',
    getValue: (metric, formatCurrency) => formatCurrency(metric.amount, metric.currency),
  },
  {
    key: 'booking_overview',
    label: 'Đơn đặt dịch vụ',
    icon: 'bookings',
    getValue: (metric) => numberFormatter.format(metric.total),
  },
  {
    key: 'user_overview',
    label: 'Khách hàng mới',
    icon: 'users',
    getValue: (metric) => numberFormatter.format(metric.total),
  },
  {
    key: 'service_overview',
    label: 'Dịch vụ đang bán',
    icon: 'services',
    getValue: (metric) => numberFormatter.format(metric.total),
  },
]

function formatCurrency(amount, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatShortCurrency(amount) {
  const formatShortNumber = (value, maximumFractionDigits = 1) =>
    new Intl.NumberFormat('vi-VN', {
      minimumFractionDigits: 0,
      maximumFractionDigits,
    }).format(value)

  if (amount >= 1000000000) {
    return `${formatShortNumber(amount / 1000000000, amount >= 10000000000 ? 0 : 1)} tỷ`
  }

  return `${formatShortNumber(amount / 1000000, amount >= 100000000 ? 0 : 1)} tr`
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function AdminDashboardPage() {
  const outletContext = useOutletContext()
  const currentRole = outletContext?.currentRole ?? 'system_admin'
  const [selectedRange, setSelectedRange] = useState(mockDashboardData.default_range)

  const dashboardData = mockDashboardData.ranges[selectedRange]

  // Partial canonical screen: current dashboard preview is sharing overview and revenue-report content.
  if (currentRole === 'staff') {
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

        <section className="admin-services-card" aria-label="Giới hạn quyền truy cập">
          <h2 className="admin-services-page__section-title">Không áp dụng cho vai trò hiện tại</h2>
          <p className="admin-services-page__section-copy" role="status">
            Vai trò <strong>{getAdminRoleLabel(currentRole)}</strong> không dùng màn hình tổng
            quan hệ thống trong luồng thực tế. Staff sẽ thao tác qua các module được phân quyền như
            quản lý dịch vụ, đơn hàng, giao dịch và hỗ trợ khách hàng.
          </p>
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
            Theo dõi hoạt động kinh doanh của Nét Việt Travel
          </p>
        </div>

        <div className="admin-dashboard-page__filters" aria-label="Bộ lọc thời gian" role="group">
          {dashboardTimeRangeOptions.map((option) => (
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

      <section className="admin-dashboard-page__metrics" aria-label="Tóm tắt chỉ số">
        {summaryCardConfig.map((card) => {
          const metric = dashboardData[card.key]

          return (
            <DashboardMetricCard
              key={card.key}
              changePercent={metric.change_percent}
              comparisonLabel={metric.comparison_label}
              icon={card.icon}
              label={card.label}
              trend={metric.trend}
              value={card.getValue(metric, formatCurrency)}
            />
          )
        })}
      </section>

      <section className="admin-dashboard-page__analytics">
        <DashboardRevenueChart
          chart={dashboardData.revenue_chart}
          formatCurrency={formatCurrency}
          formatShortCurrency={formatShortCurrency}
          periodLabel={dashboardData.period_label}
        />

        <div className="admin-dashboard-page__side-stack">
          <DashboardBreakdownCard
            items={dashboardData.booking_status_breakdown}
            renderMeta={(item) => (
              <>
                <strong>{numberFormatter.format(item.count)}</strong>
                <span>{item.share_percent}%</span>
              </>
            )}
            subtitle="Phân bổ đơn hàng theo trạng thái hiện tại"
            title="Trạng thái đơn hàng"
          />

          <DashboardBreakdownCard
            items={dashboardData.top_services}
            renderMeta={(item) => (
              <>
                <strong>{item.share_percent}%</strong>
                <span>{numberFormatter.format(item.booking_count)} đơn</span>
              </>
            )}
            subtitle="Nhóm dịch vụ đóng góp doanh thu tốt nhất"
            title="Top dịch vụ"
          />
        </div>
      </section>

      <RecentBookingsTable
        bookings={dashboardData.recent_bookings}
        formatCurrency={formatCurrency}
        formatDateTime={formatDateTime}
      />
    </main>
  )
}

export default AdminDashboardPage
