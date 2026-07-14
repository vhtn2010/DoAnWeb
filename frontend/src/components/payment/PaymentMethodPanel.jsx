import { PAYMENT_METHOD_CODES } from '../../constants/payments.js'

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

function resolveMethodHelper(method) {
  if (method?.code === PAYMENT_METHOD_CODES.manualBankTransfer) {
    return 'Sau khi xác nhận, bạn sẽ được chuyển sang màn hình QR để xem thông tin chuyển khoản và tải bill.'
  }

  if (method?.code === PAYMENT_METHOD_CODES.cashAtOffice) {
    return 'Thanh toán trực tiếp tại văn phòng, không phát sinh phí xử lý thêm trong giai đoạn này.'
  }

  return 'Sau khi xác nhận, nhân viên sẽ liên hệ với bạn để hướng dẫn thanh toán trực tiếp và xác nhận đơn.'
}

function PaymentMethodPanel({
  errors,
  methods,
  onSelectMethod,
  selectedMethod,
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
              <div className="payment-method-panel__option-group" key={method.id}>
                <button
                  className={`payment-method-panel__option ${
                    isActive ? 'payment-method-panel__option--active' : ''
                  }`}
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

                {isActive ? (
                  <p className="payment-method-panel__helper" role="note">
                    {resolveMethodHelper(method)}
                  </p>
                ) : null}
              </div>
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
    </section>
  )
}

export default PaymentMethodPanel
