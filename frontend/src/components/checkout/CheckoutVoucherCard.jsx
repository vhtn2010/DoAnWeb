function CheckoutVoucherCard({ feedbackMessage, onApplyVoucher, onChange, value }) {
  return (
    <section className="checkout-voucher-card">
      <span className="checkout-voucher-card__label">MÃ GIẢM GIÁ</span>
      <div className="checkout-voucher-card__controls">
        <input
          className="checkout-voucher-card__input"
          name="voucher_code"
          placeholder="Nhập mã ưu đãi..."
          type="text"
          value={value}
          onChange={onChange}
        />
        <button className="checkout-voucher-card__button" type="button" onClick={onApplyVoucher}>
          Áp dụng
        </button>
      </div>
      {feedbackMessage ? (
        <p className="checkout-voucher-card__feedback" role="status">
          {feedbackMessage}
        </p>
      ) : null}
    </section>
  )
}

export default CheckoutVoucherCard
