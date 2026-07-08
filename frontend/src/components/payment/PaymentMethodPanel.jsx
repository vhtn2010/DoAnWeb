import { PAYMENT_METHOD_CODES } from '../../constants/payments.js'
import PaymentQrCodePanel from './PaymentQrCodePanel.jsx'

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

function PaymentMethodPanel({
  amountLabel,
  bookingCode,
  cardNumber,
  errors,
  methods,
  onCardNumberChange,
  onSelectMethod,
  qrPayload,
  selectedMethod,
}) {
  const isCardMethod = selectedMethod === PAYMENT_METHOD_CODES.card

  return (
    <section className="payment-method-panel">
      <header className="payment-method-panel__header">
        <span className="payment-method-panel__icon" aria-hidden="true">
          <PaymentIcon />
        </span>
        <div>
          <h2 className="payment-method-panel__title">Phương thức thanh toán</h2>
          <p className="payment-method-panel__subtitle">Chọn cách thanh toán phù hợp nhất cho đơn hàng của bạn.</p>
        </div>
      </header>

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

      {errors.selected_payment_method ? (
        <p className="payment-method-panel__error">{errors.selected_payment_method}</p>
      ) : null}

      {isCardMethod ? (
        <label className="payment-method-panel__card-field">
          <span>Số thẻ</span>
          <div className="payment-method-panel__card-input">
            <input
              placeholder="0000 0000 0000 0000"
              type="text"
              value={cardNumber}
              onChange={onCardNumberChange}
            />
            <span className="payment-method-panel__card-lock" aria-hidden="true">
              <LockIcon />
            </span>
          </div>
          {errors.card_number ? <small>{errors.card_number}</small> : null}
        </label>
      ) : (
        <PaymentQrCodePanel
          amountLabel={amountLabel}
          bookingCode={bookingCode}
          payload={qrPayload}
        />
      )}
    </section>
  )
}

export default PaymentMethodPanel
