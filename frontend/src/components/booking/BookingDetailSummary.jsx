function BookingDetailSummary({
  bookingCode,
  confirmLabel = 'Xác nhận',
  feedback,
  isDisabled,
  onConfirm,
  onCopyBookingCode,
  summary,
}) {
  return (
    <section className="booking-detail-summary">
      <div className="booking-detail-summary__accent" aria-hidden="true" />
      <div className="booking-detail-summary__code-row">
        <div>
          <p className="booking-detail-summary__eyebrow">Mã đơn hàng</p>
          <strong className="booking-detail-summary__code">{bookingCode}</strong>
        </div>
        <button type="button" onClick={onCopyBookingCode}>
          Sao chép
        </button>
      </div>

      <h2 className="booking-detail-summary__title">Chi tiết đơn hàng</h2>

      <div className="booking-detail-summary__rows">
        <div className="booking-detail-summary__row">
          <span>Tạm tính</span>
          <strong>{summary.subtotal_amount}</strong>
        </div>
        <div className="booking-detail-summary__row">
          <span>Thuế & Phí</span>
          <strong>{summary.tax_and_fee_amount}</strong>
        </div>
        <div className="booking-detail-summary__row booking-detail-summary__row--discount">
          <span>Giảm giá thành viên</span>
          <strong>-{summary.discount_amount}</strong>
        </div>
      </div>

      <div className="booking-detail-summary__total">
        <div>
          <span className="booking-detail-summary__total-label">Tổng cộng</span>
          <strong className="booking-detail-summary__total-amount">{summary.total_amount}</strong>
        </div>
        <span className="booking-detail-summary__vat-note">Đã bao gồm VAT</span>
      </div>

      <button
        className="booking-detail-summary__button"
        disabled={isDisabled}
        type="button"
        onClick={onConfirm}
      >
        {confirmLabel}
      </button>

      {feedback ? (
        <p className="booking-detail-summary__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  )
}

export default BookingDetailSummary
