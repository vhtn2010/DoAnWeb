function TrainIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <rect
        x="5.25"
        y="3.75"
        width="13.5"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M8.5 8.25h2.5m2 0h2.5M9 15l-2 4m8-4 2 4M7 19h10"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function TrainDetailHeaderCard({ train }) {
  return (
    <section className="train-detail-card train-detail-header-card">
      <div className="train-detail-header-card__content">
        <div className="train-detail-header-card__brand">
          <div className="train-detail-header-card__brand-mark" aria-hidden="true">
            <TrainIcon />
          </div>

          <div className="train-detail-header-card__copy">
            <h1>{train.header_title}</h1>
            <p>Dịch vụ tốc hành Bắc-Nam • Khởi hành hàng ngày</p>
          </div>
        </div>

        <div className="train-detail-header-card__journey">
          <div className="train-detail-header-card__timeline">
            <div className="train-detail-header-card__point">
              <strong>{train.departure_time_label}</strong>
              <span>{train.departure_station_code}</span>
              <p>{train.departure_station_label}</p>
            </div>

            <div className="train-detail-header-card__line">
              <p>{train.duration_display}</p>
              <div className="train-detail-header-card__track">
                <span className="train-detail-header-card__dot train-detail-header-card__dot--outline" />
                <span className="train-detail-header-card__dot" />
              </div>
            </div>

            <div className="train-detail-header-card__point train-detail-header-card__point--arrival">
              <strong>
                {train.arrival_time_label}
                {train.arrival_day_offset_label ? (
                  <small>{train.arrival_day_offset_label}</small>
                ) : null}
              </strong>
              <span>{train.arrival_station_code}</span>
              <p>{train.arrival_station_label}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default TrainDetailHeaderCard
