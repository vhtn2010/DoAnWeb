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
  onAddToCart,
  onCheckAvailability,
  onCheckout,
  onDateChange,
  onGuestsChange,
  onRoomQuantityChange,
  roomQuantity,
  selectedRoom,
  stayNights,
}) {
  const totalAmount = selectedRoom ? selectedRoom.sale_price * stayNights * roomQuantity : 0

  return (
    <aside className="hotel-booking-panel">
      <div className="hotel-booking-panel__card">
        <div className="hotel-booking-panel__header">
          <span className="hotel-booking-panel__eyebrow">Đặt phòng mock</span>
          <h2 className="hotel-booking-panel__title">Tóm tắt lưu trú</h2>
        </div>

        <div className="hotel-booking-panel__fields">
          <label className="hotel-booking-panel__field">
            <span>Nhận phòng</span>
            <input
              type="date"
              value={checkinDate}
              onChange={(event) => onDateChange({ checkinDate: event.target.value })}
            />
          </label>

          <label className="hotel-booking-panel__field">
            <span>Trả phòng</span>
            <input
              type="date"
              value={checkoutDate}
              onChange={(event) => onDateChange({ checkoutDate: event.target.value })}
            />
          </label>

          <div className="hotel-booking-panel__field-grid">
            <label className="hotel-booking-panel__field">
              <span>Số khách</span>
              <input
                max="10"
                min="1"
                type="number"
                value={guests}
                onChange={(event) => onGuestsChange(clampInputValue(event.target.value, 1))}
              />
            </label>

            <label className="hotel-booking-panel__field">
              <span>Số phòng</span>
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

        <div className="hotel-booking-panel__summary">
          <div className="hotel-booking-panel__summary-row">
            <span>Phòng đã chọn</span>
            <strong>{selectedRoom ? selectedRoom.title : 'Chưa chọn phòng'}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>Giá mỗi đêm</span>
            <strong>{selectedRoom ? formatCurrency(selectedRoom.sale_price) : '--'}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row">
            <span>Số đêm</span>
            <strong>{stayNights}</strong>
          </div>
          <div className="hotel-booking-panel__summary-row hotel-booking-panel__summary-row--total">
            <span>Tổng tạm tính</span>
            <strong>{selectedRoom ? formatCurrency(totalAmount) : '--'}</strong>
          </div>
        </div>

        <div className="hotel-booking-panel__actions">
          <button
            className="hotel-booking-panel__button hotel-booking-panel__button--secondary"
            type="button"
            onClick={() => onCheckAvailability()}
          >
            Kiểm tra phòng
          </button>

          <button
            className="hotel-booking-panel__button hotel-booking-panel__button--primary"
            type="button"
            onClick={() => onAddToCart()}
          >
            Tiếp tục tới giỏ hàng
          </button>

          <button
            className="hotel-booking-panel__button hotel-booking-panel__button--ghost"
            type="button"
            onClick={() => onCheckout()}
          >
            Đi thẳng tới checkout
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
