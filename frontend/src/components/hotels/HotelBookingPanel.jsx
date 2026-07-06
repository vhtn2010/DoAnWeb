function HotelBookingPanel({
  availability,
  feedback,
  formatCurrency,
  hotel,
  selectedRoom,
  onAddToCart,
  onCheckout,
}) {
  const nightlyPrice = selectedRoom?.sale_price ?? hotel?.sale_price ?? 0
  const ratingLabel = hotel
    ? `${hotel.display_rating_text} (${hotel.display_review_count} đánh giá)`
    : '--'

  return (
    <aside className="hotel-booking-panel">
      <div className="hotel-booking-panel__card">
        <div className="hotel-booking-panel__price-block">
          <div className="hotel-booking-panel__price-copy">
            <span className="hotel-booking-panel__price-value">
              {nightlyPrice ? formatCurrency(nightlyPrice) : '--'}
            </span>
            <div className="hotel-booking-panel__price-meta">
              <span>Giá từ</span>
              <small>/đêm</small>
            </div>
          </div>
        </div>

        <div className="hotel-booking-panel__summary">
          <h2 className="hotel-booking-panel__summary-title">Tóm tắt thông tin</h2>

          <div className="hotel-booking-panel__summary-row">
            <span>Đánh giá</span>
            <strong>{ratingLabel}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>Nhận phòng</span>
            <strong>{hotel?.checkin_time ?? '--'}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>Trả phòng</span>
            <strong>{hotel?.checkout_time ?? '--'}</strong>
          </div>
        </div>

        <div className="hotel-booking-panel__actions">
          <button
            className="hotel-booking-panel__button hotel-booking-panel__button--primary"
            type="button"
            onClick={() => onCheckout()}
          >
            Đặt ngay
          </button>

          <button
            className="hotel-booking-panel__button hotel-booking-panel__button--secondary"
            type="button"
            onClick={() => onAddToCart()}
          >
            Thêm vào giỏ hàng
          </button>
        </div>

        {availability?.checked ? (
          <p
            className={`hotel-booking-panel__feedback ${
              availability.isAvailable
                ? 'hotel-booking-panel__feedback--success'
                : 'hotel-booking-panel__feedback--error'
            }`}
            role="status"
          >
            {availability.message}
          </p>
        ) : null}

        {feedback?.message ? (
          <p
            className={`hotel-booking-panel__feedback hotel-booking-panel__feedback--${feedback.tone}`}
            role="status"
          >
            {feedback.message}
          </p>
        ) : null}
      </div>
    </aside>
  )
}

export default HotelBookingPanel
