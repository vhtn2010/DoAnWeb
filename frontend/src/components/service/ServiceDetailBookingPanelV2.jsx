function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

function formatDepartureOptionLabel(value) {
  const normalizedValue = String(value ?? '').trim()
  const isoDateMatch = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)

  if (isoDateMatch) {
    return `${isoDateMatch[3]}/${isoDateMatch[2]}/${isoDateMatch[1]}`
  }

  return normalizedValue
}

export default function ServiceDetailBookingPanelV2({
  adultCount,
  adultTotal,
  bookingMessage,
  childCount,
  childTotal,
  departureDate,
  pendingAction,
  pricingSummary,
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
                    {formatDepartureOptionLabel(dateOption)}
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

          {pricingSummary?.vat_amount_value > 0 ? (
            <div className="service-detail-booking__summary-row">
              <span>Thuế VAT (8%)</span>
              <strong>{pricingSummary.vat_amount}</strong>
            </div>
          ) : null}

          {pricingSummary?.service_fee_amount_value > 0 ? (
            <div className="service-detail-booking__summary-row">
              <span>Phí dịch vụ</span>
              <strong>{pricingSummary.service_fee_amount}</strong>
            </div>
          ) : null}

          {pricingSummary?.surcharge_amount_value > 0 ? (
            <div className="service-detail-booking__summary-row">
              <span>Phụ thu</span>
              <strong>{pricingSummary.surcharge_amount}</strong>
            </div>
          ) : null}

          <div className="service-detail-booking__summary-row service-detail-booking__summary-row--total">
            <span>Tổng cộng</span>
            <strong>
              {pricingSummary?.has_pricing ? pricingSummary.total_amount : formatCurrency(totalPrice)}
            </strong>
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
