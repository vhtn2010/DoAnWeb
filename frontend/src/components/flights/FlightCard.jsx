function FlightCard({ flight, formatCurrency, isSelected, onOpenDetail }) {
  function handleBookingClick(event) {
    event.preventDefault()
    event.stopPropagation()
    onOpenDetail(flight)
  }

  return (
    <article
      className={`flight-card ${isSelected ? 'flight-card--selected' : ''}`}
      role="link"
      tabIndex={0}
      onClick={() => onOpenDetail(flight)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenDetail(flight)
        }
      }}
    >
      <span className="flight-card__accent" aria-hidden="true" />

      <div className="flight-card__main">
        <div className="flight-card__brand">
          <span className="flight-card__brand-mark">
            <img
              alt={flight.airline_name}
              className="flight-card__airline-logo"
              src={flight.image_url}
            />
          </span>

          <div className="flight-card__brand-copy">
            <strong>{flight.airline_name}</strong>
            <span>{flight.flight_number_label}</span>
          </div>
        </div>

        <div className="flight-card__route">
          <div className="flight-card__time-block">
            <strong>{flight.departure_time_label}</strong>
            <p>
              {flight.departure_airport_card_label} · {flight.departure_province_label}
            </p>
          </div>

          <div className="flight-card__timeline">
            <span className="flight-card__duration">{flight.duration_text}</span>
            <div className="flight-card__timeline-track">
              <span className="flight-card__timeline-plane" aria-hidden="true">
                <svg fill="none" viewBox="0 0 24 24">
                  <path
                    d="M11.25 2.75a.75.75 0 0 1 1.5 0v5.89l6.68 3.03a1.5 1.5 0 0 1-.62 2.87h-5.34l1.88 5.39a.75.75 0 0 1-1.16.85L12 19.16l-2.19 1.62a.75.75 0 0 1-1.16-.85l1.88-5.39H5.19a1.5 1.5 0 0 1-.62-2.87l6.68-3.03V2.75Z"
                    fill="currentColor"
                  />
                </svg>
              </span>
            </div>
            <p>{flight.stop_text}</p>
            <small>{flight.flight_number_label}</small>
          </div>

          <div className="flight-card__time-block flight-card__time-block--arrival">
            <strong>{flight.arrival_time_label}</strong>
            <p>
              {flight.arrival_airport_card_label} · {flight.arrival_province_label}
            </p>
          </div>
        </div>
      </div>

      <div className="flight-card__fare">
        {Number(flight.base_price) > Number(flight.sale_price) ? (
          <span className="flight-card__fare-old">{formatCurrency(flight.base_price)}</span>
        ) : null}
        <strong>{formatCurrency(flight.sale_price)}</strong>
        <button
          className="flight-card__button flight-card__button--primary"
          type="button"
          onClick={handleBookingClick}
        >
          Chọn chuyến
        </button>
        <span className="flight-card__seat-note">CHỈ CÒN {flight.available_seats} CHỖ</span>
      </div>
    </article>
  )
}

export default FlightCard
