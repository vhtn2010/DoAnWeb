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
    ? `${hotel.display_rating_text} (${hotel.display_review_count} danh gia)`
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
              <span>Gia tu</span>
              <small>/dem</small>
            </div>
          </div>
        </div>

        <div className="hotel-booking-panel__summary">
          <h2 className="hotel-booking-panel__summary-title">Tom tat thong tin</h2>

          <div className="hotel-booking-panel__summary-row">
            <span>Danh gia</span>
            <strong>{ratingLabel}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>Nhan phong</span>
            <strong>{hotel?.checkin_time ?? '--'}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>Tra phong</span>
            <strong>{hotel?.checkout_time ?? '--'}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>Loai phong</span>
            <strong>{selectedRoom?.title ?? hotel?.room_types?.[0]?.name ?? 'Dang cap nhat'}</strong>
          </div>
        </div>

        <div className="hotel-booking-panel__actions">
          <button
            className="hotel-booking-panel__button hotel-booking-panel__button--primary"
            type="button"
            onClick={() => onCheckout()}
          >
            Dat ngay
          </button>

          <button
            className="hotel-booking-panel__button hotel-booking-panel__button--secondary"
            type="button"
            onClick={() => onAddToCart()}
          >
            Them vao gio hang
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
