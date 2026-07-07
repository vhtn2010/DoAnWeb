function TrainCard({
  formatCurrency,
  isSelected,
  onOpenDetail,
  onSelect,
  train,
}) {
  function handleBookingClick(event) {
    event.stopPropagation()
    onOpenDetail(train)
  }

  return (
    <article
      className={`train-card ${isSelected ? 'train-card--selected' : ''}`}
      role="button"
      tabIndex={0}
      onClick={() => onSelect(train)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(train)
        }
      }}
    >
      <span className="train-card__accent" aria-hidden="true" />

      <div className="train-card__route">
        <div className="train-card__service">
          <span>{train.train_name}</span>
          <strong>{train.train_number_label}</strong>
        </div>

        <div className="train-card__time-block">
          <strong>{train.departure_time_label}</strong>
          <p>{train.departure_station_label}</p>
        </div>

        <div className="train-card__timeline">
          <span className="train-card__duration">{train.duration_text}</span>
          <div className="train-card__timeline-track" />
          <small>{train.route_label}</small>
        </div>

        <div className="train-card__time-block train-card__time-block--arrival">
          <strong>{train.arrival_time_label}</strong>
          <p>{train.arrival_station_label}</p>
        </div>
      </div>

      <div className="train-card__price">
        <span className="train-card__price-old">{formatCurrency(train.base_price)}</span>
        <strong>{formatCurrency(train.sale_price)}</strong>
        <button className="train-card__button" type="button" onClick={handleBookingClick}>
          Chọn chuyến
        </button>
        <span className="train-card__seat-note">{train.availability_label.toUpperCase()}</span>
      </div>
    </article>
  )
}

export default TrainCard
