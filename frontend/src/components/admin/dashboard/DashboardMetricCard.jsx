const iconPaths = {
  revenue: (
    <path
      d="M4 14.5 8.7 9.8l3.3 3.3 5-6.1M13.2 7h3.8v3.8"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    />
  ),
  bookings: (
    <>
      <path
        d="M5.5 6.5h13v11A1.5 1.5 0 0 1 17 19H7a1.5 1.5 0 0 1-1.5-1.5v-11Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
      <path d="M9 4v4M15 4v4M5.5 10.5h13" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  users: (
    <>
      <circle cx="10" cy="8.2" fill="none" r="3.1" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.8 18a5.2 5.2 0 0 1 10.4 0"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <path
        d="M15.4 7.2a2.5 2.5 0 0 1 0 5M17.4 17.1a4.2 4.2 0 0 0-2.6-3.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </>
  ),
  services: (
    <>
      <path
        d="M4.5 7.5h15M7.5 4.5v15M4.5 16.5h15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
      <rect
        fill="none"
        height="13"
        rx="2.2"
        stroke="currentColor"
        strokeWidth="1.6"
        width="13"
        x="5.5"
        y="5.5"
      />
    </>
  ),
}

function DashboardMetricCard({ label, value, changePercent, comparisonLabel, icon, trend }) {
  const isPositive = trend !== 'down'

  return (
    <article className="admin-dashboard-card admin-dashboard-metric-card">
      <div className="admin-dashboard-metric-card__accent" aria-hidden="true" />

      <div className="admin-dashboard-metric-card__top">
        <span className="admin-dashboard-metric-card__icon" aria-hidden="true">
          <svg fill="none" height="24" viewBox="0 0 24 24" width="24">
            {iconPaths[icon]}
          </svg>
        </span>

        <span
          className={`admin-dashboard-metric-card__trend ${
            isPositive
              ? 'admin-dashboard-metric-card__trend--up'
              : 'admin-dashboard-metric-card__trend--down'
          }`}
        >
          {isPositive ? '+' : '-'}
          {Math.abs(changePercent)}%
        </span>
      </div>

      <div className="admin-dashboard-metric-card__content">
        <p className="admin-dashboard-metric-card__label">{label}</p>
        <strong className="admin-dashboard-metric-card__value">{value}</strong>
        <p className="admin-dashboard-metric-card__meta">{comparisonLabel}</p>
      </div>
    </article>
  )
}

export default DashboardMetricCard
