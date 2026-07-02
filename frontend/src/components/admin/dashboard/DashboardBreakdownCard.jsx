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
        {items.map((item) => (
          <article
            className="admin-dashboard-breakdown-card__item"
            key={item.label ?? item.service_title}
          >
            <div className="admin-dashboard-breakdown-card__row">
              <div className="admin-dashboard-breakdown-card__label-wrap">
                <span
                  className={`admin-dashboard-breakdown-card__dot admin-dashboard-breakdown-card__dot--${item.status ?? 'default'}`}
                  aria-hidden="true"
                />
                <span className="admin-dashboard-breakdown-card__label">
                  {item.label ?? item.service_title}
                </span>
              </div>

              <div className="admin-dashboard-breakdown-card__meta">{renderMeta(item)}</div>
            </div>

            <div className="admin-dashboard-breakdown-card__meter" aria-hidden="true">
              <span style={{ width: `${Math.max(item.share_percent, 6)}%` }} />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

export default DashboardBreakdownCard
