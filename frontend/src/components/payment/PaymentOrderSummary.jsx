function LockIcon() {
  return (
    <svg fill="none" viewBox="0 0 20 20">
      <rect
        height="8.5"
        rx="2.5"
        stroke="currentColor"
        strokeWidth="1.6"
        width="10"
        x="5"
        y="8.5"
      />
      <path
        d="M7.5 8.5V6.8A2.5 2.5 0 0 1 10 4.3a2.5 2.5 0 0 1 2.5 2.5v1.7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  )
}

function PaymentOrderSummary({
  feedback,
  isDisabled,
  isPaid,
  onApplyVoucher,
  onPay,
  onVoucherChange,
  summary,
  voucherCode,
}) {
  return (
    <section className="payment-order-summary">
      <div className="payment-order-summary__accent" aria-hidden="true" />
      <h2 className="payment-order-summary__title">Chi tiết đơn hàng</h2>

      <div className="payment-order-summary__rows">
        <div className="payment-order-summary__row">
          <span>Tạm tính</span>
          <strong>{summary.subtotal_amount}</strong>
        </div>
        <div className="payment-order-summary__row">
          <span>Thuế & Phí</span>
          <strong>{summary.tax_and_fee_amount}</strong>
        </div>
        <div className="payment-order-summary__row payment-order-summary__row--discount">
          <span>Giảm giá</span>
          <strong>-{summary.discount_amount}</strong>
        </div>
      </div>

      <div className="payment-order-summary__total">
        <div>
          <span className="payment-order-summary__total-label">Tổng cộng</span>
          <strong className="payment-order-summary__total-amount">{summary.total_amount}</strong>
        </div>
        <span className="payment-order-summary__vat-note">Đã bao gồm VAT</span>
      </div>

      <div className="payment-order-summary__voucher">
        <label className="payment-order-summary__voucher-label" htmlFor="payment-voucher-code">
          Mã giảm giá
        </label>
        <div className="payment-order-summary__voucher-controls">
          <input
            id="payment-voucher-code"
            placeholder="Nhập mã ưu đãi"
            type="text"
            value={voucherCode}
            onChange={onVoucherChange}
          />
          <button type="button" onClick={onApplyVoucher}>
            Áp dụng
          </button>
        </div>
      </div>

      <button
        className="payment-order-summary__button"
        disabled={isDisabled}
        type="button"
        onClick={onPay}
      >
        {isPaid ? 'Đã thanh toán' : 'Thanh toán'}
      </button>

      <p className="payment-order-summary__security-note">
        <span aria-hidden="true">
          <LockIcon />
        </span>
        MÃ HÓA SSL & THANH TOÁN AN TOÀN
      </p>

      {feedback ? (
        <p className="payment-order-summary__feedback" role="status">
          {feedback}
        </p>
      ) : null}
    </section>
  )
}

export default PaymentOrderSummary
