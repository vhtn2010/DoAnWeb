function CartSummaryCard({ feedbackHint, isCustomer, onContinue, summary }) {
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
      </div>

      <button className="cart-summary-card__button" type="button" onClick={onContinue}>
        Tiếp tục
      </button>

      <p className="cart-summary-card__hint">
        {feedbackHint ||
          (isCustomer
            ? 'Sẵn sàng cho bước thông tin đặt đơn ở phase tiếp theo.'
            : 'Đăng nhập để tiếp tục đặt dịch vụ ở bước checkout sau.' )}
      </p>
    </section>
  )
}

export default CartSummaryCard
