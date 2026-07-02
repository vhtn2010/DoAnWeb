const statusMeterGradients = {
  pending_payment: 'linear-gradient(90deg, rgba(245, 158, 11, 0.92), rgba(251, 191, 36, 0.9))',
  confirmed: 'linear-gradient(90deg, rgba(37, 99, 235, 0.88), rgba(59, 130, 246, 0.9))',
  completed: 'linear-gradient(90deg, rgba(22, 163, 74, 0.88), rgba(74, 222, 128, 0.9))',
  cancelled: 'linear-gradient(90deg, rgba(220, 38, 38, 0.88), rgba(248, 113, 113, 0.9))',
}

const serviceMeterGradients = [
  'linear-gradient(90deg, rgba(200, 16, 46, 0.92), rgba(240, 88, 60, 0.88))',
  'linear-gradient(90deg, rgba(255, 176, 32, 0.92), rgba(255, 207, 84, 0.88))',
  'linear-gradient(90deg, rgba(92, 64, 61, 0.84), rgba(143, 110, 106, 0.78))',
  'linear-gradient(90deg, rgba(214, 40, 40, 0.7), rgba(244, 197, 66, 0.72))',
]

function DashboardBreakdownCard({ title, subtitle, items, renderMeta }) {
  return (
    <section className="admin-dashboard-card admin-dashboard-breakdown-card">
      <div className="admin-dashboard-section-heading">
        <div>
          <h2 className="admin-dashboard-section-heading__title">{title}</h2>
          {subtitle ? <p className="admin-dashboard-section-heading__subtitle">{subtitle}</p> : null}
        </div>
      </div>

      <div className="admin-dashboard-breakdown-card__list">
        {items.map((item, index) => {
          const itemLabel = item.label ?? item.service_title
          const meterBackground =
            statusMeterGradients[item.status] ?? serviceMeterGradients[index % serviceMeterGradients.length]

          return (
            <article
              className={`admin-dashboard-breakdown-card__item ${
                item.status ? `admin-dashboard-breakdown-card__item--${item.status}` : ''
              }`}
              key={itemLabel}
            >
              <div className="admin-dashboard-breakdown-card__row">
                <div className="admin-dashboard-breakdown-card__label-wrap">
                  <span
                    className={`admin-dashboard-breakdown-card__dot admin-dashboard-breakdown-card__dot--${item.status ?? 'default'}`}
                    aria-hidden="true"
                  />
                  <span className="admin-dashboard-breakdown-card__label" title={itemLabel}>
                    {itemLabel}
                  </span>
                </div>

                <div className="admin-dashboard-breakdown-card__meta">{renderMeta(item)}</div>
              </div>

              <div className="admin-dashboard-breakdown-card__meter" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.max(item.share_percent, 6)}%`,
                    background: meterBackground,
                  }}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default DashboardBreakdownCard
