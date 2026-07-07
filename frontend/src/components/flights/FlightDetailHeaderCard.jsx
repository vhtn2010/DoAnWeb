import FlightRouteTimeline from './FlightRouteTimeline.jsx'

function EcoIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M6 14.5c2.3-4.5 7.7-6.5 12-7-1.1 4.1-3.6 9.1-8.1 10.9-2 .8-4.1.6-5.9-.4 1.2-.2 2.3-.7 3.2-1.7 1.3-1.3 2.1-3.1 3.5-4.3"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function FlightDetailHeaderCard({ flight }) {
  return (
    <article className="flight-detail-card flight-detail-header-card">
      <div className="flight-detail-header-card__top">
        <div className="flight-detail-header-card__brand">
          <div className="flight-detail-header-card__brand-mark">
            <img alt={flight.airline_name} src={flight.image_url} />
          </div>

          <div className="flight-detail-header-card__brand-copy">
            <h1>{flight.airline_name}</h1>
            <div className="flight-detail-header-card__meta">
              <p>{flight.flight_number_label}</p>
              <span aria-hidden="true">•</span>
              <p>{flight.aircraft_label}</p>
            </div>
          </div>
        </div>

        {flight.eco_tag ? (
          <div className="flight-detail-header-card__tag">
            <span className="flight-detail-header-card__tag-icon">
              <EcoIcon />
            </span>
            <p>{flight.eco_tag}</p>
          </div>
        ) : null}
      </div>

      <FlightRouteTimeline flight={flight} />
    </article>
  )
}

export default FlightDetailHeaderCard
