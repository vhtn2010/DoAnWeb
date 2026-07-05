function FlightCard({
  feedbackMessage,
  flight,
  formatCurrency,
  isSelected,
  onContinueBooking,
  onSelect,
  onViewDetail,
}) {
  function handleDetailClick(event) {
    event.stopPropagation()
    onViewDetail(flight)
  }

  function handleBookingClick(event) {
    event.stopPropagation()
    onContinueBooking(flight)
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
            <img alt={flight.airline_name} className="flight-card__airline-logo" src={flight.image_url} />
          </span>

          <div className="flight-card__brand-copy">
            <strong>{flight.airline_name}</strong>
            <span>{flight.flight_number_label}</span>
          </div>
        </div>

        <div className="flight-card__route">
          <div className="flight-card__time-block">
            <strong>{flight.departure_time_label}</strong>
            <span>{flight.departure_airport_code}</span>
            <p>{flight.departure_city}</p>
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
            <p>(Bay thẳng)</p>
            <small>{flight.flight_number_label}</small>
          </div>

          <div className="flight-card__time-block flight-card__time-block--arrival">
            <strong>{flight.arrival_time_label}</strong>
            <span>{flight.arrival_airport_code}</span>
            <p>{flight.arrival_city}</p>
          </div>
        </div>

        <div className="flight-card__meta">
          <span>{flight.cabin_class_label}</span>
          <span>{flight.baggage_allowance}</span>
        </div>
      </div>

      <div className="flight-card__fare">
        <span className="flight-card__fare-old">{formatCurrency(flight.base_price)}</span>
        <strong>{formatCurrency(flight.sale_price)}</strong>
        <button className="flight-card__button flight-card__button--primary" type="button" onClick={handleBookingClick}>
          Chọn chuyến
        </button>
        <button className="flight-card__button flight-card__button--secondary" type="button" onClick={handleDetailClick}>
          Xem chi tiết
        </button>
        <span className="flight-card__seat-note">ⓘ CHỈ CÒN {flight.available_seats} CHỖ</span>
      </div>

      {feedbackMessage ? (
        <p className="flight-card__feedback" role="status">
          {feedbackMessage}
        </p>
      ) : null}
    </article>
  )
}

export default FlightCard
