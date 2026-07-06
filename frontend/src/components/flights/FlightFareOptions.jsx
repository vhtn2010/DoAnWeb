function formatFullFarePrice(value) {
  return `${new Intl.NumberFormat('vi-VN').format(Math.max(Number(value) || 0, 0))}đ`
}

function getFeatureTone(feature) {
  return String(feature).toLowerCase().includes('không') ? 'negative' : 'positive'
}

function FlightFareOptions({ fareOptions, selectedFareId, onSelectFare }) {
  return (
    <section className="flight-detail-fares" aria-labelledby="flight-detail-fares-title">
      <div className="flight-detail-section-heading">
        <h2 id="flight-detail-fares-title">Chọn Hạng Vé</h2>
        <a href="#flight-detail-policies">Điều kiện giá vé</a>
      </div>

      <div className="flight-fare-grid">
        {fareOptions.map((fare) => {
          const isSelected = fare.id === selectedFareId
          const cardClassName = [
            'flight-fare-card',
            fare.is_featured ? 'flight-fare-card--featured' : '',
            isSelected ? 'flight-fare-card--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          function handleSelectFare(event) {
            event?.stopPropagation?.()
            onSelectFare(fare.id)
          }

          return (
            <article
              key={fare.id}
              aria-pressed={isSelected}
              className={cardClassName}
              role="button"
              tabIndex={0}
              onClick={handleSelectFare}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  handleSelectFare(event)
                }
              }}
            >
              {fare.badge ? <div className="flight-fare-card__badge">{fare.badge}</div> : null}

              <div className="flight-fare-card__copy">
                <h3>{fare.title}</h3>
                <p className="flight-fare-card__price">{formatFullFarePrice(fare.total_price)}</p>
              </div>

              <ul className="flight-fare-card__features">
                {fare.features.map((feature) => (
                  <li
                    key={`${fare.id}-${feature}`}
                    className={`flight-fare-card__feature flight-fare-card__feature--${getFeatureTone(
                      feature,
                    )}`}
                  >
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`flight-fare-card__button ${
                  isSelected ? 'flight-fare-card__button--selected' : ''
                }`}
                type="button"
                onClick={handleSelectFare}
              >
                {isSelected ? 'Đã chọn' : 'Chọn'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default FlightFareOptions
