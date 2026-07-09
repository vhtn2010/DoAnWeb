function FlightEditorialSection({ destination }) {
  if (!destination?.title) {
    return null
  }

  return (
    <section className="flight-detail-card flight-editorial">
      <div className="flight-editorial__copy">
        <h2 className="flight-editorial__title">{destination.title}</h2>
        <p className="flight-editorial__description">{destination.description}</p>

        <div className="flight-editorial__meta">
          {destination.temperature_label ? <span>{destination.temperature_label}</span> : null}
          {destination.timezone_label ? <span>{destination.timezone_label}</span> : null}
        </div>
      </div>

      <div className="flight-editorial__media">
        <img alt={destination.title} src={destination.image_url} />
      </div>
    </section>
  )
}

export default FlightEditorialSection
