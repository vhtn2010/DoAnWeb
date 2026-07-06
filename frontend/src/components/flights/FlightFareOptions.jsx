function formatCompactFarePrice(value) {
  const numericValue = Math.max(Number(value) || 0, 0)
  const millions = Math.floor(numericValue / 1000000)
  const thousands = Math.round((numericValue % 1000000) / 1000)

  if (millions <= 0) {
    return `${Math.round(numericValue / 1000)}k`
  }

  return `${millions}tr${String(thousands).padStart(3, '0')}`
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

      <div className="flight-detail-fares__grid">
        {fareOptions.map((fare) => {
          const isSelected = selectedFareId === fare.id
          const cardClassName = [
            'flight-detail-fare-card',
            fare.is_featured ? 'flight-detail-fare-card--featured' : '',
            isSelected ? 'flight-detail-fare-card--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <article
              key={fare.id}
              className={cardClassName}
              role="button"
              tabIndex={0}
              onClick={() => onSelectFare(fare.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectFare(fare.id)
                }
              }}
            >
              {fare.badge ? <div className="flight-detail-fare-card__badge">{fare.badge}</div> : null}

              <div className="flight-detail-fare-card__copy">
                <h3>{fare.title}</h3>
                <p className="flight-detail-fare-card__price">
                  {formatCompactFarePrice(fare.total_price)}
                  <span>đ</span>
                </p>
              </div>

              <ul className="flight-detail-fare-card__features">
                {fare.features.map((feature) => (
                  <li
                    key={`${fare.id}-${feature}`}
                    className={`flight-detail-fare-card__feature flight-detail-fare-card__feature--${getFeatureTone(
                      feature,
                    )}`}
                  >
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                className={`flight-detail-fare-card__button ${
                  isSelected ? 'flight-detail-fare-card__button--selected' : ''
                }`}
                type="button"
              >
                {isSelected ? fare.cta_label ?? 'Đã chọn' : 'Chọn'}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

export default FlightFareOptions
