import './cartSummaryCard.css'

function CartSummaryCard({
  appliedVoucher,
  feedbackHint,
  isContinueDisabled,
  isVoucherLoading,
  onApplyVoucher,
  onChangeVoucherCode,
  onClearCart,
  onContinue,
  onRemoveVoucher,
  summary,
  voucherCode,
}) {
  return (
    <section className="cart-summary-card">
      <div className="cart-summary-card__accent" aria-hidden="true" />
      <div className="cart-summary-card__header">
        <h2 className="cart-summary-card__title">Tổng tiền</h2>
        <strong className="cart-summary-card__amount">{summary.total_amount}</strong>
      </div>

      <div className="cart-summary-card__details">
        <div className="cart-summary-card__row">
          <span>Đã chọn</span>
          <strong>{summary.selected_item_count} dịch vụ</strong>
        </div>
        <div className="cart-summary-card__row">
          <span>Tạm tính</span>
          <strong>{summary.subtotal_amount}</strong>
        </div>
        <div className="cart-summary-card__row">
          <span>Giảm giá</span>
          <strong>{summary.discount_amount}</strong>
        </div>
      </div>

      <div className="cart-summary-card__details">
        <div className="cart-summary-card__row">
          <span>Mã ưu đãi</span>
          <strong>{appliedVoucher?.code || 'Chưa áp dụng'}</strong>
        </div>

        <label className="cart-summary-card__voucher-field">
          <span>Nhập mã voucher</span>
          <input
            className="cart-summary-card__voucher-input"
            placeholder="Ví dụ: TOUR10"
            type="text"
            value={voucherCode}
            onChange={(event) => onChangeVoucherCode(event.target.value)}
          />
        </label>

        <div className="cart-summary-card__voucher-actions">
          <button
            className="cart-summary-card__ghost-button"
            disabled={isVoucherLoading}
            type="button"
            onClick={onApplyVoucher}
          >
            {isVoucherLoading ? 'Đang áp dụng...' : 'Áp dụng voucher'}
          </button>

          <button
            className="cart-summary-card__ghost-button"
            disabled={isVoucherLoading || !appliedVoucher}
            type="button"
            onClick={onRemoveVoucher}
          >
            Gỡ voucher
          </button>
        </div>
      </div>

      <button
        className="cart-summary-card__button"
        disabled={isContinueDisabled}
        type="button"
        onClick={onContinue}
      >
        Tiếp tục
      </button>

      <p className="cart-summary-card__hint">
        {feedbackHint || 'Bạn có thể tiếp tục đặt dịch vụ và nhập thông tin liên hệ ở bước tiếp theo.'}
      </p>

      <button
        className="cart-summary-card__ghost-button"
        disabled={isVoucherLoading}
        type="button"
        onClick={onClearCart}
      >
        Xóa toàn bộ giỏ hàng
      </button>
    </section>
  )
}

export default CartSummaryCard
