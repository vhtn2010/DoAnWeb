function InfoIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 10.5V16.2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
      <circle cx="12" cy="7.7" fill="currentColor" r="1.1" />
    </svg>
  )
}

function BenefitIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M7 12.7 10 15.7 17 8.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <rect
        height="15"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.8"
        width="15"
        x="4.5"
        y="4.5"
      />
    </svg>
  )
}

function FlightInfoCards({ flight, selectedFare }) {
  const farePolicyText = [
    selectedFare?.included_baggage ?? flight.baggage_allowance,
    selectedFare?.refundable ? 'Hoàn vé' : 'Không hoàn vé',
    selectedFare?.changeable ? 'Đổi vé có phí' : 'Không đổi vé',
  ].join(' • ')

  return (
    <section className="flight-detail-info-grid" aria-label="Thông tin chuyến bay">
      <article className="flight-detail-info-card">
        <div className="flight-detail-info-card__title">
          <span className="flight-detail-info-card__icon">
            <InfoIcon />
          </span>
          <h3>Thông tin chuyến bay</h3>
        </div>

        <p>{flight.flight_info}</p>

        <div className="flight-detail-info-card__meta">
          <div>
            <span>Hành lý theo vé</span>
            <strong>{selectedFare?.included_baggage ?? flight.baggage_allowance}</strong>
          </div>
          <div>
            <span>Điều kiện</span>
            <strong>{farePolicyText}</strong>
          </div>
        </div>
      </article>

      <article className="flight-detail-info-card">
        <div className="flight-detail-info-card__title">
          <span className="flight-detail-info-card__icon">
            <BenefitIcon />
          </span>
          <h3>Tiện ích trên chuyến bay</h3>
        </div>

        <div className="flight-detail-info-card__chips">
          {flight.onboard_benefits.map((benefit) => (
            <span key={benefit}>{benefit}</span>
          ))}
        </div>
      </article>
    </section>
  )
}

export default FlightInfoCards
