function PlaneIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M3.75 13.25h7.05l3.15 5.2c.2.35.56.55.96.55h1.34c.4 0 .65-.44.45-.8l-1.88-4.95h4.46c.56 0 1.08-.3 1.36-.78l.66-1.16c.19-.33-.05-.75-.43-.75H14.1L9.96 4.43a1.23 1.23 0 0 0-1.06-.61H7.7c-.36 0-.6.36-.46.68l2.02 5.06H3.75c-.42 0-.75.33-.75.75v2.19c0 .42.33.75.75.75Z"
        fill="currentColor"
      />
    </svg>
  )
}

function FlightRouteTimeline({ flight }) {
  return (
    <div className="flight-detail-timeline" aria-label="Lộ trình chuyến bay">
      <div className="flight-detail-timeline__point">
        <strong>{flight.departure_time_label}</strong>
        <span className="flight-detail-timeline__code">{flight.departure_airport_code}</span>
        <span className="flight-detail-timeline__airport">{flight.departure_airport_short_label}</span>
        {flight.departure_terminal_label ? (
          <span className="flight-detail-timeline__terminal">{flight.departure_terminal_label}</span>
        ) : null}
      </div>

      <div className="flight-detail-timeline__line">
        <p className="flight-detail-timeline__duration">{flight.duration_display}</p>
        <p className="flight-detail-timeline__type">{flight.stop_text}</p>
        <div className="flight-detail-timeline__track" aria-hidden="true">
          <span className="flight-detail-timeline__dot flight-detail-timeline__dot--outline" />
          <span className="flight-detail-timeline__plane">
            <PlaneIcon />
          </span>
          <span className="flight-detail-timeline__dot" />
        </div>
      </div>

      <div className="flight-detail-timeline__point flight-detail-timeline__point--arrival">
        <strong>{flight.arrival_time_label}</strong>
        <span className="flight-detail-timeline__code">{flight.arrival_airport_code}</span>
        <span className="flight-detail-timeline__airport">{flight.arrival_airport_short_label}</span>
        {flight.arrival_terminal_label ? (
          <span className="flight-detail-timeline__terminal">{flight.arrival_terminal_label}</span>
        ) : null}
      </div>
    </div>
  )
}

export default FlightRouteTimeline
