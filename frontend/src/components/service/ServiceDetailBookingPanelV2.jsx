function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

export default function ServiceDetailBookingPanelV2({
  adultCount,
  adultTotal,
  bookingMessage,
  childCount,
  childTotal,
  departureDate,
  pendingAction,
  onAdultCountChange,
  onAddToCart,
  onBookNow,
  onChildCountChange,
  onDepartureDateChange,
  service,
  totalPrice,
}) {
  const departureOptions = Array.isArray(service?.details?.departure_dates)
    ? service.details.departure_dates
    : []

  return (
    <aside className="service-detail-booking">
      <div className="service-detail-booking__card">
        <div className="service-detail-booking__price">
          {service.has_sale_price ? (
            <span className="service-detail-booking__price-old">
              {formatCurrency(service.base_price)}
            </span>
          ) : null}

          <div className="service-detail-booking__price-current">
            <strong>{formatCurrency(service.sale_price)}</strong>
            <span>/ khách</span>
          </div>
        </div>

        <div className="service-detail-booking__form">
          <label className="service-detail-booking__field">
            <span>Ngày khởi hành</span>
            <select
              disabled={!departureOptions.length}
              value={departureDate}
              onChange={(event) => onDepartureDateChange(event.target.value)}
            >
              {departureOptions.length ? (
                departureOptions.map((dateOption) => (
                  <option key={dateOption} value={dateOption}>
                    {dateOption}
                  </option>
                ))
              ) : (
                <option value="">Chưa có lịch khởi hành</option>
              )}
            </select>
          </label>

          <div className="service-detail-booking__guest-grid">
            <label className="service-detail-booking__field">
              <span>Người lớn</span>
              <select
                value={adultCount}
                onChange={(event) => onAdultCountChange(Number(event.target.value))}
              >
                {[1, 2, 3, 4, 5, 6].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="service-detail-booking__field">
              <span>Trẻ em</span>
              <select
                value={childCount}
                onChange={(event) => onChildCountChange(Number(event.target.value))}
              >
                {[0, 1, 2, 3, 4].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="service-detail-booking__summary">
          <div className="service-detail-booking__summary-row">
            <span>Người lớn (x{adultCount})</span>
            <strong>{formatCurrency(adultTotal)}</strong>
          </div>

          {childCount > 0 ? (
            <div className="service-detail-booking__summary-row">
              <span>Trẻ em (x{childCount})</span>
              <strong>{formatCurrency(childTotal)}</strong>
            </div>
          ) : null}

          <div className="service-detail-booking__summary-row">
            <span>Phí dịch vụ</span>
            <strong className="service-detail-booking__summary-note">Chưa bao gồm</strong>
          </div>

          <div className="service-detail-booking__summary-row service-detail-booking__summary-row--total">
            <span>Tổng cộng</span>
            <strong>{formatCurrency(totalPrice)}</strong>
          </div>
        </div>

        <div className="service-detail-booking__actions">
          <button
            className="service-detail-booking__button service-detail-booking__button--primary"
            disabled={pendingAction !== ''}
            type="button"
            onClick={onBookNow}
          >
            {pendingAction === 'checkout' ? 'Đang xử lý...' : 'Đặt ngay'}
          </button>

          <button
            className="service-detail-booking__button service-detail-booking__button--secondary"
            disabled={pendingAction !== ''}
            type="button"
            onClick={onAddToCart}
          >
            {pendingAction === 'cart' ? 'Đang xử lý...' : 'Thêm vào giỏ hàng'}
          </button>
        </div>

        <p aria-live="polite" className="service-detail-booking__feedback" role="status">
          {bookingMessage}
        </p>
      </div>
    </aside>
  )
}
