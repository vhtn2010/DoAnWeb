import { PublicButton } from '../public/ui/index.js'

function formatCurrency(value) {
  return `${new Intl.NumberFormat('vi-VN').format(value)}đ`
}

export default function ServiceDetailBookingPanel({
  adultCount,
  adultTotal,
  bookingMessage,
  childCount,
  childTotal,
  departureDate,
  onAdultCountChange,
  onBookNow,
  onChildCountChange,
  onDepartureDateChange,
  service,
  totalPrice,
}) {
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
            <select value={departureDate} onChange={(event) => onDepartureDateChange(event.target.value)}>
              {service.details.departure_dates.map((dateOption) => (
                <option key={dateOption} value={dateOption}>
                  {dateOption}
                </option>
              ))}
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

          <div className="service-detail-booking__summary-row">
            <span>Trẻ em (x{childCount})</span>
            <strong>{childCount > 0 ? formatCurrency(childTotal) : '0đ'}</strong>
          </div>

          <div className="service-detail-booking__summary-row">
            <span>Phí dịch vụ</span>
            <strong>Miễn phí</strong>
          </div>

          <div className="service-detail-booking__summary-row service-detail-booking__summary-row--total">
            <span>Tổng cộng</span>
            <strong>{formatCurrency(totalPrice)}</strong>
          </div>
        </div>

        <PublicButton
          className="service-detail-booking__submit"
          type="button"
          variant="primary"
          onClick={onBookNow}
        >
          Đặt ngay
        </PublicButton>
        <p className="service-detail-booking__helper">Giữ chỗ ngay, thanh toán sau</p>
        <p className="service-detail-booking__policy">{service.cancellation_policy}</p>

        <p aria-live="polite" className="service-detail-booking__feedback">
          {bookingMessage}
        </p>
      </div>
    </aside>
  )
}
