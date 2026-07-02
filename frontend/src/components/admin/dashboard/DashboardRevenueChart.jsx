function DashboardRevenueChart({ chart, periodLabel, formatCurrency, formatShortCurrency }) {
  const highestPoint = Math.max(...chart.series.map((point) => point.value), 1)

  return (
    <section className="admin-dashboard-card admin-dashboard-chart-card">
      <div className="admin-dashboard-chart-card__header">
        <div className="admin-dashboard-section-heading">
          <div>
            <h2 className="admin-dashboard-section-heading__title">Doanh thu</h2>
            <p className="admin-dashboard-section-heading__subtitle">{periodLabel}</p>
          </div>
        </div>

        <div className="admin-dashboard-chart-card__summary">
          <strong>{formatCurrency(chart.total_amount, chart.currency)}</strong>
          <span>
            +{chart.compare_percent}% {chart.compare_label}
          </span>
        </div>
      </div>

      <div className="admin-dashboard-chart-card__legend" aria-label="Chú thích biểu đồ">
        {chart.legend.map((item) => (
          <span className="admin-dashboard-chart-card__legend-item" key={item.label}>
            <span
              className="admin-dashboard-chart-card__legend-swatch"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>

      <div className="admin-dashboard-chart-card__plot" role="img" aria-label="Biểu đồ doanh thu">
        <div className="admin-dashboard-chart-card__grid" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>

        <div className="admin-dashboard-chart-card__bars">
          {chart.series.map((point) => {
            const height = `${Math.max((point.value / highestPoint) * 100, 18)}%`

            return (
              <div className="admin-dashboard-chart-card__bar-group" key={point.label}>
                <span className="admin-dashboard-chart-card__bar-value">
                  {formatShortCurrency(point.value)}
                </span>
                <div className="admin-dashboard-chart-card__bar-track">
                  <div className="admin-dashboard-chart-card__bar-fill" style={{ height }} />
                </div>
                <span className="admin-dashboard-chart-card__bar-label">{point.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default DashboardRevenueChart
