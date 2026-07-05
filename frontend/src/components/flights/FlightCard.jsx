function ShieldIcon({ isActive }) {
  return (
    <span className={`flight-card__policy ${isActive ? 'flight-card__policy--active' : ''}`}>
      {isActive ? 'Có' : 'Không'}
    </span>
  )
}

function FlightCard({
  feedbackMessage,
  flight,
  formatCurrency,
  isSelected,
  onContinueBooking,
  onSelect,
  onViewDetail,
}) {
  return (
    <article className={`flight-card ${isSelected ? 'flight-card--selected' : ''}`}>
      <div className="flight-card__top">
        <div className="flight-card__airline">
          <img alt={flight.airline_name} className="flight-card__airline-logo" src={flight.image_url} />
          <div>
            <strong>{flight.airline_name}</strong>
            <p>{flight.flight_number}</p>
          </div>
        </div>

        <div className="flight-card__fare">
          <span className="flight-card__fare-old">{formatCurrency(flight.base_price)}</span>
          <strong>{formatCurrency(flight.sale_price)}</strong>
          <span>/ khách</span>
        </div>
      </div>

      <div className="flight-card__route">
        <div className="flight-card__time-block">
          <strong>{flight.departure_time_label}</strong>
          <span>{flight.departure_airport_code}</span>
          <p>{flight.departure_airport}</p>
        </div>

        <div className="flight-card__route-line">
          <span>{flight.duration_text}</span>
          <div className="flight-card__route-track" aria-hidden="true" />
          <p>Bay thẳng</p>
        </div>

        <div className="flight-card__time-block">
          <strong>{flight.arrival_time_label}</strong>
          <span>{flight.arrival_airport_code}</span>
          <p>{flight.arrival_airport}</p>
        </div>
      </div>

      <div className="flight-card__details">
        <span>{flight.cabin_class_label}</span>
        <span>{flight.baggage_allowance}</span>
        <span>Còn {flight.available_seats} chỗ</span>
      </div>

      <div className="flight-card__policies">
        <div>
          <span>Hoàn vé</span>
          <ShieldIcon isActive={flight.refundable} />
        </div>
        <div>
          <span>Đổi lịch</span>
          <ShieldIcon isActive={flight.changeable} />
        </div>
      </div>

      <div className="flight-card__actions">
        <button
          className={`flight-card__button flight-card__button--ghost ${
            isSelected ? 'flight-card__button--selected' : ''
          }`}
          type="button"
          onClick={() => onSelect(flight)}
        >
          {isSelected ? 'Đang chọn' : 'Chọn chuyến'}
        </button>
        <button className="flight-card__button flight-card__button--secondary" type="button" onClick={() => onViewDetail(flight)}>
          Xem chi tiết
        </button>
        <button className="flight-card__button flight-card__button--primary" type="button" onClick={() => onContinueBooking(flight)}>
          Tiếp tục đặt vé
        </button>
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
