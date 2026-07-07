function TrainBookingSummary({
  bookingSummary,
  formatCurrency,
  onAddToCart,
  onBookNow,
}) {
  if (!bookingSummary) {
    return null
  }

  return (
    <aside className="train-booking-summary train-detail-section">
      <div className="train-detail-card train-booking-summary__card">
        <div className="train-booking-summary__header">
          <h2>Tóm tắt đặt chỗ</h2>
          <small>{bookingSummary.title}</small>
          <p>{bookingSummary.line_title}</p>
          <span>{bookingSummary.line_subtitle}</span>
        </div>

        <div className="train-booking-summary__rows">
          <div>
            <span>Hạng chỗ</span>
            <strong>{bookingSummary.seat_class_label}</strong>
          </div>
          <div>
            <span>Chỗ đang chọn</span>
            <strong>{bookingSummary.seat_code}</strong>
          </div>
          <div>
            <span>Vị trí</span>
            <strong>{bookingSummary.seat_label}</strong>
          </div>
          <div>
            <span>{bookingSummary.base_price_label}</span>
            <strong>{formatCurrency(bookingSummary.base_price)}</strong>
          </div>
          <div>
            <span>{bookingSummary.service_fee_label}</span>
            <strong>{formatCurrency(bookingSummary.service_fee)}</strong>
          </div>
        </div>

        <div className="train-booking-summary__total">
          <span>Tổng cộng</span>
          <div>
            <strong>{formatCurrency(bookingSummary.total_price)}</strong>
          </div>
        </div>

        <button
          className="train-booking-summary__button train-booking-summary__button--primary"
          type="button"
          onClick={onBookNow}
        >
          {bookingSummary.cta_primary}
        </button>
        <button
          className="train-booking-summary__button train-booking-summary__button--secondary"
          type="button"
          onClick={onAddToCart}
        >
          {bookingSummary.cta_secondary}
        </button>

        <p className="train-booking-summary__security">{bookingSummary.security_note}</p>
      </div>
    </aside>
  )
}

export default TrainBookingSummary
