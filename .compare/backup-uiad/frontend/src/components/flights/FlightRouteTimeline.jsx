function PlaneIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M11.25 2.75a.75.75 0 0 1 1.5 0v5.89l6.68 3.03a1.5 1.5 0 0 1-.62 2.87h-5.34l1.88 5.39a.75.75 0 0 1-1.16.85L12 19.16l-2.19 1.62a.75.75 0 0 1-1.16-.85l1.88-5.39H5.19a1.5 1.5 0 0 1-.62-2.87l6.68-3.03V2.75Z"
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
