function HotelBookingPanel({
  availability,
  feedback,
  formatCurrency,
  hotel,
  pendingAction = '',
  selectedRoom,
  onAddToCart,
  onCheckout,
}) {
  const roomHasSalePrice =
    selectedRoom?.sale_price != null &&
    Number(selectedRoom.sale_price) < Number(selectedRoom.base_price ?? 0)
  const hotelHasSalePrice =
    hotel?.sale_price != null &&
    Number(hotel.sale_price) < Number(hotel.base_price ?? 0)
  const nightlyPrice = selectedRoom
    ? (roomHasSalePrice ? selectedRoom.sale_price : selectedRoom.base_price)
    : (hotelHasSalePrice ? hotel?.sale_price : hotel?.base_price) ?? 0
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
            aria-busy={pendingAction === 'checkout'}
            className="hotel-booking-panel__button hotel-booking-panel__button--primary"
            disabled={Boolean(pendingAction)}
            type="button"
            onClick={() => onCheckout()}
          >
            {pendingAction === 'checkout' ? 'Đang xử lý...' : 'Đặt ngay'}
          </button>

          <button
            aria-busy={pendingAction === 'cart'}
            className="hotel-booking-panel__button hotel-booking-panel__button--secondary"
            disabled={Boolean(pendingAction)}
            type="button"
            onClick={() => onAddToCart()}
          >
            {pendingAction === 'cart' ? 'Đang thêm...' : 'Thêm vào giỏ hàng'}
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
