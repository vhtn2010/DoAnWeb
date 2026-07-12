function PaymentIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <rect
        height="12"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.8"
        width="18"
        x="3"
        y="6"
      />
      <path
        d="M3 10h18"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function PaymentMethodPanel({
  errors,
  methods,
  onSelectMethod,
  selectedMethod,
  selectedMethodMeta,
}) {
  return (
    <section className="payment-method-panel">
      <header className="payment-method-panel__header">
        <span className="payment-method-panel__icon" aria-hidden="true">
          <PaymentIcon />
        </span>
        <div>
          <h2 className="payment-method-panel__title">Phương thức thanh toán</h2>
          <p className="payment-method-panel__subtitle">
            Chọn phương thức phù hợp trước khi tiếp tục. Nếu chọn chuyển khoản ngân hàng, hệ thống
            sẽ đưa bạn sang màn hình thanh toán riêng để xem QR và gửi bill.
          </p>
        </div>
      </header>

      {methods.length > 0 ? (
        <div className="payment-method-panel__options">
          {methods.map((method) => {
            const isActive = method.code === selectedMethod

            return (
              <button
                className={`payment-method-panel__option ${
                  isActive ? 'payment-method-panel__option--active' : ''
                }`}
                key={method.id}
                type="button"
                onClick={() => onSelectMethod(method.code)}
              >
                <span className="payment-method-panel__option-copy">
                  <strong>{method.label}</strong>
                  <small>{method.description}</small>
                </span>
                <span
                  className={`payment-method-panel__option-dot ${
                    isActive ? 'payment-method-panel__option-dot--active' : ''
                  }`}
                  aria-hidden="true"
                />
              </button>
            )
          })}
        </div>
      ) : (
        <p className="payment-method-panel__error">
          Hiện chưa có phương thức thanh toán trực tiếp khả dụng. Vui lòng liên hệ bộ phận hỗ trợ
          để được hướng dẫn thêm.
        </p>
      )}

      {errors.selected_payment_method ? (
        <p className="payment-method-panel__error">{errors.selected_payment_method}</p>
      ) : null}

      {selectedMethodMeta ? (
        <div className="payment-method-panel__helper">
          {selectedMethodMeta.code === 'manual_bank_transfer' ? (
            <p>
              Sau khi xác nhận, bạn sẽ được chuyển sang trang thanh toán riêng để xem QR, thông
              tin chuyển khoản và tải bill.
            </p>
          ) : (
            <p>Nhân viên sẽ liên hệ với bạn sau khi gửi yêu cầu để hướng dẫn thanh toán thủ công.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}

export default PaymentMethodPanel
