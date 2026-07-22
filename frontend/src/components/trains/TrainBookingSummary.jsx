function TrainBookingSummary({
  bookingSummary,
  formatCurrency,
  onAddToCart,
  onBookNow,
  pendingAction = '',
}) {
  if (!bookingSummary) {
    return null
  }

  return (
    <section className="train-booking-summary train-detail-section">
      <div className="train-detail-card train-booking-summary__card">
        <div className="train-booking-summary__header">
          <h2>Tóm tắt đặt chỗ</h2>
          <div className="train-booking-summary__trip">
            <span>{bookingSummary.title}</span>
            <strong>{bookingSummary.quantity_label}</strong>
          </div>
          <p>{bookingSummary.seat_label}</p>
          <span>{bookingSummary.line_title}</span>
        </div>

        <div className="train-booking-summary__rows">
          <div>
            <span>Mã chỗ</span>
            <strong>{bookingSummary.seat_code}</strong>
          </div>
          <div>
            <span>Hạng chỗ</span>
            <strong>{bookingSummary.seat_class_label}</strong>
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
          aria-busy={pendingAction === 'booking'}
          className="train-booking-summary__button train-booking-summary__button--primary"
          disabled={Boolean(pendingAction)}
          type="button"
          onClick={onBookNow}
        >
          {pendingAction === 'booking' ? 'Đang xử lý...' : bookingSummary.cta_primary}
        </button>
        <button
          aria-busy={pendingAction === 'cart'}
          className="train-booking-summary__button train-booking-summary__button--secondary"
          disabled={Boolean(pendingAction)}
          type="button"
          onClick={onAddToCart}
        >
          {pendingAction === 'cart' ? 'Đang thêm...' : bookingSummary.cta_secondary}
        </button>
      </div>
    </section>
  )
}

export default TrainBookingSummary
