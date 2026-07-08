function FlightCard({ flight, formatCurrency, isSelected, onOpenDetail, onSelect }) {
  function handleBookingClick(event) {
    event.stopPropagation()
    onOpenDetail(flight)
  }

  return (
    <article
      className={`flight-card ${isSelected ? 'flight-card--selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(flight)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(flight)
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
              {flight.departure_airport_code} · {flight.departure_city_label}
            </p>
          </div>

          <div className="flight-card__timeline">
            <span className="flight-card__duration">{flight.duration_text}</span>
            <div className="flight-card__timeline-track">
              <span className="flight-card__timeline-plane" aria-hidden="true">
                <svg fill="none" viewBox="0 0 24 24">
                  <path
                    d="M3.75 13.25h7.05l3.15 5.2c.2.35.56.55.96.55h1.34c.4 0 .65-.44.45-.8l-1.88-4.95h4.46c.56 0 1.08-.3 1.36-.78l.66-1.16c.19-.33-.05-.75-.43-.75H14.1L9.96 4.43a1.23 1.23 0 0 0-1.06-.61H7.7c-.36 0-.6.36-.46.68l2.02 5.06H3.75c-.42 0-.75.33-.75.75v2.19c0 .42.33.75.75.75Z"
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
              {flight.arrival_airport_code} · {flight.arrival_city_label}
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
