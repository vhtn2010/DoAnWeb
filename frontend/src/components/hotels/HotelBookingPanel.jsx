function clampInputValue(value, fallback = 1) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : fallback
}

function HotelBookingPanel({
  availability,
  checkinDate,
  checkoutDate,
  feedback,
  formatCurrency,
  guests,
  hotel,
  onAddToCart,
  onCheckout,
  onDateChange,
  onGuestsChange,
  onRoomQuantityChange,
  roomQuantity,
  selectedRoom,
  stayNights,
}) {
  const nightlyPrice = selectedRoom?.sale_price ?? hotel?.sale_price ?? 0
  const totalAmount = nightlyPrice * Math.max(stayNights, 1) * roomQuantity
  const ratingLabel = hotel ? `${hotel.display_rating_text} (${hotel.display_review_count} danh gia)` : '--'

  return (
    <aside className="hotel-booking-panel">
      <div className="hotel-booking-panel__card">
        <div className="hotel-booking-panel__price-block">
          <span className="hotel-booking-panel__price-prefix">Gia tu / dem</span>
          <strong className="hotel-booking-panel__price-value">
            {formatCurrency(hotel?.sale_price ?? 0)}
          </strong>
        </div>

        <div className="hotel-booking-panel__section">
          <h2 className="hotel-booking-panel__title">Thong tin luu tru</h2>

          <div className="hotel-booking-panel__fields">
            <label className="hotel-booking-panel__field">
              <span>Ngay nhan phong</span>
              <input
                type="date"
                value={checkinDate}
                onChange={(event) => onDateChange({ checkinDate: event.target.value })}
              />
            </label>

            <label className="hotel-booking-panel__field">
              <span>Ngay tra phong</span>
              <input
                type="date"
                value={checkoutDate}
                onChange={(event) => onDateChange({ checkoutDate: event.target.value })}
              />
            </label>

            <div className="hotel-booking-panel__field-grid">
              <label className="hotel-booking-panel__field">
                <span>Hanh khach</span>
                <input
                  max="10"
                  min="1"
                  type="number"
                  value={guests}
                  onChange={(event) => onGuestsChange(clampInputValue(event.target.value, 1))}
                />
              </label>

              <label className="hotel-booking-panel__field">
                <span>So phong</span>
                <input
                  max="5"
                  min="1"
                  type="number"
                  value={roomQuantity}
                  onChange={(event) => onRoomQuantityChange(clampInputValue(event.target.value, 1))}
                />
              </label>
            </div>
          </div>
        </div>

        <div className="hotel-booking-panel__summary">
          <h3 className="hotel-booking-panel__summary-title">Tom tat thong tin</h3>

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
            <strong>{selectedRoom ? selectedRoom.title : 'Chon phong ben duoi'}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>Gia moi dem</span>
            <strong>{nightlyPrice ? formatCurrency(nightlyPrice) : '--'}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>So dem</span>
            <strong>{stayNights || 1}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row hotel-booking-panel__summary-row--total">
            <span>Tam tinh</span>
            <strong>{nightlyPrice ? formatCurrency(totalAmount) : '--'}</strong>
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
